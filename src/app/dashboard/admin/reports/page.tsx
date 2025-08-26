
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
import { mockLedgerAccounts, mockLedgerEntries } from '@/lib/data';
import { LedgerAccount, LedgerEntry } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const formatCurrency = (amount: number) => `₵${amount.toFixed(2)}`;

function ReportSection({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {children}
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Generate Full Report (PDF)
                </Button>
            </CardFooter>
        </Card>
    );
}

function AccountBalanceTable({ accounts }: { accounts: LedgerAccount[] }) {
    const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    return (
        <div className="space-y-2">
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
             <div className="flex w-full justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(total)}</span>
            </div>
        </div>
    );
}

function TrialBalanceTable() {
    const trialBalanceData = React.useMemo(() => {
        const balances = new Map<string, { debit: number; credit: number }>();

        mockLedgerAccounts.forEach(acc => {
            balances.set(acc.accountId, { debit: 0, credit: 0 });
        });

        mockLedgerEntries.forEach(entry => {
            const accBalance = balances.get(entry.accountId);
            if (accBalance) {
                if (entry.debit) accBalance.debit += entry.debit;
                if (entry.credit) accBalance.credit += entry.credit;
            }
        });
        
        return Array.from(balances.entries()).map(([accountId, {debit, credit}]) => {
            const account = mockLedgerAccounts.find(acc => acc.accountId === accountId)!;
            return {
                ...account,
                debit,
                credit
            };
        }).sort((a,b) => a.accountCode.localeCompare(b.accountCode));

    }, []);

    const totalDebit = trialBalanceData.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = trialBalanceData.reduce((sum, item) => sum + item.credit, 0);
    
    return (
         <div className="space-y-2">
            <div className="rounded-md border max-h-96 overflow-y-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-muted/50">
                        <TableRow>
                            <TableHead>Account</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {trialBalanceData.map(item => (
                            <TableRow key={item.accountId}>
                                <TableCell>
                                    <div className="font-medium">{item.accountName}</div>
                                    <div className="text-xs text-muted-foreground">{item.accountCode}</div>
                                </TableCell>
                                <TableCell className="text-right font-mono">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</TableCell>
                                <TableCell className="text-right font-mono">{item.credit > 0 ? formatCurrency(item.credit) : '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
             <div className="flex w-full justify-between font-bold text-lg border-t pt-2">
                <span>Totals</span>
                <div className="flex gap-4">
                    <span className="font-mono">{formatCurrency(totalDebit)}</span>
                    <span className="font-mono">{formatCurrency(totalCredit)}</span>
                </div>
            </div>
        </div>
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
          <CardTitle>Core Financial Statements</CardTitle>
          <CardDescription>An overview of the hospital's financial health and performance.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ReportSection title="Balance Sheet (Assets)" description="What the hospital owns.">
            <AccountBalanceTable accounts={assets} />
          </ReportSection>
           <ReportSection title="Balance Sheet (Liabilities)" description="What the hospital owes.">
            <AccountBalanceTable accounts={liabilities} />
          </ReportSection>
           <ReportSection title="Balance Sheet (Equity)" description="The net worth of the hospital.">
            <AccountBalanceTable accounts={equity} />
          </ReportSection>
          <ReportSection title="Profit & Loss (Revenue)" description="Income generated from services.">
             <AccountBalanceTable accounts={revenue} />
          </ReportSection>
           <ReportSection title="Profit & Loss (Expenses)" description="Costs incurred to operate.">
            <AccountBalanceTable accounts={expenses} />
          </ReportSection>
           <ReportSection title="Cash Flow Statement" description="Movement of cash from operations, investing, and financing.">
              <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">[Cash Flow Chart Placeholder]</p>
              </div>
          </ReportSection>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Trial Balance</CardTitle>
          <CardDescription>A statement of all debits and credits in the double-entry accounting system to verify their equality.</CardDescription>
        </CardHeader>
        <CardContent>
           <TrialBalanceTable />
        </CardContent>
      </Card>
    </div>
  );
}
