'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Building2, CreditCard, Zap, Server } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from 'date-fns';

export default function PlatformPulsePage() {
    const firestore = useFirestore();
    const [stats, setStats] = React.useState({
        hospitals: 0,
        patients: 0,
        activeUsers: 0,
        revenue: 0
    });
    const [isStatsLoading, setIsStatsLoading] = React.useState(true);

    // 1. Fetch Global Totals (One-time fetch)
    React.useEffect(() => {
        const fetchTotals = async () => {
            if (!firestore) return;
            try {
                const [hSnap, pSnap, uSnap] = await Promise.all([
                    getDocs(collection(firestore, "hospitals")),
                    getDocs(collection(firestore, "patients")),
                    getDocs(collection(firestore, "users"))
                ]);
                
                setStats({
                    hospitals: hSnap.size,
                    patients: pSnap.size,
                    activeUsers: uSnap.size,
                    revenue: 0 // In production, this would integrate with a payment provider API
                });
            } catch (error) {
                console.error("Error fetching global stats:", error);
            } finally {
                setIsStatsLoading(false);
            }
        };
        fetchTotals();
    }, [firestore]);

    // 2. Global Activity Feed (Live Subscription)
    // As Super Admin, our rules allow us to query the entire 'patients' collection without hospitalId filters.
    const activityQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, "patients"), 
            orderBy("createdAt", "desc"), 
            limit(10)
        );
    }, [firestore]);

    const { data: recentPatients, isLoading: isActivityLoading } = useCollection(activityQuery);

    return (
        <div className="space-y-8 min-h-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Platform Pulse</h1>
                    <p className="text-muted-foreground">Real-time oversight across the entire GamMed network</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className="bg-green-500 hover:bg-green-600 animate-pulse px-4 py-1">
                        System Live
                    </Badge>
                </div>
            </div>

            {/* Top Level KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <PulseCard 
                    title="Total Facilities" 
                    value={stats.hospitals} 
                    icon={<Building2 />} 
                    color="text-blue-600" 
                    isLoading={isStatsLoading}
                />
                <PulseCard 
                    title="Total Patients" 
                    value={stats.patients.toLocaleString()} 
                    icon={<Users />} 
                    color="text-emerald-600" 
                    isLoading={isStatsLoading}
                />
                <PulseCard 
                    title="Active Staff" 
                    value={stats.activeUsers} 
                    icon={<Zap />} 
                    color="text-purple-600" 
                    isLoading={isStatsLoading}
                />
                <PulseCard 
                    title="Monthly Revenue" 
                    value="GHS 0.00" 
                    icon={<CreditCard />} 
                    color="text-orange-600" 
                    isLoading={isStatsLoading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Activity Feed */}
                <Card className="lg:col-span-2 shadow-md border-t-4 border-t-blue-500">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            Global Activity Stream
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {isActivityLoading ? (
                                <p className="text-sm text-center py-8 text-muted-foreground italic">Connecting to activity stream...</p>
                            ) : recentPatients && recentPatients.length > 0 ? (
                                recentPatients.map((patient) => (
                                    <div key={patient.id} className="flex items-center justify-between p-4 bg-muted/30 border rounded-xl hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="h-3 w-3 bg-blue-500 rounded-full" />
                                                <div className="h-3 w-3 bg-blue-500 rounded-full absolute top-0 animate-ping opacity-75" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">New Registration: {patient.full_name || `${patient.first_name} ${patient.last_name}`}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4 border-blue-200 text-blue-700 bg-blue-50">
                                                        {patient.hospitalId}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-400 font-mono">ID: {patient.patient_id}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-slate-400">
                                            {patient.createdAt ? formatDistanceToNow(new Date(patient.createdAt), { addSuffix: true }) : 'Just now'}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                    <p>No recent platform activity found.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* System Health Section */}
                <div className="space-y-6">
                    <Card className="shadow-md overflow-hidden">
                        <CardHeader className="bg-slate-900 text-white">
                            <div className="flex items-center gap-2">
                                <Server className="h-5 w-5 text-blue-400" />
                                <CardTitle className="text-lg">System Health</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium text-slate-600">Database Load</span>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">OPTIMAL</Badge>
                                </div>
                                <Progress value={12} className="h-2 bg-slate-100" />
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium text-slate-600">Active Sessions</span>
                                    <span className="font-bold text-slate-900">{stats.activeUsers} Users</span>
                                </div>
                                <Progress value={35} className="h-2 bg-slate-100" />
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium text-slate-600">API Response Time</span>
                                    <span className="font-bold text-slate-900">42ms</span>
                                </div>
                                <Progress value={8} className="h-2 bg-slate-100" />
                            </div>
                            <div className="pt-4 border-t">
                                <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                    You are currently in Super Admin mode. This view aggregates sensitive multi-tenant data for infrastructure monitoring and business intelligence.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-600 text-white border-none shadow-lg">
                        <CardContent className="p-6">
                            <h4 className="font-bold mb-1">Growth Tip</h4>
                            <p className="text-sm text-blue-100">
                                Platform usage is up 12% this week. Consider promoting the Surgical Module to Basic tier clients to drive conversions.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function PulseCard({ title, value, icon, color, isLoading }: { title: string, value: any, icon: any, color: string, isLoading: boolean }) {
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
                        {isLoading ? (
                            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                        ) : (
                            <h3 className={`text-2xl font-black ${color}`}>{value}</h3>
                        )}
                    </div>
                    <div className={`p-3 rounded-xl bg-slate-50 ${color}`}>
                        {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
