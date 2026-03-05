'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { 
  Users, UserPlus, Activity, CreditCard, 
  ArrowUpRight, ClipboardList, Settings, ShieldCheck, Loader2, ShieldAlert, BedDouble, Tag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DirectorDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const isDirector = userProfile?.role === 'DIRECTOR';
  const hospitalId = userProfile?.hospitalId;

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospitalInfo, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "users"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: staff, isLoading: isStaffLoading } = useCollection(staffQuery);

  const isLoading = isUserLoading || isProfileLoading || isHospitalLoading || isStaffLoading;

  if (isLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }

  if (!isDirector) {
      return (
         <div className="flex flex-1 items-center justify-center bg-background p-4">
            <div className="text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have Director privileges.</p>
                 <Button onClick={() => router.push('/')} className="mt-4">Return Home</Button>
            </div>
         </div>
      );
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-blue-900 uppercase italic">
            {hospitalInfo?.name || 'Loading...'}
          </h1>
          <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-xs">
            <ShieldCheck size={14} className="text-green-600" />
            Director Command Centre • ID: {hospitalId}
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/staff/add">
            <Button>
              <UserPlus size={18} /> Onboard Staff
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Staff" value={staff?.length ?? 0} icon={<Users className="text-blue-600" />} />
        <StatCard title="Total Patients" value={hospitalInfo?.patientCounter ?? 0} icon={<Activity className="text-green-600" />} />
        <StatCard title="OPD Visits (Today)" value="0" icon={<ClipboardList className="text-orange-600" />} />
        <StatCard title="Revenue (GHS)" value="0.00" icon={<CreditCard className="text-purple-600" />} />
      </div>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
          <h3 className="text-xl font-black tracking-tighter uppercase text-slate-800 border-b pb-2">Administrative Actions</h3>
          <div className="grid grid-cols-2 gap-4">
             <ActionButton title="Manage HR" desc="Assign/Update HR roles" href="/hr" />
             <ActionButton title="Tariff Master" desc="Set service prices" href="/finance/tariffs" icon={<Tag size={16}/>} />
             <ActionButton title="Ward Setup" desc="Manage beds & clinics" href="/wards/setup" icon={<BedDouble size={16}/>} />
             <ActionButton title="Settings" desc="Hospital Profile" href="/settings" icon={<Settings size={16}/>} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <h3 className="text-xl font-black tracking-tighter uppercase text-slate-800 border-b pb-2">Recent Activity</h3>
          <div className="py-10 text-center text-slate-400 font-medium italic">
            No clinical activity recorded in the last 24 hours.
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4">
      <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({ title, desc, href, icon }: any) {
  return (
    <Link href={href} className="group p-4 bg-slate-50 rounded-2xl hover:bg-blue-600 transition-all border border-transparent hover:border-blue-400">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-slate-900 group-hover:text-white uppercase text-xs tracking-tight">{title}</span>
        {icon || <ArrowUpRight size={14} className="text-slate-400 group-hover:text-white" />}
      </div>
      <p className="text-[10px] text-slate-500 group-hover:text-blue-100 font-medium leading-tight">{desc}</p>
    </Link>
  );
}
    