'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scissors, User, Play, Edit, Monitor } from 'lucide-react';
import { format } from 'date-fns';
import { OTSession } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * == OT Air Traffic Control: Surgical Status Board ==
 * 
 * Provides real-time visibility into theatre occupancy and case progress.
 * Strictly logically isolated via the hospitalId SaaS Wall.
 */
export default function SurgeryDashboard() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // LIVE SAAS QUERY: Fetch today's surgeries for this tenant
    const surgeryQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "ot_sessions"),
            where("hospitalId", "==", user.hospitalId),
            orderBy("startTime", "asc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: surgeries, isLoading } = useCollection<OTSession>(surgeryQuery);

    if (isLoading) {
        return (
            <div className="p-8 space-y-4">
                <Skeleton className="h-12 w-64" />
                <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6 bg-slate-50/30 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
                        <Scissors className="text-red-600 h-8 w-8" />
                        OT Status Board
                    </h1>
                    <p className="text-muted-foreground font-medium">Real-time theater coordination for <strong>{user?.hospitalId}</strong></p>
                </div>
                <Button className="bg-red-600 hover:bg-red-700 shadow-md h-11 px-6">
                    <Scissors className="h-4 w-4 mr-2" />
                    Schedule Procedure
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {surgeries && surgeries.length > 0 ? (
                    surgeries.map((op) => (
                        <Card key={op.id} className="border-l-8 border-l-red-500 hover:shadow-lg transition-all shadow-sm overflow-hidden group">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row items-stretch">
                                    {/* Timeline & Room Block */}
                                    <div className="p-6 flex flex-col justify-center items-center bg-muted/20 border-r min-w-[140px] text-center">
                                        <p className="text-2xl font-black text-slate-900 leading-none">
                                            {format(new Date(op.startTime), 'HH:mm')}
                                        </p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2 bg-white px-2 py-0.5 rounded-full border">
                                            {op.otRoomId}
                                        </p>
                                        <div className="mt-4">
                                            <Badge variant={
                                                op.status === 'In-Progress' ? 'destructive' : 
                                                op.status === 'Completed' ? 'secondary' : 'outline'
                                            } className={cn(
                                                "text-[9px] font-black uppercase tracking-tighter px-2",
                                                op.status === 'In-Progress' && 'animate-pulse'
                                            )}>
                                                {op.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Patient & Procedure Block */}
                                    <div className="p-6 flex-grow flex flex-col justify-center">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-black text-xl text-slate-900 tracking-tight leading-tight group-hover:text-red-600 transition-colors">
                                                    {op.procedureName}
                                                </h3>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
                                                        <User size={14} className="text-muted-foreground" />
                                                        {op.patientName}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] font-mono font-medium opacity-60">ID: {op.patientId}</Badge>
                                                </div>
                                            </div>
                                            
                                            <div className="hidden lg:flex items-center gap-6 text-right pr-4 border-r mr-4">
                                                <div className="space-y-0.5">
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Surgeon</p>
                                                    <p className="text-sm font-bold text-slate-900">{op.surgeonName}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Anesthesia</p>
                                                    <p className="text-sm font-bold text-slate-900">{op.anesthetistName || 'TBD'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Block */}
                                    <div className="p-6 flex items-center gap-2 bg-muted/5">
                                        <Button variant="outline" size="sm" className="h-9 px-4 font-bold text-xs uppercase border-2">
                                            <Edit className="h-3 w-3 mr-2" />
                                            Modify
                                        </Button>
                                        {op.status === 'Scheduled' && (
                                            <Button size="sm" className="h-9 px-4 font-bold text-xs uppercase bg-slate-900 hover:bg-slate-800 text-white">
                                                <Play className="h-3 w-3 mr-2 fill-current" />
                                                Start Case
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-32 border-2 border-dashed rounded-2xl bg-white/50">
                        <Scissors className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">No Procedures Scheduled</h3>
                        <p className="text-sm text-muted-foreground">Theater workflow is currently clear for the selected period.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
