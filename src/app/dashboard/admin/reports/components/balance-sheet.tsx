
'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { mockLedgerAccounts } from '@/lib/data';

interface ReportProps {
  period: string;
}

const formatCurrency = (amount: number) => {
    return `₵ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const SectionRow = ({ title, isSub = false, isTotal = false }: { title: string, isSub?: boolean, isTotal?: boolean }) => (
    <TableRow className={isTotal ? 'bg-muted/50 font-bold' : ''}>
        <TableCell className={`${isSub ? 'pl-8' : 'font-semibold'} ${isTotal ? 'text-right' : ''}`}>
            {title}
        </TableCell>
        <TableCell></TableCell>
        <TableCell></TableCell>
    </TableRow>
);

const DataRow = ({ label, value }: { label: string, value: number }) => (
    <TableRow>
        <TableCell className="pl-12">{label}</TableCell>
        <TableCell className="text-right font-mono">{formatCurrency(value)}</TableCell>
        <TableCell></TableCell>
    </TableRow>
);

const TotalRow = ({ label, value }: { label: string, value: number }) => (
     <TableRow className="border-t-2 border-primary font-bold text-md">
        <TableCell>{label}</TableCell>
        <TableCell></TableCell>
        <TableCell className="text-right font-mono">{formatCurrency(value)}</TableCell>
    </TableRow>
)


export function BalanceSheet({ period }: ReportProps) {
    const assets = mockLedgerAccounts.filter(acc => acc.accountType === 'Asset' && acc.isSubLedger);
    const liabilities = mockLedgerAccounts.filter(acc => acc.accountType === 'Liability' && acc.isSubLedger);
    const equity = mockLedgerAccounts.filter(acc => acc.accountType === 'Equity' && !acc.isSubLedger);

    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
    const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return (
    <div className="rounded-md border">
        <Table>
            <TableBody>
                <SectionRow title="Assets" />
                {assets.map(acc => <DataRow key={acc.accountId} label={acc.accountName} value={acc.balance} />)}
                <TotalRow label="Total Assets" value={totalAssets} />

                <SectionRow title="Liabilities" />
                {liabilities.map(acc => <DataRow key={acc.accountId} label={acc.accountName} value={acc.balance} />)}
                <SectionRow title="Total Liabilities" isSub isTotal value={totalLiabilities}/>

                <SectionRow title="Equity" />
                {equity.map(acc => <DataRow key={acc.accountId} label={acc.accountName} value={acc.balance} />)}
                <SectionRow title="Total Equity" isSub isTotal value={totalEquity}/>
                
                <TotalRow label="Total Liabilities & Equity" value={totalLiabilitiesAndEquity} />

                 {totalAssets.toFixed(2) !== totalLiabilitiesAndEquity.toFixed(2) && (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center text-destructive font-bold p-4">
                            The Balance Sheet is out of balance. Assets do not equal Liabilities + Equity.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );
}
