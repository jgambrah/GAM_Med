'use client';

import * as React from 'react';
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
import { MoreHorizontal, UserCheck, Stethoscope, CheckCircle2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Appointment } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { NewAppointmentDialog } from './new-appointment-dialog';
import { AppointmentDetailDialog } from './appointment-detail-dialog';

interface AppointmentsDataTableProps {
  data: Appointment[];
}

const getStatusVariant = (status: Appointment['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Scheduled': return 'default';
        case 'Arrived': return 'secondary';
        case 'In-Consultation': return 'outline';
        case 'Completed': return 'secondary';
        case 'Cancelled': return 'destructive';
        case 'confirmed': return 'default';
        case 'completed': return 'secondary';
        case 'cancelled': return 'destructive';
        default: return 'outline';
    }
};

export function AppointmentsDataTable({ data }: AppointmentsDataTableProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
    const [dialog, setDialog] = React.useState<'view' | 'reschedule' | null>(null);

    const handleUpdateStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
        if (!firestore) return;
        
        const apptRef = doc(firestore, 'appointments', appointmentId);
        updateDocumentNonBlocking(apptRef, {
            status: newStatus,
            updatedAt: new Date().toISOString()
        });

        toast.success(`Patient status updated to ${newStatus}.`);
    }
    
    const closeDialog = () => {
        setSelectedAppointment(null);
        setDialog(null);
    }

  return (
    <>
    <div className="rounded-md border">
        <Table>
            <TableHeader className="bg-muted/50">
            <TableRow>
                <TableHead>Time Slot</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {data.length > 0 ? (
                data.sort((a, b) => (a.timeSlot || '').localeCompare(b.timeSlot || '')).map((appt) => (
                <TableRow key={appt.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold">
                        {appt.timeSlot || appt.time_slot}
                    </TableCell>
                    <TableCell>
                        <Link href={`/dashboard/patients/${appt.patientId || appt.patient_id}`} className="hover:underline text-primary font-bold">
                            {appt.patientName || appt.patient_name}
                        </Link>
                    </TableCell>
                    <TableCell className="text-sm">Dr. {appt.doctorName || appt.doctor_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground italic truncate max-w-[150px]">
                        {appt.reason}
                    </TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(appt.status)}>{appt.status.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            {(appt.status === 'Scheduled' || appt.status === 'confirmed') && (
                                <Button size="sm" variant="ghost" className="h-8 gap-1 text-[10px] uppercase font-bold" onClick={() => handleUpdateStatus(appt.id, 'Arrived')}>
                                    <UserCheck className="h-3.5 w-3.5" />
                                    Arrive
                                </Button>
                            )}
                            {appt.status === 'Arrived' && (
                                <Button size="sm" variant="ghost" className="h-8 gap-1 text-[10px] uppercase font-bold text-blue-600" onClick={() => handleUpdateStatus(appt.id, 'In-Consultation')}>
                                    <Stethoscope className="h-3.5 w-3.5" />
                                    Consult
                                </Button>
                            )}
                            {appt.status === 'In-Consultation' && (
                                <Button size="sm" variant="ghost" className="h-8 gap-1 text-[10px] uppercase font-bold text-green-600" onClick={() => handleUpdateStatus(appt.id, 'Completed')}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Finish
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Manage Appointment</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => { setSelectedAppointment(appt); setDialog('view'); }}>View EHR</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedAppointment(appt); setDialog('reschedule'); }}>Reschedule</DropdownMenuItem>
                                    <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => handleUpdateStatus(appt.id, 'Cancelled')}
                                        disabled={appt.status === 'Completed' || appt.status === 'completed' || appt.status === 'Cancelled' || appt.status === 'cancelled'}
                                    >
                                        Cancel Appointment
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                    All clear! No appointments found for this period.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
    </div>

    {selectedAppointment && (
        <>
            <AppointmentDetailDialog
                appointment={selectedAppointment as any}
                isOpen={dialog === 'view'}
                onOpenChange={(isOpen) => !isOpen && closeDialog()}
            />
            <NewAppointmentDialog
                appointmentToReschedule={selectedAppointment as any}
                isOpen={dialog === 'reschedule'}
                onOpenChange={(isOpen) => !isOpen && closeDialog()}
            />
        </>
    )}
    </>
  );
}
