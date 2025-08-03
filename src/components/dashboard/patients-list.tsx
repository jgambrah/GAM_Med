

"use client"

import * as React from "react"
import Link from "next/link";
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
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Patient } from "@/lib/types"
import { PatientAdmissionForm } from "./patient-admission-form"
import { useToast } from "@/hooks/use-toast"
import { allAdmissions, allUsers } from "@/lib/data"
import { finalizeDischargeSummaryAction, dischargePatientAction } from "@/lib/actions"
import { Loader2, Search } from "lucide-react"
import { Input } from "../ui/input"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../auth-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";


const getStatusBadgeVariant = (status: "Inpatient" | "Outpatient" | "Pending Discharge") => {
    if (status === 'Inpatient') return 'default';
    if (status === 'Pending Discharge') return 'destructive';
    return 'secondary';
};


export function PatientsList({ patients }: { patients: Patient[] }) {
  const { user } = useAuth();
  const [isAdmissionDialogOpen, setIsAdmissionDialogOpen] = React.useState(false);
  const [isDischargeDialogOpen, setIsDischargeDialogOpen] = React.useState(false);

  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Discharge form state
  const [diagnosis, setDiagnosis] = React.useState("");
  const [treatment, setTreatment] = React.useState("");
  const [condition, setCondition] = React.useState("");
  const [medications, setMedications] = React.useState("");
  const [instructions, setInstructions] = React.useState("");

  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "inpatient" | "outpatient">("all");

  const filteredPatients = React.useMemo(() => {
    return patients
      .filter(patient => {
        const admission = allAdmissions.find(a => a.admissionId === patient.currentAdmissionId);
        if (statusFilter === "inpatient") return patient.isAdmitted;
        if (statusFilter === "outpatient") return !patient.isAdmitted && (!admission || admission.status !== 'Pending Discharge');
        return true;
      })
      .filter(patient => 
        patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.patientId.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [patients, searchQuery, statusFilter]);

  const resetDischargeForm = () => {
    setDiagnosis("");
    setTreatment("");
    setCondition("");
    setMedications("");
    setInstructions("");
  }


  const handleAdmissionSuccess = (patientName: string) => {
    setIsAdmissionDialogOpen(false);
    toast({
      title: "Patient Admitted",
      description: `${patientName} has been successfully admitted.`
    });
  }
  
  const handleFinalizeDischarge = async (patient: Patient) => {
    if (!patient.currentAdmissionId || !user) {
       toast({ variant: "destructive", title: "Error", description: "Required patient or user information is missing." });
       return;
    }
    setIsSubmitting(true);
    try {
        const summaryData = {
            diagnosisOnDischarge: diagnosis,
            treatmentProvided: treatment,
            conditionAtDischarge: condition,
            medicationAtDischarge: medications.split(',').map(name => ({ name: name.trim(), dosage: "As prescribed", instructions: "As instructed" })),
            followUpInstructions: instructions,
        }
        const result = await finalizeDischargeSummaryAction(patient.currentAdmissionId, summaryData, user.id);
        if (result.success) {
            toast({ title: "Summary Finalized", description: result.message });
            resetDischargeForm();
            setIsDischargeDialogOpen(false);
        } else {
            toast({ variant: "destructive", title: "Finalization Failed", description: result.message });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleDischarge = async (patient: Patient) => {
     if (!patient.currentAdmissionId) return;
     setIsSubmitting(true);
     const result = await dischargePatientAction(patient.patientId, patient.currentAdmissionId);
     if (result.success) {
       toast({ title: "Patient Discharged", description: result.message });
     } else {
       toast({ variant: "destructive", title: "Discharge Failed", description: result.message });
     }
     setIsSubmitting(false);
  }


  const getPatientStatus = (patient: Patient): "Inpatient" | "Outpatient" | "Pending Discharge" => {
    const admission = allAdmissions.find(a => a.admissionId === patient.currentAdmissionId);
    if (patient.isAdmitted) {
      if (admission?.status === 'Pending Discharge') {
        return 'Pending Discharge';
      }
      return 'Inpatient';
    }
    return 'Outpatient';
  }


  return (
    <>
      <Card>
        <CardHeader className="gap-4">
            <div>
                <CardTitle className="font-headline text-2xl">Patients</CardTitle>
                <CardDescription>
                    Search, filter, and manage all patients in the system.
                </CardDescription>
            </div>
            <div className="flex items-center justify-between gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name or patient ID..." 
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="inpatient">Inpatient</TabsTrigger>
                        <TabsTrigger value="outpatient">Outpatient</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
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
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => {
                    const status = getPatientStatus(patient);
                    const admission = allAdmissions.find(a => a.admissionId === patient.currentAdmissionId);

                    return (
                    <TableRow key={patient.patientId}>
                    <TableCell className="font-mono">{patient.patientId}</TableCell>
                    <TableCell className="font-medium">
                        <Link href={`/admin/patients/${patient.patientId}`} className="hover:underline">
                        {patient.fullName}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {patient.isAdmitted ? (admission?.bedId || 'N/A') : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {patient.contact.primaryPhone}
                    </TableCell>
                    <TableCell className="text-right">
                        {status === 'Inpatient' && (
                           <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => {
                                    setSelectedPatient(patient);
                                    setIsDischargeDialogOpen(true);
                                }}
                            >
                                Finalize Summary
                            </Button>
                        )}
                         {status === 'Pending Discharge' && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Discharge Patient
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Final Discharge</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will officially discharge {patient.fullName} and free up their bed. This action cannot be undone.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDischarge(patient)}>Confirm</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                         )}
                        {status === 'Outpatient' && (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                setSelectedPatient(patient);
                                setIsAdmissionDialogOpen(true);
                                }}
                            >
                                Admit
                            </Button>
                        )}
                    </TableCell>
                    </TableRow>
                    )
                })
               ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No patients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAdmissionDialogOpen} onOpenChange={setIsAdmissionDialogOpen}>
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
      
      <Dialog open={isDischargeDialogOpen} onOpenChange={setIsDischargeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
           <DialogHeader>
            <DialogTitle>Finalize Discharge Summary: {selectedPatient?.fullName}</DialogTitle>
            <DialogDescription>
                Complete the clinical summary below. Once finalized, it will be sent for financial clearance before the patient can be officially discharged.
            </DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto p-1">
                <div className="grid gap-2">
                    <Label htmlFor="diagnosis">Diagnosis at Discharge</Label>
                    <Input 
                        id="diagnosis"
                        placeholder="e.g., Acute Myocardial Infarction"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                    />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="condition">Condition at Discharge</Label>
                    <Select onValueChange={setCondition} value={condition}>
                        <SelectTrigger id="condition">
                            <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Stable">Stable</SelectItem>
                            <SelectItem value="Improved">Improved</SelectItem>
                             <SelectItem value="Unchanged">Unchanged</SelectItem>
                            <SelectItem value="Referred">Referred</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="summary">Summary of Treatment</Label>
                    <Textarea 
                        id="summary"
                        placeholder="Patient responded well to thrombolytic therapy..."
                        value={treatment}
                        onChange={(e) => setTreatment(e.target.value)}
                        rows={5}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="medications">Medications on Discharge (comma-separated)</Label>
                    <Textarea 
                        id="medications"
                        placeholder="Aspirin 81mg, Lisinopril 10mg"
                        value={medications}
                        onChange={(e) => setMedications(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="instructions">Follow-up Instructions</Label>
                    <Textarea 
                        id="instructions"
                        placeholder="Follow up with specialist in 2 weeks. Monitor blood pressure daily."
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        rows={3}
                    />
                </div>
                <Button onClick={() => handleFinalizeDischarge(selectedPatient)} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Finalize Summary & Request Financial Clearance
                </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
