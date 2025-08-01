"use client";

import * as React from "react";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { AppointmentsView } from "@/components/dashboard/appointments-view";
import { Header } from "@/components/dashboard/header";
import { MainNav } from "@/components/dashboard/main-nav";
import { PatientsList } from "@/components/dashboard/patients-list";
import { UserNav } from "@/components/dashboard/user-nav";
import { SidebarProvider, Sidebar, SidebarInset, SidebarFooter } from "@/components/ui/sidebar";
import { allAppointments, allPatients } from "@/lib/data";
import { useAuth } from "@/components/auth-provider";
import { AiAssistant } from "./dashboard/ai-assistant";

function PlaceholderView({ role }: { role: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-full">
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="text-2xl font-bold tracking-tight font-headline">
          {role} View
        </h3>
        <p className="text-sm text-muted-foreground">
          This is a placeholder for the {role} dashboard.
        </p>
      </div>
    </div>
  );
}

const useGeminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY !== undefined;

export default function Dashboard() {
  const { user } = useAuth();

  const userAppointments = React.useMemo(() => {
    if (!user) return [];
    if (user.role === 'Patient') {
      // In a real app, user.id would be used here. For mock, we use a default patient.
      return allAppointments.filter(app => app.patientId === 'pat1');
    }
    if (user.role === 'Doctor') {
       // In a real app, user.id would be used here. For mock, we use a default doctor.
      return allAppointments.filter(app => app.doctorId === 'doc1');
    }
    return allAppointments;
  }, [user]);
  
  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (user.role) {
      case "Admin":
        return <AdminOverview patients={allPatients} />;
      case "Doctor":
        return (
          <div className="space-y-6">
            <AppointmentsView appointments={userAppointments} user={user} />
            <PatientsList patients={allPatients} />
          </div>
        );
      case "Patient":
        return <AppointmentsView appointments={userAppointments} user={user} />;
      case "Nurse":
        return (
            <div className="space-y-6">
                <AppointmentsView appointments={userAppointments} user={user} />
                <PatientsList patients={allPatients} />
            </div>
        );
      case "Pharmacist":
        return <PlaceholderView role="Pharmacist" />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <div className="flex flex-col h-full">
          <div className="p-4">
             <h1 className="text-2xl font-bold font-headline text-primary-foreground">MedFlow GH</h1>
          </div>
          <MainNav role={user.role} />
          {useGeminiApiKey && (
            <SidebarFooter>
              <AiAssistant />
            </SidebarFooter>
          )}
        </div>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen">
          <Header>
            <UserNav user={user} />
          </Header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {renderContent()}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
