
"use client";
import { useAuth } from "@/components/auth-provider";
import PatientDashboard from "@/components/dashboard/patient-dashboard";


export default function PatientDashboardPage() {
    const { user } = useAuth();
    
    if (!user || user.role !== 'Patient') {
        return <p>Access Denied</p>;
    }
    return <PatientDashboard user={user} />;
}
