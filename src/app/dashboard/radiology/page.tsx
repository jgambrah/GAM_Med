'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadiologyDashboard } from '../admin/components/radiology-dashboard';
import { ReportingQueueDashboard } from './components/reporting-queue-dashboard';

export default function RadiologyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Radiology Dashboard</h1>
        <p className="text-muted-foreground">
          Manage imaging orders, scheduling, and reporting.
        </p>
      </div>
      <Tabs defaultValue="scheduling">
        <TabsList>
            <TabsTrigger value="scheduling">Scheduling Queue</TabsTrigger>
            <TabsTrigger value="reporting">Reporting Queue</TabsTrigger>
        </TabsList>
        <TabsContent value="scheduling" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Radiology Scheduling Queue</CardTitle>
                    <CardDescription>
                        A real-time list of all imaging orders awaiting scheduling.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadiologyDashboard />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="reporting" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Radiologist Reporting Queue</CardTitle>
                    <CardDescription>
                        A list of all studies that have been performed and are awaiting a report.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ReportingQueueDashboard />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
