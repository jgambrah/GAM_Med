
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
import type { Patient } from "@/lib/types"
import { PatientAdmissionForm } from "./patient-admission-form"
import { useToast } from "@/hooks/use-toast"
import { allAdmissions, allPatients } from "@/lib/data"
import { PatientSearchComponent } from "./patient-search";

type PatientStatus = "Inpatient" | "Outpatient" | "Pending Discharge";

const getStatusBadgeVariant = (status: PatientStatus) => {
    if (status === 'Inpatient') return 'default';
    if (status === 'Pending Discharge') return 'destructive';
    return 'secondary';
};


export function PatientsList({ patients }: { patients: Patient[] }) {
  const router = useRouter();
  const [isAdmissionDialogOpen, setIsAdmissionDialogOpen] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  const { toast } = useToast();

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
  
  // The search component now handles filtering, so we just use the full list here
  // and map the status onto it.
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
                        {patient.computedStatus === 'Inpatient' && (
                           <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={() => router.push(`/admin/patients/${patient.patientId}/discharge`)}
                            >
                                Finalize Summary
                            </Button>
                        )}
                         {patient.computedStatus === 'Pending Discharge' && (
                             <span className="text-sm text-muted-foreground italic">Awaiting financial clearance</span>
                         )}
                        {patient.computedStatus === 'Outpatient' && (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                setSelectedPatient(patient);
                                setIsAdmissionDialogOpen(true);
                                }}
                            >
                                Admit
                            </Button>
                        )}
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
      
    </>
  )
}
