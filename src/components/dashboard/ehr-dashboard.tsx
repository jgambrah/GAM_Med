
"use client";

import { AlertCircle, FileText, HeartPulse, Microscope, Pill, Stethoscope, User, PlusCircle, Notebook, UserRound, FlaskConical, Beaker } from "lucide-react";
import type { Patient, ClinicalNote, MedicationHistory, LabResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "../ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "../ui/badge";
import * as React from "react";
import { useAuth } from "../auth-provider";
import { allClinicalNotes, allMedications, allLabResults } from "@/lib/data";
import { format } from "date-fns";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { ClinicalNoteForm } from "./clinical-note-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MedicationForm } from "./medication-form";
import { LabRequestForm } from "./lab-request-form";

export function EhrDashboard({ patient }: { patient: Patient }) {
  const { user } = useAuth();
  
  // State for dialogs
  const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false);
  const [isMedicationDialogOpen, setIsMedicationDialogOpen] = React.useState(false);
  const [isLabDialogOpen, setIsLabDialogOpen] = React.useState(false);
  
  // State for data
  const [patientNotes, setPatientNotes] = React.useState<ClinicalNote[]>(() => 
    allClinicalNotes.filter(n => n.patientId === patient.patientId).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
  );
  const [patientMedications, setPatientMedications] = React.useState<MedicationHistory[]>(() =>
    allMedications.filter(m => m.patientId === patient.patientId).sort((a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime())
  );
  const [patientLabResults, setPatientLabResults] = React.useState<LabResult[]>(() =>
    allLabResults.filter(l => l.patientId === patient.patientId).sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())
  );
  
  const getAge = (dob: Date) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  
  // --- Handlers for form submissions to update state ---
  const handleNoteAdded = (newNote: ClinicalNote) => {
    setPatientNotes(prev => [newNote, ...prev]);
    setIsNoteDialogOpen(false);
  }

  const handleMedicationAdded = (newMed: MedicationHistory) => {
    setPatientMedications(prev => [newMed, ...prev]);
    setIsMedicationDialogOpen(false);
  }
  
  const handleLabRequestAdded = (newLab: LabResult) => {
    setPatientLabResults(prev => [newLab, ...prev]);
    setIsLabDialogOpen(false);
  }

  const getPatientDetailsLinkPath = () => {
    const base = user?.role === 'Doctor' ? '/doctor' : '/admin';
    return `${base}/patients/${patient.patientId}`;
  }

  const isClinician = user?.role === 'Doctor' || user?.role === 'Nurse';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 border">
              <AvatarImage src={`https://placehold.co/100x100/E3F2FD/333?text=${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`} alt={patient.fullName} data-ai-hint="avatar profile" />
              <AvatarFallback>{patient.firstName.charAt(0)}{patient.lastName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold font-headline">{patient.fullName}</h1>
              <p className="text-muted-foreground">
                Patient ID: {patient.patientId} | {patient.gender}, {getAge(patient.dob)} years old
              </p>
            </div>
        </div>
        <Button variant="outline" asChild>
            <Link href={getPatientDetailsLinkPath()}>
                <UserRound className="mr-2 h-4 w-4" />
                Back to Patient Details
            </Link>
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Primary Diagnosis</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Acute Myocardial Infarction</div>
            <p className="text-xs text-muted-foreground">ICD-10: I21.9</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Allergies</CardTitle>
             <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-lg font-bold">Penicillin, Sulfa</div>
            <p className="text-xs text-muted-foreground">Recorded: 2024-01-15</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Blood Type</CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">O+</div>
            <p className="text-xs text-muted-foreground">Universal Donor</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notes">
        <TabsList>
            <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="labs">Lab Results</TabsTrigger>
        </TabsList>
        <TabsContent value="notes">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Clinical Notes</CardTitle>
                        <CardDescription>A log of all clinical notes and observations.</CardDescription>
                    </div>
                    {isClinician && (
                        <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Note</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Add Clinical Note for {patient.fullName}</DialogTitle>
                                  <DialogDescription>Fill out the note details below. The note will be time-stamped upon saving.</DialogDescription>
                                </DialogHeader>
                                <ClinicalNoteForm patient={patient} onNoteAdded={handleNoteAdded} />
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    {patientNotes.length > 0 ? (
                        <div className="space-y-4">
                            {patientNotes.map(note => (
                                <div key={note.noteId} className="border-l-4 pl-4 py-2">
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-semibold">{note.noteType}</p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(note.recordedAt), 'PPP p')} by {note.recordedByUserName}</p>
                                    </div>
                                    <p className="text-sm mt-1">{note.noteText}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <Notebook className="w-10 h-10 text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">No clinical notes recorded.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="medications">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Medications</CardTitle>
                        <CardDescription>Current and past prescribed medications.</CardDescription>
                    </div>
                     {isClinician && (
                        <Dialog open={isMedicationDialogOpen} onOpenChange={setIsMedicationDialogOpen}>
                            <DialogTrigger asChild><Button><Pill className="mr-2 h-4 w-4" /> Prescribe Medication</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Prescribe Medication for {patient.fullName}</DialogTitle>
                                  <DialogDescription>Enter the medication details. The prescription will be sent to the pharmacy module upon saving.</DialogDescription>
                                </DialogHeader>
                                <MedicationForm patient={patient} onMedicationAdded={handleMedicationAdded} />
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Medication</TableHead><TableHead>Dosage</TableHead><TableHead>Status</TableHead><TableHead>Prescribed On</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {patientMedications.length > 0 ? patientMedications.map(med => (
                                <TableRow key={med.prescriptionId}>
                                    <TableCell className="font-medium">{med.medicationName}</TableCell>
                                    <TableCell>{med.dosage}</TableCell>
                                    <TableCell><Badge variant={med.status === 'Active' ? 'default' : 'secondary'}>{med.status}</Badge></TableCell>
                                    <TableCell>{format(new Date(med.prescribedAt), 'PPP')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No medications prescribed.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="labs">
           <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Lab Results</CardTitle>
                        <CardDescription>Ordered tests and their results.</CardDescription>
                    </div>
                    {isClinician && (
                        <Dialog open={isLabDialogOpen} onOpenChange={setIsLabDialogOpen}>
                            <DialogTrigger asChild><Button><FlaskConical className="mr-2 h-4 w-4" /> Order Lab Test</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Order Lab Test for {patient.fullName}</DialogTitle>
                                  <DialogDescription>Select a test and provide a reason. The request will be sent to the laboratory module.</DialogDescription>
                                </DialogHeader>
                                <LabRequestForm patient={patient} onLabRequestAdded={handleLabRequestAdded} />
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader><TableRow><TableHead>Test Name</TableHead><TableHead>Status</TableHead><TableHead>Result</TableHead><TableHead>Ordered On</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {patientLabResults.length > 0 ? patientLabResults.map(lab => (
                                <TableRow key={lab.testId}>
                                    <TableCell className="font-medium">{lab.testName}</TableCell>
                                    <TableCell><Badge variant={lab.status === 'Completed' ? 'outline' : 'secondary'}>{lab.status}</TableCell>
                                    <TableCell>{lab.result || 'N/A'}</TableCell>
                                    <TableCell>{format(new Date(lab.orderedAt), 'PPP')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No lab tests ordered.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
