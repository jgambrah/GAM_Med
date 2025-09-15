
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { mockUtilityConsumption } from '@/lib/data';
import { format } from 'date-fns';

const chartConfig: ChartConfig = {
  consumption: {
    label: 'Consumption',
  },
  water: {
    label: 'Water (m³)',
    color: 'hsl(var(--chart-1))',
  },
  electricity: {
    label: 'Electricity (kWh)',
    color: 'hsl(var(--chart-2))',
  },
};

export function UtilitiesDashboard() {
  const dailyConsumption = React.useMemo(() => {
    const dataByDate: Record<string, { date: string, water?: number, electricity?: number }> = {};
    mockUtilityConsumption.forEach(log => {
      const date = format(new Date(log.date), 'MMM dd');
      if (!dataByDate[date]) {
        dataByDate[date] = { date };
      }
      if (log.type === 'Water') {
        dataByDate[date].water = log.consumption;
      }
      if (log.type === 'Electricity') {
        dataByDate[date].electricity = log.consumption;
      }
    });
    return Object.values(dataByDate).reverse();
  }, []);

  const totalWater = mockUtilityConsumption.filter(c => c.type === 'Water').reduce((sum, c) => sum + c.consumption, 0);
  const totalElectricity = mockUtilityConsumption.filter(c => c.type === 'Electricity').reduce((sum, c) => sum + c.consumption, 0);
  const avgDailyWater = totalWater / (dailyConsumption.length || 1);
  const avgDailyElectricity = totalElectricity / (dailyConsumption.length || 1);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Daily Consumption Trend</CardTitle>
                <CardDescription>Daily water and electricity usage for the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                    <BarChart accessibilityLayer data={dailyConsumption}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="water" fill="var(--color-water)" radius={4} />
                        <Bar dataKey="electricity" fill="var(--color-electricity)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Water Usage</CardTitle>
                <CardDescription>Summary of water consumption.</CardDescription>
            </CardHeader>
             <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-muted-foreground">Total Last 7 Days</p>
                    <p className="text-2xl font-bold">{totalWater.toFixed(2)} <span className="text-lg font-normal">m³</span></p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Avg. Daily Consumption</p>
                    <p className="text-2xl font-bold">{avgDailyWater.toFixed(2)} <span className="text-lg font-normal">m³</span></p>
                </div>
             </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Electricity Usage</CardTitle>
                <CardDescription>Summary of electricity consumption.</CardDescription>
            </CardHeader>
             <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-muted-foreground">Total Last 7 Days</p>
                    <p className="text-2xl font-bold">{totalElectricity.toFixed(2)} <span className="text-lg font-normal">kWh</span></p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Avg. Daily Consumption</p>
                    <p className="text-2xl font-bold">{avgDailyElectricity.toFixed(2)} <span className="text-lg font-normal">kWh</span></p>
                </div>
             </CardContent>
        </Card>
    </div>
  );
}
