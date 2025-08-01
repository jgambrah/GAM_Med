"use client";

import { allAppointments, allPatients } from "@/lib/data";
import { updateOutpatientStatusAction } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Patient } from "@/lib/types";
import { format } from "date-fns";
import { Check, Loader2, X } from "lucide-react";
import * as React from "react";
import { PatientsList } from "./patients-list";

function OutpatientCheckinDashboard() {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);
  const [appointments, setAppointments] = React.useState(allAppointments);
  
  const today = new Date();
  const todaysAppointments = appointments.filter(
    (a) => new Date(a.date).toDateString() === today.toDateString()
  );

  const handleUpdateStatus = async (
    appointmentId: string,
    newStatus: Appointment["status"]
  ) => {
    setIsUpdating(appointmentId);
    const result = await updateOutpatientStatusAction({
      appointmentId,
      newStatus,
    });
    if (result.success) {
      toast({ title: "Status Updated", description: result.message });
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
      );
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.message });
    }
    setIsUpdating(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Outpatient Appointments</CardTitle>
        <CardDescription>
          A list of all scheduled outpatient appointments for{" "}
          {format(today, "PPP")}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {todaysAppointments.length > 0 ? (
              todaysAppointments.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>{app.time}</TableCell>
                  <TableCell>{app.patientName}</TableCell>
                  <TableCell>{app.doctorName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        app.status === "Scheduled" ? "secondary" : "default"
                      }
                    >
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {app.status === "Scheduled" ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(app.id, "In Progress")}
                          disabled={isUpdating === app.id}
                        >
                          {isUpdating === app.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                          Check-in
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleUpdateStatus(app.id, "Cancelled")}
                          disabled={isUpdating === app.id}
                        >
                           {isUpdating === app.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <X className="mr-2 h-4 w-4" />}
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No actions</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No appointments scheduled for today.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function InpatientAdmissionDashboard({ patients }: { patients: Patient[] }) {
    const outpatients = React.useMemo(() => {
        return patients.filter(p => !p.isAdmitted);
    }, [patients]);
    
    return <PatientsList patients={outpatients} />;
}

export function AdmissionsPortal() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline">Admissions Portal</h2>
        <p className="text-muted-foreground">Manage outpatient check-ins and new inpatient admissions.</p>
      </div>

      <Tabs defaultValue="outpatient-checkin">
        <TabsList>
          <TabsTrigger value="outpatient-checkin">Outpatient Check-in</TabsTrigger>
          <TabsTrigger value="inpatient-admission">Inpatient Admission</TabsTrigger>
        </TabsList>
        <TabsContent value="outpatient-checkin" className="mt-4">
          <OutpatientCheckinDashboard />
        </TabsContent>
        <TabsContent value="inpatient-admission" className="mt-4">
          <InpatientAdmissionDashboard patients={allPatients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
