
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { mockLedgerAccounts } from '@/lib/data';
import { LedgerAccount } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const formatCurrency = (amount: number) => `₵${amount.toFixed(2)}`;

function ReportSection({ title, description, accounts }: { title: string, description: string, accounts: LedgerAccount[] }) {
    const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Account Name</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.map(acc => (
                                <TableRow key={acc.accountId}>
                                    <TableCell>{acc.accountName}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(acc.balance)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter className="flex-col items-end space-y-2">
                 <div className="flex w-full justify-between font-bold text-lg border-t pt-2">
                    <span>Total {title}</span>
                    <span className="font-mono">{formatCurrency(total)}</span>
                </div>
                <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Generate Full Report (PDF)
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function FinancialReportsPage() {
  const assets = mockLedgerAccounts.filter(a => a.accountType === 'Asset' && !a.isSubLedger);
  const liabilities = mockLedgerAccounts.filter(a => a.accountType === 'Liability' && !a.isSubLedger);
  const equity = mockLedgerAccounts.filter(a => a.accountType === 'Equity' && !a.isSubLedger);
  const revenue = mockLedgerAccounts.filter(a => a.accountType === 'Revenue');
  const expenses = mockLedgerAccounts.filter(a => a.accountType === 'Expense' && !a.isSubLedger);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <p className="text-muted-foreground">
          Generate comprehensive financial statements for hospital administration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet</CardTitle>
          <CardDescription>A snapshot of the hospital's financial health, showing assets, liabilities, and equity.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ReportSection title="Assets" description="What the hospital owns." accounts={assets} />
          <ReportSection title="Liabilities" description="What the hospital owes." accounts={liabilities} />
          <ReportSection title="Equity" description="The net worth of the hospital." accounts={equity} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss (P&L) Statement</CardTitle>
          <CardDescription>An overview of revenues and expenses over a period.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
           <ReportSection title="Revenue" description="Income generated from services." accounts={revenue} />
           <ReportSection title="Expenses" description="Costs incurred to operate." accounts={expenses} />
        </CardContent>
      </Card>
    </div>
  );
}
