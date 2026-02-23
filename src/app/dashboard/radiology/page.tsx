
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
import { RadiologyOrder, Patient } from '@/lib/types';
import { mockRadiologyOrders, allPatients as initialPatients } from '@/lib/data';

export default function RadiologyPage() {
  const { user } = useAuth();
  const isRadiologist = user?.role === 'radiologist';

  // Centralize state management for orders
  const [storedOrders, setStoredOrders] = useLocalStorage<RadiologyOrder[]>(
    'radiologyOrders',
    mockRadiologyOrders
  );
  const [allPatients] = useLocalStorage<Patient[]>('patients', initialPatients);

  // SaaS LOGIC: Always filter by hospitalId first to enforce logical isolation.
  const hospitalOrders = React.useMemo(() => {
    if (!user) return [];
    return storedOrders.filter(order => order.hospitalId === user.hospitalId);
  }, [storedOrders, user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Radiology Dashboard</h1>
        <p className="text-muted-foreground">
          Manage imaging orders, scheduling, and reporting for your facility.
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
                        All imaging orders awaiting scheduling.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SchedulingQueueDashboard orders={hospitalOrders} setOrders={setStoredOrders} />
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="full-schedule" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Radiology Schedule</CardTitle>
                    <CardDescription>
                        Today's timeline of scheduled studies.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadiologyScheduleDashboard orders={hospitalOrders} setOrders={setStoredOrders} allPatients={allPatients} />
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
                        ? "Studies assigned to you awaiting a report."
                        : "Performed studies awaiting a radiologist's report."
                      }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ReportingQueueDashboard allPatients={allPatients} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
