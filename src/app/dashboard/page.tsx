
'use client';

import { useAuth } from '@/hooks/use-auth';
import { InpatientList } from './components/inpatient-list';
import { PatientDashboard } from './components/patient-dashboard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { allAppointments } from '@/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import Link from 'next/link';

function DoctorDashboard() {
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
        <div className="col-span-1">
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
                                className="hover:underline"
                              >
                                {appt.patient_name}
                              </Link>
                            </TableCell>
                            <TableCell>{appt.type}</TableCell>
                            <TableCell>{appt.status}</TableCell>
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
        <div className="col-span-1">
            <InpatientList />
        </div>
    </div>
  );
}


export default function DashboardPage() {
  const { user } = useAuth();
  
  const isDoctor = user && user.role === 'doctor';
  const isPatient = user && user.role === 'patient';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, {user?.name || 'User'}. You are logged in as a{' '}
          <strong>{user?.role}</strong>.
        </p>
      </div>
      
      {isDoctor && <DoctorDashboard />}

      {isPatient && <PatientDashboard />}

      {!isDoctor && !isPatient && (
        <div className="p-8 border-2 border-dashed rounded-lg text-center">
          <p className="text-muted-foreground">Your role-specific dashboard will appear here.</p>
        </div>
      )}
    </div>
  );
}
