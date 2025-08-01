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


export function AppointmentsView({ appointments, user }: { appointments: Appointment[]; user: User }) {
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [view, setView] = React.useState<"calendar" | "list">("list");
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
        new Date(appointment.date).toDateString() === date.toDateString()
    );
  }, [date, appointmentList]);
  
  const upcomingAppointments = appointmentList.filter(a => new Date(a.date) >= new Date()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleUpdateStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    setIsUpdatingStatus(appointmentId);
    const result = await updateOutpatientStatusAction({ appointmentId, newStatus });
    if (result.success) {
        toast({
            title: "Status Updated",
            description: result.message
        });
        // In a real app, you would re-fetch data. Here we just update state.
        setAppointmentList(prev => prev.map(a => a.id === appointmentId ? {...a, status: newStatus } : a));
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
    const result = await getSmsReminderAction(user.role, user.name, upcomingAppointments);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline text-2xl">Appointments</CardTitle>
                <CardDescription>View and manage upcoming appointments.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button variant={view === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setView('list')}>
                    <List className="h-4 w-4" />
                </Button>
                <Button variant={view === 'calendar' ? 'default' : 'outline'} size="icon" onClick={() => setView('calendar')}>
                    <CalendarIcon className="h-4 w-4" />
                </Button>
                 <Button onClick={handleGenerateSms} disabled={isGenerating}>
                    {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Bell className="mr-2 h-4 w-4" />
                    )}
                    Generate SMS Reminder
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
          />
        </div>
        <div className="md:col-span-2">
          <h3 className="text-lg font-semibold mb-4 font-headline">
            {date ? format(date, "PPP") : "All Upcoming"}
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4">
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((appointment) => {
                const config = statusConfig[appointment.status] || statusConfig.Scheduled;
                return (
                    <div key={appointment.id} className="flex items-center p-3 bg-secondary rounded-lg">
                    <div className="flex-1 space-y-1">
                        <p className="font-medium">{appointment.time} - {user.role === 'Doctor' ? appointment.patientName : `Dr. ${appointment.doctorName}`}</p>
                        <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={config.variant}>
                            <config.icon className="mr-2 h-3 w-3" />
                            {appointment.status}
                        </Badge>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isUpdatingStatus === appointment.id}>
                                {isUpdatingStatus === appointment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, 'In Progress')}>
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                    Mark as In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, 'Completed')}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Mark as Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(appointment.id, 'Cancelled')}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Mark as Cancelled
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
