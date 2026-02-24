
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
import { mockWaitingList, allAppointments, mockMedicationRecords } from '@/lib/data';
import { WaitingListEntry, Appointment, MedicationRecord, LabResult, VitalsLog } from '@/lib/types';
import { format, differenceInMinutes } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HeartPulse, Video, FileText, Pill, Loader2, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MedicationsTab } from '../patients/[patientId]/components/medications-tab';
import { useTenant } from '@/hooks/use-tenant';

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
    const [now, setNow] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const upcomingAppointments = allAppointments.filter(
        appt => appt.patient_id === user?.patient_id && new Date(appt.appointment_date) >= now
    ).sort((a,b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

    const handleJoinCall = (link: string) => {
        toast.info("Joining virtual call...", { description: `Redirecting to ${link}`});
        window.open(link, '_blank');
    }
    
    const canJoinCall = (appointmentDate: string) => {
        const diff = differenceInMinutes(new Date(appointmentDate), now);
        return diff <= 15 && diff >= -60; // Can join 15 mins before up to 60 mins after start
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Upcoming Appointments</CardTitle>
                <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/appointments">View All</Link>
                </Button>
            </CardHeader>
            <CardContent>
                 <div className="space-y-4">
                    {upcomingAppointments.length > 0 ? upcomingAppointments.slice(0, 2).map(appt => (
                        <div key={appt.appointment_id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <p className="font-semibold">{format(new Date(appt.appointment_date), 'PPP p')}</p>
                                <p className="text-sm text-muted-foreground">{appt.doctor_name} - {appt.department}</p>
                            </div>
                            {appt.isVirtual ? (
                                canJoinCall(appt.appointment_date) ? (
                                    <Button size="sm" onClick={() => handleJoinCall(appt.telemedicineLink || '#')}>
                                        <Video className="mr-2 h-4 w-4" /> Join Call
                                    </Button>
                                ) : (
                                    <div className="text-xs text-center text-muted-foreground">
                                        <p>Join call 15 mins before start</p>
                                    </div>
                                )
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

export function PatientDashboard() {
  const { user } = useAuth();
  const { hospitalName } = useTenant();
  const firestore = useFirestore();

  // 1. LIVE QUERY: My Vitals (Filtered by Patient ID)
  const vitalsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.patient_id) return null;
    return query(
        collection(firestore, "vitals"),
        where("patientId", "==", user.patient_id),
        orderBy("createdAt", "desc"),
        limit(5)
    );
  }, [firestore, user?.patient_id]);

  const { data: vitals, isLoading: isVitalsLoading } = useCollection<VitalsLog>(vitalsQuery);

  // 2. LIVE QUERY: My Lab Results (Filtered by Patient ID)
  const labsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.patient_id) return null;
    return query(
        collection(firestore, "lab_orders"),
        where("patientId", "==", user.patient_id),
        where("status", "==", "Completed"),
        orderBy("completedAt", "desc"),
        limit(5)
    );
  }, [firestore, user?.patient_id]);

  const { data: labResults, isLoading: isLabsLoading } = useCollection<LabResult>(labsQuery);

  if (!user?.patient_id) return null;

  return (
    <div className="space-y-8">
        <header className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight">Welcome, {user.name}</h1>
            <p className="text-muted-foreground font-medium">Your Secure Health Record at <strong>{hospitalName}</strong></p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vitals Summary Card */}
            <Card className="border-t-4 border-t-red-500 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <HeartPulse className="h-5 w-5 text-red-500" />
                        Latest Vitals
                    </CardTitle>
                    {isVitalsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardHeader>
                <CardContent>
                    {vitals && vitals[0] ? (
                        <div className="space-y-4">
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-black text-slate-900">{vitals[0].bloodPressure}</span>
                                <span className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-wider">mmHg</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-medium">
                                <div className="flex items-center gap-1.5 text-red-600">
                                    <HeartPulse className="h-4 w-4" />
                                    <span>{vitals[0].heartRate} BPM</span>
                                </div>
                                <div className="text-muted-foreground border-l pl-4">
                                    Recorded {format(new Date(vitals[0].createdAt || ''), 'PPP')}
                                </div>
                            </div>
                        </div>
                    ) : !isVitalsLoading ? (
                        <div className="py-6 text-center italic text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                            No vitals recorded yet.
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Lab Results Summary Card */}
            <Card className="border-t-4 border-t-purple-500 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-500" />
                        Lab Results
                    </CardTitle>
                    {isLabsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardHeader>
                <CardContent className="space-y-3">
                    {labResults && labResults.length > 0 ? (
                        labResults.map((lab) => (
                            <div key={lab.id} className="p-3 border rounded-xl flex justify-between items-center bg-muted/20 hover:bg-muted/40 transition-colors">
                                <div>
                                    <p className="font-bold text-sm text-slate-900">{lab.testName}</p>
                                    <p className="text-[10px] uppercase font-black text-muted-foreground">
                                        {lab.completedAt ? format(new Date(lab.completedAt), 'MMM dd, yyyy') : 'Recently'}
                                    </p>
                                </div>
                                <Button size="sm" variant="ghost" className="h-8 text-xs font-bold text-purple-700 hover:text-purple-800 hover:bg-purple-50">
                                    View Report
                                    <ArrowRight className="h-3 w-3 ml-1.5" />
                                </Button>
                            </div>
                        ))
                    ) : !isLabsLoading ? (
                        <div className="py-6 text-center italic text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                            No results published yet.
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UpcomingAppointments />
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Pill className="h-5 w-5 text-blue-500" />
                        Active Medications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <MedicationsTab patient={{ patient_id: user.patient_id } as any} />
                </CardContent>
            </Card>
        </div>
        
        <MyWaitingListStatus />
    </div>
  );
}

const getPriorityVariant = (priority: WaitingListEntry['priority']): "destructive" | "default" | "secondary" => {
    switch (priority) {
        case 'Urgent': return 'destructive';
        case 'Routine': return 'default';
        default: return 'secondary';
    }
}
