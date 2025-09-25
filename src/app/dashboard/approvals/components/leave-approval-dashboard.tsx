
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
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { LeaveRequest } from '@/lib/types';

export function LeaveApprovalDashboard() {
  const { user } = useAuth();
  // Use the shared local storage key to see all leave requests
  const [allLeaveRequests, setAllLeaveRequests] = useLocalStorage<LeaveRequest[]>('allLeaveRequests', mockLeaveRequests);
  
  // In a real app, this would be a Firestore query for leave requests where `hodId === user.uid` and status is 'Pending'
  const pendingRequests = allLeaveRequests.filter(c => c.hodId === user?.uid && c.status === 'Pending');

  const handleApprove = async (requestId: string) => {
    toast.success('Leave Approved', {
        description: `Leave request ${requestId} has been approved.`,
    });
    // Update local storage state
    setAllLeaveRequests(prev => prev.map(req => req.leaveId === requestId ? { ...req, status: 'Approved' } : req));
  };
  
  const handleReject = async (requestId: string) => {
     toast.error(`Leave request ${requestId} has been rejected.`);
    // Update local storage state
    setAllLeaveRequests(prev => prev.map(req => req.leaveId === requestId ? { ...req, status: 'Rejected' } : req));
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff Member</TableHead>
            <TableHead>Leave Type</TableHead>
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
                <TableCell><Badge variant="outline">{request.leaveType}</Badge></TableCell>
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
              <TableCell colSpan={6} className="h-24 text-center">
                You have no pending leave requests to approve.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
