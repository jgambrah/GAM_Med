
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BalanceSheet } from './components/balance-sheet';
import { IncomeStatement } from './components/income-statement';
import { CashFlowStatement } from './components/cash-flow-statement';
import { TrialBalance } from './components/trial-balance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockLedgerAccounts } from '@/lib/data';
import { LedgerAccount } from '@/lib/types';


function LedgerAccountsList() {
  const accounts = mockLedgerAccounts;

  return (
     <Card>
        <CardHeader>
            <CardTitle>General Ledger</CardTitle>
            <CardDescription>A list of all ledger accounts and their current balances.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Account Code</TableHead>
                            <TableHead>Account Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {accounts.map(account => (
                            <TableRow key={account.accountId}>
                                <TableCell>{account.accountCode}</TableCell>
                                <TableCell className="font-medium">{account.accountName}</TableCell>
                                <TableCell>{account.accountType}</TableCell>
                                <TableCell className="text-right font-mono">₵{account.balance.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/dashboard/admin/chart-of-accounts/${account.accountId}`}>
                                            View Details
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  )
}

export default function FinancialReportsPage() {
  const [endDate, setEndDate] = React.useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Statements</h1>
          <p className="text-muted-foreground">
            Generate and review key financial statements for the selected period.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="grid gap-2">
            <Label htmlFor="end-date">As at</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-[180px]"
            />
          </div>
          <Button variant="outline" className="self-end">
            <Download className="h-4 w-4 mr-2" />
            Export All (PDF)
          </Button>
        </div>
      </div>
      <Tabs defaultValue="income-statement">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow Statement</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>
        <TabsContent value="income-statement" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Income Statement (Profit & Loss)</CardTitle>
                    <CardDescription>A summary of revenues and expenses for the period ending {endDate}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <IncomeStatement period={endDate} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="balance-sheet" className="mt-4">
             <Card>
                <CardHeader>
                    <CardTitle>Statement of Financial Position</CardTitle>
                    <CardDescription>A snapshot of the hospital's assets, liabilities, and equity as at {endDate}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <BalanceSheet period={endDate} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="cash-flow" className="mt-4">
             <Card>
                <CardHeader>
                    <CardTitle>Cash Flow Statement</CardTitle>
                    <CardDescription>A summary of cash movements from operating, investing, and financing activities for the period ending {endDate}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CashFlowStatement period={endDate} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="trial-balance" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Trial Balance</CardTitle>
                    <CardDescription>A list of all ledger accounts and their balances as at {endDate} to ensure debits equal credits.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TrialBalance period={endDate} />
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="ledger" className="mt-4">
            <LedgerAccountsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
