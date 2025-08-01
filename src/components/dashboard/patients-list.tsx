
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
import { allAdmissions } from "@/lib/data"
import { dischargePatientAction } from "@/lib/actions"
import { Loader2, Search } from "lucide-react"
import { Input } from "../ui/input"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

const getStatusBadgeVariant = (isAdmitted: boolean) => {
    return isAdmitted ? 'default' : 'secondary';
};


export function PatientsList({ patients }: { patients: Patient[] }) {
  const [isAdmissionDialogOpen, setIsAdmissionDialogOpen] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  const [isDischarging, setIsDischarging] = React.useState<string | null>(null);
  const [dischargeSummary, setDischargeSummary] = React.useState("");
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "inpatient" | "outpatient">("all");

  const filteredPatients = React.useMemo(() => {
    return patients
      .filter(patient => {
        if (statusFilter === "inpatient") return patient.isAdmitted;
        if (statusFilter === "outpatient") return !patient.isAdmitted;
        return true;
      })
      .filter(patient => 
        patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.patientId.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [patients, searchQuery, statusFilter]);


  const handleAdmissionSuccess = (patientName: string) => {
    setIsAdmissionDialogOpen(false);
    toast({
      title: "Patient Admitted",
      description: `${patientName} has been successfully admitted.`
    });
    // In a real app, you would re-fetch data here.
  }
  
  const handleDischarge = async (patient: Patient) => {
    if (!patient.currentAdmissionId) {
       toast({ variant: "destructive", title: "Error", description: "No active admission found for this patient." });
       return;
    }
    setIsDischarging(patient.patientId);
    try {
        const result = await dischargePatientAction(patient.patientId, patient.currentAdmissionId, dischargeSummary);
        if (result.success) {
            toast({ title: "Patient Discharged", description: result.message });
            setDischargeSummary("");
        } else {
            toast({ variant: "destructive", title: "Discharge Failed", description: result.message });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
    } finally {
        setIsDischarging(null);
    }
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
                filteredPatients.map((patient) => (
                    <TableRow key={patient.patientId}>
                    <TableCell className="font-mono">{patient.patientId}</TableCell>
                    <TableCell className="font-medium">
                        <Link href={`/admin/patients/${patient.patientId}`} className="hover:underline">
                        {patient.fullName}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <Badge variant={getStatusBadgeVariant(patient.isAdmitted)}>{patient.isAdmitted ? 'Inpatient' : 'Outpatient'}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {patient.currentAdmissionId ? (allAdmissions.find(a => a.admissionId === patient.currentAdmissionId)?.bedId || 'N/A') : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {patient.contact.primaryPhone}
                    </TableCell>
                    <TableCell className="text-right">
                        {patient.isAdmitted ? (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button 
                                variant="destructive" 
                                size="sm"
                                disabled={isDischarging === patient.patientId}
                                >
                                    {isDischarging === patient.patientId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Discharge
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Discharge Patient: {patient.fullName}</AlertDialogTitle>
                                <AlertDialogDescription>
                                This action will discharge {patient.fullName}. This will update the patient's record and free up their assigned bed. Please provide a discharge summary below. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                             <div className="grid gap-2">
                                <Label htmlFor="discharge-summary">Discharge Summary (Optional)</Label>
                                <Textarea 
                                    id="discharge-summary"
                                    placeholder="Patient responded well to treatment..."
                                    value={dischargeSummary}
                                    onChange={(e) => setDischargeSummary(e.target.value)}
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDischarge(patient)}>
                                Confirm Discharge
                                </AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        ) : (
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
                ))
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
    </>
  )
}
