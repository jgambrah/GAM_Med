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
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { Appointment } from '@/lib/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

/**
 * == SaaS Outpatient Flow Management ==
 * 
 * Manages daily outpatient arrivals. Every query is strictly isolated 
 * to the current hospitalId.
 */
export function OutpatientCheckinDashboard() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. LIVE QUERY: Listen for today's appointments for THIS hospital
  const apptQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'appointments'),
        where('hospitalId', '==', user.hospitalId),
        where('appointmentDate', '==', todayStr),
        where('status', 'in', ['Scheduled', 'confirmed'])
    );
  }, [firestore, user?.hospitalId, todayStr]);

  const { data: appointments, isLoading } = useCollection<Appointment>(apptQuery);

  const handleUpdateStatus = async (id: string, status: Appointment['status'], patientName: string) => {
    if (!firestore) return;
    
    const apptRef = doc(firestore, 'appointments', id);
    updateDocumentNonBlocking(apptRef, { 
        status, 
        updatedAt: serverTimestamp() 
    });

    toast.success(`Check-in Successful`, {
        description: `${patientName} has been marked as Arrived.`
    });
  };

  const getStatusVariant = (status: Appointment['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'confirmed': return 'default';
        case 'completed': return 'secondary';
        case 'cancelled': return 'destructive';
        case 'Scheduled': return 'default';
        case 'Arrived': return 'secondary';
        case 'In-Consultation': return 'outline';
        case 'Completed': return 'secondary';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
  }

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Outpatient Appointments</CardTitle>
        <CardDescription>
          Live check-in queue for <strong>{user?.hospitalId}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments && appointments.length > 0 ? (
                appointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-mono text-xs font-bold">
                      {appt.time_slot || appt.timeSlot}
                    </TableCell>
                    <TableCell>
                        <Link href={`/dashboard/patients/${appt.patient_id}`} className="hover:underline font-bold">
                            {appt.patient_name || appt.patientName}
                        </Link>
                    </TableCell>
                    <TableCell className="text-sm">Dr. {appt.doctor_name || appt.doctorName}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(appt.status)} className="text-[10px] uppercase font-black">{appt.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button 
                        size="sm"
                        onClick={() => handleUpdateStatus(appt.id, 'Arrived', appt.patient_name || appt.patientName || 'Patient')}
                      >
                        Mark Arrived
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                    No pending outpatient arrivals for today.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}