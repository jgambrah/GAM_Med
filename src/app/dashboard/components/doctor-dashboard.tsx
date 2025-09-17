
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
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { allAppointments } from '@/lib/data';
import { Appointment } from '@/lib/types';
import { InpatientList } from './inpatient-list';

function getStatusVariant(status: Appointment['status']): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case 'confirmed': return 'default';
        case 'completed': return 'secondary';
        case 'cancelled': return 'destructive';
        default: return 'outline';
    }
}

export function DoctorDashboard() {
  const { user } = useAuth();
  // In a real app, this would be a real-time query for appointments for the logged-in doctor.
  const todaysAppointments = allAppointments
    .filter(
      (appt) =>
        appt.doctor_id === user?.uid &&
        new Date(appt.appointment_date).toDateString() ===
          new Date().toDateString()
    )
    .sort(
      (a, b) =>
        new Date(a.appointment_date).getTime() -
        new Date(b.appointment_date).getTime()
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="col-span-1 lg:col-span-2">
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaysAppointments.length > 0 ? (
                        todaysAppointments.map((appt) => (
                          <TableRow key={appt.appointment_id}>
                            <TableCell className="font-medium">
                              {format(new Date(appt.appointment_date), 'p')}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/dashboard/patients/${appt.patient_id}`}
                                className="hover:underline text-primary"
                              >
                                {appt.patient_name}
                              </Link>
                            </TableCell>
                            <TableCell className="capitalize">{appt.type}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(appt.status)}>{appt.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No appointments scheduled for today.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
        </div>
        <div className="col-span-1 lg:col-span-2">
            <InpatientList />
        </div>
    </div>
  );
}
