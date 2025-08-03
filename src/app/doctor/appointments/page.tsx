"use client";
import { useAuth } from "@/components/auth-provider";
import { AppointmentsView } from "@/components/dashboard/appointments-view";
import { allAppointments } from "@/lib/data";
import * as React from "react";

export default function DoctorAppointmentsPage() {
    const { user } = useAuth();

    const userAppointments = React.useMemo(() => {
    if (!user) return [];
    // In a real app, user.id would be used here. For mock, a default doctor is used.
    return allAppointments.filter(app => app.doctorId === 'doc1');
  }, [user]);

    if (!user || user.role !== 'Doctor') {
        return <p>Access Denied</p>;
    }
    return <AppointmentsView appointments={userAppointments} user={user} />;
}
