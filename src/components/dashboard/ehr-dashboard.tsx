

"use client";

import {
  FileText,
  HeartPulse,
  Stethoscope,
  Pill,
  FlaskConical,
  PlusCircle,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Patient } from "@/lib/types";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "../ui/dialog";
import { useAuth } from "../auth-provider";

const ClinicalNotesTab = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [note, setNote] = React.useState("");
    const isDoctor = user?.role === 'Doctor';

    const handleSaveNote = () => {
        if (!note.trim()) {
            toast({ variant: "destructive", title: "Cannot save empty note."})
            return;
        };
        console.log("Saving clinical note:", { note });
        toast({ title: "Note Saved", description: "The clinical note has been added to the patient's record."});
        setNote("");
    }

    return (
      <Card>
        <CardHeader>
            <CardTitle>Clinical Notes</CardTitle>
            <CardDescription>
                Progress notes, consultation reports, and discharge summaries.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Textarea 
                placeholder={isDoctor ? "Type your new clinical note here..." : "Read-only access to clinical notes."}
                className="min-h-[200px]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={!isDoctor}
            />
             <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                <FileText className="mx-auto h-12 w-12" />
                <p className="mt-4">Previous notes will appear here.</p>
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveNote} disabled={!note.trim() || !isDoctor}>
                <Save className="mr-2 h-4 w-4" />
                Save Note
            </Button>
        </CardFooter>
      </Card>
    );
};

const VitalsTab = () => {
    const { toast } = useToast();
    const [isVitalsOpen, setIsVitalsOpen] = React.useState(false);
    const formRef = React.useRef<HTMLFormElement>(null);

    const handleRecordVitals = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const vitals = {
            temperature: formData.get("temperature"),
            bloodPressure: formData.get("bloodPressure"),
            heartRate: formData.get("heartRate"),
            oxygenSaturation: formData.get("oxygenSaturation"),
        };
        if (!vitals.temperature || !vitals.bloodPressure || !vitals.heartRate || !vitals.oxygenSaturation) {
            toast({ variant: "destructive", title: "All vitals fields are required."});
            return;
        }
        console.log("Recording Vitals:", vitals);
        toast({ title: "Vitals Recorded", description: `New vital signs have been saved to the patient's chart.`});
        formRef.current?.reset();
        setIsVitalsOpen(false);
    }

    return (
    <Card>
        <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Vitals</CardTitle>
            <Dialog open={isVitalsOpen} onOpenChange={setIsVitalsOpen}>
                <DialogTrigger asChild>
                    <Button size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Record Vitals
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record New Vital Signs</DialogTitle>
                    </DialogHeader>
                    <form ref={formRef} onSubmit={handleRecordVitals} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="temperature">Temperature (°C)</Label>
                                <Input id="temperature" name="temperature" type="number" step="0.1" placeholder="e.g., 37.5" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bloodPressure">Blood Pressure</Label>
                                <Input id="bloodPressure" name="bloodPressure" placeholder="e.g., 120/80" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                                <Input id="heartRate" name="heartRate" type="number" placeholder="e.g., 75" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="oxygenSaturation">O₂ Saturation (%)</Label>
                                <Input id="oxygenSaturation" name="oxygenSaturation" type="number" placeholder="e.g., 98" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save Vitals</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
        <CardDescription>
            Historical and real-time patient vital signs.
        </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
        <HeartPulse className="mx-auto h-12 w-12" />
        <p className="mt-4">Recorded vital signs will appear here.</p>
        </CardContent>
    </Card>
    )
};

const DiagnosesTab = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isDiagnosisOpen, setIsDiagnosisOpen] = React.useState(false);
    const formRef = React.useRef<HTMLFormElement>(null);
    const isDoctor = user?.role === 'Doctor';

    const handleNewDiagnosis = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const diagnosis = {
            icd10Code: formData.get("icd10Code"),
            diagnosisText: formData.get("diagnosisText"),
        };
        if (!diagnosis.icd10Code || !diagnosis.diagnosisText) {
            toast({ variant: "destructive", title: "All diagnosis fields are required."});
            return;
        }
        console.log("Recording Diagnosis:", diagnosis);
        toast({ title: "Diagnosis Recorded", description: `New diagnosis has been added to the patient's record.`});
        formRef.current?.reset();
        setIsDiagnosisOpen(false);
    }
    
    return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Diagnoses</CardTitle>
                <Dialog open={isDiagnosisOpen} onOpenChange={setIsDiagnosisOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" disabled={!isDoctor}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Diagnosis
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Diagnosis</DialogTitle>
                        </DialogHeader>
                        <form ref={formRef} onSubmit={handleNewDiagnosis} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="icd10Code">ICD-10 Code</Label>
                                <Input id="icd10Code" name="icd10Code" placeholder="e.g., I21.9" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="diagnosisText">Diagnosis Description</Label>
                                <Textarea id="diagnosisText" name="diagnosisText" placeholder="e.g., Acute Myocardial Infarction, unspecified" />
                            </div>
                             <DialogFooter>
                                <Button type="submit">Save Diagnosis</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        <CardDescription>
            A log of all recorded diagnoses for the patient.
        </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
        <Stethoscope className="mx-auto h-12 w-12" />
        <p className="mt-4">Recorded diagnoses will appear here.</p>
        </CardContent>
    </Card>
    )
};

