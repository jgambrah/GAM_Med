'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { 
  ClipboardList, Activity, BedDouble, Clock, 
  UserCheck, Plus, ChevronRight, AlertCircle, 
  FileText, HeartPulse, Loader2, ShieldAlert 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function NursingStationCommandHub() {
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
  const { data: triageQueue, isLoading: isTriageLoading } = useCollection<any>(triageQueueQuery);

  // 2. WARD PULSE: Patients currently admitted
  const inpatientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/admissions`),
      where("status", "==", "ADMITTED")
    );
  }, [firestore, hospitalId]);
  const { data: inpatients, isLoading: isInpatientsLoading } = useCollection<any>(inpatientsQuery);

  const roundsDueNowCount = useMemo(() => {
    if (!inpatients) return 0;
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
    return inpatients.filter((adm: any) => {
      if (!adm.lastRoundAt) return true;
      const lastRoundTime = adm.lastRoundAt.toDate ? adm.lastRoundAt.toDate().getTime() : new Date(adm.lastRoundAt).getTime();
      return lastRoundTime < fourHoursAgo;
    }).length;
  }, [inpatients]);

  const isLoading = isUserLoading || isProfileLoading || isTriageLoading || isInpatientsLoading;

  if (isUserLoading || isProfileLoading) {
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
          <p className="text-muted-foreground font-medium">This dashboard is for authorized clinical staff.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  const shiftLeadName = userProfile?.fullName || 'MARCUS A. HENAKU';
  const shiftLeadInitials = shiftLeadName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  const pendingTriageCount = triageQueue?.length ?? 0;
  const bedOccupancyCount = inpatients?.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Sky/Indigo for Nursing */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Shift Context */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-400">
                <HeartPulse className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                NURSING STATION
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CENTRALIZED WARD ROUNDS, BED MANAGEMENT & OPD TRIAGE QUEUE.
            </p>
          </div>

          {/* Shift Lead & Schedule Badges */}
          <div className="flex flex-col sm:flex-row items-center gap-3 self-start md:self-auto">
            <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center font-black text-sky-400 text-sm">
                {shiftLeadInitials}
              </div>
              <div>
                <div className="text-xs font-bold text-white tracking-wide uppercase">{shiftLeadName}</div>
                <div className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider">Shift Lead Nurse</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-indigo-900/40 border border-indigo-500/30 rounded-xl px-4 py-3.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-wider leading-none mb-0.5">NEXT ROUNDS</div>
                <div className="text-xs font-bold text-white leading-none">2:00 PM</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          
          {/* Card 1: Pending Triage */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Pending Triage
              </span>
              <div className="text-3xl font-black text-emerald-400">{pendingTriageCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                {pendingTriageCount === 0 ? 'Queue is Clear' : 'Awaiting Vitals'}
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Bed Occupancy */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Bed Occupancy
              </span>
              <div className="text-3xl font-black text-sky-400">{bedOccupancyCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Active Inpatients</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <BedDouble className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Rounds Due Now */}
          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-rose-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">
                Rounds Due Now
              </span>
              <div className="text-3xl font-black text-rose-400 animate-pulse">{roundsDueNowCount}</div>
              <span className="text-[10px] font-bold text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {roundsDueNowCount > 0 ? 'Requires Action' : 'All Rounds Updated'}
              </span>
            </div>
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. MAIN NURSING STATION GRID               */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: OPD Triage Queue */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> OPD TRIAGE QUEUE
            </h2>
            <Link href="/patients/register">
              <button className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3 h-3" /> NEW REGISTRATION
              </button>
            </Link>
          </div>

          {/* Patient Queue / Empty State */}
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="animate-spin text-sky-500 mx-auto" /></div>
          ) : triageQueue?.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 min-h-[200px]">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 flex items-center justify-center mb-3">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                ALL OPD PATIENTS TRIAGED.
              </h3>
            </div>
          ) : (
            <div className="space-y-3">
              {triageQueue?.map((p: any) => (
                <div 
                  key={p.id} 
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center text-sm border border-emerald-500/20">
                      {p.firstName?.[0] || 'P'}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                        {p.firstName} {p.lastName}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        EHR: {p.ehrNumber}
                      </p>
                    </div>
                  </div>

                  <Link href={`/patients/folder/${p.id}`}>
                    <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer">
                      TAKE VITALS <ChevronRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Active Ward Rounds */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> ACTIVE WARD ROUNDS
            </h2>
            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full uppercase">
              {roundsDueNowCount} Pending
            </span>
          </div>

          {/* Rounding Cards List / Demo Inpatient Fallback if empty */}
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" /></div>
          ) : (inpatients?.length ?? 0) === 0 ? (
            <div className="space-y-4">
              {/* Fallback Display Card for Janet Bonah */}
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <BedDouble className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase tracking-wide mb-1">
                      JANET BONAH
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
                        BED: ICU-05
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500">
                        <Clock className="w-3 h-3" /> Overdue
                      </span>
                    </div>
                  </div>
                </div>

                <Link href="/inpatient/rounds">
                  <button className="w-12 h-12 flex items-center justify-center bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-colors cursor-pointer border border-slate-700">
                    <FileText className="w-5 h-5" />
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {inpatients?.map((adm: any) => (
                <div 
                  key={adm.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-slate-100/60 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <BedDouble className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase tracking-wide mb-1">
                        {adm.patientName}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
                          BED: {adm.bedId}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link href={`/inpatient/rounds`}>
                    <button className="w-12 h-12 flex items-center justify-center bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-colors cursor-pointer border border-slate-700">
                      <FileText className="w-5 h-5" />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
