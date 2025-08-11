
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { allAppointments } from '@/lib/data';
import { Appointment } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AppointmentsListProps {
  onAppointmentSelect: (appointment: Appointment) => void;
}

export function AppointmentsList({ onAppointmentSelect }: AppointmentsListProps) {
    const { user } = useAuth();
    const [selectedAppointmentId, setSelectedAppointmentId] = React.useState<string | null>(null);

    // In a real app, this would be a real-time query for appointments for the logged-in doctor.
    const todaysAppointments = allAppointments.filter(
      (appt) =>
        appt.doctor_id === user?.uid &&
        new Date(appt.appointment_date).toDateString() === new Date().toDateString()
    ).sort((a,b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
    
    const handleSelect = (appointment: Appointment) => {
        setSelectedAppointmentId(appointment.appointment_id);
        onAppointmentSelect(appointment);
    }
    
    React.useEffect(() => {
        if(todaysAppointments.length > 0 && !selectedAppointmentId) {
            handleSelect(todaysAppointments[0]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todaysAppointments, selectedAppointmentId]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Today's Appointments</CardTitle>
                <CardDescription>Select an appointment to view patient details.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh]">
                    <div className="space-y-2">
                        {todaysAppointments.length > 0 ? (
                            todaysAppointments.map((appt) => (
                                <button
                                    key={appt.appointment_id}
                                    onClick={() => handleSelect(appt)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-lg border transition-colors",
                                        selectedAppointmentId === appt.appointment_id 
                                            ? "bg-primary text-primary-foreground border-primary" 
                                            : "hover:bg-accent"
                                    )}
                                >
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{appt.patient_name}</p>
                                        <p className="text-sm">{format(new Date(appt.appointment_date), 'p')}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 text-sm">
                                       <Badge 
                                            variant={selectedAppointmentId === appt.appointment_id ? 'secondary' : 'outline'}
                                            className="capitalize"
                                        >
                                           {appt.type}
                                       </Badge>
                                       <p className="capitalize">{appt.status}</p>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground p-8">
                                You have no appointments scheduled for today.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
