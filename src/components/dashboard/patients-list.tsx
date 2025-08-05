
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Patient, Referral } from "@/lib/types"
import { PatientAdmissionForm } from "./patient-admission-form"
import { useToast } from "@/hooks/use-toast"
import { allAdmissions, allPatients, allReferrals } from "@/lib/data"
import { PatientSearchComponent } from "./patient-search";
import { useAuth } from "../auth-provider";
import { DoctorReferralForm } from "./doctor-referral-form";
import { Share2 } from "lucide-react";

type PatientStatus = "Inpatient" | "Outpatient" | "Pending Discharge";

const getStatusBadgeVariant = (status: PatientStatus) => {
    if (status === 'Inpatient') return 'default';
    if (status === 'Pending Discharge') return 'destructive';
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
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);

  const getPatientStatus = (patient: Patient): PatientStatus => {
    const admission = allAdmissions.find(a => a.admissionId === patient.currentAdmissionId);
    if (patient.isAdmitted) {
      if (admission?.status === 'Pending Discharge') {
        return 'Pending Discharge';
      }
      return 'Inpatient';
    }
    return 'Outpatient';
  }
  
  const displayPatients = React.useMemo(() => {
     return patients.map(p => ({ ...p, computedStatus: getPatientStatus(p) }))
  }, [patients])

  const handleAdmissionSuccess = (patientName: string) => {
    setIsAdmissionDialogOpen(false);
    toast({
      title: "Patient Admitted",
      description: `${patientName} has been successfully admitted.`
    });
  }
  
  const handleReferralSuccess = (newReferral: Referral) => {
    setIsReferralDialogOpen(false);
    // In a real app, we would re-fetch referrals data. For now, we just show a toast.
    toast({
        title: "Referral Submitted",
        description: `Referral for ${newReferral.patientDetails.fullName} sent to triage.`
    })
  }
  
  const openReferralDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsReferralDialogOpen(true);
  }

  const getActions = (patient: Patient) => {
    const activeReferral = allReferrals.find(
      (r) => r.patientId === patient.patientId && (r.status === 'Pending' || r.status === 'Assigned')
    );

    switch (user?.role) {
        case 'Admin':
             if (patient.computedStatus === 'Inpatient') {
                return <Button variant="secondary" size="sm" onClick={() => router.push(`/admin/patients/${patient.patientId}/discharge`)}>Finalize Summary</Button>
            }
            if (patient.computedStatus === 'Pending Discharge') {
                return <span className="text-sm text-muted-foreground italic">Awaiting financial clearance</span>
            }
            if (patient.computedStatus === 'Outpatient') {
                return <Button variant="outline" size="sm" onClick={() => { setSelectedPatient(patient); setIsAdmissionDialogOpen(true); }}>Admit</Button>
            }
            return null;
        case 'Doctor':
            if (activeReferral) {
                return (
                    <Badge variant={getReferralStatusVariant(activeReferral.status)}>
                        Referral: {activeReferral.status}
                    </Badge>
                );
            }
            return <Button variant="outline" size="sm" onClick={() => openReferralDialog(patient)}><Share2 className="mr-2 h-4 w-4" />Refer Patient</Button>
        default:
            return null;
    }
  }


  return (
    <>
      <Card>
        <CardHeader className="gap-4">
            <div>
                <CardTitle className="font-headline text-2xl">Patient Records</CardTitle>
                <CardDescription>
                    Search for patients or browse the complete list below.
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
              {displayPatients.length > 0 ? (
                displayPatients.map((patient) => {
                    const admission = allAdmissions.find(a => a.admissionId === patient.currentAdmissionId);
                    return (
                    <TableRow key={patient.patientId}>
                    <TableCell className="font-mono">{patient.patientId}</TableCell>
                    <TableCell className="font-medium">
                        <Link href={`/admin/patients/${patient.patientId}`} className="hover:underline">
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

    </>
  )
}
