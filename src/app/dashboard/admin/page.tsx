
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InpatientAdmissionDashboard } from './components/inpatient-admission-dashboard';
import { DischargeDashboard } from './components/discharge-dashboard';
import { GlobalAlertsDashboard } from './components/global-alerts-dashboard';
import { OutpatientCheckinDashboard } from './components/outpatient-checkin-dashboard';
import { StaffScheduleDashboard } from './components/staff-schedule-dashboard';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WaitingListDashboard } from './components/waiting-list-dashboard';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">
          Tools for administrative and reception staff.
        </p>
      </div>

      <Tabs defaultValue="inpatient-admissions">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="inpatient-admissions">Inpatient Admissions</TabsTrigger>
          <TabsTrigger value="outpatient-checkin">Outpatient Check-in</TabsTrigger>
          <TabsTrigger value="discharge-processing">Discharge Processing</TabsTrigger>
          <TabsTrigger value="global-alerts">Global Alerts</TabsTrigger>
          <TabsTrigger value="staff-schedules">Staff Schedules</TabsTrigger>
          <TabsTrigger value="waiting-list">Waiting List</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>
         <TabsContent value="inpatient-admissions" className="mt-4">
            <InpatientAdmissionDashboard />
        </TabsContent>
        <TabsContent value="outpatient-checkin" className="mt-4">
          <OutpatientCheckinDashboard />
        </TabsContent>
        <TabsContent value="discharge-processing" className="mt-4">
            <DischargeDashboard />
        </TabsContent>
         <TabsContent value="global-alerts" className="mt-4">
            <GlobalAlertsDashboard />
        </TabsContent>
        <TabsContent value="staff-schedules" className="mt-4">
          <StaffScheduleDashboard />
        </TabsContent>
         <TabsContent value="waiting-list" className="mt-4">
            <WaitingListDashboard />
        </TabsContent>
        <TabsContent value="resources" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Resource Management</CardTitle>
                    <CardDescription>
                        This section is under development. Click the button to view the resource catalog.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">The resource dashboard will be available here soon.</p>
                        <Button asChild className="mt-4">
                            <Link href="/dashboard/admin/resources">
                                Go to Resource Management
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
