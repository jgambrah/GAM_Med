
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
}

/**
 * == Secure Narcotic Transaction Handler ==
 * 
 * Implements the "Double-Witness" protocol for wasting or adjusting controlled substances.
 * Uses a Firestore Transaction to ensure atomic consistency between log and balance.
 */
export function LogTransactionDialog({ substance, isOpen, onOpenChange }: LogTransactionDialogProps) {
  const db = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof ControlledSubstanceTransactionSchema>>({
    resolver: zodResolver(ControlledSubstanceTransactionSchema),
    defaultValues: {
      hospitalId: substance.hospitalId,
      transactionType: 'Dispense',
      quantity: 1,
      reason: '',
      patientId: '',
      witnessId: '',
    },
  });

  const transactionType = form.watch('transactionType');

  const onSubmit = async (values: z.infer<typeof ControlledSubstanceTransactionSchema>) => {
    setIsSubmitting(true);
    
    try {
        await runTransaction(db, async (transaction) => {
            const substanceRef = doc(db, 'controlled_substances', substance.substanceId);
            const substanceSnap = await transaction.get(substanceRef);
            
            if (!substanceSnap.exists()) throw new Error("Substance record missing");
            
            const currentTotal = substanceSnap.data().totalQuantity;
            const change = (values.transactionType === 'Restock') ? values.quantity : -values.quantity;
            const newTotal = currentTotal + change;

            if (newTotal < 0) throw new Error("Insufficient stock for this transaction");

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
                createdAt: serverTimestamp()
            });
        });

        toast.success('Transaction Logged', {
            description: `Audit trail updated for ${substance.name}. New balance: ${substance.totalQuantity + ((values.transactionType === 'Restock') ? values.quantity : -values.quantity)}`
        });
        onOpenChange(false);
        form.reset();
    } catch (error: any) {
        toast.error("Legal Audit Failed", { description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const patientOptions = allPatients.map(p => ({ label: p.full_name, value: p.patient_id }));
  const witnessOptions = allUsers.filter(u => u.role === 'pharmacist' || u.role === 'doctor').map(u => ({ label: u.name, value: u.uid }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle>Secure Narcotic Log</DialogTitle>
          </div>
          <DialogDescription>
            Logging movement for <strong>{substance.name}</strong>. Current: {substance.totalQuantity} {substance.unit}
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
                            <FormLabel className="text-xs uppercase font-bold">Action Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="bg-muted/30"><SelectValue/></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Dispense">Dispense to Patient</SelectItem>
                                    <SelectItem value="Restock">Restock Inventory</SelectItem>
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
                            <FormLabel className="text-xs uppercase font-bold">Quantity ({substance.unit})</FormLabel>
                            <FormControl>
                                <Input type="number" className="bg-muted/30" {...field} />
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
                            <FormLabel className="text-xs uppercase font-bold">Inpatient Assignment</FormLabel>
                            <Combobox 
                                options={patientOptions}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Select patient..."
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
                        <FormItem className="bg-orange-50 p-3 rounded-md border border-orange-100">
                            <FormLabel className="text-xs uppercase font-bold text-orange-800">Mandatory Witness Signature</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select witness..."/></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {witnessOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormDescription className="text-[10px] text-orange-700">A second licensed clinician must verify this disposal.</FormDescription>
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
                        <FormLabel className="text-xs uppercase font-bold">Clinical/Audit Notes</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., Post-op pain, Sample contaminated, Quarterly audit reconciliation..." className="bg-muted/30" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 font-bold">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Finalize & Stamp Log
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
