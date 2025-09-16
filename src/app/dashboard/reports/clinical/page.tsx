
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, LabelList } from 'recharts';
import { mockInfectionReports, mockEfficacyReports, allAdmissions } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { InfectionDrilldownDialog } from './components/infection-drilldown-dialog';

const efficacyChartConfig: ChartConfig = {
  averageEfficacy: {
    label: 'Avg. Efficacy Rating (1-5)',
  },
};

export default function ClinicalReportsPage() {
  const [drilldownData, setDrilldownData] = React.useState<{ ward: string; count: number } | null>(null);

  const readmissionRate = React.useMemo(() => {
    const readmissions = allAdmissions.filter(a => a.readmissionFlag).length;
    const totalAdmissions = allAdmissions.length;
    return totalAdmissions > 0 ? (readmissions / totalAdmissions) * 100 : 0;
  }, []);
  
  const infectionReport = mockInfectionReports[0];
  const efficacyReports = mockEfficacyReports;

  // Placeholder for patient satisfaction data
  const patientSatisfactionScore = 88.5;

  return (
    <>
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Clinical Quality Dashboard</h1>
        <p className="text-muted-foreground">
            A high-level overview of key clinical performance indicators.
        </p>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader>
                    <CardTitle>30-Day Readmission Rate</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{readmissionRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                        Percentage of patients readmitted within 30 days of discharge.
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Infection Rate (per 1,000 Patient-Days)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{infectionReport.ratePer1000Days.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">
                        For {infectionReport.month}.
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Patient Satisfaction (CSAT)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{patientSatisfactionScore}%</div>
                     <p className="text-xs text-muted-foreground">
                        Based on post-discharge surveys.
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Total Infections (Last Month)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{infectionReport.infectionCount}</div>
                    <p className="text-xs text-muted-foreground">
                         In {infectionReport.month}.
                    </p>
                </CardContent>
            </Card>
       </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Infection Breakdown by Ward</CardTitle>
                    <CardDescription>
                        Number of hospital-acquired infections per ward for {infectionReport.month}. Click 'View' to drill down.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ward</TableHead>
                                    <TableHead className="text-right">Infection Count</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(infectionReport.breakdownByWard).map(([ward, count]) => (
                                    <TableRow key={ward}>
                                        <TableCell className="font-medium">{ward}</TableCell>
                                        <TableCell className="text-right font-mono">{count}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => setDrilldownData({ ward, count })}>
                                                View Cases
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle>Treatment Plan Efficacy</CardTitle>
                    <CardDescription>
                        Average efficacy rating for common treatment plans.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <ChartContainer config={efficacyChartConfig} className="min-h-[300px]">
                        <BarChart data={efficacyReports} accessibilityLayer layout="vertical" margin={{ left: 50 }}>
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="treatmentPlanTitle" type="category" tickLine={false} axisLine={false} className="text-xs"/>
                             <XAxis type="number" dataKey="averageEfficacy" domain={[0, 5]}/>
                            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                            <Bar dataKey="averageEfficacy" fill="hsl(var(--primary))" radius={4}>
                                <LabelList
                                    position="right"
                                    offset={8}
                                    className="fill-foreground"
                                    fontSize={12}
                                />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    </div>
     {drilldownData && (
        <InfectionDrilldownDialog
            ward={drilldownData.ward}
            count={drilldownData.count}
            isOpen={!!drilldownData}
            onOpenChange={() => setDrilldownData(null)}
        />
     )}
    </>
  );
}
