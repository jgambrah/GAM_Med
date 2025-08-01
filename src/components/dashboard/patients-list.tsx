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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Patient } from "@/lib/types"
import { PatientAdmissionForm } from "./patient-admission-form"
import { useToast } from "@/hooks/use-toast"

const getStatusBadgeVariant = (isAdmitted: boolean) => {
    return isAdmitted ? 'default' : 'secondary';
};


export function PatientsList({ patients }: { patients: Patient[] }) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  const { toast } = useToast();

  const handleAdmissionSuccess = (patientName: string) => {
    setIsDialogOpen(false);
    toast({
      title: "Patient Admitted",
      description: `${patientName} has been successfully admitted.`
    });
    // In a real app, you would re-fetch data here.
    // For now, we rely on the parent component re-rendering if state changes.
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
                    {!patient.isAdmitted && (
                       <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setIsDialogOpen(true);
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