interface Medication {
    id: number;
    name: string;
    dosage: string;
    frequency: string;
  }
  
const MedicationsTab = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [medications, setMedications] = React.useState<Medication[]>([
        { id: 1, name: "", dosage: "", frequency: "" }
    ]);
    const isDoctor = user?.role === 'Doctor';

    const handleMedicationChange = (index: number, field: keyof Omit<Medication, 'id'>, value: string) => {
        const newMedications = [...medications];
        newMedications[index][field] = value;
        setMedications(newMedications);
    };

    const addMedication = () => {
        setMedications([...medications, { id: Date.now(), name: "", dosage: "", frequency: "" }]);
    };

    const removeMedication = (index: number) => {
        const newMedications = medications.filter((_, i) => i !== index);
        setMedications(newMedications);
    };

    const handlePrescribe = (e: React.FormEvent) => {
        e.preventDefault();
        const validMedications = medications.filter(
            med => med.name.trim() && med.dosage.trim() && med.frequency.trim()
        );

        if (validMedications.length === 0) {
            toast({ variant: "destructive", title: "No valid medications to prescribe.", description: "Please fill out at least one complete medication row." });
            return;
        }

        console.log("Prescribing Medications:", validMedications);
        toast({ title: "Medications Prescribed", description: `${validMedications.length} medication(s) have been ordered and sent to the pharmacy.` });
        
        // Reset the form
        setMedications([{ id: 1, name: "", dosage: "", frequency: "" }]);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Medications</CardTitle>
                <CardDescription>
                    {isDoctor ? "Prescribe new medications and view prescription history." : "View prescription history. Read-only."}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handlePrescribe}>
                <CardContent className="space-y-4">
                    <fieldset disabled={!isDoctor} className="p-4 border rounded-lg space-y-4 disabled:opacity-70 disabled:cursor-not-allowed">
                        <h4 className="font-medium">New Prescription</h4>
                        {medications.map((med, index) => (
                            <div key={med.id} className="grid grid-cols-1 md:grid-cols-10 gap-4 items-end">
                                <div className="space-y-2 md:col-span-4">
                                    <Label htmlFor={`medicationName-${index}`}>Medication Name</Label>
                                    <Input 
                                        id={`medicationName-${index}`} 
                                        placeholder="e.g., Lisinopril" 
                                        value={med.name}
                                        onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor={`dosage-${index}`}>Dosage</Label>
                                    <Input 
                                        id={`dosage-${index}`} 
                                        placeholder="e.g., 10mg" 
                                        value={med.dosage}
                                        onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-3">
                                    <Label htmlFor={`frequency-${index}`}>Frequency</Label>
                                    <Input 
                                        id={`frequency-${index}`} 
                                        placeholder="e.g., Once daily" 
                                        value={med.frequency}
                                        onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    {medications.length > 1 && (
                                        <Button 
                                            type="button" 
                                            variant="destructive" 
                                            size="icon" 
                                            onClick={() => removeMedication(index)}
                                            aria-label="Remove medication"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div className="flex gap-4">
                           <Button type="button" variant="outline" onClick={addMedication}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Another Medication
                            </Button>
                            <Button type="submit">
                                <Send className="mr-2 h-4 w-4" />
                                Send Prescription to Pharmacy
                            </Button>
                        </div>
                    </fieldset>
                    <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                        <Pill className="mx-auto h-12 w-12" />
                        <p className="mt-4">Medication history will appear here.</p>
                    </div>
                </CardContent>
            </form>
        </Card>
    );
};


const LabResultsTab = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [testName, setTestName] = React.useState("");
    const isDoctor = user?.role === 'Doctor';


    const handleOrderTest = () => {
        if (!testName.trim()) {
            toast({ variant: "destructive", title: "Test name is required."});
            return;
        }
        console.log("Ordering Lab Test:", { testName });
        toast({ title: "Lab Test Ordered", description: `A request for "${testName}" has been sent to the lab.`});
        setTestName("");
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Lab Results</CardTitle>
                <CardDescription>
                    {isDoctor ? "Order new lab tests and view results." : "View lab test history and results. Read-only."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <fieldset disabled={!isDoctor} className="p-4 border rounded-lg space-y-4 disabled:opacity-70 disabled:cursor-not-allowed">
                    <h4 className="font-medium">New Lab Order</h4>
                    <div className="flex items-end gap-4">
                         <div className="space-y-2 flex-1">
                            <Label htmlFor="testName">Test Name</Label>
                            <Input id="testName" placeholder="e.g., Complete Blood Count" value={testName} onChange={(e) => setTestName(e.target.value)} />
                        </div>
                        <Button onClick={handleOrderTest}>
                           <Send className="mr-2 h-4 w-4" />
                            Order Test
                        </Button>
                    </div>
                </fieldset>
                <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                    <FlaskConical className="mx-auto h-12 w-12" />
                    <p className="mt-4">Lab test history and results will appear here.</p>
                </div>
            </CardContent>
        </Card>
    );
};


interface EHRDashboardProps {
  patient: Patient;
}

export function EHRDashboard({ patient }: EHRDashboardProps) {
  const { user } = useAuth();

  if (!user) {
    return null; // Or a loading spinner
  }
  
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
