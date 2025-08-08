'use client';

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
import { format } from 'date-fns';

interface AdmissionsHistoryTabProps {
  admissions: Admission[];
}

export function AdmissionsHistoryTab({ admissions }: AdmissionsHistoryTabProps) {
  return (
    <div className="space-y-4">
       <h3 className="text-xl font-semibold">Admission History</h3>
       <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Admission ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Admission Date</TableHead>
                    <TableHead>Discharge Date</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {admissions.length > 0 ? (
                    admissions.map((admission) => (
                        <TableRow key={admission.admission_id}>
                            <TableCell className="font-medium">{admission.admission_id}</TableCell>
                            <TableCell>{admission.type}</TableCell>
                            <TableCell>{format(new Date(admission.admission_date), 'PPP')}</TableCell>
                            <TableCell>
                                {admission.discharge_date ? format(new Date(admission.discharge_date), 'PPP') : 'N/A'}
                            </TableCell>
                            <TableCell>{admission.ward || 'N/A'}</TableCell>
                            <TableCell>
                                <Badge variant={admission.is_discharged ? 'secondary' : 'default'}>
                                    {admission.is_discharged ? 'Discharged' : 'Admitted'}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No admission records found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
       </div>
    </div>
  );
}
