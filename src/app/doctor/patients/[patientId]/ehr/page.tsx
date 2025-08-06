
import { allPatients } from "@/lib/data";
import { notFound } from "next/navigation";
import { EhrDashboard } from "@/components/dashboard/ehr-dashboard";

// This is a Server Component. It fetches data and passes it to the client component.
export default function DoctorEhrPage({ params }: { params: { patientId: string } }) {
  const patient = allPatients.find(p => p.patientId === params.patientId);

  if (!patient) {
    notFound();
  }

  return <EhrDashboard patient={patient} />;
}
