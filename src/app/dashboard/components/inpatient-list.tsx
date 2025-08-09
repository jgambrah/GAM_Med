
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
import { allPatients, allAdmissions } from '@/lib/data';
import { format } from 'date-fns';
import Link from 'next/link';

export function InpatientList() {
    // In a real app, this query would be `db.collection('patients').where('is_admitted', '==', true)`
    const inpatients = allPatients.filter(p => p.is_admitted);

    const getAdmissionDetails = (patientId: string) => {
        const patient = allPatients.find(p => p.patient_id === patientId);
        if (!patient || !patient.current_admission_id) return null;
        return allAdmissions.find(a => a.admission_id === patient.current_admission_id);
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Inpatients</CardTitle>
        <CardDescription>
          A list of all patients currently admitted to the hospital.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Bed ID</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Admission Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inpatients.length > 0 ? (
                inpatients.map((patient) => {
                    const admission = getAdmissionDetails(patient.patient_id);
                    return (
                        <TableRow key={patient.patient_id}>
                            <TableCell className="font-medium">
                                <Link href={`/dashboard/patients/${patient.patient_id}`} className="hover:underline text-primary">
                                    {patient.full_name}
                                </Link>
                            </TableCell>
                            <TableCell>{admission?.bed_id || 'N/A'}</TableCell>
                            <TableCell>{admission?.ward || 'N/A'}</TableCell>
                            <TableCell>
                                {admission ? format(new Date(admission.admission_date), 'PPP') : 'N/A'}
                            </TableCell>
                        </TableRow>
                    )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    There are currently no admitted patients.
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
