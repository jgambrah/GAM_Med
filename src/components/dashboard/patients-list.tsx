
"use client"

import * as React from "react"
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Patient } from "@/lib/types"
import { PatientAdmissionForm } from "./patient-admission-form"
import { useToast } from "@/hooks/use-toast"
import { allAdmissions } from "@/lib/data"
import { Search } from "lucide-react"
import { Input } from "../ui/input"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"

type PatientStatus = "Inpatient" | "Outpatient" | "Pending Discharge";

const getStatusBadgeVariant = (status: PatientStatus) => {
    if (status === 'Inpatient') return 'default';
    if (status === 'Pending Discharge') return 'destructive';
    return 'secondary';
};


export function PatientsList({ patients }: { patients: Patient[] }) {
  const router = useRouter();
  const [isAdmissionDialogOpen, setIsAdmissionDialogOpen] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "inpatient" | "outpatient" | "pending">("all");

  const getPatientStatus = (patient: Patient): PatientStatus => {
    const admission = allAdmissions.find(a => a.admissionId === patient.currentAdmissionId);
    if (patient.isAdmitted) {
      if (admission?.status === 'Pending Discharge') {
        return 'Pending Discharge';
      }
      return 'Inpatient';
    }
    return 'Outpatient';
  }

  const filteredPatients = React.useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    
    return patients
      .map(p => ({ ...p, computedStatus: getPatientStatus(p) }))
      .filter(patient => {
        // Status Filter
        if (statusFilter !== 'all') {
            const statusMap = {
                inpatient: 'Inpatient',
                outpatient: 'Outpatient',
                pending: 'Pending Discharge'
            };
            if (patient.computedStatus !== statusMap[statusFilter]) {
                return false;
            }
        }
        
        // Search Query Filter
        if (!lowercasedQuery) return true;
        
        const searchCorpus = [
            patient.fullName.toLowerCase(),
            patient.patientId.toLowerCase(),
            patient.contact.primaryPhone
        ].join(' ');

        return searchCorpus.includes(lowercasedQuery);
      });
  }, [patients, searchQuery, statusFilter]);

  const handleAdmissionSuccess = (patientName: string) => {
    setIsAdmissionDialogOpen(false);
    toast({
      title: "Patient Admitted",
      description: `${patientName} has been successfully admitted.`
    });
    // In a real app, you'd likely refetch or revalidate data here.
    // For now, the user can manually refresh to see changes propagate fully.
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
                        placeholder="Search by name, patient ID, or phone..." 
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
                        <TabsTrigger value="pending">Pending Discharge</TabsTrigger>
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
                        <Badge variant={getStatusBadgeVariant(patient.computedStatus)}>{patient.computedStatus}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {patient.isAdmitted ? (admission?.bedId || 'N/A') : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {patient.contact.primaryPhone}
                    </TableCell>
                    <TableCell className="text-right">
                        {patient.computedStatus === 'Inpatient' && (
                           <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={() => router.push(`/admin/patients/${patient.patientId}/discharge`)}
                            >
                                Finalize Summary
                            </Button>
                        )}
                         {patient.computedStatus === 'Pending Discharge' && (
                             <span className="text-sm text-muted-foreground italic">Awaiting financial clearance</span>
                         )}
                        {patient.computedStatus === 'Outpatient' && (
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
                    No patients found matching your criteria.
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
