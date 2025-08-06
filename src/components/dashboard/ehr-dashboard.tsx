
"use client";

import { AlertCircle, FileText, HeartPulse, Microscope, Pill, Stethoscope, User, PlusCircle, Notebook } from "lucide-react";
import type { Patient, ClinicalNote } from "@/lib/types";
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
import { allClinicalNotes } from "@/lib/data";
import { format } from "date-fns";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { ClinicalNoteForm } from "./clinical-note-form";
import { usePathname } from "next/navigation";


export function EhrDashboard({ patient }: { patient: Patient }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false);
  
  // In a real app, this would be a fetch. For now, we filter the mock data.
  const [patientNotes, setPatientNotes] = React.useState<ClinicalNote[]>(() => 
    allClinicalNotes.filter(n => n.patientId === patient.patientId)
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
  
  const handleNoteAdded = (newNote: ClinicalNote) => {
    setPatientNotes(prev => [newNote, ...prev]);
    setIsNoteDialogOpen(false);
  }

  const getPatientDetailsLinkPath = () => {
    // We can determine the base path from the current URL to be safe
    const basePath = pathname.includes('/doctor/') ? `/doctor/patients/${patient.patientId}` : `/admin/patients/${patient.patientId}`;
    return basePath;
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

       <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Clinical Notes</CardTitle>
            <CardDescription>A log of all clinical notes and observations.</CardDescription>
          </div>
          {(user?.role === 'Doctor' || user?.role === 'Nurse') && (
            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Note
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Clinical Note</DialogTitle>
                        <DialogDescription>
                            Record a new progress, consultation, or other note for {patient.fullName}.
                        </DialogDescription>
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
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(note.recordedAt), 'PPP p')} by {note.recordedByUserName}
                                </p>
                            </div>
                            <p className="text-sm mt-1">{note.noteText}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <Notebook className="w-10 h-10 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">No clinical notes recorded for this patient.</p>
                </div>
            )}
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Medications</CardTitle>
          <CardDescription>Current and past prescribed medications.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medication</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prescribed On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Lisinopril</TableCell>
                <TableCell>10mg</TableCell>
                <TableCell><Badge>Active</Badge></TableCell>
                <TableCell>2024-07-20</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Aspirin</TableCell>
                <TableCell>81mg</TableCell>
                <TableCell><Badge>Active</Badge></TableCell>
                <TableCell>2024-07-20</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
