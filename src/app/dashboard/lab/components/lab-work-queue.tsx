
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LabResult } from '@/lib/types';
import { format } from 'date-fns';
import { mockLabResults } from '@/lib/data';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { FulfillRequestDialog } from './fulfill-request-dialog';
import { updateLabOrderStatus } from '@/lib/actions';

const getStatusVariant = (status: LabResult['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Completed': return 'secondary';
        case 'Ordered': return 'default';
        case 'In Progress': return 'outline';
        default: return 'outline';
    }
};

interface LabQueueTableProps {
  requests: LabResult[];
  onStatusChange: (testId: string, newStatus: LabResult['status']) => void;
}

function LabQueueTable({ requests, onStatusChange }: LabQueueTableProps) {
    const handleStatusUpdate = async (testId: string, newStatus: LabResult['status']) => {
        const result = await updateLabOrderStatus(testId, newStatus);
        if (result.success) {
            toast.success(`Test ${testId} status updated to '${newStatus}'.`);
            onStatusChange(testId, newStatus);
        } else {
            toast.error(result.message || 'Failed to update status.');
        }
    };

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
                {requests.length > 0 ? (
                    requests.map((request) => (
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
                                {request.status === 'Ordered' && (
                                    <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(request.testId, 'In Progress')}>
                                        Accept Sample
                                    </Button>
                                )}
                                {request.status === 'In Progress' && (
                                    <FulfillRequestDialog labRequest={request} />
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No requests in this queue.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );
}


/**
 * == Conceptual UI: Lab Technician's Work Queue ==
 * This component is the primary interface for lab staff. It provides a centralized view
 * of all lab test requests, allowing technicians to manage their workflow efficiently.
 */
export function LabWorkQueue() {
  const [labRequests, setLabRequests] = React.useState<LabResult[]>(mockLabResults);

  const handleStatusChange = (testId: string, newStatus: LabResult['status']) => {
      setLabRequests(prev => prev.map(req => req.testId === testId ? { ...req, status: newStatus } : req));
  }
  
  const orderedRequests = labRequests.filter(lr => lr.status === 'Ordered');
  const inProgressRequests = labRequests.filter(lr => lr.status === 'In Progress');
  const completedRequests = labRequests.filter(lr => lr.status === 'Completed');

  return (
    <Tabs defaultValue="new-requests">
        <TabsList>
            <TabsTrigger value="new-requests">New Requests ({orderedRequests.length})</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress ({inProgressRequests.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedRequests.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="new-requests" className="mt-4">
            <LabQueueTable requests={orderedRequests} onStatusChange={handleStatusChange} />
        </TabsContent>
         <TabsContent value="in-progress" className="mt-4">
            <LabQueueTable requests={inProgressRequests} onStatusChange={handleStatusChange} />
        </TabsContent>
         <TabsContent value="completed" className="mt-4">
            <LabQueueTable requests={completedRequests} onStatusChange={handleStatusChange} />
        </TabsContent>
    </Tabs>
  );
}
