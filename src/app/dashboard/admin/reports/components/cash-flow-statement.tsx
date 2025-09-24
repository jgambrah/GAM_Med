
'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

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

export function CashFlowStatement({ period }: ReportProps) {
    // This is a simplified mock-up. A real cash flow statement is complex and derived from changes in balance sheet and income statement accounts.
    const netIncome = 70000;
    const depreciation = 15000;
    const changeInReceivables = -5000;
    const cashFromOps = netIncome + depreciation + changeInReceivables;
    
    const assetPurchases = -25000;
    const cashFromInvesting = assetPurchases;
    
    const loanPayments = -10000;
    const cashFromFinancing = loanPayments;
    
    const netCashFlow = cashFromOps + cashFromInvesting + cashFromFinancing;
    const beginningCash = 50000;
    const endingCash = beginningCash + netCashFlow;

  return (
    <div className="rounded-md border">
        <Table>
            <TableBody>
                <SectionRow title="Cash Flow from Operating Activities" />
                <DataRow label="Net Income" value={netIncome} />
                <DataRow label="Depreciation & Amortization" value={depreciation} />
                <DataRow label="Change in Accounts Receivable" value={changeInReceivables} />
                <TotalRow label="Net Cash from Operating Activities" value={cashFromOps} />

                <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>

                <SectionRow title="Cash Flow from Investing Activities" />
                <DataRow label="Purchase of Property & Equipment" value={assetPurchases} />
                <TotalRow label="Net Cash from Investing Activities" value={cashFromInvesting} />
                
                <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>

                <SectionRow title="Cash Flow from Financing Activities" />
                <DataRow label="Repayment of Loans" value={loanPayments} />
                <TotalRow label="Net Cash from Financing Activities" value={cashFromFinancing} />
                
                <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>

                <TotalRow label="Net Increase/(Decrease) in Cash" value={netCashFlow} />
                
                <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>
                
                <DataRow label="Cash at Beginning of Period" value={beginningCash} />
                <TotalRow label="Cash at End of Period" value={endingCash} isFinal />
            </TableBody>
        </Table>
    </div>
  );
}
