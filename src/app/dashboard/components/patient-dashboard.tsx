

'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockWaitingList, allAppointments, mockMedicationRecords, mockLabResults, mockInvoices, mockMessages, mockReminders } from '@/lib/data';
import { WaitingListEntry, Appointment, MedicationRecord, LabResult, Invoice, Message, Reminder } from '@/lib/types';
import { format, formatDistanceToNowStrict, differenceInMinutes } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Video, FileText, MessageSquare, CreditCard, Pill, Bell } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MedicationsTab } from '../patients/[patientId]/components/medications-tab';

function MyWaitingListStatus() {
    const { user } = useAuth();
    const myWaitingListEntries = mockWaitingList.filter(
        (item) => item.patientId === user?.patient_id && item.status === 'Active'
    );

    if (myWaitingListEntries.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Waiting List Status</CardTitle>
                <CardDescription>
                    Your current status on waiting lists for hospital services.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Requested Service</TableHead>
                                <TableHead>Date Added</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {myWaitingListEntries.map((item) => (
                                <TableRow key={item.waitinglistId}>
                                    <TableCell className="font-medium">{item.requestedService}</TableCell>
                                    <TableCell>{format(new Date(item.dateAdded), 'PPP')}</TableCell>
                                    <TableCell>
                                        <Badge variant={getPriorityVariant(item.priority)}>
                                            {item.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={item.status === 'Active' ? 'default' : 'secondary'}>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
            </CardContent>
        </Card>
    );
}

function UpcomingAppointments() {
    const { user } = useAuth();
    const [now, setNow] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const upcomingAppointments = allAppointments.filter(
        appt => appt.patient_id === user?.patient_id && new Date(appt.appointment_date) >= now
    ).sort((a,b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

    const handleJoinCall = (link: string) => {
        toast.info("Joining virtual call...", { description: `Redirecting to ${link}`});
        window.open(link, '_blank');
    }
    
    const canJoinCall = (appointmentDate: string) => {
        const diff = differenceInMinutes(new Date(appointmentDate), now);
        return diff <= 15 && diff >= -60; // Can join 15 mins before up to 60 mins after start
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Upcoming Appointments</CardTitle>
                <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/appointments">View All</Link>
                </Button>
            </CardHeader>
            <CardContent>
                 <div className="space-y-4">
                    {upcomingAppointments.length > 0 ? upcomingAppointments.slice(0, 2).map(appt => (
                        <div key={appt.appointment_id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <p className="font-semibold">{format(new Date(appt.appointment_date), 'PPP p')}</p>
                                <p className="text-sm text-muted-foreground">{appt.doctor_name} - {appt.department}</p>
                            </div>
                            {appt.isVirtual ? (
                                canJoinCall(appt.appointment_date) ? (
                                    <Button size="sm" onClick={() => handleJoinCall(appt.telemedicineLink || '#')}>
                                        <Video className="mr-2 h-4 w-4" /> Join Call
                                    </Button>
                                ) : (
                                    <div className="text-xs text-center text-muted-foreground">
                                        <p>Join call 15 mins before start</p>
                                    </div>
                                )
                            ) : (
                                <Badge variant="outline">In-Person</Badge>
                            )}
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No upcoming appointments.</p>
                    )}
                 </div>
            </CardContent>
        </Card>
    );
}

function RecentActivity() {
    const { user } = useAuth();

    const recentResults = mockLabResults
        .filter(res => res.patientId === user?.patient_id && res.status === 'Validated')
        .sort((a,b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
        .slice(0, 1);
    
    const unreadMessages = mockMessages
        .filter(msg => msg.receiverId === user?.uid && !msg.isRead)
        .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1);

    const outstandingBills = mockInvoices
        .filter(inv => inv.patientId === user?.patient_id && (inv.status === 'Pending Payment' || inv.status === 'Overdue'))
        .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 1);
    
    const upcomingReminders = mockReminders
        .filter(rem => rem.patientId === user?.patient_id && !rem.isSent)
        .sort((a,b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())
        .slice(0,1);

    const activities = [
        ...recentResults.map(r => ({ type: 'Lab Result', data: r, date: r.completedAt })),
        ...unreadMessages.map(m => ({ type: 'Message', data: m, date: m.timestamp })),
        ...outstandingBills.map(b => ({ type: 'Billing', data: b, date: b.dueDate })),
        ...upcomingReminders.map(rem => ({ type: 'Reminder', data: rem, date: rem.scheduledDateTime }))
    ].filter(a => a.date).sort((a,b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());


    const renderActivity = (activity: any) => {
        const { type, data } = activity;
        let icon, title, description, link;

        switch (type) {
            case 'Lab Result':
                icon = <FileText className="h-5 w-5 text-blue-500" />;
                title = `New Lab Result: ${data.testName}`;
                description = `Completed ${formatDistanceToNowStrict(new Date(data.completedAt), { addSuffix: true })}`;
                link = '/dashboard/my-records';
                break;
            case 'Message':
                icon = <MessageSquare className="h-5 w-5 text-green-500" />;
                title = `New Message from ${data.senderName}`;
                description = `Received ${formatDistanceToNowStrict(new Date(data.timestamp), { addSuffix: true })}`;
                link = '/dashboard/messages';
                break;
            case 'Billing':
                icon = <CreditCard className="h-5 w-5 text-red-500" />;
                title = `Outstanding Bill: Invoice ${data.invoiceId}`;
                description = `Due ${format(new Date(data.dueDate), 'PPP')}`;
                link = '/dashboard/my-billing';
                break;
            case 'Reminder':
                 icon = <Bell className="h-5 w-5 text-yellow-500" />;
                title = `Reminder: ${data.message}`;
                description = `Scheduled for ${format(new Date(data.scheduledDateTime), 'PPP p')}`;
                link = data.type === 'Appointment' ? '/dashboard/appointments' : '/dashboard/my-records';
                break;
            default: return null;
        }

        return (
             <Link href={link} key={`${type}-${data.id || data.invoiceId || data.testId || data.messageId || data.reminderId}`}>
                <div className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    {icon}
                    <div className="flex-grow">
                        <p className="font-semibold">{title}</p>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
            </Link>
        )
    }

     return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {activities.length > 0 ? (
                    activities.map(renderActivity)
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent updates.</p>
                )}
            </CardContent>
        </Card>
    );

}


export function PatientDashboard() {
  const { user } = useAuth();
  if (!user?.patient_id) return null;

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UpcomingAppointments />
            <RecentActivity />
        </div>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                    <CardTitle>My Medications</CardTitle>
                    <CardDescription>A list of your current and past medications. Click to request a refill.</CardDescription>
                </div>
                 <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/my-records">View All Records</Link>
                </Button>
            </CardHeader>
            <CardContent>
                <MedicationsTab patientId={user.patient_id} />
            </CardContent>
        </Card>
        <MyWaitingListStatus />
    </div>
  );
}

const getPriorityVariant = (priority: WaitingListEntry['priority']): "destructive" | "default" | "secondary" => {
    switch (priority) {
        case 'Urgent': return 'destructive';
        case 'Routine': return 'default';
        default: return 'secondary';
    }
}
