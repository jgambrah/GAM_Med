
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
import { allAdmissions } from '@/lib/data';
import { Admission } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function PatientDashboard() {
    const { user } = useAuth();
  
    // In a real app, this would be a real-time query for the logged-in patient.
    const myAdmissions = allAdmissions.filter(
      (admission) => admission.patient_id === user?.patient_id
    );

    const isDischarged = (status: Admission['status']) => status === 'Discharged';

  return (
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
  );
}
