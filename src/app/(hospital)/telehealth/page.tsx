'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { 
  Video, Phone, Users, Clock, ShieldAlert, Loader2, Calendar, 
  Search, ArrowRight, CheckCircle, Activity 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      p.ehrNumber?.toLowerCase().includes(q) ||
      p.phoneNumber?.toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  const isLoading = isUserLoading || isProfileLoading || isPatientsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-sky-500" />
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
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* FLOATING TELECONSULTATION OVERLAY */}
      {activeCallSession && (
        <TeleconsultationOverlay
          patientId={activeCallSession.patientId}
          patientName={activeCallSession.patientName}
          onClose={() => setActiveCallSession(null)}
        />
      )}

      {/* 1. THE DIGITAL HEALTH COMMAND BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden mb-6">
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 pb-5 border-b border-slate-800/60 mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <Video className="w-7 h-7 text-sky-400" />
              TELEHEALTH & REMOTE CARE SUITE
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest">
              Native HD Video Teleconsultations & Integrated Real-Time EHR Charting
            </p>
          </div>

          {/* Connection Status */}
          <div className="flex items-center">
            <span className="px-3 py-1.5 text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-lg uppercase tracking-wider flex items-center gap-2 shadow-[0_0_10px_rgba(56,189,248,0.1)]">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              Virtual Care Active
            </span>
          </div>
        </div>

        {/* Telehealth Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
          
          {/* Priority Metric: Waiting Room */}
          <div className="bg-slate-900 border border-sky-900/60 shadow-[0_0_15px_rgba(56,189,248,0.08)] rounded-xl p-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-400"></div>
            <span className="block text-[10px] font-bold text-sky-400/90 uppercase tracking-widest mb-1 pl-2 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Waiting Room
            </span>
            <span className="text-2xl font-black text-sky-400 pl-2">
              3 <span className="text-xs font-medium text-sky-700">Ready</span>
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-emerald-400" /> Completed Today
            </span>
            <span className="text-2xl font-black text-white">8 <span className="text-xs font-medium text-slate-500">Consults</span></span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-purple-400" /> Avg Duration
            </span>
            <span className="text-2xl font-black text-white">12 <span className="text-xs font-medium text-slate-500">min</span></span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-amber-400" /> Upcoming
            </span>
            <span className="text-2xl font-black text-slate-300">14 <span className="text-xs font-medium text-slate-500">Scheduled</span></span>
          </div>

        </div>
      </div>

      {/* 2. VIRTUAL PATIENT QUEUE & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-500" /> Virtual Patient Queue & Launcher
        </h3>
        
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-sky-500 outline-none transition shadow-sm" 
            placeholder="Search patient by name or EHR number..." 
          />
        </div>
      </div>

      {/* 3. PATIENT QUEUE LIST */}
      <div className="space-y-3">
        {filteredPatients.length > 0 ? (
          filteredPatients.slice(0, 15).map((p) => {
            const fullName = `${p.firstName} ${p.lastName}`;
            const initial = p.firstName?.charAt(0)?.toUpperCase() || 'P';

            return (
              <div 
                key={p.id} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-500/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center font-black border border-sky-100 dark:border-sky-800 text-lg">
                      {initial}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">{fullName}</h4>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">{p.ehrNumber || 'MMH/EHR/26/0001'}</span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {p.phoneNumber || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link href={`/patients/folder/${p.id}`}>
                    <button className="px-4 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center gap-2 uppercase tracking-wide cursor-pointer">
                      Open EHR Chart <ArrowRight className="w-3 h-3" />
                    </button>
                  </Link>

                  <button 
                    onClick={() => setActiveCallSession({ patientId: p.id, patientName: fullName })}
                    className="px-5 py-2 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center gap-2 uppercase tracking-wide cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" /> Launch HD Video Call
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          /* Fallback Display Queue Items */
          <>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-300 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center font-black border border-sky-100 dark:border-sky-800 text-lg">
                    B
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Benjamin Hedidor</h4>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">MMH/EHR/26/0007</span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> 0244750903
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center gap-2 uppercase tracking-wide">
                  Open EHR Chart <ArrowRight className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => setActiveCallSession({ patientId: 'p-001', patientName: 'Benjamin Hedidor' })}
                  className="px-5 py-2 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center gap-2 uppercase tracking-wide cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" /> Launch HD Video Call
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-300 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center font-black border border-sky-100 dark:border-sky-800 text-lg">
                    Y
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Yaw Dabo</h4>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">MMH/EHR/26/0006</span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> 0244750925
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center gap-2 uppercase tracking-wide">
                  Open EHR Chart <ArrowRight className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => setActiveCallSession({ patientId: 'p-002', patientName: 'Yaw Dabo' })}
                  className="px-5 py-2 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center gap-2 uppercase tracking-wide cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" /> Launch HD Video Call
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
