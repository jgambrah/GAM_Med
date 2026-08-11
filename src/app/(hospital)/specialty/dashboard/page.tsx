'use client';

import React, { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { 
  Stethoscope, HeartHandshake, Activity, Baby, Cpu, 
  TrendingUp, LineChart, ChevronRight, ShieldCheck, 
  Droplet, Sparkles, Loader2, Calendar, CheckCircle2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import VitalsTrend from '@/components/clinical/VitalsTrend';

export default function DoctorSpecialtyHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [activeSpecialty, setActiveSpecialty] = useState<'stork' | 'cardio' | 'peds'>('stork');
  const [activeChartTab, setActiveChartTab] = useState<'vitals' | 'labs' | 'growth'>('vitals');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const isAuthorized = ['DIRECTOR', 'DOCTOR', 'NURSE', 'ADMIN'].includes(userProfile?.role || '');

  const VACCINE_MATRIX = [
    { age: 'At Birth', vaccines: ['BCG (Tuberculosis)', 'OPV 0 (Polio)', 'Hepatitis B Birth Dose'] },
    { age: '6 Weeks', vaccines: ['DPT-HepB-Hib 1 (Penta 1)', 'OPV 1', 'Pneumococcal 1 (PCV 1)', 'Rotavirus 1'] },
    { age: '10 Weeks', vaccines: ['DPT-HepB-Hib 2 (Penta 2)', 'OPV 2', 'Pneumococcal 2', 'Rotavirus 2'] },
    { age: '14 Weeks', vaccines: ['DPT-HepB-Hib 3 (Penta 3)', 'OPV 3', 'IPV (Inactivated Polio)', 'Pneumococcal 3'] },
    { age: '9 Months', vaccines: ['Measles-Rubella 1 (MR 1)', 'Yellow Fever'] },
    { age: '18 Months', vaccines: ['Measles-Rubella 2 (MR 2)', 'Meningococcal A'] },
  ];

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center">
        <ShieldCheck className="text-destructive h-16 w-16 mx-auto mb-4 text-rose-500" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground font-medium">Authorized clinical staff access only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Specialty Module Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                DOCTOR PORTAL — SPECIALTY MODULES
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              STORK ANC ANALYTICS, CARDIOLOGY & CHRONIC CARE HOME-SYNC, AND NICU GROWTH MATRIX.
            </p>
          </div>

          {/* Specialty Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setActiveSpecialty('stork')}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeSpecialty === 'stork'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <HeartHandshake className="w-4 h-4" /> ANC & OB/GYN (STORK)
            </button>

            <button
              type="button"
              onClick={() => setActiveSpecialty('cardio')}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeSpecialty === 'cardio'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4" /> CARDIOLOGY & CHRONIC CARE
            </button>

            <button
              type="button"
              onClick={() => setActiveSpecialty('peds')}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeSpecialty === 'peds'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Baby className="w-4 h-4" /> PEDIATRICS & NICU
            </button>
          </div>
        </div>

        {/* Integrated Federated AI Engine Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 mb-6 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <h3 className="text-xs font-black uppercase tracking-widest text-white">
                  MULTI-TENANT OPERATIONS & FEDERATED AI ENGINE
                </h3>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-black uppercase tracking-widest">
                  FEDERATED FEDAVG GRID
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                MULTI-HOSPITAL NODE NETWORK • ZERO RAW DATA TRANSMISSION • PREDICTIVE ER/OR ANALYTICS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto border-t md:border-t-0 border-slate-800 pt-3 md:pt-0 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">ER Surge Risk</span>
              <span className="text-xs font-bold text-amber-400 uppercase">MODERATE • BED OCCUPANCY: 84%</span>
            </div>
            <button 
              type="button"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              EXPAND ENGINE <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Clinical Metrics Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          
          {/* Card 1: ANC Registry */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                ANC Registry
              </span>
              <div className="text-3xl font-black text-white">28</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Active Maternity Registrations</span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <HeartHandshake className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Anemia Tracker */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Anemia Tracker
              </span>
              <div className="text-3xl font-black text-violet-400">11.8 g/dL</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Cohort Mean Hemoglobin (Hb)</span>
            </div>
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
              <Droplet className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Fundal Height Canvas */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Fundal Height Canvas
              </span>
              <div className="text-3xl font-black text-emerald-400">98%</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block">Gestational Age Compliance</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* SPECIALTY ACTION BUTTONS FOR CARDIOLOGY & PEDIATRICS */}
      {activeSpecialty === 'cardio' && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Link href="/telehealth/rpm" className="flex-1">
            <button className="w-full h-14 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-md">
              Open Home BP & Glucose RPM Feed <ArrowRight className="w-4 h-4" />
            </button>
          </Link>

          <Link href="/radiology/queue" className="flex-1">
            <button className="w-full h-14 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-sm">
              Open PACS Diagnostic Imaging Queue <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      )}

      {/* EPI IMMUNIZATION MATRIX FOR PEDIATRICS */}
      {activeSpecialty === 'peds' && (
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 mb-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-500" /> Expanded EPI Pediatric Immunization Milestone Matrix
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
            {VACCINE_MATRIX.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-black text-sky-600 dark:text-sky-400 uppercase">{item.age}</span>
                  <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active Protocol
                  </span>
                </div>
                <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                  {item.vaccines.map((v, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> {v}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. LONGITUDINAL TRAJECTORY CHART CONTAINER */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <LineChart className="w-4 h-4 text-rose-500" /> Longitudinal Clinical & Growth Trajectory
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              INTERACTIVE MULTI-PARAMETER CHARTING & WHO/ACOG PERCENTILE OVERLAYS.
            </p>
          </div>

          {/* Sub-Tab Chart Controls */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveChartTab('vitals')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'vitals'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              VITALS TREND
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('labs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'labs'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              LAB BIOMARKERS
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('growth')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'growth'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              GROWTH PERCENTILES
            </button>
          </div>
        </div>

        {/* Chart Viewport / VitalsTrend Component Integration */}
        {activeChartTab === 'vitals' ? (
          <VitalsTrend />
        ) : (
          <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center min-h-[320px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-1">
              CLINICAL TRAJECTORY CANVAS READY
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md font-medium">
              Displaying cohort telemetry overlays for <strong className="text-slate-800 dark:text-slate-200">Systolic/Diastolic BP</strong>, <strong className="text-slate-800 dark:text-slate-200">Pulse trends</strong>, and maternal WHO/ACOG percentile trajectories.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
