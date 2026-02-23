
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
import { Button } from '@/components/ui/button';
import { allAdmissions, allPatients } from '@/lib/data';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

/**
 * == Conceptual UI: Administrative Discharge Dashboard ==
 */
export function DischargeDashboard() {
  const { user } = useAuth();

  /**
   * == SaaS DATA QUERY ==
   * In a real application, this would be a live Firestore query filtered by hospitalId.
   */
  const pendingDischargeAdmissions = React.useMemo(() => {
    if (!user) return [];
    return allAdmissions.filter(
        (a) => a.hospitalId === user.hospitalId && a.status === 'Pending Discharge'
    );
  }, [user]);

  const getPatientName = (patientId: string) => {
      return allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';
  }

  const handleProcessDischarge = async (admissionId: string) => {
    alert(`Simulating final discharge for admission ${admissionId}. This would update patient, bed, and admission records after financial review.`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Discharges</CardTitle>
        <CardDescription>
          Patients who are clinically cleared and waiting for administrative processing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Attending Doctor</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Bed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingDischargeAdmissions.length > 0 ? (
                pendingDischargeAdmissions.map((admission) => (
                  <TableRow key={admission.admission_id}>
                    <TableCell className="font-medium">
                        <Link href={`/dashboard/patients/${admission.patient_id}`} className="hover:underline text-primary">
                            {getPatientName(admission.patient_id)}
                        </Link>
                    </TableCell>
                    <TableCell>{admission.attending_doctor_name}</TableCell>
                    <TableCell>{admission.ward}</TableCell>
                    <TableCell>{admission.bed_id}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm"
                        onClick={() => handleProcessDischarge(admission.admission_id)}
                      >
                        Process Discharge
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No patients are pending discharge.
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
