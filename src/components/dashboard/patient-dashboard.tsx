
"use client";

import { allAdmissions, allAppointments, allPatients } from "@/lib/data";
import type { User } from "@/lib/types";
import * as React from "react";
import { AppointmentsView } from "./appointments-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import Link from "next/link";
import { FileText } from "lucide-react";

export default function PatientDashboard({ user }: { user: User }) {
    
  // Find the patient record that corresponds to the logged-in user.
  // In a real app, this would be a fetch using user.id. Here we match by name.
  const patient = allPatients.find(p => p.fullName === user.name);
  
  const userAppointments = React.useMemo(() => {
    if (!patient) return [];
    return allAppointments.filter(app => app.patientId === patient.patientId);
  }, [patient]);
  
  const patientAdmissions = React.useMemo(() => {
    if (!patient) return [];
    return allAdmissions.filter(a => a.patientId === patient.patientId);
  }, [patient]);


  if (!patient) {
      return <p>Could not find patient record.</p>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight font-headline">
        Welcome, {user.name}
      </h2>
      
      <AppointmentsView appointments={userAppointments} user={user} />
      
      <Card>
        <CardHeader>
            <CardTitle>My Visit History</CardTitle>
            <CardDescription>A record of your past admissions and visits.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason for Visit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Discharge Summary</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {patientAdmissions.length > 0 ? (
                        patientAdmissions.map((admission) => (
                            <TableRow key={admission.admissionId}>
                                <TableCell>{format(new Date(admission.admissionDate), "PPP")}</TableCell>
                                <TableCell>{admission.reasonForVisit}</TableCell>
                                <TableCell>
                                    <Badge variant={admission.dischargeDate ? "secondary" : "default"}>
                                        {admission.dischargeDate ? `Discharged on ${format(new Date(admission.dischargeDate!), "PPP")}` : admission.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {admission.summaryPDF_URL ? (
                                    <Button variant="outline" size="sm" asChild>
                                      <Link href={admission.summaryPDF_URL} target="_blank">
                                        <FileText className="mr-2 h-4 w-4" />
                                        View PDF
                                      </Link>
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground">Not Available</span>
                                  )}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No admission history found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

    </div>
  );
}
