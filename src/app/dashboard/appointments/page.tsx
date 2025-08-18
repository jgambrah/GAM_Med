
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { AppointmentsDataTable } from './components/data-table';
import { allAppointments } from '@/lib/data';
import { NewAppointmentDialog } from './components/new-appointment-dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { Appointment } from '@/lib/types';

export default function AppointmentsPage() {
    const { user } = useAuth();
    const [appointments, setAppointments] = React.useState<Appointment[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');

    React.useEffect(() => {
        let baseAppointments = allAppointments;

        // If the user is a patient, show only their appointments.
        if (user?.role === 'patient') {
            baseAppointments = allAppointments.filter(appt => appt.patient_id === user.patient_id);
        }

        const filtered = baseAppointments.filter(appt => 
            appt.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            appt.doctor_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setAppointments(filtered);
    }, [searchQuery, user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Appointment Scheduling</h1>
          <p className="text-muted-foreground">
            {user?.role === 'patient' 
                ? "View and manage your appointments."
                : "View, book, and manage all patient appointments."
            }
          </p>
        </div>
        {user?.role !== 'patient' && <NewAppointmentDialog />}
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
             <div>
                <CardTitle>
                    {user?.role === 'patient' ? "My Appointments" : "All Appointments"}
                </CardTitle>
                <CardDescription>
                    {user?.role === 'patient' 
                        ? "A list of your upcoming and past appointments."
                        : "A comprehensive list of all scheduled appointments."
                    }
                </CardDescription>
             </div>
             <div className="w-full sm:w-auto">
                <Input
                    placeholder={user?.role === 'patient' ? "Search by doctor..." : "Search by patient or doctor..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                />
             </div>
          </div>
        </CardHeader>
        <CardContent>
            <AppointmentsDataTable data={appointments} />
        </CardContent>
      </Card>
    </div>
  );
}
