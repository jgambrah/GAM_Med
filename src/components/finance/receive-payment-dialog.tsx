'use client';

import * as React from 'react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Receipt, CreditCard, Loader2 } from 'lucide-react';
import { Invoice } from '@/lib/types';

interface ReceivePaymentDialogProps {
    invoice: Invoice & { id: string };
}

/**
 * == Billing Settlement Tool ==
 * 
 * Allows clerks to collect payments and settle invoices.
 * Stems the financial data into the 'transactions' collection for Platform Pulse analytics.
 */
export function ReceivePaymentDialog({ invoice }: ReceivePaymentDialogProps) {
    const firestore = useFirestore();
    const [loading, setLoading] = React.useState(false);
    const [open, setOpen] = React.useState(false);

    const markAsPaid = async (method: string) => {
        if (!firestore) return;
        setLoading(true);
        
        try {
            // 1. UPDATE THE INVOICE (Settlement)
            const invRef = doc(firestore, 'invoices', invoice.id);
            await updateDoc(invRef, {
                status: 'Paid',
                paymentMethod: method,
                amountDue: 0,
                paidAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // 2. LOG THE TRANSACTION (For Platform Pulse)
            // This allows the CEO to see platform-wide revenue growth
            await addDoc(collection(firestore, "transactions"), {
                hospitalId: invoice.hospitalId,
                invoiceId: invoice.id,
                patientId: invoice.patientId,
                amount: invoice.grandTotal,
                type: 'Revenue',
                method: method,
                description: `Settlement for Invoice ${invoice.id.slice(0, 8)}`,
                createdAt: serverTimestamp()
            });

            toast.success("Payment Captured", {
                description: `Invoice ${invoice.id.slice(0, 8)} marked as Paid via ${method}.`
            });
            setOpen(false);
        } catch (error: any) {
            console.error("Payment settlement failed:", error);
            toast.error("Settlement Failed", {
                description: "You do not have permission to record payments."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 border-green-600 text-green-700 hover:bg-green-50">
                    Collect Payment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Settle Invoice</DialogTitle>
                    <DialogDescription>
                        Confirm payment method for <strong>₵{invoice.grandTotal.toLocaleString()}</strong>.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4 py-6">
                    <Button 
                        onClick={() => markAsPaid('Cash')} 
                        variant="outline" 
                        className="h-24 flex flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all"
                        disabled={loading}
                    >
                        <Receipt className="h-8 w-8 text-green-600" />
                        <span className="font-bold">CASH</span>
                    </Button>
                    <Button 
                        onClick={() => markAsPaid('POS / Card')} 
                        variant="outline" 
                        className="h-24 flex flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all"
                        disabled={loading}
                    >
                        <CreditCard className="h-8 w-8 text-blue-600" />
                        <span className="font-bold">POS / CARD</span>
                    </Button>
                </div>

                {loading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing secure settlement...
                    </div>
                )}

                <DialogFooter className="sm:justify-start">
                    <p className="text-[10px] text-muted-foreground italic">
                        This action will generate an immutable transaction record for auditing.
                    </p>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
