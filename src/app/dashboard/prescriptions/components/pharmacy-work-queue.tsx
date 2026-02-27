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
import { Prescription } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface PharmacyWorkQueueProps {
  onDispense?: () => void;
}

/**
 * == Live Dispensing Engine ==
 * 
 * Lists all pending prescriptions for the current hospital.
 * Actions are performed in real-time and synced back to the patient EHR.
 */
export function PharmacyWorkQueue({ onDispense }: PharmacyWorkQueueProps) {
  const { user } = useAuth();
  const firestore = useFirestore();

  // LIVE QUERY: Listen for Pending prescriptions for THIS hospital
  const presQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'prescriptions'),
        where('hospitalId', '==', user.hospitalId),
        where('status', '==', 'Pending'),
        orderBy('datePrescribed', 'desc')
    );
  }, [firestore, user?.hospitalId]);

  const { data: prescriptions, isLoading } = useCollection<Prescription>(presQuery);

  const handleDispense = async (prescriptionId: string, patientName: string) => {
    if (!firestore) return;

    // a) Update status to 'Dispensed' (Non-blocking for smooth UI)
    const presRef = doc(firestore, 'prescriptions', prescriptionId);
    updateDocumentNonBlocking(presRef, {
        status: 'Dispensed',
        dispensedBy: user?.name,
        dispensedAt: new Date().toISOString()
    });

    // == NHIS AUTOMATIC CLAIM GENERATION ==
    const pres = prescriptions?.find(p => p.id === prescriptionId);
    if (pres) {
        const patientRef = doc(firestore, 'patients', pres.patientId);
        getDoc(patientRef).then((snap) => {
            if (snap.exists()) {
                const patientData = snap.data();
                if (patientData.patientType === 'public') {
                    addDocumentNonBlocking(collection(firestore, "nhis_claims"), {
                        hospitalId: user?.hospitalId,
                        patientId: pres.patientId,
                        patientName: patientData.full_name,
                        nhisNumber: patientData.insurance?.nhisNumber || 'N/A',
                        amount: 120, // Mock drug tariff based on dispensed items
                        status: 'Pending',
                        diagnosisCode: 'ICD-10', // Placeholder
                        serviceDate: new Date().toISOString(),
                        createdAt: serverTimestamp()
                    });
                }
            }
        });
    }

    toast.success(`Medications dispensed to ${patientName}`);
    
    if (onDispense) {
        onDispense();
    }
  };

  if (isLoading) {
    return (
        <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="rounded-md border">
        <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Medications</TableHead>
                    <TableHead>Prescriber</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
            {prescriptions && prescriptions.length > 0 ? (
                prescriptions.map((pres) => (
                <TableRow key={pres.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs font-medium">
                        {format(new Date(pres.datePrescribed), 'MMM dd, p')}
                    </TableCell>
                    <TableCell>
                        <div className="font-bold">{pres.patientName}</div>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase">{pres.patientId}</p>
                    </TableCell>
                    <TableCell>
                        <div className="space-y-1">
                            {pres.medications.map((med, i) => (
                                <div key={i} className="text-xs">
                                    <span className="font-semibold text-blue-700">{med.name}</span>
                                    <span className="text-muted-foreground ml-1">{med.dosage} ({med.frequency})</span>
                                </div>
                            ))}
                        </div>
                    </TableCell>
                    <TableCell className="text-sm">Dr. {pres.doctorId.split('_')[1] || 'Medical Staff'}</TableCell>
                    <TableCell className="text-right">
                        <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleDispense(pres.id, pres.patientName)}
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Dispense
                        </Button>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <CheckCircle2 className="h-12 w-12 opacity-20 mb-2" />
                            <p>Queue is empty. No pending prescriptions.</p>
                        </div>
                    </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
    </div>
  );
}