

'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TaskQueue } from './components/task-queue';

export default function HousekeepingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Housekeeping Dashboard</h1>
        <p className="text-muted-foreground">
          A real-time list of all pending cleaning and maintenance tasks.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Task Queue</CardTitle>
          <CardDescription>
            These tasks have been automatically generated or requested by staff.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskQueue />
        </CardContent>
      </Card>
    </div>
  );
}
