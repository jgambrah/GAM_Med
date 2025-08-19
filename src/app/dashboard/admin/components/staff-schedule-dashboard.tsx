
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { allUsers } from '@/lib/data';
import { ScheduleCalendar } from '../../my-schedule/components/schedule-calendar';

export function StaffScheduleDashboard() {
  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string | null>(null);
  const doctors = allUsers.filter(u => u.role === 'doctor');

  React.useEffect(() => {
    // Select the first doctor by default
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].uid);
    }
  }, [doctors, selectedDoctorId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Staff Schedule Viewer</CardTitle>
        <CardDescription>
          Select a doctor to view and manage their weekly schedule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs">
            <Label htmlFor="doctor-select">Select Doctor</Label>
            <Select onValueChange={setSelectedDoctorId} value={selectedDoctorId || ''}>
                <SelectTrigger id="doctor-select">
                    <SelectValue placeholder="Select a doctor..." />
                </SelectTrigger>
                <SelectContent>
                    {doctors.map(doc => (
                        <SelectItem key={doc.uid} value={doc.uid}>
                            {doc.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        
        {selectedDoctorId ? (
            <ScheduleCalendar />
        ) : (
            <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Please select a doctor to view their schedule.</p>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
