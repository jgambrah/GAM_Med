
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
 *
 * This component serves a dual purpose based on the user's role, acting as the central
 * point for the entire referral workflow.
 *
 * For Administrative Staff ('admin', 'triage_officer'):
 * - It displays ALL incoming referrals, serving as the main work queue for triage.
 * - Actions would include "Assign to Doctor" and "Update Status".
 *
 * For Doctors ('doctor'):
 * - It displays ONLY the referrals specifically assigned to them.
 * - Actions would be focused on their part of the workflow, like "Schedule Appointment"
 *   or "Mark as Patient Seen".
 */
export function ReferralsDashboard() {
  const { user } = useAuth();

  /**
   * == DATA QUERY (PSEUDOCODE) ==
   * The query logic changes based on the user's role to fetch the correct data.
   *
   *   let q;
   *   if (user.role === 'doctor') {
   *     // Doctor's View: Fetch only referrals assigned to me.
   *     q = query(
   *       collection(db, 'referrals'),
   *       where('assignedToDoctorId', '==', user.uid),
   *       orderBy('referralDate', 'desc')
   *     );
   *   } else {
   *     // Admin/Triage View: Fetch all referrals.
   *     q = query(
   *       collection(db, 'referrals'),
   *       orderBy('referralDate', 'desc')
   *     );
   *   }
   *   const [referrals, loading, error] = useCollection(q);
   */
  const referrals = React.useMemo(() => {
    if (user?.role === 'doctor') {
      return mockReferrals.filter(r => r.assignedDoctorId === user.uid);
    }
    return mockReferrals;
  }, [user]);


  return (
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
                         <DropdownMenuItem>Assign to Doctor</DropdownMenuItem>
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
                No referrals found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
