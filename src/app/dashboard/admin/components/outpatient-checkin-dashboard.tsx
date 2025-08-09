
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
import { Button } from '@/components/ui/button';
import { allAppointments } from '@/lib/data';
import { Appointment } from '@/lib/types';
import { format } from 'date-fns';
import { updateOutpatientStatus } from '@/lib/actions';
import Link from 'next/link';

/**
 * == Conceptual Code: Outpatient Check-in Dashboard ==
 *
 * This component serves as the UI for managing daily outpatient flow.
 */
export function OutpatientCheckinDashboard() {
  /**
   * == DATA QUERY ==
   * In a production application, this would be a real-time Firestore query.
   * The query would look something like this:
   *
   *   const today = new Date();
   *   const startOfToday = new Date(today.setHours(0, 0, 0, 0));
   *   const endOfToday = new Date(today.setHours(23, 59, 59, 999));
   *
   *   const q = query(
   *     collection(db, 'appointments'),
   *     where('type', '==', 'outpatient'), // Filter for outpatient visits
   *     where('appointment_date', '>=', startOfToday),
   *     where('appointment_date', '<=', endOfToday),
   *     orderBy('appointment_date', 'asc')
   *   );
   *
   * This query efficiently fetches only the relevant appointments for the day.
   */
  const todaysOutpatientAppointments = allAppointments.filter(
    (appt) => appt.type !== 'procedure' && new Date(appt.appointment_date).toDateString() === new Date().toDateString()
  );

  /**
   * == FUNCTION TO HANDLE STATUS UPDATES ==
   * This function is called when a receptionist clicks "Check-in" or "Cancel".
   * It demonstrates calling the server action which would, in turn, invoke the
   * `updateOutpatientStatus` Cloud Function.
   */
  const handleUpdateStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    // This calls the conceptual server action which would in turn call the `updateOutpatientStatus` Cloud Function.
    const result = await updateOutpatientStatus(appointmentId, newStatus);
    if (result.success) {
        alert(`Appointment status updated to '${newStatus}' (simulated).`);
    } else {
        alert(`Error: ${result.message}`);
    }
  };

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
        <CardTitle>Today's Outpatient Appointments</CardTitle>
        <CardDescription>
          A list of all scheduled outpatient visits for today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todaysOutpatientAppointments.length > 0 ? (
                todaysOutpatientAppointments.map((appt) => (
                  <TableRow key={appt.appointment_id}>
                    <TableCell className="font-medium">
                      {format(new Date(appt.appointment_date), 'p')}
                    </TableCell>
                    <TableCell>
                        <Link href={`/dashboard/patients/${appt.patient_id}`} className="hover:underline">
                            {appt.patient_name}
                        </Link>
                    </TableCell>
                    <TableCell>{appt.doctor_name}</TableCell>
                    <TableCell>{appt.type}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(appt.status)}>{appt.status}</Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUpdateStatus(appt.appointment_id, 'completed')}
                        disabled={appt.status === 'completed' || appt.status === 'cancelled'}
                      >
                        Check-in
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleUpdateStatus(appt.appointment_id, 'cancelled')}
                        disabled={appt.status === 'completed' || appt.status === 'cancelled'}
                        >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No outpatient appointments scheduled for today.
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
