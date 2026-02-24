'use client';

import * as React from 'react';
import { Admission } from '@/lib/types';
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
import { Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';

interface AdmissionsHistoryTabProps {
  patientId: string;
}

export function AdmissionsHistoryTab({ patientId }: AdmissionsHistoryTabProps) {
  const { user } = useAuth();
  const firestore = useFirestore();

  // LIVE QUERY: Historical admissions for the patient
  const admQuery = useMemoFirebase(() => {
    if (!firestore || !patientId || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'admissions'),
        where('hospitalId', '==', user.hospitalId),
        where('patient_id', '==', patientId),
        orderBy('admission_date', 'desc')
    );
  }, [firestore, patientId, user?.hospitalId]);

  const { data: admissions, isLoading } = useCollection<Admission>(admQuery);
  
  return (
    <div className="space-y-4">
       <h3 className="text-xl font-semibold">Visit History</h3>
       <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
                ) : admissions && admissions.length > 0 ? (
                    admissions.map((admission) => (
                        <TableRow key={admission.id}>
                            <TableCell className="text-xs">
                                {format(new Date(admission.admission_date), 'PPP')}
                            </TableCell>
                            <TableCell className="text-xs">{admission.type}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-[10px]">{admission.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {admission.summary_pdf_url && (
                                    <Button asChild variant="ghost" size="icon">
                                        <a href={admission.summary_pdf_url} target="_blank"><Download className="h-4 w-4" /></a>
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No records.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
       </div>
    </div>
  );
}
