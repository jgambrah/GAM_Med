

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
import { AccountsPayableDashboard } from './components/accounts-payable-dashboard';
import { FinancialReportsDashboard } from './components/financial-reports-dashboard';
import { RadiologyDashboard } from './components/radiology-dashboard';
import { UserManagementDashboard } from './components/user-management-dashboard';
import { SecurityDashboard } from './components/security-dashboard';

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
          <TabsTrigger value="radiology-scheduling">Radiology Scheduling</TabsTrigger>
          <TabsTrigger value="discharge-processing">Discharge Processing</TabsTrigger>
          <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
          <TabsTrigger value="ap">Accounts Payable</TabsTrigger>
          <TabsTrigger value="payroll">
              <Link href="/dashboard/payroll">Payroll</Link>
          </TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="user-management">User Management</TabsTrigger>
           <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="global-alerts">Global Alerts</TabsTrigger>
          <TabsTrigger value="staff-schedules">Staff Schedules</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="assets">Asset Management</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>
         <TabsContent value="inpatient-admissions" className="mt-4">
            <InpatientAdmissionDashboard />
        </TabsContent>
        <TabsContent value="outpatient-checkin" className="mt-4">
          <OutpatientCheckinDashboard />
        </TabsContent>
        <TabsContent value="radiology-scheduling" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Radiology Order Scheduling</CardTitle>
              <CardDescription>
                Manage and schedule incoming radiology orders. This page is accessible to all reception and radiology staff.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
              <Button asChild className="mt-4">
                <Link href="/dashboard/radiology">
                  Go to Radiology Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="discharge-processing" className="mt-4">
            <DischargeDashboard />
        </TabsContent>
        <TabsContent value="ar" className="mt-4">
            <BillingDashboard />
        </TabsContent>
        <TabsContent value="ap" className="mt-4">
            <AccountsPayableDashboard />
        </TabsContent>
         <TabsContent value="payroll" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Payroll Management</CardTitle>
                    <CardDescription>
                        Run and manage staff payroll. This page is accessible to all finance and HR staff.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <Button asChild className="mt-4">
                        <Link href="/dashboard/payroll">
                            Go to Payroll Dashboard
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
            <FinancialReportsDashboard />
        </TabsContent>
        <TabsContent value="chart-of-accounts" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Chart of Accounts Management</CardTitle>
                    <CardDescription>
                        View the complete Chart of Accounts. This page is accessible to all finance staff.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <Button asChild className="mt-4">
                        <Link href="/dashboard/admin/chart-of-accounts">
                            View Full Chart of Accounts
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="user-management" className="mt-4">
            <UserManagementDashboard />
        </TabsContent>
         <TabsContent value="credentials" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Staff Credentialing</CardTitle>
                    <CardDescription>
                        Monitor and manage staff licenses and certifications to ensure compliance.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                    <Button asChild className="mt-4">
                        <Link href="/dashboard/admin/credentials">
                            Go to Credentials Dashboard
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="global-alerts" className="mt-4">
            <GlobalAlertsDashboard />
        </TabsContent>
        <TabsContent value="staff-schedules" className="mt-4">
          <StaffScheduleDashboard />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
            <SecurityDashboard />
        </TabsContent>
        <TabsContent value="assets" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Asset & Facilities Management</CardTitle>
                    <CardDescription>
                        View and manage all hospital assets, equipment, and maintenance schedules.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">The asset dashboard will be available here soon.</p>
                        <Button asChild className="mt-4">
                            <Link href="/dashboard/admin/resources">
                                Go to Asset Management
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
