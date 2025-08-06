import { DischargeSummaryForm } from "@/components/dashboard/discharge-summary-form";
import { allPatients } from "@/lib/data";
import { notFound } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";

export default function DischargePatientPage({ params }: { params: { patientId: string } }) {
    const patient = allPatients.find(p => p.patientId === params.patientId);

    if (!patient) {
        notFound();
    }
    
    if (!patient.isAdmitted) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cannot Discharge Patient</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{patient.fullName} is not currently admitted and cannot be discharged.</p>
                </CardContent>
            </Card>
        )
    }

    return (
       <DischargeSummaryForm patient={patient} />
    )
}
