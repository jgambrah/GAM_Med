
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { ControlledSubstance } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { allPatients, allUsers } from '@/lib/data';
import { ControlledSubstanceTransactionSchema } from '@/lib/schemas';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface LogTransactionDialogProps {
  substance: ControlledSubstance;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialType?: 'Dispense' | 'Restock';
}

/**
 * == Secure Narcotic Transaction Handler ==
 * 
 * Implements the "Double-Witness" protocol for high-risk pharmacy actions.
 * Uses a Firestore Transaction to ensure atomic consistency between log and balance.
 */
export function LogTransactionDialog({ substance, isOpen, onOpenChange, initialType = 'Dispense' }: LogTransactionDialogProps) {
  const db = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof ControlledSubstanceTransactionSchema>>({
    resolver: zodResolver(ControlledSubstanceTransactionSchema),
    defaultValues: {
      hospitalId: substance.hospitalId,
      transactionType: initialType as any,
      quantity: 1,
      reason: '',
      patientId: '',
      witnessId: '',
    },
  });

  const transactionType = form.watch('transactionType');

  // Reset form when the dialog opens with a new initial type
  React.useEffect(() => {
    if (isOpen) {
        form.reset({
            hospitalId: substance.hospitalId,
            transactionType: initialType as any,
            quantity: 1,
            reason: '',
            patientId: '',
            witnessId: '',
        });
    }
  }, [isOpen, initialType, substance.hospitalId, form]);

  const onSubmit = async (values: z.infer<typeof ControlledSubstanceTransactionSchema>) => {
    setIsSubmitting(true);
    
    try {
        await runTransaction(db, async (transaction) => {
            const substanceRef = doc(db, 'controlled_substances', substance.substanceId);
            const substanceSnap = await transaction.get(substanceRef);
            
            if (!substanceSnap.exists()) throw new Error("Substance record missing from registry.");
            
            const currentTotal = substanceSnap.data().totalQuantity;
            const change = (values.transactionType === 'Restock') ? values.quantity : -values.quantity;
            const newTotal = currentTotal + change;

            if (newTotal < 0) throw new Error("INSUFFICIENT STOCK: This transaction would result in a negative balance.");

            // 1. UPDATE MASTER BALANCE
            transaction.update(substanceRef, { 
                totalQuantity: newTotal,
                updatedAt: serverTimestamp()
            });

            // 2. CREATE IMMUTABLE AUDIT LOG
            const logRef = doc(collection(db, 'controlled_substance_logs'));
            transaction.set(logRef, {
                ...values,
                substanceId: substance.substanceId,
                substanceName: substance.name,
                quantityChange: change,
                currentQuantity: newTotal,
                date: new Date().toISOString(),
                userId: db.app.options.apiKey?.slice(0,5) || 'staff', // Mocking user ID for prototype
                createdAt: serverTimestamp()
            });
        });

        toast.success('Movement Logged', {
            description: `Audit trail updated for ${substance.name}. Current register balance: ${substance.totalQuantity + ((values.transactionType === 'Restock') ? values.quantity : -values.quantity)}`
        });
        onOpenChange(false);
        form.reset();
    } catch (error: any) {
        toast.error("Audit Failure", { description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const patientOptions = allPatients.map(p => ({ label: p.full_name, value: p.patient_id }));
  const witnessOptions = allUsers.filter(u => u.role === 'pharmacist' || u.role === 'doctor').map(u => ({ label: u.name, value: u.uid }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-t-4 border-t-red-600">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-red-600">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle>Secure Movement Registry</DialogTitle>
          </div>
          <DialogDescription>
            Logging transaction for <strong>{substance.name}</strong> ({substance.strength}). 
            <br />
            Current Register Balance: <strong>{substance.totalQuantity} {substance.unit}s</strong>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
               <FormField
                    control={form.control}
                    name="transactionType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Action Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="bg-muted/30 font-bold"><SelectValue/></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Dispense">Dispense to Patient</SelectItem>
                                    <SelectItem value="Restock">Inventory Refill</SelectItem>
                                    <SelectItem value="Waste">Wastage / Disposal</SelectItem>
                                    <SelectItem value="Adjustment">Audit Adjustment</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Quantity ({substance.unit}s)</FormLabel>
                            <FormControl>
                                <Input type="number" className="bg-muted/30 font-mono text-lg font-bold" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {transactionType === 'Dispense' && (
                <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Assign to Inpatient</FormLabel>
                            <Combobox 
                                options={patientOptions}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Search admitted patients..."
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            
            {(transactionType === 'Waste' || transactionType === 'Adjustment') && (
                 <FormField
                    control={form.control}
                    name="witnessId"
                    render={({ field }) => (
                        <FormItem className="bg-orange-50 p-3 rounded-lg border border-orange-100 ring-2 ring-orange-200/50">
                            <FormLabel className="text-[10px] uppercase font-black text-orange-800 flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3" />
                                Mandatory Witness Signature
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="bg-white border-orange-200 mt-2 font-bold"><SelectValue placeholder="Select witness..."/></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {witnessOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormDescription className="text-[9px] text-orange-700/70 mt-1 font-medium leading-tight">
                                A second licensed clinical professional (Pharmacist or Doctor) must verify this wastage for legal compliance.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            
            <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Clinical/Audit Notes</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Provide clinical context or audit rationale..." className="bg-muted/30 text-xs italic" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button type="button" variant="ghost" className="text-xs uppercase font-bold" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 font-black text-xs uppercase tracking-widest px-8 h-11">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Finalize & Stamp Register
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
