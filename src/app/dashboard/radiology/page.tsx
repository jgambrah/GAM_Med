
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SchedulingQueueDashboard } from './components/scheduling-queue-dashboard';
import { ReportingQueueDashboard } from './components/reporting-queue-dashboard';
import { RadiologyScheduleDashboard } from './components/radiology-schedule-dashboard';
import { useAuth } from '@/hooks/use-auth';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { RadiologyOrder } from '@/lib/types';
import { mockRadiologyOrders } from '@/lib/data';

export default function RadiologyPage() {
  const { user } = useAuth();
  const isRadiologist = user?.role === 'radiologist';

  // Centralize the state management for radiology orders here.
  const [orders, setOrders] = useLocalStorage<RadiologyOrder[]>(
    'radiologyOrders',
    mockRadiologyOrders
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Radiology Dashboard</h1>
        <p className="text-muted-foreground">
          Manage imaging orders, scheduling, and reporting.
        </p>
      </div>
      <Tabs defaultValue="scheduling-queue">
        <TabsList>
            <TabsTrigger value="scheduling-queue">Scheduling Queue</TabsTrigger>
            <TabsTrigger value="full-schedule">Full Schedule</TabsTrigger>
            <TabsTrigger value="reporting-queue">
              {isRadiologist ? 'My Worklist' : 'Reporting Queue'}
            </TabsTrigger>
        </TabsList>
        <TabsContent value="scheduling-queue" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Radiology Scheduling Queue</CardTitle>
                    <CardDescription>
                        A real-time list of all imaging orders awaiting scheduling.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SchedulingQueueDashboard orders={orders} setOrders={setOrders} />
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="full-schedule" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Radiology Schedule</CardTitle>
                    <CardDescription>
                        A timeline of all scheduled studies for today.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadiologyScheduleDashboard orders={orders} setOrders={setOrders} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="reporting-queue" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>
                      {isRadiologist ? 'My Reporting Worklist' : 'Radiologist Reporting Queue'}
                    </CardTitle>
                    <CardDescription>
                      {isRadiologist
                        ? "A list of all studies assigned to you that are awaiting a report."
                        : "A list of all studies that have been performed and are awaiting a report."
                      }
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
