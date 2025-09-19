
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
import { mockLedgerAccounts, mockLedgerEntries, mockResources, mockClaims, mockRevenueByDepartment } from '@/lib/data';
import { LedgerAccount, LedgerEntry } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';

const formatCurrency = (amount: number) => `₵${amount.toFixed(2)}`;

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
   department: {
    label: "Department"
  }
} satisfies ChartConfig

const mockMonthlyPerformance = [
    { month: "Jan", revenue: 186000, expenses: 80000 },
    { month: "Feb", revenue: 305000, expenses: 200000 },
    { month: "Mar", revenue: 237000, expenses: 120000 },
    { month: "Apr", revenue: 73000, expenses: 190000 },
    { month: "May", revenue: 209000, expenses: 130000 },
    { month: "Jun", revenue: 214000, expenses: 140000 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];


function TrialBalanceTable({ startDate, endDate }: { startDate: string, endDate: string }) {
    const trialBalanceData = React.useMemo(() => {
        const balances = new Map<string, { debit: number; credit: number }>();
        
        mockLedgerAccounts.forEach(acc => {
            balances.set(acc.accountId, { debit: 0, credit: 0 });
        });

        const filteredEntries = mockLedgerEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start && entryDate < start) return false;
            if (end) {
                // Set end date to the end of the day for inclusive comparison
                end.setHours(23, 59, 59, 999);
                if(entryDate > end) return false;
            }
            return true;
        });

        filteredEntries.forEach(entry => {
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

    }, [startDate, endDate]);

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
                        {trialBalanceData.filter(item => item.debit > 0 || item.credit > 0).map(item => (
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
                    <span className={`font-mono ${totalDebit !== totalCredit ? 'text-destructive' : ''}`}>{formatCurrency(totalDebit)}</span>
                    <span className={`font-mono ${totalDebit !== totalCredit ? 'text-destructive' : ''}`}>{formatCurrency(totalCredit)}</span>
                </div>
            </div>
             {totalDebit !== totalCredit && <p className="text-destructive text-sm text-right">The debits and credits do not balance for the selected period.</p>}
        </div>
    );
}


export default function FinancialReportsPage() {
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  
  const totalRevenue = mockLedgerAccounts.filter(a => a.accountType === 'Revenue').reduce((sum, acc) => sum + acc.balance, 0);
  const totalExpenses = mockLedgerAccounts.filter(a => a.accountType === 'Expense').reduce((sum, acc) => sum + acc.balance, 0);
  const netProfit = totalRevenue - totalExpenses;
  const outstandingClaims = mockClaims.filter(c => c.status === 'Submitted').reduce((sum, claim) => sum + (claim.payoutAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold">Financial Dashboard</h1>
            <p className="text-muted-foreground">
            A high-level overview of the hospital's financial health and performance.
            </p>
        </div>
        <div className="flex items-center gap-4">
            <div className="grid gap-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
        </div>
      </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                Total Revenue
                </CardTitle>
                <span className="text-sm text-muted-foreground">₵</span>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                All-time revenue from all services
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                Total Expenses
                </CardTitle>
                 <span className="text-sm text-muted-foreground">₵</span>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">
                All-time operational expenses
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit / Loss</CardTitle>
                 <span className="text-sm text-muted-foreground">₵</span>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(netProfit)}
                </div>
                 <p className="text-xs text-muted-foreground">
                All-time profitability
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Claims</CardTitle>
                 <span className="text-sm text-muted-foreground">₵</span>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(outstandingClaims)}</div>
                 <p className="text-xs text-muted-foreground">
                Total value of submitted claims awaiting payout
                </p>
            </CardContent>
            </Card>
        </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs. Expenses</CardTitle>
            <CardDescription>Monthly financial performance for the current year.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <BarChart data={mockMonthlyPerformance}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis
                  tickFormatter={(value) => `₵${value / 1000}k`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Revenue by Department</CardTitle>
                <CardDescription>A breakdown of revenue sources for the current fiscal year.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="min-h-[300px]">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="department" />} />
                        <Pie 
                            data={mockRevenueByDepartment} 
                            dataKey="revenue" 
                            nameKey="department" 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={100} 
                            label={({ name, revenue }) => `${name}: ${formatCurrency(revenue)}`}
                        >
                                {mockRevenueByDepartment.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Trial Balance</CardTitle>
          <CardDescription>A statement of all debits and credits in the double-entry accounting system for the selected period to verify their equality.</CardDescription>
        </CardHeader>
        <CardContent>
           <TrialBalanceTable startDate={startDate} endDate={endDate} />
        </CardContent>
        <CardFooter>
            <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Full Financial Statements (PDF)
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
