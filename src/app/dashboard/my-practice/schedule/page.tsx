
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, PlayCircle, CheckCircle2, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Appointment } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * == Doctor Module: Daily Schedule Board ==
 * 
 * Provides a high-focus worklist for clinicians to manage their daily patient flow.
 * Every query is logically isolated by hospitalId and doctorId.
 */
export default function DoctorSchedulePage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. LIVE QUERY: Today's appointments for THIS doctor at THIS facility
    const todayQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !user?.hospitalId) return null;
        return query(
            collection(firestore, "appointments"),
            where("hospitalId", "==", user.hospitalId),
            where("doctorId", "==", user.uid),
            where("appointmentDate", "==", todayStr),
            orderBy("timeSlot", "asc")
        );
    }, [firestore, user?.uid, user?.hospitalId, todayStr]);

    const { data: appointments, isLoading } = useCollection<Appointment>(todayQuery);

    const handleUpdateStatus = (appointmentId: string, newStatus: Appointment['status'], patientName: string) => {
        if (!firestore) return;

        const apptRef = doc(firestore, 'appointments', appointmentId);
        
        // Optimistic update
        updateDocumentNonBlocking(apptRef, { 
            status: newStatus,
            updatedAt: serverTimestamp()
        });

        if (newStatus === 'In-Consultation') {
            toast.success(`Started consultation with ${patientName}`);
        } else if (newStatus === 'Completed') {
            toast.success(`Completed visit for ${patientName}`);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">My Daily Schedule</h1>
                <p className="text-muted-foreground">
                    Patient queue for <strong>{format(new Date(), 'EEEE, MMMM do')}</strong>.
                </p>
            </header>

            <div className="grid gap-4">
                {appointments && appointments.length > 0 ? (
                    appointments.map((app) => (
                        <Card 
                            key={app.id} 
                            className={cn(
                                "transition-all border-l-4",
                                app.status === 'In-Consultation' ? "border-l-blue-500 bg-blue-50/30" : 
                                app.status === 'Completed' ? "border-l-green-500 opacity-70" : "border-l-muted"
                            )}
                        >
                            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-6">
                                    <div className="text-center min-w-[80px] bg-slate-100 p-2 rounded-lg border">
                                        <Clock size={14} className="mx-auto text-muted-foreground mb-1" />
                                        <span className="text-xs font-black font-mono">{app.timeSlot}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                            <User size={14} className="text-muted-foreground" />
                                            {app.patientName}
                                        </h4>
                                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                                            "{app.reason || 'General Consultation'}"
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Badge variant={
                                        app.status === 'In-Consultation' ? 'default' : 
                                        app.status === 'Arrived' ? 'secondary' : 'outline'
                                    } className="text-[10px] font-bold uppercase tracking-tighter">
                                        {app.status}
                                    </Badge>

                                    <div className="flex gap-2">
                                        {app.status === 'Arrived' && (
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleUpdateStatus(app.id, 'In-Consultation', app.patientName || 'Patient')}
                                                className="bg-blue-600 hover:bg-blue-700 h-8 text-xs font-bold"
                                            >
                                                <PlayCircle className="mr-2 h-4 w-4" />
                                                Start Visit
                                            </Button>
                                        )}
                                        {app.status === 'In-Consultation' && (
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleUpdateStatus(app.id, 'Completed', app.patientName || 'Patient')}
                                                className="border-green-600 text-green-700 hover:bg-green-50 h-8 text-xs font-bold"
                                            >
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                Finish
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-24 border-2 border-dashed rounded-xl bg-muted/5">
                        <Clock className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                        <h3 className="font-bold text-slate-900">Your schedule is clear</h3>
                        <p className="text-sm text-muted-foreground">No appointments confirmed for you today.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
