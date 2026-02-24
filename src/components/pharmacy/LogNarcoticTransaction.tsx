
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel, 
    FormMessage,
    FormDescription
} from '@/components/ui/form';
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { ShieldCheck, Loader2, MinusCircle, PlusCircle } from 'lucide-react';
import { ControlledSubstance } from '@/lib/types';

// Specialized schema for Narcotic Transactions
const TransactionSchema = z.object({
    qty: z.coerce.number().min(1, "Quantity must be at least 1"),
    patientId: z.string().optional(),
    witnessName: z.string().min(3, "A witness name is mandatory for legal compliance"),
});

interface LogNarcoticTransactionProps {
    substance: ControlledSubstance;
    action: 'Dispense' | 'Refill';
}

/**
 * == Secure Narcotic Transaction: The Double Sign-off Pattern ==
 * 
 * This component handles the high-risk movements of controlled drugs.
 * It enforces a mandatory witness verification and uses atomic transactions
 * to ensure the Dangerous Drugs Register (DDR) remains 100% accurate.
 */
export function LogNarcoticTransaction({ substance, action }: LogNarcoticTransactionProps) {
    const { user } = useAuth();
    const db = useFirestore();
    const [open, setOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<z.infer<typeof TransactionSchema>>({
        resolver: zodResolver(TransactionSchema),
        defaultValues: {
            qty: 1,
            patientId: '',
            witnessName: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof TransactionSchema>) => {
        if (!user || !db) return;
        setIsSubmitting(true);

        try {
            await runTransaction(db, async (transaction) => {
                const substanceRef = doc(db, 'controlled_substances', substance.substanceId);
                const substanceSnap = await transaction.get(substanceRef);
                
                if (!substanceSnap.exists()) throw new Error("Substance registry record missing.");
                
                const currentTotal = substanceSnap.data().totalQuantity;
                const delta = action === 'Dispense' ? -values.qty : values.qty;
                const newTotal = currentTotal + delta;

                if (newTotal < 0) throw new Error("INSUFFICIENT BALANCE: Cannot dispense more than is in the register.");

                // 1. UPDATE MASTER REGISTER BALANCE
                transaction.update(substanceRef, { 
                    totalQuantity: newTotal,
                    updatedAt: serverTimestamp()
                });

                // 2. CREATE IMMUTABLE AUDIT LOG ENTRY (SaaS Wall Enforced)
                const logRef = doc(collection(db, 'controlled_substance_logs'));
                transaction.set(logRef, {
                    id: logRef.id,
                    hospitalId: user.hospitalId,
                    substanceId: substance.substanceId,
                    substanceName: substance.name,
                    transactionType: action,
                    quantityChange: delta,
                    currentQuantity: newTotal,
                    performedBy: user.name,
                    performedByUserId: user.uid,
                    witnessName: values.witnessName, // THE SECOND SIGN-OFF
                    patientId: values.patientId || 'N/A',
                    date: new Date().toISOString(),
                    createdAt: serverTimestamp(),
                    reason: action === 'Dispense' ? `Clinical Dispensing to Pt ${values.patientId}` : "Inventory Replenishment"
                });
            });

            toast.success("Narcotic Transaction Logged", {
                description: `Register updated for ${substance.name}. Current balance: ${substance.totalQuantity + (action === 'Dispense' ? -values.qty : values.qty)}`
            });
            setOpen(false);
            form.reset();
        } catch (error: any) {
            console.error("Narcotic audit failure:", error);
            toast.error("Transaction Aborted", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    size="sm" 
                    variant={action === 'Dispense' ? 'destructive' : 'outline'}
                    className="h-8 text-[10px] font-black uppercase tracking-widest gap-2"
                >
                    {action === 'Dispense' ? <MinusCircle className="h-3.5 w-3.5" /> : <PlusCircle className="h-3.5 w-3.5" />}
                    {action}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-t-4 border-t-red-600">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2 text-red-600">
                        <ShieldCheck className="h-5 w-5" />
                        <DialogTitle className="font-black uppercase tracking-tighter">
                            {action} Registry Entry
                        </DialogTitle>
                    </div>
                    <DialogDescription>
                        Logging movement for <strong>{substance.name} ({substance.strength})</strong>. 
                        Balance: <strong>{substance.totalQuantity} {substance.unit}s</strong>
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="qty"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Quantity to {action}</FormLabel>
                                    <FormControl>
                                        <Input type="number" className="text-xl font-black font-mono h-12 bg-muted/30" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {action === 'Dispense' && (
                            <FormField
                                control={form.control}
                                name="patientId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Patient MRN</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 123456" className="bg-muted/30 font-bold" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-red-200 ring-2 ring-red-50">
                            <FormField
                                control={form.control}
                                name="witnessName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-red-700 flex items-center gap-2">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            Mandatory Witness Verification
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Full Name of Second Clinician" className="bg-white font-bold" {...field} />
                                        </FormControl>
                                        <FormDescription className="text-[9px] text-slate-500 font-medium">
                                            A second registered pharmacist or nurse must witness this movement for statutory compliance.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="pt-4 border-t">
                            <Button type="button" variant="ghost" className="text-[10px] font-black uppercase" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest px-8 h-11"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Confirm & Sign Register
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
