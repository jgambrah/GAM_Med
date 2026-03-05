'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Calendar, Clock, User, Scissors, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Surgery = {
  id: string;
  theaterName: string;
  scheduledTime: string;
  procedureName: string;
  patientName: string;
  surgeonName: string;
  patientId: string;
};

export default function TheaterSchedule() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'].includes(userProfile?.role || '');

  const surgeriesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/surgeries`),
      where("status", "==", "SCHEDULED"),
      orderBy("scheduledDate", "asc")
    );
  }, [firestore, hospitalId]);

  const { data: surgeries, isLoading: areSurgeriesLoading } = useCollection<Surgery>(surgeriesQuery);

  const isLoading = isUserLoading || isProfileLoading;
  
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this high-security module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 text-black font-bold">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
           <h1 className="text-3xl font-black uppercase tracking-tighter italic text-black">OT <span className="text-primary">Schedule</span></h1>
           <p className="text-muted-foreground font-medium">Live surgical board for all scheduled operations.</p>
        </div>
        <Button>New Surgery</Button>
      </div>
      
      {areSurgeriesLoading ? (
        <div className="text-center p-20"><Loader2 className="animate-spin text-primary" /></div>
      ) : surgeries?.length === 0 ? (
        <div className="text-center p-20 bg-card rounded-2xl border-2 border-dashed">
            <p className="font-bold text-muted-foreground">No surgeries scheduled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surgeries?.map(s => (
            <div key={s.id} className="bg-card p-6 rounded-[32px] border-4 border-foreground shadow-[8px_8px_0px_0px_hsl(var(--foreground))] space-y-4">
              <div className="flex justify-between items-start">
                 <span className="text-[9px] font-black bg-primary text-primary-foreground px-3 py-1 rounded-full uppercase italic">{s.theaterName}</span>
                 <span className="text-[10px] text-muted-foreground uppercase font-bold">{s.scheduledTime}</span>
              </div>
              <div>
                 <p className="text-sm font-black uppercase">{s.procedureName}</p>
                 <p className="text-[10px] text-primary mt-1 uppercase">Patient: {s.patientName}</p>
              </div>
              <div className="pt-4 border-t flex justify-between items-center">
                 <p className="text-[9px] text-muted-foreground font-bold uppercase italic">Surgeon: Dr. {s.surgeonName}</p>
                 <Link href={`/theater/log/${s.id}`} className="bg-foreground text-background p-2 rounded-xl hover:bg-primary transition-all"><Scissors size={14}/></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
