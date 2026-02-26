
'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExtendTrialDialog } from '@/components/super-admin/ExtendTrialDialog';
import { Hospital } from '@/lib/types';
import { Building2, Users, CreditCard, Zap, Loader2, Globe, ShieldCheck } from 'lucide-react';
import CreateHospitalModal from '@/components/super-admin/CreateHospitalModal';
import { format } from 'date-fns';

/**
 * == Super Admin Platform Control Tower ==
 * 
 * Provides global oversight of all hospital tenants.
 * Utilizes "God Mode" permissions to aggregate platform-wide stats.
 */
export default function SuperAdminDashboard() {
  const firestore = useFirestore();
  const [stats, setStats] = React.useState({ totalHospitals: 0, totalPatients: 0, totalUsers: 0 });
  const [isStatsLoading, setIsStatsLoading] = React.useState(true);

  // 1. Fetch global totals (God Mode permitted for Super Admin)
  React.useEffect(() => {
    const fetchGlobalStats = async () => {
      if (!firestore) return;
      try {
        const [hSnap, pSnap, uSnap] = await Promise.all([
          getDocs(collection(firestore, "hospitals")),
          getDocs(collection(firestore, "patients")),
          getDocs(collection(firestore, "users"))
        ]);
        
        setStats({ 
          totalHospitals: hSnap.size, 
          totalPatients: pSnap.size, 
          totalUsers: uSnap.size 
        });
      } catch (e) {
        console.error("Global stats fetch failed:", e);
      } finally {
        setIsStatsLoading(false);
      }
    };
    fetchGlobalStats();
  }, [firestore]);

  // 2. Real-time Tenant Registry
  const hospitalsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "hospitals"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: hospitals, isLoading: isHospitalsLoading } = useCollection<Hospital>(hospitalsQuery);

  return (
    <div className="p-8 space-y-8 bg-slate-50/30 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Globe className="h-8 w-8 text-blue-600" />
            Platform Control Tower
          </h1>
          <p className="text-muted-foreground font-medium">Master tenant registry and evaluation management.</p>
        </div>
        <CreateHospitalModal />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PulseCard 
            title="Active Facilities" 
            value={stats.totalHospitals} 
            icon={<Building2 />} 
            color="text-blue-600" 
            isLoading={isStatsLoading}
        />
        <PulseCard 
            title="Total Patients" 
            value={stats.totalPatients.toLocaleString()} 
            icon={<Users />} 
            color="text-emerald-600" 
            isLoading={isStatsLoading}
        />
        <PulseCard 
            title="System Users" 
            value={stats.totalUsers} 
            icon={<Zap />} 
            color="text-purple-600" 
            isLoading={isStatsLoading}
        />
      </div>

      {/* Tenant Directory */}
      <Card className="shadow-xl border-none ring-1 ring-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-900 text-white pb-6">
          <CardTitle className="text-lg font-bold">Facility Registry</CardTitle>
          <CardDescription>Manage hospital tenants, trial periods, and platform access.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader className="bg-slate-50 border-b">
              <TableRow>
                <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Hospital Name</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Plan & Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Trial Window</TableHead>
                <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isHospitalsLoading ? (
                <TableRow><TableCell colSpan={4} className="h-40 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-muted-foreground" /></TableCell></TableRow>
              ) : (hospitals && hospitals.length > 0) ? (
                hospitals.map((hosp) => {
                    const trialDate = hosp.trialEndsAt?.toDate 
                        ? hosp.trialEndsAt.toDate() 
                        : (hosp.trialEndsAt ? new Date(hosp.trialEndsAt) : null);
                    const isExpired = trialDate && trialDate < new Date();

                    return (
                        <TableRow key={hosp.hospitalId} className="hover:bg-slate-50/80 transition-colors h-20">
                            <TableCell className="pl-6">
                                <p className="font-black text-slate-900">{hosp.name}</p>
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">{hosp.hospitalId}</p>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <Badge variant="outline" className="w-fit text-[9px] font-black uppercase border-blue-200 text-blue-700 bg-blue-50">
                                        {hosp.subscriptionTier || 'starter'}
                                    </Badge>
                                    <Badge variant={hosp.status === 'active' ? "secondary" : "destructive"} className="w-fit text-[8px] uppercase">
                                        {hosp.subscriptionStatus || hosp.status}
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell>
                                {trialDate ? (
                                    <div className="flex flex-col">
                                        <span className={`text-xs font-bold ${isExpired ? 'text-red-600' : 'text-slate-700'}`}>
                                            {format(trialDate, 'MMM dd, yyyy')}
                                        </span>
                                        <span className="text-[9px] font-black uppercase text-muted-foreground">
                                            {isExpired ? 'LOCKED' : 'EVALUATION'}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-green-600">
                                        <ShieldCheck size={14} />
                                        <span className="text-[10px] font-black uppercase">PAID SEAT</span>
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <div className="flex justify-end items-center gap-2">
                                    {!hosp.isInternal && <ExtendTrialDialog hospital={hosp} />}
                                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase">Details</Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic">No facilities provisioned on the platform.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PulseCard({ title, value, icon, color, isLoading }: any) {
    return (
        <Card className="shadow-sm border-none ring-1 ring-slate-200">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">{title}</p>
                    {isLoading ? <div className="h-8 w-16 bg-muted animate-pulse rounded" /> : <h3 className={`text-2xl font-black ${color}`}>{value}</h3>}
                </div>
                <div className={`p-3 rounded-xl bg-slate-50 ${color}`}>{icon}</div>
            </CardContent>
        </Card>
    );
}
