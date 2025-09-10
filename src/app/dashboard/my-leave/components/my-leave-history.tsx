
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
import { format } from 'date-fns';
import { LeaveRequest } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { mockLeaveRequests } from '@/lib/data';

const getStatusVariant = (status: LeaveRequest['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'Approved':
      return 'secondary';
    case 'Pending':
      return 'default';
    case 'Rejected':
      return 'destructive';
    case 'Cancelled':
        return 'outline';
    default:
      return 'outline';
  }
};


export function MyLeaveHistory() {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = React.useState<LeaveRequest[]>([]);

  React.useEffect(() => {
    if (user) {
      const requests = mockLeaveRequests.filter(r => r.staffId === user.uid);
      setMyRequests(requests);
    }
  }, [user]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {myRequests.length > 0 ? (
            myRequests.map((request) => (
              <TableRow key={request.leaveId}>
                <TableCell>{format(new Date(request.startDate), 'PPP')}</TableCell>
                <TableCell>{format(new Date(request.endDate), 'PPP')}</TableCell>
                <TableCell>{request.reason}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                You have not submitted any leave requests.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
