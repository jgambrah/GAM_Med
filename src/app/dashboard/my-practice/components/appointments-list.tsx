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
import { Appointment } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Video } from 'lucide-react';

interface AppointmentsListProps {
  appointments: Appointment[]; // Receive appointments as a prop
  onAppointmentSelect: (appointment: Appointment | null) => void;
}

/**
 * == Conceptual Component: TodayAppointments ==
 *
 * This component acts as the doctor's daily work queue. It's the "Today's Appointments" list
 * that drives the entire Doctor's Workbench workflow.
 *
 * It uses a real-time listener to fetch only the appointments assigned to the
 * currently logged-in doctor for the current day. This ensures the list is always up-to-date.
 */
export function AppointmentsList({ appointments, onAppointmentSelect }: AppointmentsListProps) {
    const { user } = useAuth();
    const [selectedAppointmentId, setSelectedAppointmentId] = React.useState<string | null>(null);
    
    const todaysAppointments = React.useMemo(() => {
        if (!user) return [];
        // Filter the appointments passed via props
        return appointments
            .filter(
            (appt) =>
                appt.doctor_id === user?.uid &&
                new Date(appt.appointment_date).toDateString() === new Date().toDateString()
            )
            .sort(
            (a, b) =>
                new Date(a.appointment_date).getTime() -
                new Date(b.appointment_date).getTime()
            );
    }, [appointments, user]);
    
    const handleSelect = (appointment: Appointment) => {
        setSelectedAppointmentId(appointment.appointment_id);
        onAppointmentSelect(appointment);
    }
    
    React.useEffect(() => {
        if (todaysAppointments.length > 0 && !selectedAppointmentId) {
            handleSelect(todaysAppointments[0]);
        } else if (todaysAppointments.length === 0 && selectedAppointmentId) {
            setSelectedAppointmentId(null);
            onAppointmentSelect(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todaysAppointments, selectedAppointmentId]);


    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Today's Appointments</CardTitle>
                <CardDescription>Select an appointment to view patient details.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0">
                <ScrollArea className="h-full p-6 pt-0">
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
                                       <div className="flex items-center gap-2">
                                            <Badge 
                                                    variant={selectedAppointmentId === appt.appointment_id ? 'secondary' : 'outline'}
                                                    className="capitalize"
                                                >
                                                {appt.type}
                                            </Badge>
                                             {appt.isVirtual && (
                                                <Badge variant={selectedAppointmentId === appt.appointment_id ? 'secondary' : 'outline'}>
                                                    <Video className="h-3 w-3" />
                                                </Badge>
                                            )}
                                       </div>
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
