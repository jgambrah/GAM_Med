
"use client";
import { useAuth } from "@/components/auth-provider";
import { AppointmentsView } from "@/components/dashboard/appointments-view";
import { PatientsList } from "@/components/dashboard/patients-list";
import { allAppointments, allPatients } from "@/lib/data";
import * as React from "react";
import { DoctorActions } from "@/components/dashboard/doctor-actions";
import { PatientDetailsView } from "@/components/dashboard/patient-details-view";
import type { Patient } from "@/lib/types";

function DoctorDashboard({ user }: { user: any }) {
    const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);

    const userAppointments = React.useMemo(() => {
        if (!user) return [];
        return allAppointments.filter(app => app.attendingDoctorId === user.id);
    }, [user]);

    const handleSelectPatient = (patientId: string) => {
        const patient = allPatients.find(p => p.patientId === patientId);
        setSelectedPatient(patient || null);
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight font-headline">Doctor's Workbench</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <AppointmentsView 
                        appointments={userAppointments} 
                        user={user}
                        onSelectPatient={handleSelectPatient}
                    />
                    <DoctorActions />
                </div>
                <div className="lg:col-span-2">
                    {selectedPatient ? (
                        <PatientDetailsView patient={selectedPatient} />
                    ) : (
                        <Card className="h-full flex items-center justify-center">
                            <CardContent className="text-center">
                                <p className="text-lg font-semibold">No Patient Selected</p>
                                <p className="text-muted-foreground">Select an appointment to view patient details.</p>
                            </CardContent>
                        </Card>
                    )}
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
