

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffManagementDashboard } from './components/staff-management-dashboard';
import { PositionsDashboard } from './components/positions-dashboard';

export default function HumanResourcesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Human Resources</h1>
        <p className="text-muted-foreground">
          Manage staff profiles, positions, and other HR-related configurations.
        </p>
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
            <TabsTrigger value="staff">Staff Management</TabsTrigger>
            <TabsTrigger value="positions">Positions & Salaries</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="mt-4">
            <StaffManagementDashboard />
        </TabsContent>
        <TabsContent value="positions" className="mt-4">
            <PositionsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
