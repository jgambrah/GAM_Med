
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
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Referral } from '@/lib/types';
import { format } from 'date-fns';
import { mockReferrals } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';

type StatusFilter = 'All' | Referral['status'];

const getStatusVariant = (status: Referral['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Pending Review': return 'destructive';
        case 'Assigned': return 'default';
        case 'Scheduled': return 'outline';
        case 'Completed': return 'secondary';
        default: return 'secondary';
    }
};

const getPriorityVariant = (priority: Referral['priority']): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
        case 'Emergency': return 'destructive';
        case 'Urgent': return 'default';
        case 'Routine': return 'secondary';
        default: return 'secondary';
    }
}

/**
 * == Conceptual UI: Role-Based Referrals Dashboard ==
 * This component serves as the central "Referral Inbox" for the administrative/triage team.
 * It's designed to be a dynamic work queue with filtering and assignment capabilities.
 */
export function ReferralsDashboard() {
  const { user } = useAuth();
  const [filter, setFilter] = React.useState<StatusFilter>('Pending Review');

  /**
   * == DATA QUERY (PSEUDOCODE) ==
   * This logic adapts the query based on both user role and the selected filter.
   *
   *   let q;
   *   let baseQuery = collection(db, 'referrals');
   *
   *   if (user.role === 'doctor') {
   *     // Doctor's View: Fetch only referrals assigned to me.
   *     q = query(baseQuery, where('assignedToDoctorId', '==', user.uid), orderBy('referralDate', 'desc'));
   *   } else {
   *     // Admin/Triage View: Apply status filter.
   *     if (filter !== 'All') {
   *        baseQuery = query(baseQuery, where('status', '==', filter));
   *     }
   *     q = query(baseQuery, orderBy('referralDate', 'desc'));
   *   }
   *   const [referrals, loading, error] = useCollection(q);
   */
  const referrals = React.useMemo(() => {
    const allReferrals = user?.role === 'doctor'
      ? mockReferrals.filter(r => r.assignedDoctorId === user.uid)
      : mockReferrals;
      
    if (filter === 'All') return allReferrals;
    return allReferrals.filter(r => r.status === filter);
  }, [user, filter]);


  return (
    <div className="space-y-4">
      {user?.role !== 'doctor' && (
        <div className="flex items-center gap-2">
            <Button variant={filter === 'All' ? 'default' : 'outline'} onClick={() => setFilter('All')}>All</Button>
            <Button variant={filter === 'Pending Review' ? 'default' : 'outline'} onClick={() => setFilter('Pending Review')}>Pending Review</Button>
            <Button variant={filter === 'Assigned' ? 'default' : 'outline'} onClick={() => setFilter('Assigned')}>Assigned</Button>
            <Button variant={filter === 'Scheduled' ? 'default' : 'outline'} onClick={() => setFilter('Scheduled')}>Scheduled</Button>
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referral Date</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Referring Provider</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrals.length > 0 ? (
              referrals.map((referral) => (
                <TableRow key={referral.referral_id}>
                  <TableCell className="font-medium">
                    {format(new Date(referral.referralDate), 'PPP')}
                  </TableCell>
                  <TableCell>{referral.patientDetails.name}</TableCell>
                  <TableCell>{referral.referringProvider}</TableCell>
                  <TableCell>{referral.assignedDepartment}</TableCell>
                  <TableCell>
                      <Badge variant={getPriorityVariant(referral.priority)}>{referral.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(referral.status)}>{referral.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {user?.role !== 'doctor' && (
                           <DropdownMenuItem>
                            {/* ASSIGNMENT WORKFLOW:
                                This action would open a dialog with a dropdown of doctors
                                in the 'assignedDepartment'. On confirmation, it would update
                                the referral document with the 'assignedToDoctorId', which
                                then triggers the `onReferralAssignment` Cloud Function.
                             */}
                             Assign to Doctor
                           </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Update Status</DropdownMenuItem>
                         {user?.role === 'doctor' && (
                           <DropdownMenuItem>Schedule Appointment</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No referrals found for the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
