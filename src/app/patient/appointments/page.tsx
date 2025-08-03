
"use client";
import { useAuth } from "@/components/auth-provider";
import { AppointmentsView } from "@/components/dashboard/appointments-view";
import { allAppointments } from "@/lib/data";
import * as React from "react";

export default function PatientAppointmentsPage() {
    const { user } = useAuth();

    const userAppointments = React.useMemo(() => {
        if (!user) return [];
        // In a real app, user.id would be used here. For mock, a default patient is used.
        return allAppointments.filter(app => app.patientId === 'pat1');
    }, [user]);

    if (!user || user.role !== 'Patient') {
        return <p>Access Denied</p>;
    }
    return <AppointmentsView appointments={userAppointments} user={user} />;
}
