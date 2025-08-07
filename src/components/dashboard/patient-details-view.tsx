
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

      <Tabs defaultValue="history">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Patient Info</TabsTrigger>
            <TabsTrigger value="history">Admission History</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Patient Information</CardTitle>
                    <CardDescription>Demographic and contact details.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="font-semibold">Gender:</span> {patient.gender}</div>
                        <div><span className="font-semibold">DOB:</span> {format(patient.dob, "PPP")}</div>
                        <div><span className="font-semibold">Phone:</span> {patient.contact.primaryPhone}</div>
                        <div><span className="font-semibold">Email:</span> {patient.contact.email || 'N/A'}</div>
                        <div className="col-span-2"><span className="font-semibold">Address:</span> {patient.address.street}, {patient.address.city}</div>
                    </div>
                     <div className="pt-4 border-t">
                        <h4 className="font-semibold text-sm mb-2">Emergency Contact</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                           <div><span className="font-semibold">Name:</span> {patient.emergencyContact.name}</div>
                           <div><span className="font-semibold">Relationship:</span> {patient.emergencyContact.relationship}</div>
                           <div className="col-span-2"><span className="font-semibold">Phone:</span> {patient.emergencyContact.phone}</div>
                        </div>
                    </div>
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
