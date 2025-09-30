
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
import { format, parseISO } from 'date-fns';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LedgerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.accountId as string;

  const [accounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);
  const [entries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', mockLedgerEntries);
  
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const account = accounts.find((acc) => acc.accountId === accountId);
  
  const filteredAccountEntries = React.useMemo(() => {
    return entries
        .filter((entry) => entry.accountId === accountId)
        .filter((entry) => {
            if (!startDate && !endDate) return true;
            const entryDate = parseISO(entry.date);
            if (startDate && entryDate < parseISO(startDate)) return false;
            if (endDate && entryDate > parseISO(endDate)) return false;
            return true;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entries, accountId, startDate, endDate]);


  if (!account) {
    notFound();
  }

  const handlePrint = () => {
    window.print();
  };

  const getOpeningBalance = () => {
        // This is a simplification. A real opening balance would be calculated
        // based on transactions before the first one displayed.
        const isDebitType = ['Asset', 'Expense'].includes(account.accountType);
        const firstEntry = filteredAccountEntries[0];
        if (!firstEntry) return account.balance;

        const firstEntryChange = (firstEntry.debit || 0) - (firstEntry.credit || 0);
        return isDebitType ? (account.balance - firstEntryChange) : (account.balance + firstEntryChange);
  }

  // A more accurate running balance calculation
   const entriesWithBalance = filteredAccountEntries.reduce((acc, entry) => {
    const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
    const isDebitType = ['Asset', 'Expense'].includes(account.accountType);
    const change = (entry.debit || 0) - (entry.credit || 0);
    const newBalance = prevBalance + (isDebitType ? change : -change);

    acc.push({ ...entry, balance: newBalance });
    return acc;
  }, [] as (LedgerEntry & { balance: number })[]).reverse(); // Show most recent first


  const openingBalance = getOpeningBalance();

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
        <div className="flex items-end gap-4">
            <div className="grid gap-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
             <div className="grid gap-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print Ledger
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            A log of all debits and credits for this account. Current balance: <strong>₵{account.balance.toFixed(2)}</strong>
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
                            No transactions found for this period.
                        </TableCell>
                    </TableRow>
                )}
                 <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={4} className="text-right">Opening Balance</TableCell>
                    <TableCell className="text-right font-mono">₵{openingBalance.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
