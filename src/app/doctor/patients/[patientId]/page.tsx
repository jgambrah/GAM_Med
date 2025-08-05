
import { allPatients } from "@/lib/data";
import { notFound } from "next/navigation";
import { PatientDetailsView } from "@/components/dashboard/patient-details-view";

// This route reuses the same component structure as the admin view,
// but keeps the user within the /doctor/* URL space for consistent navigation.
export default function DoctorPatientDetailsPage({ params }: { params: { patientId: string } }) {
    const patient = allPatients.find(p => p.patientId === params.patientId);

    if (!patient) {
        notFound();
    }

    return <PatientDetailsView patient={patient} />;
}
