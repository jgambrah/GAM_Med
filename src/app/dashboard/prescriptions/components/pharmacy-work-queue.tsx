
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
import { Prescription } from '@/lib/types';
import { format } from 'date-fns';
import { mockPrescriptions } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

const getStatusVariant = (status: Prescription['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Pending Pharmacy': return 'default';
        case 'Dispensed': return 'secondary';
        case 'Canceled': return 'destructive';
        default: return 'outline';
    }
};

export function PharmacyWorkQueue() {
  const { user } = useAuth();
  // In a real app, this would be a real-time Firestore query on the top-level 'prescriptions' collection
  // where status is 'Pending Pharmacy' or similar.
  const pendingPrescriptions = mockPrescriptions.filter(p => p.status === 'Pending Pharmacy');

  const isPharmacist = user?.role === 'pharmacist';

  return (
    <div className="rounded-md border">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Prescribed At</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>Medication</TableHead>
                <TableHead>Prescribing Doctor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                <span className="sr-only">Actions</span>
                </TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {pendingPrescriptions.length > 0 ? (
                pendingPrescriptions.map((prescription) => (
                <TableRow key={prescription.prescriptionId}>
                    <TableCell className="font-medium">
                        {format(new Date(prescription.prescribedAt), 'PPP p')}
                    </TableCell>
                    <TableCell>
                        <Link href={`/dashboard/patients/${prescription.patientId}`} className="hover:underline text-primary">
                            {mockPrescriptions.find(p => p.patientId === prescription.patientId)?.patientName || 'Unknown'}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <div>{prescription.medicationName}</div>
                        <div className="text-sm text-muted-foreground">{prescription.dosage} / {prescription.frequency}</div>
                    </TableCell>
                    <TableCell>{prescription.prescribedByDoctorName}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(prescription.status)}>{prescription.status}</Badge>
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
                            <DropdownMenuItem>View Full Prescription</DropdownMenuItem>
                            {isPharmacist && (
                                <>
                                 <DropdownMenuItem>Mark as Filled</DropdownMenuItem>
                                 <DropdownMenuItem>Contact Prescriber</DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                    No pending prescriptions in the queue.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
    </div>
  );
}
