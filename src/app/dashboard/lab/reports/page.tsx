
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, LabelList, Line, LineChart, Pie, PieChart, Cell } from 'recharts';
import { mockLabReports } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const chartConfig: ChartConfig = {
    volume: {
        label: 'Tests Ordered',
    },
    avgTAT: {
        label: 'Avg. Turnaround (Hours)',
        color: 'hsl(var(--chart-1))'
    },
    abnormalPercentage: {
        label: 'Abnormal %'
    },
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function LabReportsPage() {
    // PRERENDER SAFETY: Provide a robust fallback for static generation.
    const reportData = (mockLabReports && mockLabReports.length > 0) ? mockLabReports[0] : {
        testVolumes: [],
        turnaroundTimes: [],
        abnormalResultTrends: []
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Laboratory Reports</h1>
                    <p className="text-muted-foreground">
                        Key performance indicators and analytics for the lab.
                    </p>
                </div>
                 <div className="w-full sm:w-[200px]">
                    <Select defaultValue="last-30-days">
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="last-24-hours">Last 24 Hours</SelectItem>
                            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                            <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Lab Test Volume</CardTitle>
                        <CardDescription>Number of tests ordered in the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="min-h-[300px]">
                            <BarChart data={reportData.testVolumes || []} accessibilityLayer>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="testName" tickLine={false} tickMargin={10} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                < Bar dataKey="volume" fill="hsl(var(--primary))" radius={8}>
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
                    <CardFooter>
                        <Button variant="outline" className="w-full">
                            <Download className="mr-2 h-4 w-4" />
                            Export Volume Report
                        </Button>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Abnormal Results Trend</CardTitle>
                        <CardDescription>Percentage of abnormal results by test type.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        <ChartContainer config={chartConfig} className="min-h-[300px]">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="testName" hideLabel />} />
                                <Pie 
                                    data={reportData.abnormalResultTrends || []} 
                                    dataKey="abnormalPercentage" 
                                    nameKey="testName" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={100} 
                                    label={({ name, abnormalPercentage }) => `${name.split(' ')[0]}: ${abnormalPercentage}%`}
                                >
                                     {(reportData.abnormalResultTrends || []).map((entry, index) => (
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
                    <CardTitle>Average Turnaround Time (TAT)</CardTitle>
                    <CardDescription>Average time from order to result completion (in hours).</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="min-h-[300px]">
                        <LineChart data={reportData.turnaroundTimes || []} accessibilityLayer
                          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="testName" tickLine={false} axisLine={false} />
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Line dataKey="avgTAT" type="monotone" stroke="var(--color-avgTAT)" strokeWidth={2} dot={{ fill: "var(--color-avgTAT)" }}>
                                <LabelList
                                    position="top"
                                    offset={12}
                                    className="fill-foreground"
                                    fontSize={12}
                                    formatter={(value: number) => `${value.toFixed(1)}h`}
                                />
                            </Line>
                        </LineChart>
                    </ChartContainer>
                </CardContent>
                 <CardFooter>
                    <Button variant="outline" className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Export TAT Report
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
