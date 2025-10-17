
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RequestForQuotation } from '@/lib/types';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';

interface RfqDetailDialogProps {
  rfq: RequestForQuotation;
  isOpen: boolean;
  onOpenChange: () => void;
}

export function RfqDetailDialog({ rfq, isOpen, onOpenChange }: RfqDetailDialogProps) {

  const handlePrint = () => {
    setTimeout(() => {
        window.print();
    }, 100);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl print:max-w-full print:border-0 print:shadow-none">
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
            <DialogTitle className="text-2xl text-center">Request for Quotation</DialogTitle>
            <DialogDescription className="text-center">
                RFQ ID: {rfq.rfqId}
            </DialogDescription>
            </DialogHeader>
            <div className="my-6 space-y-4">
                <div className="flex justify-between p-4 border rounded-lg bg-muted/50">
                    <div>
                        <p className="text-sm font-medium">RFQ Title</p>
                        <p className="font-semibold">{rfq.title}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium">Date Issued</p>
                        <p className="font-semibold">{format(new Date(rfq.dateCreated), 'PPP')}</p>
                    </div>
                     <div className="text-right">
                        <p className="text-sm font-medium">Submission Deadline</p>
                        <p className="font-semibold">{format(new Date(rfq.deadline), 'PPP')}</p>
                    </div>
                </div>
                
                <h4 className="font-semibold">Items for Quotation</h4>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead className="text-right">Required Quantity</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {rfq.items.map((item, index) => (
                            <TableRow key={index}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
                 <div className="pt-6 text-sm text-muted-foreground">
                    <p>Please submit your quotation for the items listed above to the procurement office before the specified deadline.</p>
                </div>
            </div>
        </div>
        <DialogFooter className="no-print">
          <Button variant="ghost" onClick={onOpenChange}>Close</Button>
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print RFQ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
