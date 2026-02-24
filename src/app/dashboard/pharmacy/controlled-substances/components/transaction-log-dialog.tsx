
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
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { History, Loader2, User, UserCheck } from 'lucide-react';
import Link from 'next/link';

interface TransactionLogDialogProps {
  substance: ControlledSubstance;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const getTransactionTypeVariant = (type: ControlledSubstanceLog['transactionType']): "default" | "secondary" | "destructive" | "outline" => {
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

/**
 * == Tamper-Proof Audit Trail ==
 * 
 * Displays an immutable chronological log of every movement for a controlled substance.
 * Enforces logical isolation via the hospitalId wall.
 */
export function TransactionLogDialog({ substance, isOpen, onOpenChange }: TransactionLogDialogProps) {
  const { user } = useAuth();
  const firestore = useFirestore();

  // LIVE QUERY: Fetch history for THIS substance in THIS facility
  const logQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId || !substance.substanceId) return null;
    return query(
        collection(firestore, 'controlled_substance_logs'),
        where('hospitalId', '==', user.hospitalId),
        where('substanceId', '==', substance.substanceId),
        orderBy('date', 'desc'),
        limit(50)
    );
  }, [firestore, user?.hospitalId, substance.substanceId]);

  const { data: logs, isLoading } = useCollection<ControlledSubstanceLog>(logQuery);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <History className="h-5 w-5" />
            <DialogTitle>Chain of Custody: {substance.name}</DialogTitle>
          </div>
          <DialogDescription>
            Permanent, legal audit trail for {substance.strength} {substance.form}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 rounded-xl border overflow-hidden shadow-inner bg-muted/5">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase pl-6">Timestamp</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Action</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Delta</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Balance</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Clinician</TableHead>
                <TableHead className="text-[10px] font-black uppercase pr-6 text-right">Context</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
              ) : logs && logs.length > 0 ? (
                logs.map(entry => (
                    <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-[10px] pl-6 text-muted-foreground">
                        {format(new Date(entry.date), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTransactionTypeVariant(entry.transactionType)} className="text-[9px] uppercase font-black tracking-widest px-2 py-0">
                            {entry.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("font-black font-mono text-right text-xs", entry.quantityChange > 0 ? 'text-green-600' : 'text-red-600')}>
                        {entry.quantityChange > 0 ? `+${entry.quantityChange}` : entry.quantityChange}
                      </TableCell>
                      <TableCell className="font-black font-mono text-right text-xs bg-muted/30">{entry.currentQuantity}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-[10px] font-bold">
                                <User className="h-2.5 w-2.5" /> {entry.userId.split('_')[1] || 'Primary'}
                            </div>
                            {entry.witnessId && (
                                <div className="flex items-center gap-1 text-[9px] font-bold text-orange-600">
                                    <UserCheck className="h-2.5 w-2.5" /> Witness: {entry.witnessId.split('_')[1]}
                                </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="max-w-[150px] ml-auto">
                            <p className="text-[10px] text-muted-foreground italic truncate">"{entry.reason}"</p>
                            {entry.patientId && (
                                <p className="text-[9px] font-black text-primary uppercase mt-0.5">Pt: {entry.patientId.split('_MRN')[1]}</p>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                    No secure log entries found for this substance.
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
