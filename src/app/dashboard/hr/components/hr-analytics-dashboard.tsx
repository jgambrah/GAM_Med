
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, LabelList, Line, LineChart } from 'recharts';
import { allUsers, mockLeaveRequests } from '@/lib/data';
import { format } from 'date-fns';

const chartConfig: ChartConfig = {
  count: {
    label: 'Staff Count',
  },
  leave: {
    label: 'Leave Requests'
  }
};

export function HrAnalyticsDashboard() {
  const staffByDepartment = React.useMemo(() => {
    const counts: Record<string, number> = {};
    allUsers.forEach(user => {
      if (user.department) {
        counts[user.department] = (counts[user.department] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, []);

  const leaveByMonth = React.useMemo(() => {
    const counts: Record<string, number> = {};
    mockLeaveRequests.forEach(req => {
      const month = format(new Date(req.requestedAt), 'MMM yyyy');
      counts[month] = (counts[month] || 0) + 1;
    });
    return Object.entries(counts)
        .map(([month, count]) => ({ month, count }))
        .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, []);
  
  const totalStaff = allUsers.length;
  const onLeaveToday = mockLeaveRequests.filter(req => {
    const today = new Date();
    return new Date(req.startDate) <= today && new Date(req.endDate) >= today && req.status === 'Approved';
  }).length;
  const staffByRole = allUsers.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader>
                    <CardTitle>Total Staff</CardTitle>
                    <CardDescription>Total number of active employees.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{totalStaff}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Staff on Leave</CardTitle>
                    <CardDescription>Number of staff currently on approved leave.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{onLeaveToday}</div>
                </CardContent>
            </Card>
             <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Headcount by Role</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-x-6 gap-y-4">
                    {Object.entries(staffByRole).map(([role, count]) => (
                         <div key={role}>
                            <p className="text-sm font-medium capitalize text-muted-foreground">{role.replace('_', ' ')}</p>
                            <p className="text-2xl font-bold">{count}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
             <Card>
                <CardHeader>
                    <CardTitle>Staff Distribution by Department</CardTitle>
                    <CardDescription>Number of employees in each department.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="min-h-[300px]">
                        <BarChart data={staffByDepartment} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={8}>
                                <LabelList
                                    position="top"
                                    offset={12}
                                    className="fill-foreground"
                                    fontSize={12}
                                />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Leave Request Trends</CardTitle>
                    <CardDescription>Number of leave requests submitted per month.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ChartContainer config={chartConfig} className="min-h-[300px]">
                        <LineChart data={leaveByMonth}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                            <Line dataKey="count" type="monotone" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
