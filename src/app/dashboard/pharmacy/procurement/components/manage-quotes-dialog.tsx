
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
import { toast } from '@/hooks/use-toast';
import { Crown } from 'lucide-react';

interface ManageQuotesDialogProps {
  rfq: RequestForQuotation;
  isOpen: boolean;
  onOpenChange: () => void;
}

export function ManageQuotesDialog({ rfq, isOpen, onOpenChange }: ManageQuotesDialogProps) {

  const handleAward = (quote: Quote) => {
    // In a real app, this would trigger a series of actions:
    // 1. Update the RFQ status to 'Closed'.
    // 2. Update this quote status to 'Awarded'.
    // 3. Update other quotes to 'Not Awarded'.
    // 4. Automatically generate a Purchase Order from this quote's details.
    toast.success(`Quote from ${quote.supplierName} has been awarded!`);
    onOpenChange(); // Close the dialog
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
                        <Button size="sm" onClick={() => handleAward(quote)}>
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
