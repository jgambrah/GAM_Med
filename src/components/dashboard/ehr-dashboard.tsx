"use client";

import {
  FileText,
  HeartPulse,
  Stethoscope,
  Pill,
  FlaskConical,
  PlusCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Patient } from "@/lib/types";

// These are placeholder components for each tab's content.
// In a real implementation, they would fetch and display data from Firestore.

const ClinicalNotesTab = () => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle>Clinical Notes</CardTitle>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>
      <CardDescription>
        Progress notes, consultation reports, and discharge summaries.
      </CardDescription>
    </CardHeader>
    <CardContent className="text-center text-muted-foreground py-12">
      <FileText className="mx-auto h-12 w-12" />
      <p className="mt-4">No clinical notes available.</p>
    </CardContent>
  </Card>
);

const VitalsTab = () => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle>Vitals</CardTitle>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Record Vitals
        </Button>
      </div>
      <CardDescription>
        Historical and real-time patient vital signs.
      </CardDescription>
    </CardHeader>
    <CardContent className="text-center text-muted-foreground py-12">
      <HeartPulse className="mx-auto h-12 w-12" />
      <p className="mt-4">No vital signs recorded.</p>
    </CardContent>
  </Card>
);

const DiagnosesTab = () => (
  <Card>
    <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Diagnoses</CardTitle>
            <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Diagnosis
            </Button>
        </div>
      <CardDescription>
        A log of all recorded diagnoses for the patient.
      </CardDescription>
    </CardHeader>
    <CardContent className="text-center text-muted-foreground py-12">
      <Stethoscope className="mx-auto h-12 w-12" />
      <p className="mt-4">No diagnoses recorded.</p>
    </CardContent>
  </Card>
);

const MedicationsTab = () => (
  <Card>
    <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Medications</CardTitle>
            <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Prescription
            </Button>
        </div>
      <CardDescription>
        A history of all prescribed medications.
      </CardDescription>
    </CardHeader>
    <CardContent className="text-center text-muted-foreground py-12">
      <Pill className="mx-auto h-12 w-12" />
      <p className="mt-4">No medications prescribed.</p>
    </CardContent>
  </Card>
);

const LabResultsTab = () => (
  <Card>
    <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Lab Results</CardTitle>
            <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Lab Order
            </Button>
        </div>
      <CardDescription>
        Results from all ordered laboratory tests.
      </CardDescription>
    </CardHeader>
    <CardContent className="text-center text-muted-foreground py-12">
      <FlaskConical className="mx-auto h-12 w-12" />
      <p className="mt-4">No lab results available.</p>
    </CardContent>
  </Card>
);

interface EHRDashboardProps {
  patient: Patient;
}

export function EHRDashboard({ patient }: EHRDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Avatar className="h-24 w-24 border">
          <AvatarImage
            src={`https://placehold.co/100x100/E3F2FD/333?text=${patient.firstName.charAt(
              0
            )}${patient.lastName.charAt(0)}`}
            alt={patient.fullName}
            data-ai-hint="avatar profile"
          />
          <AvatarFallback>
            {patient.firstName.charAt(0)}
            {patient.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold font-headline">
            {patient.fullName}
          </h1>
          <p className="text-muted-foreground">Patient ID: {patient.patientId}</p>
        </div>
      </div>

      <Tabs defaultValue="clinical_notes" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="clinical_notes">
            <FileText className="mr-2 h-4 w-4" />
            Clinical Notes
          </TabsTrigger>
          <TabsTrigger value="vitals">
            <HeartPulse className="mr-2 h-4 w-4" />
            Vitals
          </TabsTrigger>
          <TabsTrigger value="diagnoses">
            <Stethoscope className="mr-2 h-4 w-4" />
            Diagnoses
          </TabsTrigger>
          <TabsTrigger value="medications">
            <Pill className="mr-2 h-4 w-4" />
            Medications
          </TabsTrigger>
          <TabsTrigger value="lab_results">
            <FlaskConical className="mr-2 h-4 w-4" />
            Lab Results
          </TabsTrigger>
        </TabsList>
        <TabsContent value="clinical_notes" className="mt-4">
          <ClinicalNotesTab />
        </TabsContent>
        <TabsContent value="vitals" className="mt-4">
          <VitalsTab />
        </TabsContent>
        <TabsContent value="diagnoses" className="mt-4">
          <DiagnosesTab />
        </TabsContent>
        <TabsContent value="medications" className="mt-4">
          <MedicationsTab />
        </TabsContent>
        <TabsContent value="lab_results" className="mt-4">
          <LabResultsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
