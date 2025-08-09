
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
 * It demonstrates querying for patients in the 'Pending Discharge' state and provides
 * the entry point for the final administrative action.
 */
export function DischargeDashboard() {
  /**
   * == DATA QUERY (PSEUDOCODE) ==
   * In a real application, this would be a live Firestore query to fetch all admission
   * records where the `status` is 'Pending Discharge'. This gives the billing team a
   * real-time work queue.
   *
   *   const q = query(
   *     collectionGroup(db, 'admissions'),
   *     where('status', '==', 'Pending Discharge'),
   *     orderBy('updatedAt', 'desc')
   *   );
   *   const [pendingDischargeAdmissions, loading, error] = useCollection(q);
   *
   * This conceptual query efficiently fetches all relevant records across all patients.
   */
  const pendingDischargeAdmissions = allAdmissions.filter(
    (a) => a.status === 'Pending Discharge'
  );

  const getPatientName = (patientId: string) => {
      return allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';
  }

  /**
   * == Workflow Step 3: Administrative Finalization ==
   * This function simulates the action taken by an admin or billing clerk.
   * In a full implementation, this button would open a finalization view or modal.
   * That view would display a read-only version of the doctor's summary and the final
   * bill breakdown.
   *
   * After review, a confirmation button in that finalization view would call the
   * `processPatientDischarge` Cloud Function, completing the workflow.
   */
  const handleProcessDischarge = async (admissionId: string) => {
    // This simulates opening the finalization view before the backend call.
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
