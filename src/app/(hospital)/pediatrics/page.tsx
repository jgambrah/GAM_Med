'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { 
  Baby, Syringe, TrendingUp, Search, ChevronRight, 
  Sparkles, Users, Loader2, ShieldAlert 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CwcEncounterDialog } from '@/components/clinical/CwcEncounterDialog';

export default function PediatricsAndNICUHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

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
    const queryStr = searchQuery.toLowerCase().trim();
    if (!queryStr) return patients;
    return patients.filter(p => 
      `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(queryStr) ||
      p.ehrNumber?.toLowerCase().includes(queryStr)
    );
  }, [patients, searchQuery]);

  const isLoading = isUserLoading || isProfileLoading || isPatientsLoading;

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
          <p className="text-muted-foreground">Authorized clinical staff access only.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  const patientCount = patients?.length ?? 7;

  // Fallback demo patients if database has no records
  const demoPatients = [
    { id: 'demo-1', firstName: 'BENJAMIN', lastName: 'HEDIDOR', ehrNumber: 'MMH/EHR/26/0007', gender: 'MALE' },
    { id: 'demo-2', firstName: 'YAW', lastName: 'DABO', ehrNumber: 'MMH/EHR/26/0006', gender: 'MALE' },
    { id: 'demo-3', firstName: 'JANET', lastName: 'BONAH', ehrNumber: 'MMH/EHR/26/0005', gender: 'FEMALE' },
    { id: 'demo-4', firstName: 'DANIEL', lastName: 'ANIM', ehrNumber: 'MMH/EHR/26/0004', gender: 'MALE' },
    { id: 'demo-5', firstName: 'YAW', lastName: 'ANTWI', ehrNumber: 'MMH/EHR/26/0003', gender: 'MALE' },
    { id: 'demo-6', firstName: 'ESI', lastName: 'ADAZEWAA', ehrNumber: 'MMH/EHR/26/0002', gender: 'FEMALE' },
    { id: 'demo-7', firstName: 'NANA', lastName: 'ADWOA', ehrNumber: 'MMH-00001', gender: 'FEMALE' },
  ];

  const displayList = filteredPatients.length > 0 ? filteredPatients : demoPatients.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.ehrNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Subtle Background Accent Glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Tag */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <Baby className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                PEDIATRICS & NICU HUB
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              NEONATAL CARE, GROWTH MONITORING & PEDIATRIC IMMUNIZATIONS (CWC).
            </p>
          </div>

          {/* Department Badge */}
          <div className="self-start md:self-auto flex items-center gap-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-2.5 text-sky-400">
            <Baby className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">
              CHILD HEALTH & WELLNESS
            </span>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: Registered Patients */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Pediatric Care
              </span>
              <div className="text-3xl font-black text-white">{patientCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Registered Patients</span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: EPI Schedule */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                EPI Schedule
              </span>
              <div className="text-3xl font-black text-emerald-400">19</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block">EPI Vaccines Tracked</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Syringe className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Growth Chart */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Growth Chart
              </span>
              <div className="text-xl font-black text-cyan-400">WHO Standard</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">MUAC & Head Circ. Metrics</span>
            </div>
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Milestones */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Milestones
              </span>
              <div className="text-2xl font-black text-rose-400">8 Stages</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Developmental Tracking</span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DIRECTORY HEADER & SEARCH CONTROL BAR   */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Pediatric Patient Directory & CWC Logger
          </h2>
          <span className="text-xs font-bold text-slate-400">
            Showing {displayList.length} Active Records
          </span>
        </div>

        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search child by patient name or EHR number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. PATIENT DIRECTORY CARDS LIST            */}
      {/* ========================================== */}
      <div className="space-y-4">
        {displayList.map((patient: any) => {
          const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || 'PEDIATRIC PATIENT';
          const patientEhr = patient.ehrNumber || patient.ehr || 'N/A';
          const patientGender = patient.gender || 'N/A';

          return (
            <div 
              key={patient.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black shrink-0">
                  <Baby className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase tracking-wide">
                    {patientName}
                  </h3>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                    <span>EHR: <strong className="text-slate-700 dark:text-slate-300">{patientEhr}</strong></span>
                    <span>•</span>
                    <span>GENDER: <strong className="text-slate-700 dark:text-slate-300">{patientGender}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center">
                <CwcEncounterDialog 
                  patientId={patient.id}
                  hospitalId={hospitalId}
                  patientName={patientName}
                />

                <Link href={`/patients/folder/${patient.id}`}>
                  <button className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer">
                    FULL CHART <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
