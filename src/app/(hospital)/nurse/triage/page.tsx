'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc } from 'firebase/firestore';
import {
  Activity, HeartPulse, Thermometer, ArrowRight, Clock, Loader2, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function TriageStation() {
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

  const queueQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/patients`),
      where("status", "==", "Awaiting Vitals"),
      orderBy("checkInTime", "asc")
    );
  }, [firestore, hospitalId]);
  
  const { data: queue, isLoading: isQueueLoading } = useCollection(queueQuery);

  const isLoading = isUserLoading || isProfileLoading || isQueueLoading;
  
  if (isLoading) {
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Triage <span className="text-blue-600">Station</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Clinical Intake & Vitals Assessment Queue.</p>
        </div>
        <div className="bg-blue-600 text-white px-6 py-2 rounded-2xl flex items-center gap-2">
           <Clock size={16} />
           <span className="text-[10px] font-black uppercase">Waiting: {queue?.length ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {queue?.length === 0 ? (
          <div className="p-20 bg-slate-50 rounded-[40px] border-2 border-dashed text-center text-slate-300 italic uppercase font-black">
             Queue is empty. Awaiting Front Desk Check-in.
          </div>
        ) : queue?.map((p) => (
          <div key={p.id} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 hover:border-orange-500 transition-all">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[24px] bg-orange-50 text-orange-600 flex items-center justify-center">
                   <Activity size={32} />
                </div>
                <div>
                   <h3 className="text-2xl font-black uppercase tracking-tight">{p.firstName} {p.lastName}</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EHR: {p.ehrNumber} • Checked-in: {p.checkInTime ? new Date(p.checkInTime?.toDate()).toLocaleTimeString() : 'N/A'}</p>
                </div>
             </div>
             
             <Link href={`/patients/folder/${p.id}`}>
                <Button className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-100 flex items-center gap-3 hover:bg-black transition-all">
                   Assess Vitals <ArrowRight size={18} />
                </Button>
             </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
