
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { allAppointments } from '@/lib/data';
import { Appointment } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function DoctorAppointments() {
    const { user } = useAuth();
  
    // In a real app, this would be a real-time query for appointments for the logged-in doctor.
    const todaysAppointments = allAppointments.filter(
      (appt) =>
        appt.doctor_id === user?.uid &&
        new Date(appt.appointment_date).toDateString() === new Date().toDateString()
    );

    const getStatusVariant = (status: Appointment['status']): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'confirmed': return 'default';
            case 'completed': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Appointments</CardTitle>
        <CardDescription>
          A list of your scheduled appointments for today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todaysAppointments.length > 0 ? (
                todaysAppointments.map((appt) => (
                  <TableRow key={appt.appointment_id}>
                    <TableCell className="font-medium">
                      {format(new Date(appt.appointment_date), 'p')}
                    </TableCell>
                    <TableCell>{appt.patient_name}</TableCell>
                    <TableCell>{appt.type}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(appt.status)}>{appt.status}</Badge>
                    </TableCell>
                    <TableCell>
                       <Button asChild variant="outline" size="sm">
                         <Link href={`/dashboard/patients/${appt.patient_id}`}>
                            View Record
                         </Link>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    You have no appointments scheduled for today.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
