'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { Video, Phone, Users, Clock, ShieldAlert, Loader2, Calendar, Search, ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TeleconsultationOverlay } from '@/components/clinical/TeleconsultationOverlay';

export default function TelehealthDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [activeCallSession, setActiveCallSession] = useState<{ patientId: string; patientName: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'].includes(userRole || '');

  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/patients`),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);

  const { data: patients, isLoading: isPatientsLoading } = useCollection<any>(patientsQuery);

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.ehrNumber?.toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  const isLoading = isUserLoading || isProfileLoading || isPatientsLoading;

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
          <p className="text-muted-foreground">Authorized clinical staff access only.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      {/* FLOATING TELECONSULTATION OVERLAY */}
      {activeCallSession && (
        <TeleconsultationOverlay
          patientId={activeCallSession.patientId}
          patientName={activeCallSession.patientName}
          onClose={() => setActiveCallSession(null)}
        />
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Telehealth & <span className="text-sky-600">Remote Care Suite</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Native HD Video Teleconsultations & Integrated Real-time EHR Charting.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-sky-50 text-sky-700 px-6 py-2 rounded-2xl border border-sky-200 flex items-center gap-2">
            <Video size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Virtual Care Active</span>
          </div>
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-sky-600">
            <Video size={24} />
            <span className="text-[10px] font-black uppercase bg-sky-50 px-3 py-1 rounded-full">Waiting Room</span>
          </div>
          <p className="text-3xl font-black">3</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Patients Ready in Waiting Room</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-emerald-600">
            <CheckCircle2 size={24} />
            <span className="text-[10px] font-black uppercase bg-emerald-50 px-3 py-1 rounded-full">Completed Today</span>
          </div>
          <p className="text-3xl font-black">8</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Virtual Consultations</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-purple-600">
            <Clock size={24} />
            <span className="text-[10px] font-black uppercase bg-purple-50 px-3 py-1 rounded-full">Avg Duration</span>
          </div>
          <p className="text-3xl font-black">12 min</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Average Teleconsult Time</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-amber-600">
            <Calendar size={24} />
            <span className="text-[10px] font-black uppercase bg-amber-50 px-3 py-1 rounded-full">Upcoming</span>
          </div>
          <p className="text-3xl font-black">14</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Scheduled Virtual Follow-ups</p>
        </div>
      </div>

      {/* PATIENT QUEUE & VIRTUAL APPOINTMENTS */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Virtual Patient Queue & Direct Video Call Launcher</h3>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search patient by name or EHR number for remote follow-up..."
            className="pl-9 bg-slate-50 border rounded-2xl font-bold h-12 text-xs text-black placeholder:text-slate-400"
          />
        </div>

        <div className="bg-white rounded-[40px] border shadow-sm divide-y">
          {filteredPatients.length === 0 ? (
            <div className="p-16 text-center text-slate-400 italic text-xs uppercase font-black">No patients in virtual queue.</div>
          ) : (
            filteredPatients.slice(0, 15).map(p => (
              <div key={p.id} className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Video size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase">{p.firstName} {p.lastName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">EHR: {p.ehrNumber} • Phone: {p.phoneNumber || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    onClick={() => setActiveCallSession({ patientId: p.id, patientName: `${p.firstName} ${p.lastName}` })}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 px-6 py-3 shadow-lg shadow-emerald-100"
                  >
                    <Play size={14} /> Launch HD Video Call
                  </Button>

                  <Link href={`/patients/folder/${p.id}`}>
                    <Button variant="outline" className="rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      Open EHR Chart <ArrowRight size={14} />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
