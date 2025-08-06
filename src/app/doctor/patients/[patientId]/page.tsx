
import { allPatients } from "@/lib/data";
import { notFound } from "next/navigation";
import { PatientDetailsView } from "@/components/dashboard/patient-details-view";

// This is a Server Component. It fetches data and passes it to the client component.
export default function DoctorPatientDetailsPage({ params }: { params: { patientId: string } }) {
  const patient = allPatients.find(p => p.patientId === params.patientId);

  if (!patient) {
    notFound();
  }

  return <PatientDetailsView patient={patient} />;
}
