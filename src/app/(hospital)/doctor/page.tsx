'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp, doc } from 'firebase/firestore';
import {
  Users, Stethoscope, Beaker,
  Bell, Clock, ChevronRight,
  Activity, ShieldAlert, Loader2, BookOpen, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function DoctorDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Fetch the user's full profile from Firestore to get their role and hospitalId.
  // This is more reliable than relying on custom claims which can have propagation delays.
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const doctorUid = user?.uid;
  const isDoctor = userProfile?.role === 'DOCTOR' || userProfile?.role === 'DIRECTOR';

  // 1. LISTEN FOR CONSULTATION QUEUE
  const queueQuery = useMemoFirebase(() => {
      if (!firestore || !hospitalId || !doctorUid) return null;
      return query(
          collection(firestore, `hospitals/${hospitalId}/patients`),
          where("assignedDoctorId", "==", doctorUid), // <--- THE FILTER
          where("status", "==", "Waiting for Doctor"),
          orderBy("assignedAt", "asc") // First assigned, first seen
      );
  }, [firestore, hospitalId, doctorUid]);
  const { data: queue, isLoading: isQueueLoading } = useCollection(queueQuery);

  // 2. LISTEN FOR DIAGNOSTIC ALERTS
  const alertsQuery = useMemoFirebase(() => {
      if (!firestore || !hospitalId || !doctorUid) return null;
      return query(
          collection(firestore, `hospitals/${hospitalId}/lab_orders`),
          where("providerUid", "==", doctorUid),
          where("status", "==", "COMPLETED"),
          orderBy("completedAt", "desc"),
          limit(5)
      );
  }, [firestore, hospitalId, doctorUid]);
  const { data: alerts, isLoading: isAlertsLoading } = useCollection(alertsQuery);
  
  const isLoading = isUserLoading || isProfileLoading || isQueueLoading || isAlertsLoading;

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isDoctor) {
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* --- DOCTOR GREETING --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter italic">Clinical <span className="text-primary">Command Desk</span></h1>
          <p className="text-muted-foreground font-bold text-xs uppercase italic">Welcome, {user?.displayName}</p>
        </div>
        <div className="flex items-center gap-3 bg-card p-2 rounded-2xl border shadow-sm px-6">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">System Sync: Live</span>
        </div>
      </div>

      {/* --- CLINICAL KPI GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PersonalKPI label="Consulted Today" value={queue && queue.length > 5 ? "12" : "0"} icon={<Users size={20}/>} color="blue" />
        <PersonalKPI label="Pending Results" value={alerts?.length.toString() ?? '0'} icon={<Beaker size={20}/>} color="purple" />
        <PersonalKPI label="Inpatient Rounds" value="4" icon={<Stethoscope size={20}/>} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- MAIN WORK QUEUE (The OPD List) --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <Clock size={16} className="text-primary" /> Patient Consultation Queue
            </h3>
            <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full">{queue?.length ?? 0} WAITING</span>
          </div>

          <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden divide-y">
            {!queue || queue.length === 0 ? (
               <div className="p-20 text-center text-muted-foreground/50 italic uppercase text-xs font-bold">No patients currently in the queue.</div>
            ) : queue.map((patient: any) => (
              <div key={patient.id} className="p-6 flex items-center justify-between group hover:bg-muted/50 transition-all">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
                      {patient.firstName?.[0]}{patient.lastName?.[0]}
                   </div>
                   <div>
                      <p className="font-black text-card-foreground uppercase text-sm">{patient.firstName} {patient.lastName}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{patient.ehrNumber} • {patient.gender}</p>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="hidden md:block text-right">
                      <p className="text-[9px] font-black text-muted-foreground uppercase">Waited for</p>
                      <p className="text-xs font-bold text-card-foreground">15 Mins</p>
                   </div>
                   <Link href={`/patients/folder/${patient.id}`}>
                      <Button asChild size="sm" className="bg-foreground hover:bg-primary text-background font-bold uppercase text-[10px] tracking-widest">
                         <div>
                            Start Consultation <ChevronRight size={14} />
                         </div>
                      </Button>
                   </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- SIDEBAR: CLINICAL ALERTS --- */}
        <div className="space-y-6">
           <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <Bell size={16} className="text-red-500" /> Diagnostic Alerts
           </h3>
           
           <div className="space-y-4">
              {!alerts || alerts.length === 0 ? (
                <div className="p-10 bg-card rounded-[32px] border-2 border-dashed text-center text-muted-foreground text-[10px] font-bold uppercase">No unread results</div>
              ) : alerts.map((alert: any) => {
                const isCritical = alert.isAbnormal || false;
                return (
                    <Link key={alert.id} href={`/patients/folder/${alert.patientId}`}>
                        <div className={`p-5 rounded-[28px] border-2 shadow-sm relative overflow-hidden group mb-3 transition-all ${isCritical ? 'bg-red-50 border-red-500 animate-pulse' : 'bg-card hover:border-primary/20'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${isCritical ? 'bg-red-500 text-white' : 'bg-primary/10 text-primary'}`}>
                                    {isCritical ? <ShieldAlert size={20} /> : <Activity size={20} />}
                                </div>
                                <div>
                                    <p className={`font-black uppercase text-[11px] leading-tight ${isCritical ? 'text-red-700' : 'text-card-foreground'}`}>
                                        {isCritical && <span className="font-black">CRITICAL: </span>} {alert.testName} Ready
                                    </p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">{alert.patientName}</p>
                                </div>
                            </div>
                            {isCritical && <div className="absolute right-0 top-0 h-full w-1.5 bg-red-500" />}
                        </div>
                    </Link>
                );
              })}
           </div>

           {/* QUICK UTILITY SECTION */}
           <div className="bg-primary p-8 rounded-[40px] text-primary-foreground shadow-xl space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">System Shortcuts</h4>
              <div className="space-y-2">
                 <ShortcutBtn label="Search Medical Archive" />
                 <ShortcutBtn label="View Ward Occupancy" />
              </div>
           </div>
           
           <a 
              href="https://www.moh.gov.gh/wp-content/uploads/2020/07/GHANA-STG-2017.pdf" 
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 hover:bg-amber-100 transition-all"
            >
              <div className="flex items-center gap-3">
                 <BookOpen size={18} />
                 <span className="text-[10px] font-black uppercase tracking-tight">Standard Treatment Guidelines</span>
              </div>
              <ExternalLink size={14} />
            </a>
        </div>

      </div>
    </div>
  );
}

function PersonalKPI({ label, value, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };
  return (
    <div className={`p-8 rounded-[32px] border-2 flex items-center gap-5 transition-all hover:scale-105 shadow-sm ${colors[color]}`}>
       <div className="p-3 bg-card rounded-2xl shadow-sm">{icon}</div>
       <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
          <p className="text-3xl font-black tracking-tighter">{value}</p>
       </div>
    </div>
  );
}

function ShortcutBtn({ label, icon }: any) {
    return (
        <button className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-card hover:text-primary rounded-xl transition-all text-xs font-bold uppercase tracking-tight">
            {label} {icon}
        </button>
    );
}
