
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
import { useAuth } from '@/hooks/use-auth';

/**
 * == Staff Schedule Viewer (Administrative) ==
 * 
 * Allows directors/admins to view schedules for clinical staff within their facility.
 * Enforces the SaaS Wall by filtering the staff list by hospitalId.
 */
export function StaffScheduleDashboard() {
  const { user } = useAuth();
  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string | null>(null);

  // SaaS LOGIC: Only show doctors belonging to this facility
  const hospitalDoctors = React.useMemo(() => {
    if (!user) return [];
    return allUsers.filter(u => u.role === 'doctor' && u.hospitalId === user.hospitalId);
  }, [user]);

  React.useEffect(() => {
    // Select the first doctor by default if one exists
    if (hospitalDoctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(hospitalDoctors[0].uid);
    }
  }, [hospitalDoctors, selectedDoctorId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Staff Schedule Viewer</CardTitle>
        <CardDescription>
          Select a doctor to view and manage their weekly schedule for <strong>{user?.hospitalId}</strong>.
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
                    {hospitalDoctors.map(doc => (
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
            <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/10">
                <p className="text-muted-foreground italic text-sm">No doctors registered for your facility.</p>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
