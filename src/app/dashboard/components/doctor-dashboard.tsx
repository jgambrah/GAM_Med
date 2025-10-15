
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
import { allAppointments as initialAppointments } from '@/lib/data';
import { Appointment } from '@/lib/types';
import { InpatientList } from './inpatient-list';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/use-local-storage';

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
  const [allAppointments] = useLocalStorage<Appointment[]>('appointments', initialAppointments);

  const todaysAppointments = React.useMemo(() => {
    if (!user) return [];
    return allAppointments
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
  }, [allAppointments, user]);


  const handleJoinCall = (link: string) => {
    toast.info("Joining virtual call...", { description: `Redirecting to ${link}`});
    window.open(link, '_blank');
  }

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
                            <TableCell>
                              {appt.isVirtual && (
                                <Button variant="outline" size="sm" onClick={() => handleJoinCall(appt.telemedicineLink!)}>
                                  <Video className="h-4 w-4 mr-2" />
                                  Join Call
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
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
