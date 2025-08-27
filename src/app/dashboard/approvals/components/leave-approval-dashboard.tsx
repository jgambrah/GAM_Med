
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
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { mockLeaveRequests } from '@/lib/data';
import { Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function LeaveApprovalDashboard() {
  const { user } = useAuth();
  // In a real app, this would be a Firestore query for leave requests where `hodId === user.uid` and status is 'Pending'
  const pendingRequests = mockLeaveRequests.filter(c => c.hodId === user?.uid && c.status === 'Pending');

  const handleApprove = async (requestId: string) => {
    toast.success('Leave Approved', {
        description: `Leave request ${requestId} has been approved.`,
    });
    // Here you would call a server action to update the leave request status.
  };
  
  const handleReject = async (requestId: string) => {
     toast.error(`Leave request ${requestId} has been rejected.`);
    // Here you would call a server action to update the leave request status.
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff Member</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingRequests.length > 0 ? (
            pendingRequests.map((request) => (
              <TableRow key={request.leaveId}>
                <TableCell className="font-medium">{request.staffName}</TableCell>
                <TableCell>{format(new Date(request.startDate), 'PPP')}</TableCell>
                <TableCell>{format(new Date(request.endDate), 'PPP')}</TableCell>
                <TableCell>{request.reason}</TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleApprove(request.leaveId)}>
                    <Check className="h-4 w-4 mr-2 text-green-600" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(request.leaveId)}>
                     <X className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                You have no pending leave requests to approve.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
