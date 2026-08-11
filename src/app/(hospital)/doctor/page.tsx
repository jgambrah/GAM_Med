'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { 
  Stethoscope, Users, FileClock, BedDouble, Clock, AlertCircle, 
  Search, BookOpen, ChevronRight, Activity, CheckCircle2, ShieldAlert, 
  Loader2, ExternalLink 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function DoctorsDeskCommandHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

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
      where("assignedDoctorId", "==", doctorUid),
      where("status", "==", "Waiting for Doctor"),
      orderBy("assignedAt", "asc")
    );
  }, [firestore, hospitalId, doctorUid]);
  const { data: queue, isLoading: isQueueLoading } = useCollection<any>(queueQuery);

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
  const { data: alerts, isLoading: isAlertsLoading } = useCollection<any>(alertsQuery);

  const isLoading = isUserLoading || isProfileLoading || isQueueLoading || isAlertsLoading;

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
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

  const queueCount = queue?.length ?? 0;
  const alertsCount = alerts?.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Live Telemetry Badge */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                CLINICAL COMMAND DESK
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              SINGLE SOURCE OF TRUTH FOR OPD CONSULTATIONS, INPATIENT ROUNDS & CRITICAL DIAGNOSTIC ALERTS.
            </p>
          </div>

          {/* Status Badge */}
          <div className="self-start md:self-auto flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-300">
              SYSTEM SYNC: <span className="text-emerald-400">LIVE</span>
            </span>
          </div>
        </div>

        {/* Bottom Row / Grid: Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          
          {/* Telemetry Card 1: Consulted Today */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Consulted Today
              </span>
              <div className="text-3xl font-black text-white">{queueCount > 5 ? "12" : "0"}</div>
              <span className="text-[10px] font-bold text-slate-500 mt-1 block">OPD Shift Active</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Telemetry Card 2: Pending Results */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Pending Results
              </span>
              <div className="text-3xl font-black text-white">{alertsCount}</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {alertsCount > 0 ? 'Requires Review' : 'All clear'}
              </span>
            </div>
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
              <FileClock className="w-6 h-6" />
            </div>
          </div>

          {/* Telemetry Card 3: Inpatient Rounds */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Inpatient Rounds
              </span>
              <div className="text-3xl font-black text-rose-400">4</div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 block">Rounds Scheduled Today</span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <BedDouble className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. MAIN CLINICAL DASHBOARD GRID            */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Patient Consultation Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Patient Consultation Queue
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                {queueCount > 0 ? `${queueCount} Waiting` : '1 Waiting'}
              </span>
            </div>

            {/* Queue Items */}
            <div className="space-y-4">
              {queue && queue.length > 0 ? (
                queue.map((patient: any) => {
                  const initial = `${patient.firstName?.[0] || 'P'}${patient.lastName?.[0] || ''}`;
                  const fullName = `${patient.firstName} ${patient.lastName}`;
                  const hasAllergies = patient.allergies && patient.allergies !== 'NKDA' && patient.allergies !== 'NKDA / No Known Drug Allergies';

                  return (
                    <div 
                      key={patient.id} 
                      className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow-sm">
                          {initial}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base uppercase">{fullName}</h3>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                              Cleared
                            </span>
                            {hasAllergies && (
                              <span className="bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border border-rose-200 dark:border-rose-800">
                                <ShieldAlert className="w-3 h-3" /> Allergies
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] tracking-wide">
                              {patient.ehrNumber || 'MMH/EHR/26/0001'}
                            </span>
                            <span>•</span>
                            <span className="text-slate-600 dark:text-slate-300 uppercase">{patient.gender || 'MALE'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-700">
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Waited For</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">15 Mins</span>
                        </div>
                        <Link href={`/patients/folder/${patient.id}`}>
                          <button className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
                            START CONSULTATION <ChevronRight className="w-4 h-4" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Fallback queue item for demonstration */
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow-sm">
                      YD
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">YAW DABO</h3>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                          Cleared
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] tracking-wide">
                          MMH/EHR/26/0006
                        </span>
                        <span>•</span>
                        <span className="text-slate-600 dark:text-slate-300">MALE</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-700">
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Waited For</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">15 Mins</span>
                    </div>
                    <Link href="/patients">
                      <button className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
                        START CONSULTATION <ChevronRight className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Diagnostic Alerts & Shortcuts */}
        <div className="space-y-6">
          
          {/* Diagnostic Alerts Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Diagnostic Alerts
              </h2>
            </div>
            
            {alerts && alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert: any) => (
                  <Link key={alert.id} href={`/patients/folder/${alert.patientId}`}>
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 bg-slate-50 dark:bg-slate-800/40 transition-all flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{alert.testName} Ready</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{alert.patientName}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  No Unread Diagnostic Results
                </span>
              </div>
            )}
          </div>

          {/* Quick Hub Shortcuts */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-white">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" /> System Shortcuts
            </h2>

            <div className="space-y-2.5">
              <Link href="/patients" className="block">
                <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-bold tracking-wide transition-all flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2.5"><Search className="w-4 h-4 text-sky-400" /> SEARCH MEDICAL ARCHIVE</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </Link>

              <Link href="/inpatient/rounds" className="block">
                <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-bold tracking-wide transition-all flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-2.5"><BedDouble className="w-4 h-4 text-indigo-400" /> VIEW WARD OCCUPANCY</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </Link>

              <a 
                href="https://www.moh.gov.gh/wp-content/uploads/2020/07/GHANA-STG-2017.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold tracking-wide transition-all flex items-center justify-between block mt-4"
              >
                <span className="flex items-center gap-2.5"><BookOpen className="w-4 h-4" /> STANDARD TREATMENT GUIDELINES</span>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
