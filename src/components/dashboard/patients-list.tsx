

"use client"

import * as React from "react"
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Patient, Referral } from "@/lib/types"
import { PatientAdmissionForm } from "./patient-admission-form"
import { useToast } from "@/hooks/use-toast"
import { allAdmissions, allReferrals } from "@/lib/data"
import { PatientSearchComponent } from "./patient-search";
import { useAuth } from "../auth-provider";
import { DoctorReferralForm } from "./doctor-referral-form";
import { pronouncePatientDeadAction, recommendSurgeryAction } from "@/lib/actions";
import { Share2, MoreHorizontal, BedDouble, LogOut, UserRound, AlertTriangle, HeartOff, HandCoins, Activity, FileHeart } from "lucide-react";


type PatientStatus = "Inpatient" | "Outpatient" | "Pending Discharge" | "Deceased";

const getStatusBadgeVariant = (status: PatientStatus) => {
    if (status === 'Inpatient') return 'default';
    if (status === 'Pending Discharge') return 'destructive';
    if (status === 'Deceased') return 'destructive';
    return 'secondary';
};

const getReferralStatusVariant = (status: Referral['status']) => {
  switch (status) {
    case 'Pending':
      return 'secondary';
    case 'Assigned':
      return 'default';
    default:
      return 'outline';
  }
};


