
import { EHRDashboard } from "@/components/dashboard/ehr-dashboard";
import { allPatients } from "@/lib/data";
import { notFound } from "next/navigation";

export default function DoctorPatientEHRPage({ params }: { params: { patientId: string } }) {
    const patient = allPatients.find(p => p.patientId === params.patientId);

    if (!patient) {
        notFound();
    }

    return <EHRDashboard patient={patient} />;
}

