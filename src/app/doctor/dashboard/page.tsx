
"use client";
import { useAuth } from "@/components/auth-provider";
import { AppointmentsView } from "@/components/dashboard/appointments-view";
import { PatientsList } from "@/components/dashboard/patients-list";
import { allAppointments, allPatients } from "@/lib/data";
import * as React from "react";
import { DoctorActions } from "@/components/dashboard/doctor-actions";

function DoctorDashboard({ user }: { user: any }) {
    const userAppointments = React.useMemo(() => {
        if (!user) return [];
        return allAppointments.filter(app => app.attendingDoctorId === user.id);
    }, [user]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight font-headline">Doctor's Workbench</h2>
            <DoctorActions />
            <AppointmentsView appointments={userAppointments} user={user} />
            <PatientsList patients={allPatients} />
        </div>
    )
}

export default function DoctorDashboardPage() {
    const { user } = useAuth();
    if (!user || user.role !== 'Doctor') {
        return <p>Access Denied</p>;
    }
    return <DoctorDashboard user={user} />;
}
