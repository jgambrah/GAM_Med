
import { PatientsList } from "@/components/dashboard/patients-list";
import { allPatients } from "@/lib/data";

// This is a Server Component. It can directly access data sources.
export default function DoctorPatientsPage() {
    // The role check for this page is handled by the layout/auth provider.
    // We can directly render the list component and pass the data.
    return <PatientsList patients={allPatients} />;
}
