
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";
import { allPatients, allAdmissions, allUsers } from "@/lib/data";
import Link from "next/link";
import * as React from "react";
import { dischargePatientAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

export default function BillingPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState<string | null>(null);

  const patientsPendingDischarge = React.useMemo(() => {
    return allPatients.filter(p => {
      if (!p.isAdmitted || !p.currentAdmissionId) return false;
      const admission = allAdmissions.find(a => a.admissionId === p.currentAdmissionId);
      return admission?.status === 'Pending Discharge';
    });
  }, []);
  
  const handleDischarge = async (patientId: string, admissionId: string) => {
     setIsSubmitting(patientId);
     const result = await dischargePatientAction(patientId, admissionId);
     if (result.success) {
       toast({ title: "Patient Discharged", description: result.message });
       // In a real app, data would be re-fetched. Here, we'd need a way to refresh the list.
       // For this simulation, the user can refresh the page to see the updated list.
     } else {
       toast({ variant: "destructive", title: "Discharge Failed", description: result.message });
     }
     setIsSubmitting(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Billing & Finance
        </h2>
        <p className="text-muted-foreground">
          Manage patient bills and financial reporting.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patients Pending Financial Clearance</CardTitle>
          <CardDescription>
            These patients have been clinically cleared for discharge by a
            doctor and are awaiting final financial sign-off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patientsPendingDischarge.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Patient ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {patientsPendingDischarge.map(patient => {
                        const admission = allAdmissions.find(a => a.admissionId === patient.currentAdmissionId);
                        const doctor = allUsers.find(u => u.id === admission?.attendingDoctorId);
                        
                        return (
                            <TableRow key={patient.patientId}>
                                <TableCell className="font-mono">{patient.patientId}</TableCell>
                                <TableCell>
                                    <Link href={`/admin/patients/${patient.patientId}`} className="font-medium hover:underline">
                                        {patient.fullName}
                                    </Link>
                                </TableCell>
                                <TableCell>{admission?.ward}</TableCell>
                                <TableCell>{doctor?.name || 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" disabled={isSubmitting === patient.patientId}>
                                                {isSubmitting === patient.patientId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Finalize & Discharge
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Confirm Final Discharge</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action confirms financial clearance and officially discharges {patient.fullName}. The bed will be marked for cleaning. This cannot be undone.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDischarge(patient.patientId, admission!.admissionId)}>
                                                Confirm Discharge
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <FileText className="w-12 h-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                No patients are currently pending financial clearance.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                When a doctor finalizes a discharge summary, the patient will appear here.
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
