
'use client';

import * as React from 'react';
import { Appointment } from '@/lib/types';
import { format, startOfWeek, addDays, isSameDay, isToday, differenceInMinutes, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cancelAppointment } from '@/lib/actions';

interface AppointmentDetailDialogProps { 
  appointment: Appointment, 
  trigger: React.ReactNode 
}

function AppointmentDetailDialog({ appointment, trigger }: AppointmentDetailDialogProps) {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
      const timer = setInterval(() => {
          setNow(new Date());
      }, 60000);
      return () => clearInterval(timer);
  }, []);

  const handleJoinCall = (link: string) => {
    toast.info("Joining virtual call...", { description: `Redirecting to ${link}`});
    window.open(link, '_blank');
  }

  const handleCancel = async (appointmentId: string) => {
    const result = await cancelAppointment(appointmentId);
    if (result.success) {
        toast.success("Appointment Canceled", {
            description: "Your appointment has been successfully canceled."
        });
        // In a real app, this would trigger a re-fetch of data.
    } else {
        toast.error("Cancellation Failed", {
            description: result.message
        });
    }
  };
  
  const canJoinCall = differenceInMinutes(new Date(appointment.appointment_date), now) <= 15;
  const canCancel = isFuture(new Date(appointment.appointment_date)) && (appointment.status === 'scheduled' || appointment.status === 'confirmed');
  
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            {format(new Date(appointment.appointment_date), 'eeee, MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p><strong>Time:</strong> {format(new Date(appointment.appointment_date), 'p')}</p>
          <p><strong>Doctor:</strong> {appointment.doctor_name}</p>
          <p><strong>Department:</strong> {appointment.department}</p>
          <p><strong>Type:</strong> <span className="capitalize">{appointment.type}</span></p>
          <p><strong>Status:</strong> <Badge>{appointment.status}</Badge></p>
          <p><strong>Notes:</strong> {appointment.notes || 'N/A'}</p>
        </div>
         <DialogFooter className="sm:justify-between">
          <Button variant="destructive" onClick={() => handleCancel(appointment.appointment_id)} disabled={!canCancel}>
            Cancel Appointment
          </Button>
          {appointment.isVirtual ? (
            canJoinCall ? (
              <Button onClick={() => handleJoinCall(appointment.telemedicineLink!)}>
                <Video className="mr-2 h-4 w-4" /> Join Virtual Call
              </Button>
            ) : (
               <Button variant="outline" disabled>
                 <Video className="mr-2 h-4 w-4" /> Joinable 15 mins before start
              </Button>
            )
          ) : (
              <Button disabled>In-Person Visit</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PatientAppointmentCalendar({ appointments }: { appointments: Appointment[] }) {
  const weekStartsOn = 1; // Monday
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7">
        {days.map(day => (
          <div key={day.toString()} className="p-2 text-center font-semibold border-b border-r">
            <div className={cn(isToday(day) && "text-primary")}>{format(day, 'EEE')}</div>
            <div className={cn("text-sm", isToday(day) ? "text-primary font-bold" : "text-muted-foreground")}>{format(day, 'd')}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 h-[60vh]">
        {days.map((day, dayIndex) => {
          const dailyAppointments = appointments
            .filter(appt => isSameDay(new Date(appt.appointment_date), day))
            .sort((a,b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
          
          return (
            <div key={dayIndex} className={cn("border-r p-2 space-y-2 overflow-y-auto", isToday(day) && "bg-muted/50")}>
              {dailyAppointments.map(appt => (
                 <AppointmentDetailDialog 
                    key={appt.appointment_id} 
                    appointment={appt}
                    trigger={
                      <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <div className="p-2 rounded-md bg-blue-100 border border-blue-300 cursor-pointer hover:bg-blue-200 transition-colors">
                                      <p className="font-semibold text-xs truncate">{format(new Date(appt.appointment_date), 'p')} - {appt.type}</p>
                                      <p className="text-xs text-muted-foreground truncate">w/ {appt.doctor_name}</p>
                                  </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                  <p>{appt.type} with {appt.doctor_name}</p>
                              </TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                    }
                 />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  );
}
