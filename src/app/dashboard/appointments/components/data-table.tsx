
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
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Appointment } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { cancelAppointment } from '@/lib/actions';

interface AppointmentsDataTableProps {
  data: Appointment[];
}

const getStatusVariant = (status: Appointment['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'confirmed': return 'default';
        case 'completed': return 'secondary';
        case 'cancelled': return 'destructive';
        case 'no-show': return 'outline';
        default: return 'outline';
    }
};

export function AppointmentsDataTable({ data }: AppointmentsDataTableProps) {
    const { user } = useAuth();

    const handleCancel = async (appointmentId: string) => {
        const result = await cancelAppointment(appointmentId);
        if (result.success) {
            toast.success("Appointment Canceled", {
                description: "The appointment has been canceled and the time slot has been opened."
            });
            // In a real app, this would trigger a re-fetch of the data.
        } else {
            toast.error("Cancellation Failed", {
                description: result.message
            });
        }
    }

  return (
    <div className="rounded-md border">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                    <span className="sr-only">Actions</span>
                </TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {data.length > 0 ? (
                data.map((appt) => (
                <TableRow key={appt.appointment_id}>
                    <TableCell className="font-medium">
                        {format(new Date(appt.appointment_date), 'PPP p')}
                    </TableCell>
                    <TableCell>
                        <Link href={`/dashboard/patients/${appt.patient_id}`} className="hover:underline text-primary">
                            {appt.patient_name}
                        </Link>
                    </TableCell>
                    <TableCell>{appt.doctor_name}</TableCell>
                    <TableCell className="capitalize">{appt.type}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(appt.status)}>{appt.status}</Badge>
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Reschedule</DropdownMenuItem>
                            <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleCancel(appt.appointment_id)}
                                disabled={appt.status === 'completed' || appt.status === 'cancelled'}
                            >
                                Cancel Appointment
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                    No appointments found.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
    </div>
  );
}
