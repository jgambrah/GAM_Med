
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
import { format, differenceInBusinessDays } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { mockLeaveRequests, mockStaffProfiles } from '@/lib/data';
import { Check, X, Paperclip } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { LeaveRequest, StaffProfile } from '@/lib/types';

export function LeaveApprovalDashboard() {
  const { user } = useAuth();
  const [allLeaveRequests, setAllLeaveRequests] = useLocalStorage<LeaveRequest[]>('allLeaveRequests', mockLeaveRequests);
  const [staffProfiles, setStaffProfiles] = useLocalStorage<StaffProfile[]>('staffProfiles', mockStaffProfiles);
  
  // SaaS LOGIC: Filter by hospitalId first
  const pendingRequests = React.useMemo(() => {
    if (!user) return [];
    return allLeaveRequests.filter(c => {
        // Must belong to the same hospital
        if (c.hospitalId !== user.hospitalId) return false;

        // Admins/Directors see all pending requests in their hospital, HODs only see requests assigned to them.
        if (user.role === 'admin' || user.role === 'director') {
            return c.status === 'Pending';
        }
        return c.hodId === user.uid && c.status === 'Pending';
    });
  }, [allLeaveRequests, user]);

  const handleApprove = async (requestId: string) => {
    const request = allLeaveRequests.find(req => req.leaveId === requestId);
    if (!request) {
        toast.error("Leave request not found.");
        return;
    }

    // Calculate leave duration
    const leaveDuration = differenceInBusinessDays(new Date(request.endDate), new Date(request.startDate)) + 1;

    // Update staff profile
    setStaffProfiles(prevProfiles => 
        prevProfiles.map(profile => {
            if (profile.staffId === request.staffId) {
                const newBalances = { ...profile.leaveBalances };
                if (newBalances && newBalances[request.leaveType] !== undefined) {
                    newBalances[request.leaveType] -= leaveDuration;
                }
                return { ...profile, leaveBalances: newBalances };
            }
            return profile;
        })
    );

    // Update leave request status
    setAllLeaveRequests(prev => prev.map(req => 
        req.leaveId === requestId 
            ? { ...req, status: 'Approved', approvedByUserId: user?.uid, approvalDate: new Date().toISOString() } 
            : req
    ));

    toast.success('Leave Approved', {
        description: `Leave request ${requestId} has been approved and balance updated.`,
    });
  };
  
  const handleReject = async (requestId: string) => {
     toast.error(`Leave request ${requestId} has been rejected.`);
    setAllLeaveRequests(prev => prev.map(req => req.leaveId === requestId ? { ...req, status: 'Rejected' } : req));
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff Member</TableHead>
            <TableHead>Leave Type</TableHead>
            <TableHead>Dates</TableHead>
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
                <TableCell>
                  {format(new Date(request.startDate), 'PPP')} - {format(new Date(request.endDate), 'PPP')}
                </TableCell>
                <TableCell>{request.reason}</TableCell>
                <TableCell className="space-x-2">
                  {request.attachmentUrl && (
                    <Button asChild variant="outline" size="sm">
                        <a href={request.attachmentUrl} target="_blank" rel="noopener noreferrer">
                            <Paperclip className="h-4 w-4 mr-2" /> View Attachment
                        </a>
                    </Button>
                  )}
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
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                You have no pending leave requests to approve for your facility.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
