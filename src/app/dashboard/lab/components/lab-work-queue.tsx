
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
import { LabResult } from '@/lib/types';
import { format } from 'date-fns';
import { mockLabResults } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { FulfillRequestDialog } from './fulfill-request-dialog';

const getStatusVariant = (status: LabResult['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Completed': return 'secondary';
        case 'Ordered': return 'default';
        case 'In Progress': return 'outline';
        default: return 'outline';
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
                                <FulfillRequestDialog labRequest={request} />
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
