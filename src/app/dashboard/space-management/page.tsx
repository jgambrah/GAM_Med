
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FacilitySchedule } from './components/facility-schedule';
import { BookFacilityDialog } from './components/book-facility-dialog';
import { Facility, FacilityBooking } from '@/lib/types';
import { Building2, Calendar as CalendarIcon, Clock, Users, Loader2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

/**
 * == Space & Facility Management Dashboard ==
 * 
 * Provides real-time visibility into the utilization of hospital real estate.
 * Every query is tenant-locked using the hospitalId SaaS Wall.
 */
export default function SpaceManagementPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // 1. LIVE SAAS QUERY: Fetch all facilities for this hospital
    const facilitiesQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "facilities"),
            where("hospitalId", "==", user.hospitalId),
            where("isActive", "==", true),
            orderBy("name", "asc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: facilities, isLoading: isFacLoading } = useCollection<Facility>(facilitiesQuery);

    // 2. LIVE SAAS QUERY: Fetch active bookings
    const bookingsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "facility_bookings"),
            where("hospitalId", "==", user.hospitalId),
            where("status", "==", "Confirmed")
        );
    }, [firestore, user?.hospitalId]);

    const { data: bookings, isLoading: isBookLoading } = useCollection<FacilityBooking>(bookingsQuery);

    // 3. UTILIZATION CALCULATIONS
    const stats = React.useMemo(() => {
        if (!facilities || !bookings) return { totalBookable: 0, bookedHours: 0, availableHours: 0, rate: 0 };
        
        const totalBookable = facilities.length;
        const availableHoursWeekly = totalBookable * 168; // 24/7 = 168 hours per facility
        
        const bookedHours = bookings.reduce((acc, b) => {
            // Use the duration field if present, otherwise calculate it
            if (b.duration !== undefined) return acc + b.duration;
            
            const start = new Date(b.startTime);
            const end = new Date(b.endTime);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return acc + (isNaN(duration) ? 0 : duration);
        }, 0);

        const utilizationRate = availableHoursWeekly > 0 ? (bookedHours / availableHoursWeekly) * 100 : 0;

        return {
            totalBookable,
            bookedHours,
            availableHours: availableHoursWeekly,
            rate: utilizationRate
        };
    }, [facilities, bookings]);

    if (isFacLoading || isBookLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50/30 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
                        <Building2 className="text-blue-600 h-8 w-8" />
                        Space & Facility Management
                    </h1>
                    <p className="text-muted-foreground font-medium">Real-time utilization and scheduling for <strong>{user?.hospitalId}</strong></p>
                </div>
                <BookFacilityDialog facilities={facilities || []} />
            </div>
            
            {/* Metrics Row */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard 
                    title="Bookable Facilities" 
                    value={stats.totalBookable} 
                    icon={<Building2 />} 
                />
                <MetricCard 
                    title="Utilization Rate" 
                    value={`${stats.rate.toFixed(1)}%`} 
                    icon={<Users />} 
                />
                <MetricCard 
                    title="Booked Hours" 
                    value={`${stats.bookedHours.toFixed(1)}h`} 
                    icon={<CalendarIcon />} 
                />
                <MetricCard 
                    title="Available Hours" 
                    value={`${stats.availableHours}h`} 
                    icon={<Clock />} 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Facility Map */}
                <Card className="lg:col-span-2 shadow-lg border-none ring-1 ring-slate-200 overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white pb-6">
                        <CardTitle className="text-lg font-bold">Facility Schedule Map</CardTitle>
                        <CardDescription className="text-slate-400">
                            Live visual overview of room occupancy and upcoming sessions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 bg-white">
                        {facilities && facilities.length > 0 ? (
                            <div className="p-6">
                                <FacilitySchedule facilities={facilities} bookings={bookings || []} />
                            </div>
                        ) : (
                            <div className="py-32 text-center border-2 border-dashed m-6 rounded-2xl bg-muted/10">
                                <Building2 className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                                <h3 className="text-lg font-bold text-slate-900">Registry Empty</h3>
                                <p className="text-sm text-muted-foreground">No active facilities found for this facility.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Utilization Health */}
                <Card className="shadow-sm border-none bg-white ring-1 ring-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap size={18} className="text-yellow-500" />
                            Utilization Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center justify-center p-6 text-center">
                            <h2 className="text-5xl font-black text-blue-600">{stats.rate.toFixed(1)}%</h2>
                            <p className="text-xs font-bold text-muted-foreground uppercase mt-3 tracking-widest">Weekly Space Efficiency</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                                <span>Current Load</span>
                                <span>Target: 75%</span>
                            </div>
                            <Progress value={stats.rate} className="h-2 bg-slate-100" />
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground italic leading-relaxed px-4">
                            Efficiency Tip: High utilization Hall usage indicates a need for more multi-purpose seminar spaces.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon }: { title: string, value: any, icon: React.ReactNode }) {
    return (
        <Card className="shadow-sm border-none bg-white ring-1 ring-slate-200 hover:shadow-md transition-all group">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">{title}</p>
                    <h3 className="text-2xl font-black text-slate-900 leading-none">{value}</h3>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors text-blue-600">
                    {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: 2.5 })}
                </div>
            </CardContent>
        </Card>
    );
}
