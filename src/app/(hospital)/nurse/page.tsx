'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { 
  Activity, Thermometer, Pill, Bed, 
  Clock, CheckCircle2, AlertCircle, ChevronRight,
  UserPlus, ClipboardList, HeartPulse, Loader2, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function NurseDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = userProfile?.role === 'NURSE' || userProfile?.role === 'DOCTOR' || userProfile?.role === 'DIRECTOR';

  // 1. TRIAGE QUEUE: Patients awaiting Vitals
  const triageQueueQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/patients`),
      where("status", "==", "Awaiting Vitals"),
      orderBy("createdAt", "asc")
    );
  }, [firestore, hospitalId]);
  const { data: triageQueue, isLoading: isTriageLoading } = useCollection(triageQueueQuery);

  // 2. WARD PULSE: Patients currently admitted
  const inpatientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/admissions`),
      where("status", "==", "ADMITTED")
    );
  }, [firestore, hospitalId]);
  const { data: inpatients, isLoading: isInpatientsLoading } = useCollection(inpatientsQuery);

  const isLoading = isUserLoading || isProfileLoading || isTriageLoading || isInpatientsLoading;

  if (isUserLoading || isProfileLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }

  if (!isAuthorized) {
       return (
         <div className="flex flex-1 items-center justify-center bg-background p-4">
            <div className="text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">This dashboard is for authorized clinical staff.</p>
                 <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
            </div>
         </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* --- NURSE GREETING --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter italic">Nursing <span className="text-primary">Station</span></h1>
          <p className="text-muted-foreground font-bold text-xs uppercase italic">Shift Lead: Nurse {userProfile?.fullName}</p>
        </div>
        <div className="bg-primary text-primary-foreground px-6 py-2 rounded-2xl shadow-lg flex items-center gap-3">
           <Clock size={18} />
           <span className="text-[10px] font-black uppercase tracking-widest">Next Rounds: 2:00 PM</span>
        </div>
      </div>

      {/* --- NURSING KPI GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NurseKPI label="Pending Triage" value={triageQueue?.length.toString() ?? '0'} icon={<Activity size={20}/>} color="orange" />
        <NurseKPI label="Bed Occupancy" value={inpatients?.length.toString() ?? '0'} icon={<Bed size={20}/>} color="blue" />
        <NurseKPI label="Meds Due Now" value="3" icon={<Pill size={20}/>} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- TRIAGE / VITAL QUEUE --- */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <Thermometer size={16} className="text-orange-500" /> OPD Triage Queue
            </h3>
            <Link href="/patients/register" className="text-[10px] font-black text-primary uppercase hover:underline">New Registration</Link>
          </div>

          <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden">
            {isLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin text-primary"/></div> :
            triageQueue?.length === 0 ? (
               <div className="p-20 text-center text-muted-foreground/50 italic uppercase text-xs font-bold">All OPD patients triaged.</div>
            ) : triageQueue?.map((p: any) => (
              <div key={p.id} className="p-6 flex items-center justify-between border-b last:border-0 hover:bg-muted/50 transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-xs">
                      {p.firstName?.[0]}
                   </div>
                   <div>
                      <p className="font-black text-card-foreground uppercase text-xs">{p.firstName} {p.lastName}</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{p.ehrNumber}</p>
                   </div>
                </div>
                <Link href={`/patients/folder/${p.id}`}>
                   <Button variant="destructive" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[9px] tracking-widest shadow-sm">
                      Take Vitals <ChevronRight size={14} />
                   </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* --- WARD MONITORING --- */}
        <div className="space-y-6">
           <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <HeartPulse size={16} className="text-primary" /> Active Ward Rounds
           </h3>
           
           <div className="grid grid-cols-1 gap-4">
              {isLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin text-primary"/></div> :
              inpatients?.length === 0 ? (
                <div className="p-20 bg-card rounded-[40px] border border-dashed text-center text-muted-foreground text-[10px] font-bold uppercase">No patients admitted.</div>
              ) : inpatients?.map((adm: any) => (
                <div key={adm.id} className="bg-card p-6 rounded-[32px] border-2 border-border shadow-sm flex justify-between items-center group hover:border-primary/20 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                         <Bed size={24} />
                      </div>
                      <div>
                         <p className="font-black text-card-foreground uppercase text-sm">{adm.patientName}</p>
                         <p className="text-[10px] font-bold text-primary uppercase italic">Bed: {adm.bedId}</p>
                      </div>
                   </div>
                   <Link href={`/wards/treatment/${adm.id}`}>
                      <Button variant="secondary" size="icon" className="bg-foreground text-background hover:bg-primary group-hover:bg-primary transition-all shadow-lg">
                         <ClipboardList size={20} />
                      </Button>
                   </Link>
                </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
}

function NurseKPI({ label, value, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };
  return (
    <div className={`p-8 rounded-[32px] border-2 flex items-center justify-between transition-all hover:scale-105 shadow-sm ${colors[color]}`}>
       <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
          <p className="text-4xl font-black tracking-tighter">{value}</p>
       </div>
       <div className="p-4 bg-white rounded-3xl shadow-sm">{icon}</div>
    </div>
  );
}
