
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

/**
 * == Conceptual UI: Administrative Discharge Dashboard ==
 *
 * This component provides a work queue for the administrative or billing department to
 * finalize the discharge process after a doctor has completed the clinical summary.
 *
 * Workflow:
 * 1.  **Data Query:** It fetches all admission records where the `status` is 'Pending Discharge'.
 *     This indicates the patient is clinically ready for discharge but awaits financial clearance.
 * 2.  **Display:** It lists these patients, showing their name, doctor, and when the summary was
 *     finalized. This gives a clear overview of pending administrative tasks.
 * 3.  **Action:** The "Process Discharge" button for each patient would trigger the final backend
 *     process. In a full implementation, this button would open a finalization view or modal
 *     showing a read-only version of the doctor's summary and the final bill breakdown.
 * 4.  **Backend Call:** After review in the finalization view, a confirmation button would call
 *     the `processPatientDischarge` Cloud Function. This function performs the final,
 *     multi-document atomic transaction to:
 *     - Update the admission status to 'Discharged'.
 *     - Update the patient's `is_admitted` flag to `false`.
 *     - Update the bed status to 'cleaning'.
 *     - Link the final bill ID.
 */
export function DischargeDashboard() {
  // In a real app, this would be a query like:
  // db.collectionGroup('admissions').where('status', '==', 'Pending Discharge')
  const pendingDischargeAdmissions = allAdmissions.filter(
    (a) => a.status === 'Pending Discharge'
  );

  const getPatientName = (patientId: string) => {
      return allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';
  }

  const handleProcessDischarge = async (admissionId: string) => {
    // In a real app, this would open a finalization modal/view.
    // For this prototype, it directly simulates calling the `processPatientDischarge` Cloud Function.
    alert(`Simulating final discharge for admission ${admissionId}. This would update patient, bed, and admission records after financial review.`);
    // On success, the component would re-render and this item would disappear from the list.
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
