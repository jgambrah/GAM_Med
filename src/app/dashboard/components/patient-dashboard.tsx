

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
import { allAdmissions, mockWaitingList, allAppointments, mockMedicationRecords, mockLabResults } from '@/lib/data';
import { Admission, WaitingListEntry, Appointment, MedicationRecord, LabResult } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Video } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const getPriorityVariant = (priority: WaitingListEntry['priority']): "destructive" | "default" | "secondary" => {
    switch (priority) {
        case 'Urgent': return 'destructive';
        case 'Routine': return 'default';
        default: return 'secondary';
    }
}

function MyWaitingListStatus() {
    const { user } = useAuth();
    const myWaitingListEntries = mockWaitingList.filter(
        (item) => item.patientId === user?.patient_id && item.status === 'Active'
    );

    if (myWaitingListEntries.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Waiting List Status</CardTitle>
                <CardDescription>
                    Your current status on waiting lists for hospital services.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Requested Service</TableHead>
                                <TableHead>Date Added</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {myWaitingListEntries.map((item) => (
                                <TableRow key={item.waitinglistId}>
                                    <TableCell className="font-medium">{item.requestedService}</TableCell>
                                    <TableCell>{format(new Date(item.dateAdded), 'PPP')}</TableCell>
                                    <TableCell>
                                        <Badge variant={getPriorityVariant(item.priority)}>
                                            {item.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={item.status === 'Active' ? 'default' : 'secondary'}>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
            </CardContent>
        </Card>
    );
}

function UpcomingAppointments() {
    const { user } = useAuth();
    const upcomingAppointments = allAppointments.filter(
        appt => appt.patient_id === user?.patient_id && new Date(appt.appointment_date) >= new Date()
    ).sort((a,b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

    const handleJoinCall = (link: string) => {
        toast.info("Joining virtual call...", { description: `Redirecting to ${link}`});
        window.open(link, '_blank');
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="space-y-4">
                    {upcomingAppointments.length > 0 ? upcomingAppointments.map(appt => (
                        <div key={appt.appointment_id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <p className="font-semibold">{format(new Date(appt.appointment_date), 'PPP p')}</p>
                                <p className="text-sm text-muted-foreground">{appt.doctor_name} - {appt.department}</p>
                            </div>
                            {appt.isVirtual ? (
                                <Button size="sm" onClick={() => handleJoinCall(appt.telemedicineLink || '#')}>
                                    <Video className="mr-2 h-4 w-4" /> Join Call
                                </Button>
                            ) : (
                                <Badge variant="outline">In-Person</Badge>
                            )}
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No upcoming appointments.</p>
                    )}
                 </div>
            </CardContent>
        </Card>
    );
}

function CurrentMedications() {
    const { user } = useAuth();
    const medications = mockMedicationRecords.filter(med => med.patientId === user?.patient_id && med.status === 'Active');

    return (
         <Card>
            <CardHeader>
                <CardTitle>My Current Medications</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2 text-sm list-disc pl-5">
                    {medications.length > 0 ? medications.map(med => (
                        <li key={med.prescriptionId}>
                            <strong>{med.medicationName}</strong> ({med.dosage}) - {med.frequency}
                        </li>
                    )) : (
                         <p className="text-sm text-muted-foreground text-center py-4">No active medications on your record.</p>
                    )}
                </ul>
            </CardContent>
        </Card>
    )
}

function RecentLabResults() {
    const { user } = useAuth();
    const results = mockLabResults
        .filter(res => res.patientId === user?.patient_id && res.status === 'Validated')
        .sort((a,b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
        .slice(0, 3);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Lab Results</CardTitle>
                <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/my-billing">View All</Link>
                </Button>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {results.length > 0 ? results.map(res => (
                        <li key={res.testId} className="flex justify-between items-center text-sm">
                            <span>{res.testName}</span>
                            <span className="text-muted-foreground">{format(new Date(res.completedAt!), 'PPP')}</span>
                        </li>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No recent lab results available.</p>
                    )}
                </ul>
            </CardContent>
        </Card>
    )
}


export function PatientDashboard() {
    const { user } = useAuth();
  
    // In a real app, this would be a real-time query for the logged-in patient.
    const myAdmissions = allAdmissions.filter(
      (admission) => admission.patient_id === user?.patient_id
    );

    const isDischarged = (status: Admission['status']) => status === 'Discharged';

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UpcomingAppointments />
            <CurrentMedications />
        </div>

        <RecentLabResults />
        
        <MyWaitingListStatus />
        
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>My Visit History</CardTitle>
                        <CardDescription>
                        A summary of your recent visits and admissions.
                        </CardDescription>
                    </div>
                    {user?.patient_id && (
                        <Button asChild variant="outline">
                            <Link href={`/dashboard/patients/${user.patient_id}`}>
                                View Full Record
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Admission Date</TableHead>
                        <TableHead>Discharge Date</TableHead>
                        <TableHead>Reason for Visit</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {myAdmissions.length > 0 ? (
                        myAdmissions.map((admission) => (
                        <TableRow key={admission.admission_id}>
                            <TableCell className="font-medium">
                                {format(new Date(admission.admission_date), 'PPP')}
                            </TableCell>
                            <TableCell>
                                {admission.discharge_date ? format(new Date(admission.discharge_date), 'PPP') : 'N/A'}
                            </TableCell>
                            <TableCell>{admission.reasonForVisit}</TableCell>
                            <TableCell>
                            <Badge variant={isDischarged(admission.status) ? 'secondary' : 'default'}>
                                {admission.status}
                            </Badge>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            You have no visit history on record.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
