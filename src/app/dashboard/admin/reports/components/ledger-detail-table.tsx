
'use client';

import * as React from 'react';
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
import { Printer } from 'lucide-react';
import { mockLedgerAccounts, mockLedgerEntries } from '@/lib/data';
import { LedgerAccount, LedgerEntry } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function LedgerDetailTable() {
  const [accounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);
  const [entries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', mockLedgerEntries);
  
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | undefined>(accounts[0]?.accountId);
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const account = accounts.find((acc) => acc.accountId === selectedAccountId);
  
  const filteredAccountEntries = React.useMemo(() => {
    if (!account) return [];
    return entries
        .filter((entry) => entry.accountId === account.accountId)
        .filter((entry) => {
            if (!startDate && !endDate) return true;
            const entryDate = parseISO(entry.date);
            if (startDate && entryDate < parseISO(startDate)) return false;
            if (endDate && entryDate > parseISO(endDate)) return false;
            return true;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entries, account, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };
  
  const getOpeningBalance = () => {
        if (!account) return 0;
        // This is a simplification. A real opening balance would be calculated
        // based on transactions before the first one displayed.
        const isDebitType = ['Asset', 'Expense'].includes(account.accountType);
        const firstEntry = filteredAccountEntries[0];
        if (!firstEntry) return account.balance;

        const firstEntryChange = (firstEntry.debit || 0) - (firstEntry.credit || 0);
        return isDebitType ? (account.balance - firstEntryChange) : (account.balance + firstEntryChange);
  }

  // A more accurate running balance calculation
   const entriesWithBalance = React.useMemo(() => {
    if (!account) return [];
    return filteredAccountEntries.reduce((acc, entry) => {
        const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : getOpeningBalance();
        const isDebitType = ['Asset', 'Expense'].includes(account.accountType);
        const change = (entry.debit || 0) - (entry.credit || 0);
        const newBalance = prevBalance + (isDebitType ? change : -change);

        acc.push({ ...entry, balance: newBalance });
        return acc;
    }, [] as (LedgerEntry & { balance: number })[]);
  }, [filteredAccountEntries, account]);


  const openingBalance = getOpeningBalance();

  return (
    <div className="space-y-6 print:space-y-2">
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
          }
           .no-print {
            display: none !important;
          }
        }
      `}</style>
      <Card>
        <CardHeader className="no-print">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="w-full sm:w-1/3">
                    <Label htmlFor="account-select">Select Ledger Account</Label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger id="account-select">
                            <SelectValue placeholder="Select an account..." />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map(acc => <SelectItem key={acc.accountId} value={acc.accountId}>{acc.accountName} ({acc.accountCode})</SelectItem>)}
                        </SelectContent>
                    </Select>
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
        </CardHeader>
        <div id="print-section">
            <CardHeader>
            <CardTitle>Transaction History: {account?.accountName || 'No Account Selected'}</CardTitle>
            <CardDescription>
                A log of all debits and credits for this account. Current balance: <strong>₵{account?.balance.toFixed(2)}</strong>
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
                    <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={4} className="text-right">Opening Balance</TableCell>
                        <TableCell className="text-right font-mono">₵{openingBalance.toFixed(2)}</TableCell>
                    </TableRow>
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
                </TableBody>
                </Table>
            </div>
            </CardContent>
        </div>
      </Card>
    </div>
  );
}

