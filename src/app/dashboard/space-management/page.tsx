
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FacilitySchedule } from './components/facility-schedule';
import { Facility, FacilityBooking } from '@/lib/types';
import { Building, Loader2, Users, CalendarClock, Zap } from 'lucide-react';
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
        if (!facilities || !bookings) return { rate: 0, hours: 0, capacity: 0 };
        
        const totalRooms = facilities.length;
        const totalCapacity = facilities.reduce((acc, f) => acc + (f.capacity || 0), 0);
        
        // Simple heuristic: Total available hours per week per room (12 hours * 7 days)
        const weeklyRoomCapacityHours = totalRooms * 12 * 7;
        
        const bookedHours = bookings.reduce((acc, b) => {
            const start = new Date(b.startTime);
            const end = new Date(b.endTime);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return acc + duration;
        }, 0);

        const utilizationRate = weeklyRoomCapacityHours > 0 ? (bookedHours / weeklyRoomCapacityHours) * 100 : 0;

        return {
            rate: utilizationRate,
            hours: bookedHours,
            capacity: totalCapacity,
            totalRooms
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
            <header className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
                    <Building className="text-blue-600 h-8 w-8" />
                    Space & Facility Management
                </h1>
                <p className="text-muted-foreground font-medium">Real-time utilization and scheduling for <strong>{user?.hospitalId}</strong></p>
            </header>
            
            {/* Real Estate KPIs */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <KPICard 
                    title="Managed Assets" 
                    value={stats.totalRooms || 0} 
                    sub="Active Rooms/Suites"
                    icon={<Building className="text-blue-500" />} 
                />
                <KPICard 
                    title="Human Capacity" 
                    value={stats.capacity || 0} 
                    sub="Simultaneous Capacity"
                    icon={<Users className="text-emerald-500" />} 
                />
                <KPICard 
                    title="Booked Time" 
                    value={`${stats.hours.toFixed(1)}h`} 
                    sub="Total Weekly Reservation"
                    icon={<CalendarClock className="text-orange-500" />} 
                />
                <Card className="shadow-sm border-none bg-white ring-1 ring-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground flex items-center justify-between">
                            Utilization Rate
                            <Zap size={14} className="text-yellow-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900">{stats.rate.toFixed(1)}%</div>
                        <Progress value={stats.rate} className="h-1.5 mt-3" />
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-lg border-none ring-1 ring-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-900 text-white pb-6">
                    <CardTitle className="text-lg font-bold">Facility Schedule Map</CardTitle>
                    <CardDescription className="text-slate-400">
                        Live visual overview of room occupancy and upcoming seminar/diagnostic sessions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                    {facilities && facilities.length > 0 ? (
                        <div className="p-6">
                            <FacilitySchedule facilities={facilities} bookings={bookings || []} />
                        </div>
                    ) : (
                        <div className="py-32 text-center border-2 border-dashed m-6 rounded-2xl bg-muted/10">
                            <Building className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                            <h3 className="text-lg font-bold text-slate-900">Asset Registry Empty</h3>
                            <p className="text-sm text-muted-foreground">No bookable facilities found for this facility.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function KPICard({ title, value, sub, icon }: { title: string, value: any, sub: string, icon: React.ReactNode }) {
    return (
        <Card className="shadow-sm border-none bg-white ring-1 ring-slate-200 hover:shadow-md transition-all group">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">{title}</p>
                    <h3 className="text-3xl font-black text-slate-900 leading-none">{value}</h3>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">{sub}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-primary/5 transition-colors">
                    {React.cloneElement(icon as React.ReactElement, { size: 24 })}
                </div>
            </CardContent>
        </Card>
    );
}
