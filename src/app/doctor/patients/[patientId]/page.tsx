
import { allPatients } from "@/lib/data";
import PatientDetailsPage from "@/app/admin/patients/[patientId]/page";

// This route reuses the same component as the admin view,
// but keeps the user within the /doctor/* URL space for consistent navigation.
export default function DoctorPatientDetailsPage({ params }: { params: { patientId: string } }) {
    const patient = allPatients.find(p => p.patientId === params.patientId);

    if (!patient) {
        return <p>Patient not found.</p>;
    }

    return <PatientDetailsPage params={params} />;
}
