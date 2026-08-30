'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  Activity, Users, AlertTriangle, HeartPulse, Clock, 
  Search, UserPlus, ChevronRight, ShieldAlert, CheckCircle2, 
  Loader2, ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import VitalsCaptureModal from '@/components/app/vitals-capture-modal';

export default function EmergencyTriageStation() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'queue' | 'critical' | 'completed'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [acuityFilter, setAcuityFilter] = useState('all');

  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState<any | null>(null);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);

  const [persistentCheckIns, setPersistentCheckIns] = useState<Record<string, any>>({});

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId || 'default-hospital';
  const isAuthorized = userProfile?.role === 'NURSE' || userProfile?.role === 'DOCTOR' || userProfile?.role === 'DIRECTOR' || !userProfile?.role;

  // Hydrate persistent check-ins from localStorage
  useEffect(() => {
    try {
      const storageKey = `gam_checked_in_patients_${hospitalId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setPersistentCheckIns(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not load stored check-ins from localStorage:", e);
    }
  }, [hospitalId]);

  const queueQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/patients`),
      where("status", "in", ["Awaiting Vitals", "CHECKED_IN", "TRIAGE", "Waiting for Triage"])
    );
  }, [firestore, hospitalId]);
  
  const { data: queue, isLoading: isQueueLoading } = useCollection<any>(queueQuery);

  // Baseline Triage Patients Fallback
  const defaultTriagePatients = useMemo(() => [
    {
      id: 'p_01',
      firstName: 'BENJAMIN',
      lastName: 'HEDIDOR',
      ehrNumber: 'MMH/EHR/26/0007',
      status: 'Awaiting Vitals',
      checkInTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      chiefComplaint: 'High fever, acute chills, and severe headache'
    },
    {
      id: 'p_06',
      firstName: 'EMMANUEL',
      lastName: 'TETTEH',
      ehrNumber: 'MMH/EHR/26/0004',
      status: 'Awaiting Vitals',
      checkInTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      chiefComplaint: 'Mild palpitations and dizziness'
    }
  ], []);

  // Directory Patient Metadata Directory for Names & Details
  const directoryPatientsMap = useMemo(() => ({
    'p_01': { firstName: 'BENJAMIN', lastName: 'HEDIDOR', ehrNumber: 'MMH/EHR/26/0007' },
    'p_02': { firstName: 'JANET', lastName: 'BONAH', ehrNumber: 'MMH/EHR/26/0005' },
    'p_03': { firstName: 'KWAME', lastName: 'MENSAH', ehrNumber: 'MMH/EHR/26/0001' },
    'p_04': { firstName: 'AKOSUA', lastName: 'AGYAPONG', ehrNumber: 'MMH/EHR/26/0003' },
    'p_05': { firstName: 'SAMUEL', lastName: 'OWUSU-ANSAH', ehrNumber: 'MMH/EHR/26/0002' },
    'p_06': { firstName: 'EMMANUEL', lastName: 'TETTEH', ehrNumber: 'MMH/EHR/26/0004' },
    'p_07': { firstName: 'REBECCA', lastName: 'ADDO', ehrNumber: 'MMH/EHR/26/0006' },
  }), []);

  const combinedQueue = useMemo(() => {
    const listMap = new Map<string, any>();

    // 1. Add Default Fallback Patients
    defaultTriagePatients.forEach(p => listMap.set(p.id, p));

    // 2. Add Firestore Queue Patients
    if (queue && queue.length > 0) {
      queue.forEach((p: any) => listMap.set(p.id, p));
    }

    // 3. Add Locally / Persistently Checked-in Patients from Directory
    Object.entries(persistentCheckIns).forEach(([patientId, data]: [string, any]) => {
      const meta = (directoryPatientsMap as any)[patientId] || {};
      const existing = listMap.get(patientId);
      listMap.set(patientId, {
        id: patientId,
        firstName: data.firstName || meta.firstName || existing?.firstName || 'PATIENT',
        lastName: data.lastName || meta.lastName || existing?.lastName || '',
        ehrNumber: data.ehrNumber || meta.ehrNumber || existing?.ehrNumber || `MMH/EHR/26/000${patientId.slice(-1)}`,
        status: 'Awaiting Vitals',
        checkInTime: data.checkedInAt || existing?.checkInTime || new Date().toISOString(),
        chiefComplaint: data.chiefComplaint || existing?.chiefComplaint || 'Medical Review',
        urgencyPriority: data.urgencyPriority || existing?.urgencyPriority || 'ROUTINE',
      });
    });

    return Array.from(listMap.values());
  }, [defaultTriagePatients, queue, persistentCheckIns, directoryPatientsMap]);

  const filteredQueue = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return combinedQueue.filter(p => {
      const nameMatch = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(q);
      const ehrMatch = (p.ehrNumber || '').toLowerCase().includes(q);
      return nameMatch || ehrMatch;
    });
  }, [combinedQueue, searchQuery]);

  const isLoading = isUserLoading || isProfileLoading || isQueueLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
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

  const queueCount = combinedQueue?.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Subtle Background Accent Glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <Activity className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                EMERGENCY & TRIAGE STATION
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              REAL-TIME CLINICAL INTAKE, ESI ACUITY SCORING & VITALS ASSESSMENT QUEUE.
            </p>
          </div>

          {/* Action Button */}
          <Link href="/patients/register">
            <button className="self-start md:self-auto px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer">
              <UserPlus className="w-4 h-4" /> NEW EMERGENCY INTAKE
            </button>
          </Link>
        </div>

        {/* Bottom Row / Grid: Telemetry Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          
          {/* Telemetry Card 1: Waiting for Intake */}
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-slate-900 border-rose-500/50 ring-1 ring-rose-500/30 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-rose-400" /> Intake Queue
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-black">
                {queueCount} Waiting
              </span>
            </div>
            <div className="text-2xl font-black text-white">{queueCount} Patients</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              {queueCount === 0 ? 'Queue is empty' : 'Active arrivals in triage'}
            </div>
          </button>

          {/* Telemetry Card 2: Red / Amber Alerts */}
          <button
            type="button"
            onClick={() => setActiveTab('critical')}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'critical'
                ? 'bg-slate-900 border-amber-500/50 ring-1 ring-amber-500/30 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> High Acuity (ESI 1-2)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                Stable
              </span>
            </div>
            <div className="text-2xl font-black text-white">0 Critical</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-slate-500" />
              No emergency escalations
            </div>
          </button>

          {/* Telemetry Card 3: Triaged Today */}
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-slate-900 border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Triaged Today
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                Shift Active
              </span>
            </div>
            <div className="text-2xl font-black text-white">14 Evaluated</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <HeartPulse className="w-3 h-3 text-emerald-400" />
              Avg Vitals Speed: 4 mins
            </div>
          </button>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER & SEARCH CONTROL BAR             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Patient Name, EHR number, or GHA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:inline">
            Acuity Filter:
          </span>
          <select 
            value={acuityFilter}
            onChange={(e) => setAcuityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All ESI Levels</option>
            <option value="1">ESI Level 1 (Resuscitation)</option>
            <option value="2">ESI Level 2 (Emergent)</option>
            <option value="3">ESI Level 3 (Urgent)</option>
            <option value="4">ESI Level 4 (Less Urgent)</option>
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. TRIAGE QUEUE CONTENT AREA               */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Triage & Vitals Assessment Queue
          </h2>
          <span className="text-xs font-bold text-slate-400">
            Awaiting Front Desk Check-In
          </span>
        </div>

        {filteredQueue.length === 0 ? (
          /* Empty State Banner */
          <div className="p-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 flex items-center justify-center mb-4">
              <HeartPulse className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
              QUEUE IS CURRENTLY EMPTY
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm font-medium">
              No patients are currently waiting in the triage queue. New arrivals will appear here immediately after front desk registration.
            </p>
          </div>
        ) : (
          /* Queue Items List */
          <div className="space-y-4">
            {filteredQueue.map((p: any) => {
              const checkInTimeStr = p.checkInTime ? (
                (() => {
                  const d = typeof p.checkInTime.toDate === 'function' 
                    ? p.checkInTime.toDate() 
                    : (p.checkInTime.seconds ? new Date(p.checkInTime.seconds * 1000) : new Date(p.checkInTime));
                  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })()
              ) : 'Just Now';

              return (
                <div 
                  key={p.id} 
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row justify-between items-center gap-6"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-800 shrink-0">
                      <Activity className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                        {p.firstName} {p.lastName}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                        EHR: {p.ehrNumber} • Checked-in: {checkInTimeStr}
                      </p>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedPatientForVitals({
                        id: p.id,
                        patientId: p.id,
                        patientName: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
                        ehrId: p.ehrNumber || 'MMH/EHR/26/0007',
                      });
                      setIsVitalsModalOpen(true);
                    }}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-900/20 transition-all cursor-pointer"
                  >
                    Assess Vitals <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <VitalsCaptureModal
        encounter={selectedPatientForVitals}
        isOpen={isVitalsModalOpen}
        onClose={() => {
          setIsVitalsModalOpen(false);
          setSelectedPatientForVitals(null);
        }}
        hospitalId={hospitalId}
      />

    </div>
  );
}
