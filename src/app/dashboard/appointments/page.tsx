
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PatientAppointmentCalendar } from './components/patient-appointment-calendar';

const mockDepartments = [
    { value: 'all', label: 'All Departments' },
    { value: 'Cardiology', label: 'Cardiology' },
    { value: 'Orthopedics', label: 'Orthopedics' },
    { value: 'Pediatrics', label: 'Pediatrics' },
    { value: 'Neurology', label: 'Neurology' },
    { value: 'General Surgery', label: 'General Surgery' },
    { value: 'Dermatology', label: 'Dermatology' },
];


export default function AppointmentsPage() {
    const { user } = useAuth();
    const [appointments, setAppointments] = React.useState<Appointment[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedDepartment, setSelectedDepartment] = React.useState('all');

    React.useEffect(() => {
        let baseAppointments = allAppointments;

        if (user?.role === 'patient') {
            baseAppointments = allAppointments.filter(appt => appt.patient_id === user.patient_id);
        }

        const filteredBySearch = baseAppointments.filter(appt => 
            appt.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            appt.doctor_name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const filteredByDept = selectedDepartment === 'all'
            ? filteredBySearch
            : filteredBySearch.filter(appt => appt.department === selectedDepartment);

        setAppointments(filteredByDept);
    }, [searchQuery, user, selectedDepartment]);

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
                        ? "A calendar view of your upcoming and past appointments."
                        : "A comprehensive list of all scheduled appointments."
                    }
                </CardDescription>
             </div>
             <div className="flex items-center gap-2">
                {user?.role !== 'patient' && (
                    <div className="w-full sm:w-[200px]">
                        <Label htmlFor="department-filter" className="sr-only">Filter by Department</Label>
                         <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                            <SelectTrigger id="department-filter">
                                <SelectValue placeholder="Filter by department" />
                            </SelectTrigger>
                            <SelectContent>
                                {mockDepartments.map((d) => (
                                    <SelectItem key={d.value} value={d.value}>
                                    {d.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="w-full sm:w-auto">
                    <Input
                        placeholder={user?.role === 'patient' ? "Search by doctor..." : "Search by patient or doctor..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
             </div>
          </div>
        </CardHeader>
        <CardContent>
            {user?.role === 'patient' ? (
              <PatientAppointmentCalendar appointments={appointments} />
            ) : (
              <AppointmentsDataTable data={appointments} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
