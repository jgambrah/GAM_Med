'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed as BedIcon, User, Loader2, LayoutGrid, ClipboardList, Activity, ArrowRight, ShieldCheck, Plus } from 'lucide-react';
import { AssignBedDialog } from '@/components/wards/assign-bed-dialog';
import { AddWardDialog } from './components/add-ward-dialog';
import { AddBedDialog } from '../beds/components/add-bed-dialog';
import { Bed, Ward } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';

/**
 * == Ward Control Center: Facility Real-Time Census ==
 * 
 * Provides an interactive, high-fidelity map of the hospital's clinical units.
 * Features:
 * - Ward grouping with dynamic Load Factor tracking.
 * - Multi-tenant isolation (The SaaS Wall).
 * - Real-time bed status updates.
 */
export default function WardManagementPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // 1. LIVE SAAS QUERIES: Fetch wards and beds for THIS hospital
    const wardsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "wards"),
            where("hospitalId", "==", user.hospitalId),
            orderBy("name", "asc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: wards, isLoading: isWardsLoading } = useCollection<Ward>(wardsQuery);

    const bedsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "beds"),
            where("hospitalId", "==", user.hospitalId),
            orderBy("bedNumber", "asc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: beds, isLoading: isBedsLoading } = useCollection<Bed>(bedsQuery);

    // 2. AGGREGATE STATS
    const stats = React.useMemo(() => {
        if (!beds) return { total: 0, occupied: 0, cleaning: 0, rate: 0 };
        const total = beds.length;
        const occupied = beds.filter(b => b.status === 'Occupied' || b.status === 'occupied').length;
        const cleaning = beds.filter(b => b.status === 'Cleaning').length;
        return {
            total,
            occupied,
            cleaning,
            rate: total > 0 ? (occupied / total) * 100 : 0
        };
    }, [beds]);

    if (isWardsLoading || isBedsLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Facility Map...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <LayoutGrid className="text-blue-600 h-8 w-8" />
                        Ward Control Center
                    </h1>
                    <p className="text-muted-foreground font-medium italic mt-1">Live Clinical Census for <strong>{user?.hospitalId}</strong></p>
                </div>
                <div className="flex gap-2">
                    <AddWardDialog />
                    <AddBedDialog />
                </div>
            </header>

            {/* Platform KPI Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 text-white shadow-xl border-none">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Facility Load Factor</p>
                        <div className="flex items-end justify-between mb-4">
                            <h2 className="text-5xl font-black">{Math.round(stats.rate)}%</h2>
                            <Activity className="text-blue-400 h-8 w-8 mb-1" />
                        </div>
                        <Progress value={stats.rate} className="h-2 bg-slate-800" />
                        <p className="text-[10px] font-bold text-slate-500 mt-4 uppercase">Target: &lt; 85% for patient safety</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-none ring-1 ring-slate-200">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Unit Census</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-3xl font-black text-slate-900">{stats.occupied}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Admitted Patients</p>
                            </div>
                            <div className="border-l pl-4">
                                <p className="text-3xl font-black text-slate-900">{stats.total - stats.occupied}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Vacant Units</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-100 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-700 mb-1">Housekeeping Queue</p>
                            <h3 className="text-3xl font-black text-orange-900">{stats.cleaning}</h3>
                            <p className="text-[9px] font-bold text-orange-700/70 mt-1 uppercase">Beds Pending Disinfection</p>
                        </div>
                        <div className="p-3 bg-white rounded-2xl shadow-sm"><Activity className="text-orange-500" /></div>
                    </CardContent>
                </Card>
            </div>

            {/* THE WARD MAP */}
            <div className="space-y-10">
                {(wards && wards.length > 0) ? (
                    wards.map((ward) => {
                        const wardBeds = beds?.filter(b => b.wardId === ward.id) || [];
                        const occupiedCount = wardBeds.filter(b => b.status === 'Occupied' || b.status === 'occupied').length;
                        const capacity = wardBeds.length;
                        const wardRate = capacity > 0 ? (occupiedCount / capacity) * 100 : 0;

                        return (
                            <section key={ward.id} className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                                            <Badge variant="outline" className="border-none p-0 text-blue-600 font-black">{ward.name.charAt(0)}</Badge>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 leading-none">{ward.name}</h3>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1.5">{ward.type} Ward</p>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full sm:w-64 space-y-2">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                            <span className="text-muted-foreground">Occupancy: {occupiedCount}/{capacity}</span>
                                            <span className={cn(wardRate > 90 ? "text-red-600" : "text-blue-600")}>{Math.round(wardRate)}%</span>
                                        </div>
                                        <Progress value={wardRate} className={cn("h-1.5", wardRate > 90 ? "bg-red-100" : "bg-blue-100")} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                    {wardBeds.map((bed) => (
                                        <BedControlCard key={bed.id} bed={bed} />
                                    ))}
                                    {wardBeds.length === 0 && (
                                        <div className="col-span-full py-12 text-center border-2 border-dashed rounded-3xl bg-muted/5 flex flex-col items-center gap-3">
                                            <BedIcon className="h-8 w-8 text-muted-foreground/30" />
                                            <div className="space-y-1">
                                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Unit Inventory Empty</p>
                                                <p className="text-[10px] text-muted-foreground/70">No beds have been provisioned for this specific ward unit.</p>
                                            </div>
                                            <AddBedDialog />
                                        </div>
                                    )}
                                </div>
                            </section>
                        );
                    })
                ) : (
                    <div className="py-32 text-center border-4 border-dashed rounded-[2rem] bg-muted/5 flex flex-col items-center gap-4">
                        <ClipboardList className="h-16 w-16 text-muted-foreground/20" />
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Facility Infrastructure Required</h3>
                            <p className="text-muted-foreground text-sm font-medium">To begin clinical census tracking, you must first define your facility's Wards (Clinical Units).</p>
                        </div>
                        <AddWardDialog />
                    </div>
                )}
            </div>

            {/* Security Protocol Footer */}
            <div className="bg-slate-950 text-white p-6 rounded-3xl flex items-center gap-4 shadow-2xl">
                <ShieldCheck className="text-blue-500 h-8 w-8 shrink-0" />
                <p className="text-[11px] font-medium opacity-80 leading-relaxed">
                    <strong>Enterprise Data Segregation:</strong> All census data is logically isolated. Occupancy logs and patient movement records are encrypted at rest and scoped strictly to your hospital's partition.
                </p>
            </div>
        </div>
    );
}

