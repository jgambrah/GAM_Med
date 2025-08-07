
"use client";
import { useAuth } from "@/components/auth-provider";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { allPatients, allAppointments } from "@/lib/data";
import { DoctorActions } from "@/components/dashboard/doctor-actions";
import { PatientsList } from "@/components/dashboard/patients-list";
import { AppointmentsView } from "@/components/dashboard/appointments-view";
import * as React from "react";

function DoctorDashboard({ user }: { user: any }) {
    const userAppointments = React.useMemo(() => {
        if (!user) return [];
        return allAppointments.filter(app => app.attendingDoctorId === user.id);
    }, [user]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight font-headline">Doctor's Dashboard</h2>
             <p className="text-muted-foreground">
                Welcome, Dr. {user.name}. Here is an overview of your day.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                     <AppointmentsView 
                        appointments={userAppointments} 
                        user={user}
                    />
                </div>
                 <div className="lg:col-span-2">
                    <DoctorActions />
                </div>
            </div>
            
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
