'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockLedgerAccounts } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { LedgerAccount } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface ReportProps {
  period: string;
}

const formatCurrency = (amount: number) => {
    return amount !== 0 ? `₵ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
};

export function TrialBalance({ period }: ReportProps) {
    const { user } = useAuth();
    const [accounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);

    // SaaS LOGIC: Filter by hospitalId
    const hospitalAccounts = React.useMemo(() => {
        return accounts.filter(acc => acc.hospitalId === user?.hospitalId);
    }, [accounts, user?.hospitalId]);

    const debitAccountTypes = ['Asset', 'Expense'];
    
    let totalDebits = 0;
    let totalCredits = 0;

    const accountEntries = hospitalAccounts.map(acc => {
        const isDebit = debitAccountTypes.includes(acc.accountType);
        if (isDebit) {
            totalDebits += acc.balance;
        } else {
            totalCredits += Math.abs(acc.balance);
        }
        return {
            ...acc,
            debit: isDebit ? acc.balance : 0,
            credit: !isDebit ? acc.balance : 0,
        }
    });

  return (
    <div className="rounded-md border">
        <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Debit (₵)</TableHead>
                    <TableHead className="text-right">Credit (₵)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {accountEntries.length > 0 ? accountEntries.map(account => (
                    <TableRow key={account.accountId}>
                        <TableCell className="font-mono text-xs">{account.accountCode}</TableCell>
                        <TableCell className="font-medium text-sm">{account.accountName}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(account.debit)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(account.credit)}</TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No ledger balances found.</TableCell>
                    </TableRow>
                )}
            </TableBody>
            <TableFooter>
                <TableRow className="font-bold text-lg bg-muted/50">
                    <TableCell colSpan={2} className="text-right">Totals</TableCell>
                    <TableCell className="text-right font-mono">₵ {totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-mono">₵ {totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
                 {totalDebits.toFixed(2) !== totalCredits.toFixed(2) && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center text-destructive font-bold p-4">
                            The Trial Balance is out of balance. Total Debits do not equal Total Credits.
                        </TableCell>
                    </TableRow>
                )}
            </TableFooter>
        </Table>
    </div>
  );
}