function BedControlCard({ bed }: { bed: Bed }) {
    const isOccupied = bed.status === 'Occupied' || bed.status === 'occupied';
    
    return (
        <Card className={cn(
            "relative overflow-hidden border-2 transition-all group",
            isOccupied ? "border-blue-200 bg-white shadow-md ring-4 ring-blue-50/50" : 
            bed.status === 'Cleaning' ? "border-orange-200 bg-orange-50/30" : "border-slate-100 bg-slate-50/50 grayscale hover:grayscale-0 hover:border-slate-300"
        )}>
            <div className="p-4 flex flex-col items-center text-center space-y-3 min-h-[160px] justify-center">
                <div className="absolute top-2 right-2 opacity-20">
                   {isOccupied ? <User size={14} /> : <BedIcon size={14} />}
                </div>
                
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{bed.bedNumber}</p>
                
                <div className="py-1">
                    {isOccupied ? (
                        <div className="space-y-1.5">
                            <p className="text-sm font-black truncate w-28 text-slate-900 leading-tight">{bed.currentPatientName}</p>
                            <Badge variant="secondary" className="text-[8px] font-black uppercase px-1.5 h-4 bg-blue-600 text-white border-none">Occupied</Badge>
                        </div>
                    ) : (
                        <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase px-2 h-5",
                            bed.status === 'Cleaning' ? "border-orange-500 text-orange-700 bg-white animate-pulse" : "border-slate-300 text-slate-500 bg-white"
                        )}>
                            {bed.status}
                        </Badge>
                    )}
                </div>

                <div className="pt-2 flex flex-col gap-1 w-full">
                    {isOccupied ? (
                        <Button variant="outline" size="sm" asChild className="h-7 text-[9px] font-black uppercase gap-1 group-hover:border-primary transition-all">
                            <Link href={`/dashboard/patients/${bed.currentPatientId}`}>
                                View EHR
                                <ArrowRight className="h-2.5 w-2.5" />
                            </Link>
                        </Button>
                    ) : (bed.status === 'Available' || bed.status === 'vacant') ? (
                        <AssignBedDialog bedId={bed.id} bedNumber={bed.bedNumber} wardName={bed.wardName!} />
                    ) : (
                        <div className="text-[8px] font-bold text-muted-foreground uppercase py-1">Unit Restricted</div>
                    )}
                </div>
            </div>
        </Card>
    );
}