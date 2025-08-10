
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
import { LabResult } from '@/lib/types';
import { format } from 'date-fns';
import { mockLabResults } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

const getStatusVariant = (status: LabResult['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Completed': return 'secondary';
        case 'Ordered': return 'default';
        case 'In Progress': return 'outline';
        default: 'outline';
    }
};

/**
 * == Conceptual UI: Lab Technician's Work Queue ==
 * This component is the primary interface for lab staff. It provides a centralized view
 * of all lab test requests, allowing technicians to manage their workflow efficiently.
 */
export function LabWorkQueue() {
  const { user } = useAuth();
  
  /**
   * == DATA QUERY (PSEUDOCODE) ==
   * This is where the component would fetch its data. For a lab work queue, this query
   * needs to pull all tests that are not yet 'Completed'.
   *
   *   // Query for all lab requests that are not yet completed.
   *   // The `lab_results` collection would need a composite index on `status` and `orderedAt`.
   *   const q = query(
   *      collectionGroup(db, 'lab_results'),
   *      where('status', '!=', 'Completed'),
   *      orderBy('status'),
   *      orderBy('orderedAt', 'asc')
   *   );
   *
   *   // This hook would provide real-time updates as new tests are ordered or statuses change.
   *   const [labRequests, loading, error] = useCollection(q);
   *
   * By querying a collection group, we can fetch all `lab_results` across all patients in
   * a single, efficient query, which is perfect for a centralized work queue dashboard.
   */
  const labRequests = mockLabResults.filter(lr => lr.status !== 'Completed');

  const handleFulfillRequest = (testId: string) => {
    /**
     * == WORKFLOW STEP: FULFILLMENT ==
     * This function simulates the action a lab technician takes after completing a test.
     *
     * 1. **Open a Modal:** This button would open a dialog/modal with a form for entering
     *    the test results. The form fields would be specific to the `testName`.
     *
     * 2. **Update the Document:** Upon submitting the results form, a server action would
     *    be called. This action would update the original lab result document in the
     *    `/patients/{patientId}/lab_results/{testId}` sub-collection. It would:
     *    - Set the `status` to 'Completed'.
     *    - Populate the `result` field with the data from the form.
     *    - Set the `completedAt` timestamp.
     *    - Set the `labTechnicianId` to the current user's UID.
     *
     * 3. **Trigger Notification:** This update would automatically trigger the
     *    `onLabResultCompleted` Cloud Function, which then notifies the ordering doctor
     *    that the results are ready for review.
     */
    alert(`Simulating fulfillment for test ${testId}. This would open a result entry form.`);
  }

  return (
    <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Ordered At</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {labRequests.length > 0 ? (
                    labRequests.map((request) => (
                        <TableRow key={request.testId}>
                            <TableCell className="font-medium">
                                {format(new Date(request.orderedAt), 'PPP p')}
                            </TableCell>
                            <TableCell>
                                <Link href={`/dashboard/patients/${request.patientId}`} className="hover:underline text-primary">
                                    {request.patientName} ({request.patientId})
                                </Link>
                            </TableCell>
                            <TableCell>{request.testName}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
                            </TableCell>
                            <TableCell>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleFulfillRequest(request.testId)}
                                >
                                    Fulfill Request
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No pending lab requests.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );
}
