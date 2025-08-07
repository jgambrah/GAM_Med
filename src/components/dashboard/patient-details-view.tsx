
"use client";

import { allAdmissions, allClinicalNotes, allLabResults, allMedications } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Hospital, Stethoscope, FileText, Activity, UserRound, Pill, Microscope, NotebookPen, CalendarClock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/lib/types";
import { useAuth } from "../auth-provider";

export function PatientDetailsView({ patient }: { patient: Patient }) {
  const { user } = useAuth();
  const patientAdmissions = allAdmissions.filter(a => a.patientId === patient.patientId);
  const currentAdmission = patient.isAdmitted ? patientAdmissions.find(a => a.admissionId === patient.currentAdmissionId) : null;
  const clinicalNotes = allClinicalNotes.filter(n => n.patientId === patient.patientId);
  
  const getAge = (dob: Date) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  }
  
  const getEhrLink = () => {
    const base = user?.role === 'Doctor' ? '/doctor' : '/admin';
    return `${base}/patients/${patient.patientId}/ehr`;
  }

  return (
    <div className="space-y-6">
       <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-24 w-24 border">
              <AvatarImage src={`https://placehold.co/100x100/E3F2FD/333?text=${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`} alt={patient.fullName} data-ai-hint="avatar profile" />
              <AvatarFallback>{patient.firstName.charAt(0)}{patient.lastName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold font-headline">{patient.fullName}</h1>
              <p className="text-muted-foreground">ID: {patient.patientId} &bull; {getAge(patient.dob)} years old</p>
               {patient.isAdmitted && currentAdmission ? (
                <Badge className="mt-2">
                    <Hospital className="mr-2 h-3 w-3" />
                    Admitted to {currentAdmission.ward}, Bed {currentAdmission.bedId}
                </Badge>
              ) : (
                <Badge variant="secondary" className="mt-2">
                  <Stethoscope className="mr-2 h-3 w-3" />
                  Outpatient
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
                <Link href={getEhrLink()}>
                    <Activity className="mr-2 h-4 w-4" />
                    View Full EHR
                </Link>
            </Button>
           </div>
       </div>

      <Tabs defaultValue="notes">
        <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="meds">Medication</TabsTrigger>
            <TabsTrigger value="labs">Labs</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
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
                <CardHeader>
                    <CardTitle>Clinical Notes</CardTitle>
                    <CardDescription>A log of all clinical notes and observations.</CardDescription>
                </CardHeader>
                <CardContent>
                    {clinicalNotes.length > 0 ? (
                        <div className="space-y-4">
                            {clinicalNotes.map(note => (
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
                <CardHeader>
                    <CardTitle>Medication</CardTitle>
                    <CardDescription>This feature is coming soon.</CardDescription>
                </CardHeader>
                 <CardContent className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <Pill className="w-10 h-10 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Active and past prescriptions will be listed here.</p>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="labs" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Lab Results</CardTitle>
                    <CardDescription>This feature is coming soon.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <Microscope className="w-10 h-10 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Ordered lab tests and their results will appear here.</p>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="history" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Admission History</CardTitle>
                    <CardDescription>A log of all past and current admissions for this patient.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Admission ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Ward</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Summary</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {patientAdmissions.length > 0 ? (
                                patientAdmissions.map((admission) => (
                                    <TableRow key={admission.admissionId}>
                                        <TableCell className="font-mono">{admission.admissionId}</TableCell>
                                        <TableCell>{format(new Date(admission.admissionDate), "PPP")}</TableCell>
                                        <TableCell>{admission.ward || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={admission.dischargeDate ? "secondary" : "default"}>
                                                {admission.dischargeDate ? `Discharged on ${format(new Date(admission.dischargeDate!), "PPP")}` : admission.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {admission.summaryPDF_URL ? (
                                            <Button variant="outline" size="sm" asChild>
                                              <Link href={admission.summaryPDF_URL} target="_blank">
                                                <FileText className="mr-2 h-4 w-4" />
                                                View PDF
                                              </Link>
                                            </Button>
                                          ) : (
                                            <span className="text-muted-foreground">N/A</span>
                                          )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No admission history found.
                                    </TableCell>
                                </TableRow>
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
