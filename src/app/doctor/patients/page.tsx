"use client";
import { useAuth } from "@/components/auth-provider";
import { PatientsList } from "@/components/dashboard/patients-list";

export default function DoctorPatientsPage() {
    const { user } = useAuth();
     if (!user || user.role !== 'Doctor') {
        return <p>Access Denied</p>;
    }
    return <PatientsList />;
}
