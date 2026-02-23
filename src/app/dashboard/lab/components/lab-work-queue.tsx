
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
import { updateLabOrderStatus, analyzeSample } from '@/lib/actions';
import { ValidateResultDialog } from './validate-result-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useAuth } from '@/hooks/use-auth';

const getStatusVariant = (status: LabResult['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Completed': return 'secondary';
        case 'Ordered': return 'default';
        case 'In Progress': return 'outline';
        case 'Draft': return 'outline';
        case 'Validated': return 'secondary';
        default: return 'outline';
    }
};

interface LabQueueTableProps {
  requests: LabResult[];
  onStatusChange: (testId: string, newStatus: LabResult['status']) => void;
  userRole: string;
}

function LabQueueTable({ requests, onStatusChange, userRole }: LabQueueTableProps) {
    const handleStatusUpdate = async (testId: string, newStatus: LabResult['status']) => {
        const result = await updateLabOrderStatus(testId, newStatus);
        if (result.success) {
            toast.success(`Test ${testId} status updated to '${newStatus}'.`);
            onStatusChange(testId, newStatus);
        } else {
            toast.error(result.message || 'Failed to update status.');
        }
    };
    
    const handleAnalyze = async (testId: string) => {
        const result = await analyzeSample(testId);
        if (result.success) {
            toast.success(`Analysis for test ${testId} completed.`);
            onStatusChange(testId, 'Draft');
        } else {
             toast.error(result.message || 'Failed to analyze sample.');
        }
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
                                    <Button size="sm" variant="outline" onClick={() => handleAnalyze(request.testId)}>
                                        Analyze Sample
                                    </Button>
                                )}
                                {request.status === 'Draft' && userRole === 'lab_supervisor' && (
                                     <ValidateResultDialog
                                        labRequest={request}
                                        onValidated={() => onStatusChange(request.testId, 'Validated')}
                                     />
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


export function LabWorkQueue() {
  const { user } = useAuth();
  const [labRequests, setLabRequests] = useLocalStorage<LabResult[]>('labResults', mockLabResults);
  const userRole = 'lab_supervisor'; 

  const handleStatusChange = (testId: string, newStatus: LabResult['status']) => {
      setLabRequests(prev => prev.map(req => req.testId === testId ? { ...req, status: newStatus } : req));
  }
  
  // SaaS LOGIC: Filter by hospitalId
  const hospitalRequests = labRequests.filter(lr => lr.hospitalId === user?.hospitalId);

  const orderedRequests = hospitalRequests.filter(lr => lr.status === 'Ordered');
  const inProgressRequests = hospitalRequests.filter(lr => lr.status === 'In Progress');
  const draftRequests = hospitalRequests.filter(lr => lr.status === 'Draft');
  const completedRequests = hospitalRequests.filter(lr => lr.status === 'Completed' || lr.status === 'Validated');

  return (
    <Tabs defaultValue="new-requests">
        <TabsList>
            <TabsTrigger value="new-requests">New Requests ({orderedRequests.length})</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress ({inProgressRequests.length})</TabsTrigger>
            <TabsTrigger value="for-validation">For Validation ({draftRequests.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedRequests.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="new-requests" className="mt-4">
            <LabQueueTable requests={orderedRequests} onStatusChange={handleStatusChange} userRole={userRole} />
        </TabsContent>
         <TabsContent value="in-progress" className="mt-4">
            <LabQueueTable requests={inProgressRequests} onStatusChange={handleStatusChange} userRole={userRole} />
        </TabsContent>
        <TabsContent value="for-validation" className="mt-4">
            <LabQueueTable requests={draftRequests} onStatusChange={handleStatusChange} userRole={userRole} />
        </TabsContent>
         <TabsContent value="completed" className="mt-4">
            <LabQueueTable requests={completedRequests} onStatusChange={handleStatusChange} userRole={userRole} />
        </TabsContent>
    </Tabs>
  );
}
