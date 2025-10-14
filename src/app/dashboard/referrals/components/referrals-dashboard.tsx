
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
import { Referral, Patient } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ReferralDetailDialog } from './referral-detail-dialog';
import { AssignDoctorDialog } from './assign-doctor-dialog';
import { NewAppointmentDialog } from '@/app/dashboard/appointments/components/new-appointment-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { RegisterPatientFromReferralDialog } from './register-patient-from-referral-dialog';
import Link from 'next/link';


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

function UpdateReferralStatusDialog({ referral, isOpen, onOpenChange, onStatusUpdate }: { referral: Referral, isOpen: boolean, onOpenChange: (isOpen: boolean) => void, onStatusUpdate: (referralId: string, newStatus: Referral['status']) => void }) {
    const [newStatus, setNewStatus] = React.useState<Referral['status'] | ''>('');

    const handleUpdate = () => {
        if (!newStatus) {
            toast.error("Please select a new status.");
            return;
        }
        onStatusUpdate(referral.referral_id, newStatus);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Referral Status</DialogTitle>
                    <DialogDescription>Update the status for the referral for {referral.patientDetails.name}.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                     <Select onValueChange={(value) => setNewStatus(value as Referral['status'])}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a new status..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Scheduled">Appointment Scheduled</SelectItem>
                            <SelectItem value="Completed">Action Completed</SelectItem>
                            <SelectItem value="Pending Further Action">Pending Further Action</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleUpdate} disabled={!newStatus}>Update Status</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface ReferralsDashboardProps {
  allReferrals: Referral[];
  setAllReferrals: React.Dispatch<React.SetStateAction<Referral[]>>;
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
export function ReferralsDashboard({ allReferrals, setAllReferrals }: ReferralsDashboardProps) {
  const { user } = useAuth();
  const [filter, setFilter] = React.useState<StatusFilter>('Pending Review');
  const [displayReferrals, setDisplayReferrals] = React.useState<Referral[]>([]);
  const [selectedReferral, setSelectedReferral] = React.useState<Referral | null>(null);
  const [dialogState, setDialogState] = React.useState<'detail' | 'assign' | 'schedule' | 'statusUpdate' | null>(null);
  const [allPatients, setAllPatients] = useLocalStorage<Patient[]>('patients', []);
  const isDoctor = user?.role === 'doctor';

  const openDialog = (referral: Referral, dialog: 'detail' | 'assign' | 'schedule' | 'statusUpdate') => {
    setSelectedReferral(referral);
    setDialogState(dialog);
  }

  const closeDialogs = () => {
    setSelectedReferral(null);
    setDialogState(null);
  }
  
   React.useEffect(() => {
    let filteredList = allReferrals;
    if (isDoctor) {
      filteredList = allReferrals.filter(r => r.assignedDoctorId === user.uid);
    } else {
      if (filter !== 'All') {
        filteredList = allReferrals.filter(r => r.status === filter);
      }
    }
    setDisplayReferrals(filteredList);
  }, [user, filter, isDoctor, allReferrals]);

  const handleReferralAssigned = (referralId: string, doctorId: string, doctorName: string) => {
    setAllReferrals(prev => prev.map(ref => 
        ref.referral_id === referralId 
            ? { ...ref, status: 'Assigned', assignedDoctorId: doctorId, assignedDoctorName: doctorName } 
            : ref
    ));
    closeDialogs();
  };

  const handleStatusUpdate = (referralId: string, newStatus: Referral['status']) => {
    setAllReferrals(prev => prev.map(ref => 
        ref.referral_id === referralId ? { ...ref, status: newStatus } : ref
    ));
    toast.success(`Referral status updated to "${newStatus}".`);
    closeDialogs();
  }

  const handlePatientRegistered = (referralId: string, newPatient: Patient) => {
    setAllPatients(prev => [newPatient, ...prev]);
    setAllReferrals(prev => prev.map(ref =>
        ref.referral_id === referralId ? { ...ref, patientId: newPatient.patient_id } : ref
    ));
    closeDialogs();
    toast.success("Patient registered. You can now book their appointment.");
  }

  const handleAppointmentBooked = (appointmentId: string, patientId: string) => {
    // Find the referral associated with this patient and update its status
    const referralToUpdate = allReferrals.find(r => r.patientId === patientId && r.status === 'Assigned');
    if (referralToUpdate) {
        handleStatusUpdate(referralToUpdate.referral_id, 'Scheduled');
    }
    closeDialogs();
  };


  return (
    <>
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
                {displayReferrals.length > 0 ? (
                displayReferrals.map((referral) => (
                    <TableRow key={referral.referral_id}>
                    <TableCell className="font-medium">
                        {format(new Date(referral.referralDate), 'PPP')}
                    </TableCell>
                     <TableCell>
                        {referral.patientId ? (
                            <Link href={`/dashboard/patients/${referral.patientId}`} className="font-medium underline text-primary">
                                {referral.patientDetails.name}
                            </Link>
                        ) : (
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
                        )}
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
                             <DropdownMenuItem onSelect={() => openDialog(referral, 'detail')}>
                                View Full Details
                             </DropdownMenuItem>
                            {!isDoctor && (
                            <DropdownMenuItem onSelect={() => openDialog(referral, 'assign')} disabled={referral.status !== 'Pending Review'}>
                                Assign to Doctor
                            </DropdownMenuItem>
                            )}
                            {isDoctor && (
                                <>
                                <DropdownMenuItem onSelect={() => openDialog(referral, 'statusUpdate')}>Update Status</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openDialog(referral, 'schedule')}>
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
    {selectedReferral && (
        <>
            <ReferralDetailDialog
                referral={selectedReferral}
                isOpen={dialogState === 'detail'}
                onOpenChange={closeDialogs}
            />
            <AssignDoctorDialog
                referral={selectedReferral}
                isOpen={dialogState === 'assign'}
                onOpenChange={closeDialogs}
                onAssigned={handleReferralAssigned}
            />
            <UpdateReferralStatusDialog 
                referral={selectedReferral}
                isOpen={dialogState === 'statusUpdate'}
                onOpenChange={closeDialogs}
                onStatusUpdate={handleStatusUpdate}
            />
            {dialogState === 'schedule' && (
                selectedReferral.patientId ? (
                     <NewAppointmentDialog
                        isOpen={true}
                        onOpenChange={closeDialogs}
                        patientId={selectedReferral.patientId}
                        doctorId={selectedReferral.assignedDoctorId}
                        onAppointmentBooked={handleAppointmentBooked}
                    />
                ) : (
                    <RegisterPatientFromReferralDialog
                        referral={selectedReferral}
                        isOpen={true}
                        onOpenChange={closeDialogs}
                        onPatientRegistered={handlePatientRegistered}
                    />
                )
            )}
        </>
    )}
    </>
  );
}
