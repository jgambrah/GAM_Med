
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
import { BillingDashboard } from './components/billing-dashboard';

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
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="inpatient-admissions">Inpatient Admissions</TabsTrigger>
          <TabsTrigger value="outpatient-checkin">Outpatient Check-in</TabsTrigger>
          <TabsTrigger value="discharge-processing">Discharge Processing</TabsTrigger>
          <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
          <TabsTrigger value="global-alerts">Global Alerts</TabsTrigger>
          <TabsTrigger value="staff-schedules">Staff Schedules</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
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
        <TabsContent value="ar" className="mt-4">
            <BillingDashboard />
        </TabsContent>
         <TabsContent value="global-alerts" className="mt-4">
            <GlobalAlertsDashboard />
        </TabsContent>
        <TabsContent value="staff-schedules" className="mt-4">
          <StaffScheduleDashboard />
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
        <TabsContent value="pricing" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Pricing Management</CardTitle>
                    <CardDescription>
                        View and manage flexible pricing tiers and rate cards for different patient types.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">The pricing management dashboard will be available here.</p>
                        <Button asChild className="mt-4">
                            <Link href="/dashboard/admin/pricing">
                                Go to Pricing Management
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
