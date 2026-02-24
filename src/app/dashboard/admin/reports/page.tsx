
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
import { useLocalStorage } from '@/hooks/use-local-storage';
import { mockLedgerAccounts, mockLedgerEntries } from '@/lib/data';
import { LedgerAccount, LedgerEntry } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';

const PostingSchema = z.object({
  debitAccountId: z.string().min(1, 'Debit account is required.'),
  creditAccountId: z.string().min(1, 'Credit account is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero.'),
  description: z.string().min(3, 'Description is required.'),
  paymentMethod: z.enum(['Cheque', 'Bank Transfer']),
  chequeNumber: z.string().optional(),
}).refine(data => {
    return data.paymentMethod !== 'Cheque' || (data.chequeNumber && data.chequeNumber.length > 0);
}, {
    message: "Cheque number is required for this payment method.",
    path: ["chequeNumber"],
});


export default function FinancialReportsPage() {
  const { user } = useAuth();
  const [endDate, setEndDate] = React.useState('');
  const [isJournalOpen, setIsJournalOpen] = React.useState(false);
  const [accounts, setAccounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);
  const [entries, setEntries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', mockLedgerEntries);

  React.useEffect(() => {
    // Set initial date only on the client side to avoid hydration mismatch
    setEndDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handlePostToLedger = async (values: z.infer<typeof PostingSchema>) => {
    const { debitAccountId, creditAccountId, amount, paymentMethod, chequeNumber } = values;

    if (amount <= 0) {
        toast.success("Zero-amount transaction skipped.");
        return;
    }

    try {
        const now = new Date().toISOString();

        const debitAccount = accounts.find(a => a.accountId === debitAccountId);
        const creditAccount = accounts.find(a => a.accountId === creditAccountId);

        if (!debitAccount || !creditAccount) {
            toast.error("One or more accounts not found for ledger posting.");
            return;
        }
        
        let finalDescription = values.description;
        if (paymentMethod === 'Cheque' && chequeNumber) {
            finalDescription = `${finalDescription} (Cheque No: ${chequeNumber})`;
        } else if (paymentMethod === 'Bank Transfer') {
            finalDescription = `${finalDescription} (Bank Transfer)`;
        }

        const newDebitEntry: LedgerEntry = { hospitalId: user?.hospitalId || 'hosp-1', entryId: `entry-${Date.now()}-dr`, accountId: debitAccountId, date: now, description: finalDescription, debit: amount };
        const newCreditEntry: LedgerEntry = { hospitalId: user?.hospitalId || 'hosp-1', entryId: `entry-${Date.now()}-cr`, accountId: creditAccountId, date: now, description: finalDescription, credit: amount };
        
        setEntries(prev => [...prev, newDebitEntry, newCreditEntry]);

        setAccounts(prev => prev.map(acc => {
            let balanceChange = 0;
            if (acc.accountId === debitAccountId) {
                const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                balanceChange = isDebitType ? amount : -amount;
            } else if (acc.accountId === creditAccountId) {
                const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                balanceChange = isDebitType ? -amount : amount;
            }
            return balanceChange !== 0 ? { ...acc, balance: acc.balance + balanceChange } : acc;
        }));
        
        toast.success("Transaction Posted", { description: `${finalDescription} for ₵${amount.toFixed(2)}` });
    } catch (e) {
        console.error(e);
        toast.error("Failed to post transaction.", { description: 'An unknown error occurred.' });
    }
  };

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
              onPost={handlePostToLedger}
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
