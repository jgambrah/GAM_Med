
"use client";
import { useAuth } from "@/components/auth-provider";
import { AppointmentsView } from "@/components/dashboard/appointments-view";
import { allAppointments, allPatients } from "@/lib/data";
import * as React from "react";

export default function PatientAppointmentsPage() {
    const { user } = useAuth();
    
    const patient = React.useMemo(() => {
      if (!user) return null;
      return allPatients.find(p => p.fullName === user.name);
    }, [user]);

    const userAppointments = React.useMemo(() => {
        if (!patient) return [];
        return allAppointments.filter(app => app.patientId === patient.patientId);
    }, [patient]);

    if (!user || user.role !== 'Patient') {
        return <p>Access Denied</p>;
    }

    if (!patient) {
        return <p>Could not find patient record to load appointments.</p>
    }

    return <AppointmentsView appointments={userAppointments} user={user} />;
}
