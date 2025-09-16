'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { mockLedgerAccounts, allBeds, allAdmissions, allUsers, mockLeaveRequests } from '@/lib/data';
import { differenceInDays, parseISO } from 'date-fns';

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
   admissions: {
    label: "Admissions",
     color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const mockMonthlyPerformance = [
    { month: "Jan", revenue: 186000, expenses: 80000 },
    { month: "Feb", revenue: 305000, expenses: 200000 },
    { month: "Mar", revenue: 237000, expenses: 120000 },
    { month: "Apr", revenue: 73000, expenses: 190000 },
    { month: "May", revenue: 209000, expenses: 130000 },
    { month: "Jun", revenue: 214000, expenses: 140000 },
];

const mockAdmissionType = [
    { type: "Inpatient", count: allAdmissions.filter(a => a.type === 'Inpatient').length },
    { type: "Outpatient", count: allAdmissions.filter(a => a.type === 'Outpatient').length },
    { type: "Emergency", count: allAdmissions.filter(a => a.type === 'Emergency').length },
]

export function AdminDashboard() {
  const totalRevenue = mockLedgerAccounts.filter(a => a.accountType === 'Revenue').reduce((sum, acc) => sum + acc.balance, 0);
  const totalExpenses = mockLedgerAccounts.filter(a => a.accountType === 'Expense').reduce((sum, acc) => sum + acc.balance, 0);
  const netProfit = totalRevenue - totalExpenses;
  
  const totalBeds = allBeds.length;
  const occupiedBeds = allBeds.filter(b => b.status === 'occupied').length;
  const bedOccupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;
  
  const dischargedAdmissions = allAdmissions.filter(a => a.status === 'Discharged' && a.discharge_date);
  const totalLengthOfStay = dischargedAdmissions.reduce((sum, admission) => {
    const admissionDate = parseISO(admission.admission_date);
    const dischargeDate = parseISO(admission.discharge_date!);
    return sum + differenceInDays(dischargeDate, admissionDate);
  }, 0);
  const avgLengthOfStay = dischargedAdmissions.length > 0 ? totalLengthOfStay / dischargedAdmissions.length : 0;

  const totalStaff = allUsers.length;
  const onLeaveToday = mockLeaveRequests.filter(req => {
    const today = new Date();
    return new Date(req.startDate) <= today && new Date(req.endDate) >= today && req.status === 'Approved';
  }).length;

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <span className="text-sm text-muted-foreground">₵</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">All-time revenue</p>
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
                    <p className="text-xs text-muted-foreground">All-time profitability</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bed Occupancy Rate</CardTitle>
                    <span className="text-sm text-muted-foreground">%</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{bedOccupancyRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">{occupiedBeds} of {totalBeds} beds occupied</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Length of Stay</CardTitle>
                    <span className="text-sm text-muted-foreground">Days</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{avgLengthOfStay.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">Based on discharged patients</p>
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
                    <CardTitle>Admissions by Type</CardTitle>
                    <CardDescription>A summary of total admissions by type.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                        <BarChart data={mockAdmissionType} layout="vertical">
                        <CartesianGrid horizontal={false} />
                        <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} />
                        <XAxis type="number" hide />
                        <ChartTooltip
                            content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="count" fill="var(--color-admissions)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalStaff}</div>
                     <p className="text-xs text-muted-foreground">Total number of active employees.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Staff on Leave Today</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{onLeaveToday}</div>
                    <p className="text-xs text-muted-foreground">Staff currently on approved leave.</p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
