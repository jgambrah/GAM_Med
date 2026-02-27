
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { differenceInDays } from 'date-fns';
import { Loader2, TrendingUp, Users, BedDouble, Activity, ShieldCheck } from 'lucide-react';
import { Invoice, Bed, Admission, User as UserType } from '@/lib/types';

const formatCurrency = (amount: number) => `₵${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  count: {
    label: "Admissions",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

/**
 * == Core Strategic Dashboard: Admin/Director View ==
 * 
 * Aggregates live facility metrics from Firestore.
 * Enforces logical isolation via the SaaS hospitalId wall.
 */
export function AdminDashboard() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const hospitalId = user?.hospitalId || '';

  // 1. LIVE SAAS QUERIES: Fetch facility-locked data
  const invQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "invoices"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: invoices, isLoading: isInvLoading } = useCollection<Invoice>(invQuery);

  const bedsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "beds"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: beds, isLoading: isBedsLoading } = useCollection<Bed>(bedsQuery);

  const admQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "admissions"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: admissions, isLoading: isAdmLoading } = useCollection<Admission>(admQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "users"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: staff, isLoading: isUsersLoading } = useCollection<UserType>(usersQuery);

  // 2. AGGREGATE CALCULATIONS
  const metrics = React.useMemo(() => {
    const totalRevenue = invoices?.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (i.grandTotal || 0), 0) || 0;
    const arBalance = invoices?.filter(i => i.status !== 'Paid' && i.status !== 'Void').reduce((sum, i) => sum + (i.amountDue || 0), 0) || 0;
    
    const totalBeds = beds?.length || 0;
    const occupiedBeds = beds?.filter(b => b.status === 'Occupied' || b.status === 'occupied').length || 0;
    const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

    const completedAdmissions = admissions?.filter(a => a.status === 'Discharged' && a.admission_date && a.discharge_date) || [];
    const totalStayDays = completedAdmissions.reduce((sum, a) => {
        const start = new Date(a.admission_date);
        const end = new Date(a.discharge_date!);
        return sum + Math.max(1, differenceInDays(end, start));
    }, 0);
    const avgStay = completedAdmissions.length > 0 ? totalStayDays / completedAdmissions.length : 0;

    const admissionMix = [
        { type: "Inpatient", count: admissions?.filter(a => a.type === 'Inpatient').length || 0 },
        { type: "Outpatient", count: admissions?.filter(a => a.type === 'Outpatient').length || 0 },
        { type: "Emergency", count: admissions?.filter(a => a.type === 'Emergency').length || 0 },
    ];

    return {
        totalRevenue,
        arBalance,
        occupancyRate,
        occupiedBeds,
        totalBeds,
        avgStay,
        admissionMix
    };
  }, [invoices, beds, admissions]);

  if (isInvLoading || isBedsLoading || isAdmLoading || isUsersLoading) {
    return (
        <div className="h-96 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <Loader2 className="h-10 w-10 animate-spin opacity-20" />
            <p className="text-xs font-black uppercase tracking-widest animate-pulse">Syncing Facility Intelligence...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DashboardKpi 
                title="Revenue (Paid)" 
                value={formatCurrency(metrics.totalRevenue)} 
                desc="Collected this period"
                icon={<TrendingUp className="text-green-600" />}
            />
            <DashboardKpi 
                title="A/R Balance" 
                value={formatCurrency(metrics.arBalance)} 
                desc="Total Outstanding"
                icon={<Activity className="text-orange-600" />}
            />
            <DashboardKpi 
                title="Bed Occupancy" 
                value={`${metrics.occupancyRate.toFixed(1)}%`} 
                desc={`${metrics.occupiedBeds} of ${metrics.totalBeds} Units`}
                icon={<BedDouble className="text-blue-600" />}
            />
            <DashboardKpi 
                title="Avg. Visit Length" 
                value={`${metrics.avgStay.toFixed(1)} Days`} 
                desc="Discharged Patients"
                icon={<Users className="text-purple-600" />}
            />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
             <Card className="shadow-md border-t-4 border-t-primary">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg font-bold">Revenue Insight</CardTitle>
                    <CardDescription>Live billing throughput for {hospitalId}.</CardDescription>
                </CardHeader>
                <CardContent className="h-80 flex flex-col items-center justify-center text-center p-8 bg-muted/5 border-2 border-dashed m-6 rounded-2xl">
                    <ShieldCheck className="h-12 w-12 text-muted-foreground/20 mb-4" />
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">SaaS Wall Enforced</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-2">Historical revenue trends populate as monthly logs accrue.</p>
                </CardContent>
            </Card>

            <Card className="shadow-md border-t-4 border-t-blue-500 overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg font-bold">Admissions Mix</CardTitle>
                    <CardDescription>Real-time census by visit type.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                     <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                        <BarChart data={metrics.admissionMix} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid horizontal={false} opacity={0.3} />
                            <YAxis dataKey="type" type="category" tickLine={false} axisLine={false} width={80} fontSize={12} />
                            <XAxis type="number" hide />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={32} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
             <Card className="bg-slate-50 border-slate-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Staff Count</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black text-slate-900">{staff?.length || 0}</div>
                     <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Personnel Scoped to Tenant</p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

function DashboardKpi({ title, value, desc, icon }: { title: string, value: string, desc: string, icon: React.ReactNode }) {
    return (
        <Card className="shadow-sm border-none bg-white ring-1 ring-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
                <div className="h-4 w-4">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black text-slate-900 leading-none">{value}</div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-3 tracking-tighter">{desc}</p>
            </CardContent>
        </Card>
    );
}
