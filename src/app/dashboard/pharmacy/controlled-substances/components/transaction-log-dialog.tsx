
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ControlledSubstance, ControlledSubstanceLog } from '@/lib/types';
import { mockControlledSubstanceLog, allUsers } from '@/lib/data';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface TransactionLogDialogProps {
  substance: ControlledSubstance;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const getTransactionTypeVariant = (type: ControlledSubstanceLog['transactionType']) => {
    switch(type) {
        case 'Dispense':
        case 'Waste':
            return 'destructive';
        case 'Restock':
            return 'secondary';
        case 'Audit':
        case 'Adjustment':
            return 'outline';
        default:
            return 'default';
    }
}

const getUserName = (userId: string) => allUsers.find(u => u.uid === userId)?.name || 'Unknown User';

export function TransactionLogDialog({ substance, isOpen, onOpenChange }: TransactionLogDialogProps) {
  const log = mockControlledSubstanceLog.filter(l => l.substanceId === substance.substanceId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Transaction Log: {substance.name} ({substance.strength})</DialogTitle>
          <DialogDescription>
            An immutable audit trail for all transactions involving this substance.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qty Change</TableHead>
                <TableHead>New Balance</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Reason</TableHead>
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
                      <TableCell className="font-mono">{entry.currentQuantity}</TableCell>
                      <TableCell>{getUserName(entry.userId)}</TableCell>
                      <TableCell>
                        {entry.patientId ? (
                            <Link href={`/dashboard/patients/${entry.patientId}`} className="hover:underline text-primary">
                                {entry.patientId}
                            </Link>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>{entry.reason}</TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No transaction history found for this item.
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
