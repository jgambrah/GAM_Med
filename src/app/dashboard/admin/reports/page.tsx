'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BalanceSheet } from './components/balance-sheet';
import { IncomeStatement } from './components/income-statement';
import { CashFlowStatement } from './components/cash-flow-statement';
import { TrialBalance } from './components/trial-balance';
import { ChartOfAccountsTable } from '../components/chart-of-accounts-table';
import { LedgerDetailTable } from './components/ledger-detail-table';
import { LedgerPostingDialog } from '../components/ledger-posting-dialog';

export default function FinancialReportsPage() {
  const [endDate, setEndDate] = React.useState('');
  const [isJournalOpen, setIsJournalOpen] = React.useState(false);

  React.useEffect(() => {
    // Set initial date only on the client side to avoid hydration mismatch
    setEndDate(new Date().toISOString().split('T')[0]);
  }, []);

  if (!endDate) {
    return null; // Or a loading skeleton
  }

  return (
    <>
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
           <LedgerPostingDialog
              isOpen={isJournalOpen}
              onOpenChange={setIsJournalOpen}
              trigger={
                 <Button variant="outline" className="self-end">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Journal Entry
                </Button>
              }
           />
        </div>
      </div>
      <Tabs defaultValue="income-statement">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow Statement</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="ledger">Ledger Details</TabsTrigger>
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
        <TabsContent value="chart-of-accounts" className="mt-4">
          <ChartOfAccountsTable hideHeader={true} />
        </TabsContent>
        <TabsContent value="ledger" className="mt-4">
          <LedgerDetailTable />
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
