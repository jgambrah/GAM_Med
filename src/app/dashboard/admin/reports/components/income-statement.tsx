
'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { mockLedgerAccounts } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { LedgerAccount } from '@/lib/types';

interface ReportProps {
  period: string;
}

const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return amount < 0 ? `(₵ ${formatted})` : `₵ ${formatted}`;
};

const SectionRow = ({ title }: { title: string }) => (
    <TableRow>
        <TableCell className="font-semibold">{title}</TableCell>
        <TableCell></TableCell>
    </TableRow>
);

const DataRow = ({ label, value }: { label: string, value: number }) => (
    <TableRow>
        <TableCell className="pl-8">{label}</TableCell>
        <TableCell className="text-right font-mono">{formatCurrency(value)}</TableCell>
    </TableRow>
);

const TotalRow = ({ label, value, isFinal = false }: { label: string, value: number, isFinal?: boolean }) => (
     <TableRow className={`${isFinal ? 'border-t-2 border-primary' : 'border-t'} font-bold`}>
        <TableCell className="pl-8">{label}</TableCell>
        <TableCell className="text-right font-mono">{formatCurrency(value)}</TableCell>
    </TableRow>
)


export function IncomeStatement({ period }: ReportProps) {
    const [accounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);

    const revenueAccounts = accounts.filter(acc => acc.accountType === 'Revenue' && acc.isSubLedger);
    const expenseAccounts = accounts.filter(acc => acc.accountType === 'Expense' && acc.isSubLedger);

    const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const netIncome = totalRevenue - totalExpenses;
    
  return (
    <div className="rounded-md border">
        <Table>
            <TableBody>
                <SectionRow title="Revenue" />
                {revenueAccounts.map(acc => <DataRow key={acc.accountId} label={acc.accountName} value={acc.balance} />)}
                <TotalRow label="Total Revenue" value={totalRevenue} />

                <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>
                
                <SectionRow title="Expenses" />
                {expenseAccounts.map(acc => <DataRow key={acc.accountId} label={acc.accountName} value={-acc.balance} />)}
                <TotalRow label="Total Expenses" value={-totalExpenses} />
                
                <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>

                <TotalRow label="Net Income / (Loss)" value={netIncome} isFinal />
            </TableBody>
        </Table>
    </div>
  );
}
