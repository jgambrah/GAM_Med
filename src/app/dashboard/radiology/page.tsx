
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadiologyDashboard } from '../admin/components/radiology-dashboard';

export default function RadiologyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Radiology Dashboard</h1>
        <p className="text-muted-foreground">
          Manage imaging orders and view results.
        </p>
      </div>
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
    </div>
  );
}
