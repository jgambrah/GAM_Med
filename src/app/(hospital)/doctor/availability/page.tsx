
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Clock, Calendar, Save, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DoctorAvailabilityPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const isDoctor = userProfile?.role === 'DOCTOR' || userProfile?.role === 'DIRECTOR';

  const availabilityRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "doctor_availability", user.uid);
  }, [user, firestore]);
  const { data: availabilityData, isLoading: availabilityLoading } = useDoc(availabilityRef);
  
  const [schedule, setSchedule] = useState({
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '08:00',
    endTime: '16:00',
    slotDuration: 30,
  });

  useEffect(() => {
    if (availabilityData) {
      setSchedule(availabilityData as any);
    }
  }, [availabilityData]);

  const saveAvailability = async () => {
    if (!user || !userProfile || !availabilityRef) {
        toast({ variant: "destructive", title: "Error", description: "User not authenticated."});
        return;
    }
    setSaving(true);
    try {
      setDocumentNonBlocking(availabilityRef, {
        ...schedule,
        hospitalId: userProfile.hospitalId,
        doctorId: user.uid,
        doctorName: userProfile.fullName,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Consultation Schedule Published" });
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Save Failed", description: e.message }); 
    } finally {
      setSaving(false);
    }
  };

  const isLoading = isUserLoading || profileLoading || availabilityLoading;

  if (isLoading) {
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
              <p className="text-muted-foreground">This page is for authorized doctors.</p>
               <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
          </div>
       </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black font-bold">
      <h1 className="text-3xl font-black uppercase tracking-tighter italic">Consultation <span className="text-blue-600">Hours</span></h1>
      
      <div className="bg-white p-10 rounded-[40px] border shadow-sm space-y-8">
        <div className="grid grid-cols-2 gap-8">
           <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Start Time</label>
              <input type="time" className="w-full p-4 border rounded-2xl bg-slate-50 mt-1 font-black" 
                value={schedule.startTime} onChange={e => setSchedule({...schedule, startTime: e.target.value})} />
           </div>
           <div>
              <label className="text-[10px] font-black uppercase text-slate-400">End Time</label>
              <input type="time" className="w-full p-4 border rounded-2xl bg-slate-50 mt-1 font-black" 
                value={schedule.endTime} onChange={e => setSchedule({...schedule, endTime: e.target.value})} />
           </div>
        </div>

        <div>
           <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Available Days</label>
           <div className="flex flex-wrap gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <button 
                  key={day}
                  onClick={() => {
                    const days = schedule.days.includes(day) ? schedule.days.filter(d => d !== day) : [...schedule.days, day];
                    setSchedule({...schedule, days});
                  }}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${schedule.days.includes(day) ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                >
                  {day}
                </button>
              ))}
           </div>
        </div>

        <button onClick={saveAvailability} disabled={saving} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all">
           {saving ? <Loader2 className="animate-spin" /> : <Save size={18}/>} Publish Availability to Patient Portal
        </button>
      </div>
    </div>
  );
}

    