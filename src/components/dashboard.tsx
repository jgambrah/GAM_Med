"use client";

import * as React from "react";
import { AdminOverview } from "@/components/dashboard/admin-overview";
import { AppointmentsView } from "@/components/dashboard/appointments-view";
import { Header } from "@/components/dashboard/header";
import { MainNav } from "@/components/dashboard/main-nav";
import { PatientsList } from "@/components/dashboard/patients-list";
import { UserNav } from "@/components/dashboard/user-nav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { allUsers, allAppointments, allPatients } from "@/lib/data";
import type { UserRole } from "@/lib/types";

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

export default function Dashboard() {
  const [currentUserRole, setCurrentUserRole] = React.useState<UserRole>("Doctor");
  const currentUser = React.useMemo(() => {
    return allUsers.find((user) => user.role === currentUserRole) || allUsers[0];
  }, [currentUserRole]);

  const userAppointments = React.useMemo(() => {
    if (currentUser.role === 'Patient') {
      return allAppointments.filter(app => app.patientId === currentUser.id);
    }
    if (currentUser.role === 'Doctor') {
      return allAppointments.filter(app => app.doctorId === currentUser.id);
    }
    return allAppointments;
  }, [currentUser]);

  const renderContent = () => {
    switch (currentUser.role) {
      case "Admin":
        return <AdminOverview />;
      case "Doctor":
        return (
          <div className="space-y-6">
            <AppointmentsView appointments={userAppointments} user={currentUser} />
            <PatientsList patients={allPatients} />
          </div>
        );
      case "Patient":
        return <AppointmentsView appointments={userAppointments} user={currentUser} />;
      case "Nurse":
        return <AppointmentsView appointments={userAppointments} user={currentUser} />;
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
          <MainNav role={currentUser.role} />
        </div>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col h-screen">
          <Header>
            <UserNav user={currentUser} onRoleChange={setCurrentUserRole} />
          </Header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {renderContent()}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
