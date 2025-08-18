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

export default function AppointmentsPage() {
    // In a real app, this data would be fetched and filtered based on user role and search queries.
    const [appointments, setAppointments] = React.useState(allAppointments);
    const [searchQuery, setSearchQuery] = React.useState('');

    React.useEffect(() => {
        const filtered = allAppointments.filter(appt => 
            appt.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            appt.doctor_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setAppointments(filtered);
    }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Appointment Scheduling</h1>
          <p className="text-muted-foreground">
            View, book, and manage all patient appointments.
          </p>
        </div>
        <NewAppointmentDialog />
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
             <div>
                <CardTitle>All Appointments</CardTitle>
                <CardDescription>
                    A comprehensive list of all scheduled appointments.
                </CardDescription>
             </div>
             <div className="w-full sm:w-auto">
                <Input
                    placeholder="Search by patient or doctor..."
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