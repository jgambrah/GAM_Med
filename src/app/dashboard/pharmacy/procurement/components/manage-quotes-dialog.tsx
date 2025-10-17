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
import { Badge } from '@/components/ui/badge';
import { RequestForQuotation, Quote } from '@/lib/types';
import { format } from 'date-fns';
import { Crown } from 'lucide-react';

interface ManageQuotesDialogProps {
  rfq: RequestForQuotation;
  isOpen: boolean;
  onOpenChange: () => void;
  onAward: (rfqId: string, quoteId: string) => void;
}

export function ManageQuotesDialog({ rfq, isOpen, onOpenChange, onAward }: ManageQuotesDialogProps) {

  const handleAward = (quote: Quote) => {
    onAward(rfq.rfqId, quote.quoteId);
  }

  const sortedQuotes = React.useMemo(() => {
    if (!rfq.quotes) return [];
    return [...rfq.quotes].sort((a, b) => a.totalAmount - b.totalAmount);
  }, [rfq.quotes]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Quotations for: {rfq.title}</DialogTitle>
          <DialogDescription>
            Review submitted quotations and award the order to a supplier.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedQuotes.length > 0 ? (
                sortedQuotes.map((quote) => (
                  <TableRow key={quote.quoteId}>
                    <TableCell className="font-medium">{quote.supplierName}</TableCell>
                    <TableCell>{format(new Date(quote.dateSubmitted), 'PPP')}</TableCell>
                    <TableCell className="text-right font-mono">₵{quote.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleAward(quote)} disabled={rfq.status !== 'Evaluating'}>
                            <Crown className="h-4 w-4 mr-2" />
                            Award
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No quotations have been submitted for this RFQ yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={onOpenChange}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
