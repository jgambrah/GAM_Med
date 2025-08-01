"use client"

import * as React from "react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Patient } from "@/lib/types"
import { PatientAdmissionForm } from "./patient-admission-form"
import { useToast } from "@/hooks/use-toast"
import { allAdmissions } from "@/lib/data"
import { dischargePatientAction } from "@/lib/actions"
import { Loader2 } from "lucide-react"

const getStatusBadgeVariant = (isAdmitted: boolean) => {
    return isAdmitted ? 'default' : 'secondary';
};


export function PatientsList({ patients }: { patients: Patient[] }) {
  const [isAdmissionDialogOpen, setIsAdmissionDialogOpen] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  const [isDischarging, setIsDischarging] = React.useState<string | null>(null);
  const { toast } = useToast();

  const handleAdmissionSuccess = (patientName: string) => {
    setIsAdmissionDialogOpen(false);
    toast({
      title: "Patient Admitted",
      description: `${patientName} has been successfully admitted.`
    });
    // In a real app, you would re-fetch data here.
  }
  
  const handleDischarge = async (patient: Patient) => {
    if (!patient.currentAdmissionId) {
       toast({ variant: "destructive", title: "Error", description: "No active admission found for this patient." });
       return;
    }
    setIsDischarging(patient.patientId);
    try {
        const result = await dischargePatientAction(patient.patientId, patient.currentAdmissionId);
        if (result.success) {
            toast({ title: "Patient Discharged", description: result.message });
        } else {
            toast({ variant: "destructive", title: "Discharge Failed", description: result.message });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
    } finally {
        setIsDischarging(null);
    }
  }


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Patients</CardTitle>
          <CardDescription>
            A list of all patients in the system.
          </CardDescription>
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
              {patients.map((patient) => (
                <TableRow key={patient.patientId}>
                  <TableCell className="font-mono">{patient.patientId}</TableCell>
                  <TableCell className="font-medium">{patient.fullName}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(patient.isAdmitted)}>{patient.isAdmitted ? 'Inpatient' : 'Outpatient'}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {patient.currentAdmissionId ? (allAdmissions.find(a => a.admissionId === patient.currentAdmissionId)?.bedId || 'N/A') : 'N/A'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {patient.contact.phone}
                  </TableCell>
                  <TableCell className="text-right">
                    {patient.isAdmitted ? (
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button 
                              variant="destructive" 
                              size="sm"
                              disabled={isDischarging === patient.patientId}
                            >
                                {isDischarging === patient.patientId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Discharge
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will discharge {patient.fullName}. This will update the patient's record and free up their assigned bed. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDischarge(patient)}>
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
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
              ))}
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
