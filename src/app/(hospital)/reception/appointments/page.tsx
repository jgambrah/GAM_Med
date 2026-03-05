
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Calendar, Check, X, Loader2, ShieldAlert, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

type Appointment = {
    id: string;
    patientName: string;
    patientId: string;
    doctorName: string;
    timeSlot: string;
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}

export default function AppointmentsQueuePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [today, setToday] = useState(new Date().toISOString().split('T')[0]);

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const hospitalId = userProfile?.hospitalId;
    const isAuthorized = ['DIRECTOR', 'ADMIN', 'NURSE', 'RECEPTIONIST'].includes(userProfile?.role || '');

    const appointmentsQuery = useMemoFirebase(() => {
        if (!firestore || !hospitalId) return null;
        return query(
            collection(firestore, 'appointments'),
            where('hospitalId', '==', hospitalId),
            where('date', '==', today),
            orderBy('timeSlot', 'asc')
        );
    }, [firestore, hospitalId, today]);

    const { data: appointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

    const handleUpdateStatus = (id: string, status: Appointment['status']) => {
        if (!firestore) return;
        const appointmentRef = doc(firestore, 'appointments', id);
        updateDocumentNonBlocking(appointmentRef, { status });
        toast({ title: `Appointment ${status}` });
    };

    const handleCheckIn = (appointment: Appointment) => {
        if (!firestore || !hospitalId) return;

        const appointmentRef = doc(firestore, 'appointments', appointment.id);
        const patientRef = doc(firestore, `hospitals/${hospitalId}/patients`, appointment.patientId);

        // This is not a transaction, but two non-blocking writes. Good enough for this use case.
        updateDocumentNonBlocking(appointmentRef, { status: 'COMPLETED' });
        updateDocumentNonBlocking(patientRef, { status: 'Waiting for Doctor' });

        toast({ title: "Patient Checked In", description: `${appointment.patientName} is now in the doctor's consultation queue.` });
    };
    
    const isLoading = isUserLoading || isProfileLoading;

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!isAuthorized) {
        return (
            <div className="flex flex-1 items-center justify-center bg-background p-4">
                <div className="text-center">
                    <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-muted-foreground">You are not authorized for this module.</p>
                    <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Today's <span className="text-primary">Appointments</span></h1>
                    <p className="text-muted-foreground font-medium">Live queue of all scheduled patient visits for today.</p>
                </div>
                <Input type="date" value={today} onChange={(e) => setToday(e.target.value)} className="w-auto" />
            </div>

            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time Slot</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Clinician</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {areAppointmentsLoading && <TableRow><TableCell colSpan={5} className="text-center p-12"><Loader2 className="animate-spin"/></TableCell></TableRow>}
                        {!areAppointmentsLoading && appointments?.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="p-20 text-center text-muted-foreground italic">No appointments scheduled for {format(parseISO(today), 'PPP')}.</TableCell></TableRow>
                        )}
                        {appointments?.map(app => (
                            <TableRow key={app.id}>
                                <TableCell className="font-mono font-bold text-primary">{app.timeSlot}</TableCell>
                                <TableCell className="font-bold uppercase">{app.patientName}</TableCell>
                                <TableCell className="text-muted-foreground">{app.doctorName}</TableCell>
                                <TableCell>
                                    <Badge variant={
                                        app.status === 'CONFIRMED' ? 'default' :
                                        app.status === 'COMPLETED' ? 'outline' :
                                        app.status === 'CANCELLED' ? 'destructive' :
                                        'secondary'
                                    }>{app.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {app.status === 'PENDING' && (
                                        <Button size="sm" onClick={() => handleUpdateStatus(app.id, 'CONFIRMED')}><Check/> Confirm</Button>
                                    )}
                                    {app.status === 'CONFIRMED' && (
                                        <Button size="sm" onClick={() => handleCheckIn(app)}><Clock/> Check-In</Button>
                                    )}
                                    {app.status !== 'CANCELLED' && app.status !== 'COMPLETED' && (
                                         <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(app.id, 'CANCELLED')}><X size={16}/></Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
