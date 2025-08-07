
"use client";

import { AlertCircle, FileText, HeartPulse, Microscope, Pill, Stethoscope, User, NotebookPen, CalendarClock, PlusCircle } from "lucide-react";
import type { Patient, ClinicalNote, MedicationHistory, LabResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "../ui/button";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "../ui/badge";
import * as React from "react";
import { useAuth } from "../auth-provider";
import { allClinicalNotes, allLabResults, allMedications } from "@/lib/data";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClinicalNoteForm } from "./clinical-note-form";
import { MedicationForm } from "./medication-form";
import { LabRequestForm } from "./lab-request-form";

export function EhrDashboard({ patient }: { patient: Patient }) {
  const { user } = useAuth();
  const [patientClinicalNotes, setPatientClinicalNotes] = React.useState<ClinicalNote[]>(() => allClinicalNotes.filter(n => n.patientId === patient.patientId).sort((a,b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()));
  const [patientMedications, setPatientMedications] = React.useState<MedicationHistory[]>(() => allMedications.filter(m => m.patientId === patient.patientId).sort((a,b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime()));
  const [patientLabResults, setPatientLabResults] = React.useState<LabResult[]>(() => allLabResults.filter(l => l.patientId === patient.patientId).sort((a,b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()));

  const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false);
  const [isMedDialogOpen, setIsMedDialogOpen] = React.useState(false);
  const [isLabDialogOpen, setIsLabDialogOpen] = React.useState(false);

  const isClinician = user?.role === 'Doctor' || user?.role === 'Nurse';
  
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
  
  const getPatientDetailsLinkPath = () => {
    const base = user?.role === 'Doctor' ? '/doctor' : '/admin';
    return `${base}/patients/${patient.patientId}`;
  }

  const handleNoteAdded = (newNote: ClinicalNote) => {
    setPatientClinicalNotes(prev => [newNote, ...prev]);
    setIsNoteDialogOpen(false);
  }

  const handleMedicationAdded = (newMed: MedicationHistory) => {
    setPatientMedications(prev => [newMed, ...prev]);
    setIsMedDialogOpen(false);
  }

  const handleLabRequestAdded = (newLab: LabResult) => {
    setPatientLabResults(prev => [newLab, ...prev]);
    setIsLabDialogOpen(false);
  }

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
                <User className="mr-2 h-4 w-4" />
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

      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
            <TabsTrigger value="meds">Medication</TabsTrigger>
            <TabsTrigger value="labs">Lab Results</TabsTrigger>
        </TabsList>
        <TabsContent value="vitals" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Vitals</CardTitle>
                    <CardDescription>This feature is coming soon.</CardDescription>
                </CardHeader>
                 <CardContent className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <CalendarClock className="w-10 h-10 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Vital signs monitoring will be available here.</p>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
             <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Clinical Notes</CardTitle>
                        <CardDescription>A log of all clinical notes and observations.</CardDescription>
                    </div>
                    {isClinician && (
                       <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add New Note
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                               <DialogHeader>
                                <DialogTitle>New Clinical Note</DialogTitle>
                                <DialogDescription>
                                  Record a new note for {patient.fullName}.
                                </DialogDescription>
                              </DialogHeader>
                              <ClinicalNoteForm patient={patient} onNoteAdded={handleNoteAdded} />
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    {patientClinicalNotes.length > 0 ? (
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {patientClinicalNotes.map(note => (
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
                            <NotebookPen className="w-10 h-10 text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">No clinical notes recorded for this patient.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="meds" className="mt-4">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Medication</CardTitle>
                        <CardDescription>Active and past prescriptions.</CardDescription>
                    </div>
                     {isClinician && (
                       <Dialog open={isMedDialogOpen} onOpenChange={setIsMedDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Prescribe
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                               <DialogHeader>
                                <DialogTitle>Prescribe Medication</DialogTitle>
                                <DialogDescription>
                                  Create a new prescription for {patient.fullName}.
                                </DialogDescription>
                              </DialogHeader>
                              <MedicationForm patient={patient} onMedicationAdded={handleMedicationAdded} />
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                 <CardContent>
                    {patientMedications.length > 0 ? (
                         <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {patientMedications.map(med => (
                                <div key={med.prescriptionId} className="border-l-4 pl-4 py-2">
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-semibold">{med.medicationName} ({med.dosage})</p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(med.prescribedAt), 'PPP p')}</p>
                                    </div>
                                    <p className="text-sm mt-1">Frequency: {med.frequency}</p>
                                     <p className="text-sm text-muted-foreground mt-1">Instructions: {med.instructions}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <Pill className="w-10 h-10 text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">No medication history recorded.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="labs" className="mt-4">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Lab Results</CardTitle>
                        <CardDescription>Ordered lab tests and their results.</CardDescription>
                    </div>
                     {isClinician && (
                       <Dialog open={isLabDialogOpen} onOpenChange={setIsLabDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Order Test
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                               <DialogHeader>
                                <DialogTitle>Order Lab Test</DialogTitle>
                                <DialogDescription>
                                  Request a new lab test for {patient.fullName}.
                                </DialogDescription>
                              </DialogHeader>
                              <LabRequestForm patient={patient} onLabRequestAdded={handleLabRequestAdded} />
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    {patientLabResults.length > 0 ? (
                         <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {patientLabResults.map(lab => (
                                <div key={lab.testId} className="border-l-4 pl-4 py-2">
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-semibold">{lab.testName}</p>
                                        <Badge variant={lab.status === 'Completed' ? 'default' : 'secondary'}>{lab.status}</Badge>
                                    </div>
                                    <p className="text-sm mt-1">
                                        Result: {lab.result || 'Pending'} {lab.units}
                                    </p>
                                     <p className="text-xs text-muted-foreground mt-1">
                                        Ordered: {format(new Date(lab.orderedAt), 'PPP p')}
                                        {lab.completedAt && ` | Completed: ${format(new Date(lab.completedAt), 'PPP p')}`}
                                     </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <Microscope className="w-10 h-10 text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">No lab results found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    