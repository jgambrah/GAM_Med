
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
import { allAdmissions, mockWaitingList } from '@/lib/data';
import { Admission, WaitingListEntry } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock } from 'lucide-react';

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

export function PatientDashboard() {
    const { user } = useAuth();
  
    // In a real app, this would be a real-time query for the logged-in patient.
    const myAdmissions = allAdmissions.filter(
      (admission) => admission.patient_id === user?.patient_id
    );

    const isDischarged = (status: Admission['status']) => status === 'Discharged';

  return (
    <div className="space-y-6">
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
