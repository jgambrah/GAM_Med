
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

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
        default: 'secondary';
    }
}

/**
 * == Conceptual UI: Role-Based Referrals Dashboard ==
 * This component serves as a central hub for referral management, adapting its functionality
 * based on the user's role. It acts as both the administrative work queue and the doctor's
 * personalized list.
 *
 * For Admins/Triage: It's a dynamic work queue with filtering and assignment capabilities.
 * For Doctors: It's a streamlined list of their assigned referrals, with actions tailored to their workflow.
 */
export function ReferralsDashboard() {
  const { user } = useAuth();
  const [filter, setFilter] = React.useState<StatusFilter>('Pending Review');
  const isDoctor = user?.role === 'doctor';

  /**
   * == DATA QUERY (PSEUDOCODE) ==
   * This logic adapts the query based on both user role and the selected filter, ensuring
   * users only see relevant information.
   *
   *   let q;
   *   let baseQuery = collection(db, 'referrals');
   *
   *   if (isDoctor) {
   *     // == Doctor's Referral List Query ==
   *     // This query is simple and secure. It fetches only referrals where the
   *     // `assignedToDoctorId` field matches the currently logged-in doctor's UID.
   *     // This is the core of the Doctor's Portal view.
   *     q = query(
   *       baseQuery,
   *       where('assignedToDoctorId', '==', user.uid),
   *       orderBy('referralDate', 'desc')
   *     );
   *   } else {
   *     // == Admin/Triage Dashboard Query ==
   *     // This is the work queue for administrative staff. It can be filtered by status.
   *     // By default, it shows 'Pending Review' to guide staff to the most urgent tasks.
   *     if (filter !== 'All') {
   *        baseQuery = query(baseQuery, where('status', '==', filter));
   *     }
   *     q = query(baseQuery, orderBy('referralDate', 'desc'));
   *   }
   *
   *   // In a real application, this would use a hook like `useCollection` from
   *   // 'react-firebase-hooks/firestore' to get real-time data.
   *   const [referrals, loading, error] = useCollection(q);
   */
  const referrals = React.useMemo(() => {
    if (isDoctor) {
        // For a doctor, always show their assigned referrals regardless of status.
        return mockReferrals.filter(r => r.assignedDoctorId === user.uid);
    }
    // For admin/triage, filter based on the selected status.
    if (filter === 'All') return mockReferrals;
    return mockReferrals.filter(r => r.status === filter);
  }, [user, filter, isDoctor]);


  return (
    <div className="space-y-4">
      {/*
        == ROLE-BASED UI ==
        This block demonstrates conditional rendering. The filter buttons, which are part of
        the administrative workflow, are only rendered if the user is *not* a doctor. This
        declutters the UI for doctors and focuses them on their assigned tasks.
      */}
      {!isDoctor && (
        <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant={filter === 'All' ? 'default' : 'outline'} onClick={() => setFilter('All')}>All</Button>
            <Button size="sm" variant={filter === 'Pending Review' ? 'default' : 'outline'} onClick={() => setFilter('Pending Review')}>Pending Review</Button>
            <Button size="sm" variant={filter === 'Assigned' ? 'default' : 'outline'} onClick={() => setFilter('Assigned')}>Assigned</Button>
            <Button size="sm" variant={filter === 'Scheduled' ? 'default' : 'outline'} onClick={() => setFilter('Scheduled')}>Scheduled</Button>
            <Button size="sm" variant={filter === 'Completed' ? 'default' : 'outline'} onClick={() => setFilter('Completed')}>Completed</Button>
        </div>
      )}
      <div className="rounded-md border">
        <TooltipProvider>
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
                     <TableCell>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="font-medium underline-dotted cursor-help">
                                    {referral.patientDetails.name}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>DOB: {format(new Date(referral.patientDetails.dob), 'PPP')}</p>
                                <p>Phone: {referral.patientDetails.phone}</p>
                            </TooltipContent>
                        </Tooltip>
                     </TableCell>
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
                             <DropdownMenuItem>
                                {/* This opens a read-only view of the full referral */}
                                View Full Details
                             </DropdownMenuItem>
                            {/* == Admin/Triage Workflow Action == */}
                            {!isDoctor && (
                            <DropdownMenuItem>
                                {/* This action is the entry point for the assignment workflow.
                                    In a full implementation, this would open a dialog with a
                                    dropdown of doctors in the 'assignedDepartment'. On confirmation,
                                    it would update the referral document with the doctor's ID, which
                                    then triggers the `onReferralAssignment` Cloud Function to
                                    send a notification to the doctor. This guides the admin
                                    to the next logical step.
                                */}
                                Assign to Doctor
                            </DropdownMenuItem>
                            )}
                            {/* == Doctor Workflow Actions == */}
                            {isDoctor && (
                                <>
                                <DropdownMenuItem>Update Status</DropdownMenuItem>
                                <DropdownMenuItem>
                                    {/* This is the primary action for a doctor. It would open
                                        the scheduling modal/page, pre-filled with the patient
                                        and referral info. On save, it would call the
                                        `linkReferralToAppointment` Cloud Function to create the
                                        bidirectional link between the referral and the new appointment.
                                        This provides a clear path from receiving a referral to taking action.
                                    */}
                                    Schedule Appointment
                                </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                    {isDoctor 
                        ? "You have no referrals assigned to you." 
                        : "No referrals found for the current filter."
                    }
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </TooltipProvider>
      </div>
    </div>
  );
}
