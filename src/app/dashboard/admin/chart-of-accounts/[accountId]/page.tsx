
'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Printer } from 'lucide-react';
import { mockLedgerAccounts, mockLedgerEntries } from '@/lib/data';
import { LedgerAccount, LedgerEntry } from '@/lib/types';
import { format } from 'date-fns';

export default function LedgerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.accountId as string;

  const account = mockLedgerAccounts.find((acc) => acc.accountId === accountId);
  const entries = mockLedgerEntries
    .filter((entry) => entry.accountId === accountId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (!account) {
    notFound();
  }

  const handlePrint = () => {
    window.print();
  };

  let runningBalance = account.balance;
  const entriesWithBalance = entries.map(entry => {
    runningBalance += (entry.debit || 0) - (entry.credit || 0);
    return { ...entry, balance: runningBalance };
  }).reverse(); // Show most recent first

  return (
    <div className="space-y-6 print:space-y-2">
       <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none;
          }
        }
      `}</style>
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
            <div>
                <h1 className="text-3xl font-bold">Ledger Details: {account.accountName}</h1>
                <p className="text-muted-foreground">
                    A detailed transaction history for account code: {account.accountCode}
                </p>
            </div>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print Ledger
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            A log of all debits and credits for this account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entriesWithBalance.length > 0 ? (
                    entriesWithBalance.map((entry) => (
                        <TableRow key={entry.entryId}>
                            <TableCell>{format(new Date(entry.date), 'PPP')}</TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell className="text-right font-mono">{entry.debit ? `₵${entry.debit.toFixed(2)}` : '-'}</TableCell>
                            <TableCell className="text-right font-mono">{entry.credit ? `₵${entry.credit.toFixed(2)}` : '-'}</TableCell>
                            <TableCell className="text-right font-mono">₵{entry.balance.toFixed(2)}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No transactions found for this account.
                        </TableCell>
                    </TableRow>
                )}
                 <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={4} className="text-right">Opening Balance</TableCell>
                    <TableCell className="text-right font-mono">₵{account.balance.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