export function PatientsList({ patients }: { patients: Patient[] }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isAdmissionDialogOpen, setIsAdmissionDialogOpen] = React.useState(false);
  const [isReferralDialogOpen, setIsReferralDialogOpen] = React.useState(false);
  const [isDeceasedAlertOpen, setIsDeceasedAlertOpen] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  
  // A local state to manage the patient list to reflect UI changes instantly
  const [displayPatients, setDisplayPatients] = React.useState(patients);

  React.useEffect(() => {
    // This keeps the local state in sync if the parent prop changes
    setDisplayPatients(patients);
  }, [patients]);


  const getPatientStatus = (patient: Patient): PatientStatus => {
    if (patient.status === 'deceased') return 'Deceased';
    const admission = allAdmissions.find(a => a.admissionId === patient.currentAdmissionId);
    if (patient.isAdmitted) {
      if (admission?.status === 'Pending Discharge') {
        return 'Pending Discharge';
      }
      return 'Inpatient';
    }
    return 'Outpatient';
  }
  
  const computedPatients = React.useMemo(() => {
     return displayPatients.map(p => ({ ...p, computedStatus: getPatientStatus(p) }))
  }, [displayPatients]);

  const handleAdmissionSuccess = (patientName: string) => {
    setIsAdmissionDialogOpen(false);
    toast({
      title: "Patient Admitted",
      description: `${patientName} has been successfully admitted.`
    });
    // Refresh local state to show updated status
    setDisplayPatients(prev => [...prev]);
  }
  
  const handleReferralSuccess = (newReferral: Referral) => {
    setIsReferralDialogOpen(false);
    toast({
        title: "Referral Submitted",
        description: `Referral for ${newReferral.patientDetails.fullName} sent to triage.`
    });
     // Refresh local state to show updated status
    setDisplayPatients(prev => [...prev]);
  }
  
  const handleRecommendSurgery = async (patientId: string) => {
    const result = await recommendSurgeryAction(patientId);
     toast({
      title: result.success ? "Surgery Recommended" : "Action Failed",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  }

  const handlePronounceDead = async (patientId: string) => {
    const result = await pronouncePatientDeadAction(patientId);
    toast({
      title: result.success ? "Action Recorded" : "Action Failed",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
     if (result.success) {
      // Find and update the patient in the local state
      setDisplayPatients(prev => 
        prev.map(p => p.patientId === patientId ? { ...p, status: 'deceased' } : p)
      );
    }
    setIsDeceasedAlertOpen(false);
    setSelectedPatient(null);
  }

  
  const openReferralDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsReferralDialogOpen(true);
  }
  
  const openAdmissionDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsAdmissionDialogOpen(true);
  }

  const openDeceasedDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDeceasedAlertOpen(true);
  }

  const getPatientLink = (patientId: string) => {
    const rolePrefix = user?.role?.toLowerCase() || 'admin';
    if (rolePrefix === 'doctor') {
      return `/doctor/patients/${patientId}`;
    }
    // Default for admin and other roles that might view this page
    return `/admin/patients/${patientId}`;
  }

  const getEhrLink = (patientId: string) => {
    return `${getPatientLink(patientId)}/ehr`;
  }

  const getActions = (patient: Patient & { computedStatus: PatientStatus }) => {
    const activeReferral = allReferrals.find(
      (r) => r.patientId === patient.patientId && (r.status === 'Pending' || r.status === 'Assigned')
    );
    
    if (patient.computedStatus === 'Deceased') {
      return <Badge variant="destructive">Deceased</Badge>;
    }

    const commonActions = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(getPatientLink(patient.patientId))}>
                    <UserRound className="mr-2 h-4 w-4" />
                    View Details
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => router.push(getEhrLink(patient.patientId))}>
                    <FileHeart className="mr-2 h-4 w-4" />
                    View Full EHR
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />

                {patient.computedStatus === 'Outpatient' && (
                  <>
                    <DropdownMenuItem onClick={() => openAdmissionDialog(patient)}>
                       <BedDouble className="mr-2 h-4 w-4" />
                       Admit Patient
                    </DropdownMenuItem>
                    {!activeReferral && (
                      <DropdownMenuItem onClick={() => openReferralDialog(patient)}>
                         <Share2 className="mr-2 h-4 w-4" />
                         Refer Patient
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                 
                {patient.computedStatus === 'Inpatient' && (
                  <>
                    <DropdownMenuItem onClick={() => router.push(`/admin/patients/${patient.patientId}/discharge`)}>
                       <LogOut className="mr-2 h-4 w-4" />
                       Finalize Discharge
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRecommendSurgery(patient.patientId)}>
                        <Activity className="mr-2 h-4 w-4" />
                        Recommend Surgery
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => openDeceasedDialog(patient)}>
                   <HeartOff className="mr-2 h-4 w-4" />
                   Pronounce Patient Dead
                </DropdownMenuItem>

            </DropdownMenuContent>
        </DropdownMenu>
    );

    switch (user?.role) {
        case 'Admin':
             if (patient.computedStatus === 'Inpatient') {
                return <Button variant="secondary" size="sm" onClick={() => router.push(`/admin/patients/${patient.patientId}/discharge`)}>Discharge</Button>
            }
            if (patient.computedStatus === 'Pending Discharge') {
                 return (
                    <Button size="sm" variant="destructive" onClick={() => router.push(`/admin/billing`)}>
                        <HandCoins className="mr-2 h-4 w-4" />
                        Clear Bill
                    </Button>
                );
            }
            if (patient.computedStatus === 'Outpatient') {
                return <Button variant="outline" size="sm" onClick={() => { openAdmissionDialog(patient) }}>Admit</Button>
            }
            return null;
        case 'Doctor':
            return (
              <div className="flex items-center justify-end gap-2">
                {activeReferral && (
                  <Badge variant={getReferralStatusVariant(activeReferral.status)} className="hidden md:inline-flex">
                    Referral: {activeReferral.status}
                  </Badge>
                )}
                {commonActions}
              </div>
            );
        default:
            // For Nurse, Patient, etc., a simple view action.
             return (
                <Button variant="outline" size="sm" onClick={() => router.push(getPatientLink(patient.patientId))}>
                    <UserRound className="mr-2 h-4 w-4" />
                    View
                </Button>
             );
    }
  }


  return (
    <>
      <Card>
        <CardHeader className="gap-4">
            <div>
                <CardTitle className="font-headline text-2xl">Patient Records</CardTitle>
                <CardDescription>
                    Search for patients or browse the complete list below. Use the actions menu to manage patients.
                </CardDescription>
            </div>
            <div className="flex items-center justify-between gap-4">
                <PatientSearchComponent />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Bed</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {computedPatients.length > 0 ? (
                computedPatients.map((patient) => {
                    const admission = allAdmissions.find(a => a.admissionId === patient.currentAdmissionId);
                    return (
                    <TableRow key={patient.patientId} className={patient.computedStatus === 'Deceased' ? 'bg-muted/50 text-muted-foreground' : ''}>
                    <TableCell className="font-mono">{patient.patientId}</TableCell>
                    <TableCell className="font-medium">
                        <Link href={getPatientLink(patient.patientId)} className="hover:underline">
                        {patient.fullName}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <Badge variant={getStatusBadgeVariant(patient.computedStatus)}>{patient.computedStatus}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {patient.isAdmitted ? (admission?.bedId || 'N/A') : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {patient.contact.primaryPhone}
                    </TableCell>
                    <TableCell className="text-right">
                        {getActions(patient)}
                    </TableCell>
                    </TableRow>
                    )
                })
               ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No patients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAdmissionDialogOpen} onOpenChange={setIsAdmissionDialogOpen}>
        <DialogContent>
           <DialogHeader>
            <DialogTitle>Admit Patient: {selectedPatient?.fullName}</DialogTitle>
            <DialogDescription>
              Fill out the admission details below.
            </DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <PatientAdmissionForm 
              patient={selectedPatient} 
              onFormSubmit={() => handleAdmissionSuccess(selectedPatient.fullName)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isReferralDialogOpen} onOpenChange={setIsReferralDialogOpen}>
        <DialogContent>
           <DialogHeader>
            <DialogTitle>Create Outgoing Referral</DialogTitle>
            <DialogDescription>
              Complete the form to refer {selectedPatient?.fullName} to another department or facility.
            </DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <DoctorReferralForm
              patient={selectedPatient} 
              onFormSubmit={handleReferralSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeceasedAlertOpen} onOpenChange={setIsDeceasedAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 text-destructive" />
                Confirm Critical Action
            </AlertDialogTitle>
            <AlertDialogDescription>
                This action will permanently mark {selectedPatient?.fullName} as deceased. The record will become read-only. This cannot be undone. Are you absolutely sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPatient(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => handlePronounceDead(selectedPatient!.patientId)}
            >
              Confirm and Pronounce Deceased
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
