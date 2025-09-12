
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SparePart, SparePartLog } from '@/lib/types';
import { mockSparePartsLog, allUsers } from '@/lib/data';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface SparePartsLogDialogProps {
  part: SparePart;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const getTransactionTypeVariant = (type: SparePartLog['transactionType']) => {
    switch(type) {
        case 'Usage': return 'destructive';
        case 'Restock': return 'secondary';
        case 'Adjustment': return 'outline';
        default: return 'default';
    }
}

const getUserName = (userId: string) => allUsers.find(u => u.uid === userId)?.name || 'Unknown User';

export function SparePartsLogDialog({ part, isOpen, onOpenChange }: SparePartsLogDialogProps) {
  const log = mockSparePartsLog.filter(l => l.partId === part.partId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Transaction Log: {part.name}</DialogTitle>
          <DialogDescription>
            An immutable audit trail for all transactions involving this spare part.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border mt-4 max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qty Change</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Related ID</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.length > 0 ? (
                log
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(entry => (
                    <TableRow key={entry.logId}>
                      <TableCell className="font-mono text-xs">{format(new Date(entry.date), 'PPP p')}</TableCell>
                      <TableCell>
                        <Badge variant={getTransactionTypeVariant(entry.transactionType)}>{entry.transactionType}</Badge>
                      </TableCell>
                      <TableCell className={cn("font-mono", entry.quantityChange > 0 ? 'text-green-600' : 'text-red-600')}>
                        {entry.quantityChange > 0 ? `+${entry.quantityChange}` : entry.quantityChange}
                      </TableCell>
                      <TableCell>{getUserName(entry.userId)}</TableCell>
                      <TableCell>{entry.workOrderId || entry.purchaseOrderId || 'N/A'}</TableCell>
                      <TableCell>{entry.notes}</TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No transaction history found for this part.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

