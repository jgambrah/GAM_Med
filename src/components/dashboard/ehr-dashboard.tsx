"use client";

import { AlertCircle, FileText, HeartPulse, Microscope, Pill, Stethoscope, User } from "lucide-react";
import type { Patient } from "@/lib/types";
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

export function EhrDashboard({ patient }: { patient: Patient }) {
  
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
            <Link href={`/admin/patients/${patient.patientId}`}>
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
