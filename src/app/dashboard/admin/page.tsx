
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OutpatientCheckinDashboard } from './components/outpatient-checkin-dashboard';
import { InpatientAdmissionDashboard } from './components/inpatient-admission-dashboard';
import { DischargeDashboard } from './components/discharge-dashboard';
import { GlobalAlertsDashboard } from './components/global-alerts-dashboard';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">
          Tools for administrative and reception staff.
        </p>
      </div>

      <Tabs defaultValue="outpatient-checkin">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="outpatient-checkin">Outpatient Check-in</TabsTrigger>
          <TabsTrigger value="inpatient-admissions">Inpatient Admissions</TabsTrigger>
          <TabsTrigger value="discharge-processing">Discharge Processing</TabsTrigger>
          <TabsTrigger value="global-alerts">Global Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="outpatient-checkin" className="mt-4">
            <OutpatientCheckinDashboard />
        </TabsContent>
         <TabsContent value="inpatient-admissions" className="mt-4">
            <InpatientAdmissionDashboard />
        </TabsContent>
        <TabsContent value="discharge-processing" className="mt-4">
            <DischargeDashboard />
        </TabsContent>
         <TabsContent value="global-alerts" className="mt-4">
            <GlobalAlertsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
