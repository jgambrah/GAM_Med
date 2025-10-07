'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StaffExpenseClaim } from '@/lib/types';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';

interface PaymentVoucherProps {
  claim: StaffExpenseClaim;
  voucherType: 'Net Payment' | 'WHT Payment';
  trigger: React.ReactNode;
}

// A simple function to convert number to words (for demonstration)
function numberToWords(num: number): string {
    // This is a simplified version. A production app would use a robust library.
    if (num === 0) return "Zero";
    const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const ghs = Math.floor(num);
    const pesewas = Math.round((num - ghs) * 100);
    let words = '';
    if (ghs > 0) {
       words += `${ghs.toString()} Ghana Cedis`; // Simplified
    }
    if (pesewas > 0) {
        words += ` and ${pesewas} Pesewas`;
    }
    return words.trim();
}


export function PaymentVoucher({ claim, voucherType, trigger }: PaymentVoucherProps) {
    const [open, setOpen] = React.useState(false);
    
    const isNetPayment = voucherType === 'Net Payment';
    const amount = isNetPayment ? claim.netAmount : claim.whtAmount;
    const payee = isNetPayment ? claim.staffName : 'Ghana Revenue Authority (GRA)';
    const description = isNetPayment 
        ? `Net payment for expense claim: ${claim.description}`
        : `Withholding tax remittance for claim: ${claim.claimId}`;

    const handlePrint = () => {
        setTimeout(() => {
            window.print();
        }, 100);
    }
    
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl print:max-w-full print:border-0 print:shadow-none">
         <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #print-section, #print-section * {
                visibility: visible;
              }
              #print-section {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 2rem;
              }
              .no-print {
                display: none;
              }
            }
          `}</style>
        <div id="print-section">
            <DialogHeader>
                <DialogTitle className="text-2xl text-center">GamMed Hospital Payment Voucher</DialogTitle>
                <DialogDescription className="text-center">{voucherType}</DialogDescription>
            </DialogHeader>
            <div className="my-6 space-y-6 border p-6 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Voucher No.</p>
                        <p className="font-semibold">{`PV-${claim.claimId.split('-')[1]}-${isNetPayment ? 'NET' : 'WHT'}`}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Payment Date</p>
                        <p className="font-semibold">{format(new Date(), 'PPP')}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Claim ID</p>
                        <p className="font-semibold">{claim.claimId}</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Payee</p>
                    <p className="font-semibold text-lg border-b pb-2">{payee}</p>
                </div>
                 <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Amount in Figures</p>
                    <p className="font-semibold text-2xl border-b pb-2">₵{amount?.toFixed(2)}</p>
                </div>
                 <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Amount in Words</p>
                    <p className="font-semibold text-lg border-b pb-2 capitalize">{numberToWords(amount || 0)}</p>
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="font-semibold border-b pb-2">{description}</p>
                </div>
                <div className="grid grid-cols-3 gap-8 pt-16">
                    <div className="text-center">
                        <div className="border-t pt-2">Prepared By</div>
                    </div>
                    <div className="text-center">
                         <div className="border-t pt-2">Finance Director</div>
                    </div>
                     <div className="text-center">
                         <div className="border-t pt-2">Health Director</div>
                    </div>
                </div>
            </div>
        </div>
        <DialogFooter className="no-print">
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print Voucher</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
