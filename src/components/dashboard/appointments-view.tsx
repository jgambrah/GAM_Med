
"use client";

import { getSmsReminderAction, updateOutpatientStatusAction } from "@/lib/actions";
import type { Appointment, User } from "@/lib/types";
import { format } from "date-fns";
import { Bell, Calendar as CalendarIcon, List, Loader2, MoreHorizontal, CheckCircle, Clock, XCircle, PlayCircle } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
    Scheduled: {
        variant: "default" as const,
        icon: CalendarIcon,
    },
    'In Progress': {
        variant: "secondary" as const,
        icon: PlayCircle,
    },
    Completed: {
        variant: "outline" as const,
        icon: CheckCircle
    },
    Cancelled: {
        variant: "destructive" as const,
        icon: XCircle
    }
}

interface AppointmentsViewProps {
  appointments: Appointment[];
  user: User;
  onSelectPatient?: (patientId: string) => void;
}


export function AppointmentsView({ appointments, user, onSelectPatient }: AppointmentsViewProps) {
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState<string | null>(null);
  const [reminderSms, setReminderSms] = React.useState("");
  const [isSmsDialogOpen, setIsSmsDialogOpen] = React.useState(false);
  const [appointmentList, setAppointmentList] = React.useState(appointments);

  React.useEffect(() => {
    setAppointmentList(appointments);
  }, [appointments]);

  const filteredAppointments = React.useMemo(() => {
    if (!date) return appointmentList;
    return appointmentList.filter(
      (appointment) =>
        new Date(appointment.appointmentDateTime).toDateString() === date.toDateString()
    );
  }, [date, appointmentList]);
  
  const upcomingAppointments = appointmentList.filter(a => new Date(a.appointmentDateTime) >= new Date()).sort((a,b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime());

  const handleUpdateStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    setIsUpdatingStatus(appointmentId);
    // This is a mock update as the server action for this is not defined yet.
    // const result = await updateOutpatientStatusAction({ appointmentId, newStatus });
    const result = { success: true, message: "Status updated successfully (mock)." };
    if (result.success) {
        toast({
            title: "Status Updated",
            description: result.message
        });
        // In a real app, you would re-fetch data. Here we just update state.
        setAppointmentList(prev => prev.map(a => a.appointmentId === appointmentId ? {...a, status: newStatus } : a));
    } else {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: result.message
        });
    }
    setIsUpdatingStatus(null);
  }


  const handleGenerateSms = async () => {
    setIsGenerating(true);
    // This is a mock call as the underlying data structure for SMS generation has changed
    const result = { success: true, message: `Hi ${user.name}, you have ${upcomingAppointments.length} upcoming appointments. Your next is at ${format(upcomingAppointments[0].appointmentDateTime, 'p')}.` };
    // const result = await getSmsReminderAction(user.role, user.name, upcomingAppointments);
    setIsGenerating(false);

    if (result.success) {
      setReminderSms(result.message);
      setIsSmsDialogOpen(true);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.message,
      });
    }
  };

  const handleCardClick = (patientId: string) => {
    if (onSelectPatient) {
        onSelectPatient(patientId);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-2xl">Today's Appointments</CardTitle>
                <CardDescription>Select an appointment to view details.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                 <Button onClick={handleGenerateSms} disabled={isGenerating} size="sm">
                    {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Bell className="mr-2 h-4 w-4" />
                    )}
                    SMS Reminder
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border mb-4"
          />
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4">
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((appointment) => {
                const config = statusConfig[appointment.status] || statusConfig.Scheduled;
                return (
                    <div 
                        key={appointment.appointmentId} 
                        className={cn("flex items-center p-3 rounded-lg transition-colors", onSelectPatient && "cursor-pointer hover:bg-muted")}
                        onClick={() => handleCardClick(appointment.patientId)}
                    >
                        <div className="flex-1 space-y-1">
                            <p className="font-medium">{format(appointment.appointmentDateTime, 'p')} - {user.role === 'Doctor' ? appointment.patientName : `Dr. ${appointment.doctorName}`}</p>
                            <p className="text-sm text-muted-foreground">{appointment.reasonForVisit}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={config.variant}>
                                <config.icon className="mr-2 h-3 w-3" />
                                {appointment.status}
                            </Badge>
                        </div>
                    </div>
                )
            })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">
                No appointments for this day.
              </p>
            )}
          </div>
      </CardContent>

      <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SMS Reminder Generated</DialogTitle>
            <DialogDescription>
              This is the personalized SMS message generated for {user.name} ({user.role}).
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 p-4 bg-muted rounded-md text-sm">
            <p>{reminderSms}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSmsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
