'use client';

import React, { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { 
  Stethoscope, Inbox, Clock, Award, AlertCircle, Pill, 
  ClipboardList, FileText, UserCheck, ChevronRight, TrendingUp, 
  Activity, ShieldAlert, Loader2, CheckCircle2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MyDayCommandDesk() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [activeTab, setActiveTab] = useState<'inbox' | 'wait' | 'cme'>('inbox');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const isDoctor = ['DIRECTOR', 'DOCTOR'].includes(userProfile?.role || '');

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
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
          <p className="text-muted-foreground">Physician Command Center access restricted to doctors.</p>
          <Button onClick={() => window.location.href = '/dashboard'} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  const doctorName = userProfile?.fullName || user?.displayName || 'Tracy Gambrah';
  const doctorInitials = doctorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'TG';
  const roleTitle = userProfile?.specialty || 'Lead Physician';

  // 1. UNIFIED CLINICAL INBOX FEED ITEMS
  const mockInboxItems = [
    {
      id: 'inbox_1',
      category: 'LAB_RESULT',
      title: 'CRITICAL HB RESULT (7.8 G/DL) - REQUIRES SIGNATURE',
      patientName: 'AKOSUA MANSAH',
      ehrNumber: 'GAM/EHR/26/0031',
      urgency: 'HIGH',
      timestamp: '12 MINS AGO',
      details: 'Full Blood Count shows severe anemia. Transfusion evaluation required.',
      icon: AlertCircle,
      color: 'rose'
    },
    {
      id: 'inbox_2',
      category: 'PRESCRIPTION_REFILL',
      title: 'E-PRESCRIPTION REFILL REQUEST: AMOXICILLIN-CLAVULANATE',
      patientName: 'KWAME NKRUMAH',
      ehrNumber: 'GAM/EHR/26/0018',
      urgency: 'MEDIUM',
      timestamp: '25 MINS AGO',
      details: 'Pharmacy requesting doctor sign-off for 7-day extension.',
      icon: Pill,
      color: 'amber'
    },
    {
      id: 'inbox_3',
      category: 'SHIFT_HANDOVER',
      title: 'NIGHT SHIFT HANDOVER NOTE: WARD 3 BED 12',
      patientName: 'KOFI MENSAH',
      ehrNumber: 'GAM/EHR/26/0009',
      urgency: 'ROUTINE',
      timestamp: '1 HOUR AGO',
      details: 'Post-op Day 2 appendix. Vitals stable overnight. Pain controlled.',
      icon: ClipboardList,
      color: 'sky'
    },
    {
      id: 'inbox_4',
      category: 'E_CONSULT',
      title: 'INTER-DEPARTMENTAL E-CONSULT REQUEST FROM ANC CLINIC',
      patientName: 'AMA SERWAA PREMPEH',
      ehrNumber: 'GAM/EHR/26/0014',
      urgency: 'URGENT',
      timestamp: '2 HOURS AGO',
      details: 'Gestational HTN workup consult requested by Dr. Osei.',
      icon: UserCheck,
      color: 'indigo'
    },
  ];

  // 2. PATIENT FLOW QUEUE
  const mockPatientQueue = [
    {
      id: 'flow_1',
      patientName: 'ABENA OSEI',
      ehrNumber: 'GAM/EHR/26/0022',
      clinic: 'OPD Consultation Desk',
      waitTimeMins: 14,
      vitalsTaken: '140/88 BP, 76 bpm',
    },
    {
      id: 'flow_2',
      patientName: 'YAW BOATENG',
      ehrNumber: 'GAM/EHR/26/0045',
      clinic: 'ANC Specialty Clinic',
      waitTimeMins: 28,
      vitalsTaken: '118/74 BP, 36.6°C',
    },
    {
      id: 'flow_3',
      patientName: 'KOJO ADDO',
      ehrNumber: 'GAM/EHR/26/0051',
      clinic: 'Pediatric Care Desk',
      waitTimeMins: 8,
      vitalsTaken: 'Weight: 12.4kg, Temp: 38.2°C',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Subtle Background Accent Glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and User Context */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                "MY DAY" PHYSICIAN COMMAND CENTER
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              UNIFIED CLINICAL INBOX, REAL-TIME OPD WAIT TRACKER & PERSONAL CME AUDIT METRICS.
            </p>
          </div>

          {/* User Badge */}
          <div className="self-start md:self-auto flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center font-black text-rose-400 text-sm">
              {doctorInitials}
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide uppercase">DR. {doctorName}</div>
              <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">{roleTitle}</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          
          {/* Tab 1: Clinical Inbox */}
          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'inbox'
                ? 'bg-slate-900 border-rose-500/50 ring-1 ring-rose-500/30 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Inbox className="w-3.5 h-3.5 text-rose-400" /> Unified Clinical Inbox
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black">
                {mockInboxItems.length} Pending
              </span>
            </div>
            <div className="text-2xl font-black text-white">{mockInboxItems.length} Action Items</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              1 Critical sign-off required
            </div>
          </button>

          {/* Tab 2: Patient Flow & Wait Times */}
          <button
            type="button"
            onClick={() => setActiveTab('wait')}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'wait'
                ? 'bg-slate-900 border-sky-500/50 ring-1 ring-sky-500/30 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" /> Patient Flow & Wait Times
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                On Track
              </span>
            </div>
            <div className="text-2xl font-black text-white">18 Mins Avg</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              12 Patients currently in queue
            </div>
          </button>

          {/* Tab 3: Personal CME & Audit Metrics */}
          <button
            type="button"
            onClick={() => setActiveTab('cme')}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'cme'
                ? 'bg-slate-900 border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" /> Personal CME & Audit
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                28 / 30 Credits
              </span>
            </div>
            <div className="text-2xl font-black text-white">93.3% Complete</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              2 Credits needed for annual renewal
            </div>
          </button>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. MAIN CONTENT AREA                       */}
      {/* ========================================== */}

      {/* TAB 1: CLINICAL INBOX FEED */}
      {activeTab === 'inbox' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Actionable Inbox Items Requiring Doctor Attention
            </h2>
            <span className="text-xs font-bold text-slate-400">
              Sorted by Urgency
            </span>
          </div>

          {/* Action Items List */}
          <div className="space-y-4">
            {mockInboxItems.map((item) => {
              const ItemIcon = item.icon;
              const isRose = item.color === 'rose';

              return (
                <div 
                  key={item.id}
                  className={`p-5 rounded-xl border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isRose
                      ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 hover:border-rose-300'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl mt-1 ${
                      isRose ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' :
                      item.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' :
                      item.color === 'sky' ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400' :
                      'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      <ItemIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base">
                          {item.title}
                        </h3>
                        {isRose && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                            Action Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 font-medium mb-2">
                        {item.details}
                      </p>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>PATIENT: <strong className="text-slate-800 dark:text-slate-200">{item.patientName}</strong></span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px]">{item.ehrNumber}</span>
                        <span>•</span>
                        <span className="text-slate-400">{item.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <button className={`self-end md:self-center px-5 py-2.5 text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    isRose ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}>
                    REVIEW & SIGN <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PATIENT FLOW & WAIT TIMES */}
      {activeTab === 'wait' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-sky-600">
                <Clock className="w-6 h-6 text-sky-500" />
                <span className="text-[10px] font-black uppercase bg-sky-50 dark:bg-sky-950 px-3 py-1 rounded-full text-sky-700 dark:text-sky-400">OPD Wait Time</span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">16 min</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Average Patient Consultation Wait</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span className="text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full text-emerald-700 dark:text-emerald-400">Consultation Duration</span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">11.4 min</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Average Physician Time Per Patient</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-amber-600">
                <TrendingUp className="w-6 h-6 text-amber-500" />
                <span className="text-[10px] font-black uppercase bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full text-amber-700 dark:text-amber-400">Queue Bottlenecks</span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">Normal</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Triage & OPD Flow Rate Optimal</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-t-2xl border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Current Clinic Patient Queue & Wait Time Breakdown</h3>
            </div>

            {mockPatientQueue.map((p) => (
              <div key={p.id} className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase text-slate-900 dark:text-slate-100">{p.patientName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">EHR: {p.ehrNumber} • {p.clinic} • Vitals: {p.vitalsTaken}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-xl">
                      Waiting: {p.waitTimeMins} mins
                    </span>
                  </div>

                  <Link href="/doctor">
                    <button className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-sm">
                      Start Consultation <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PERSONAL CME & AUDIT METRICS */}
      {activeTab === 'cme' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultations This Month</span>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">142</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase">+8% vs Previous Month</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antibiotic Prescribing Rate</span>
              <p className="text-3xl font-black text-purple-600 dark:text-purple-400">22.4%</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase">Within WHO Target (&lt; 30%)</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ICD-10 Coding Compliance</span>
              <p className="text-3xl font-black text-sky-600 dark:text-sky-400">99.2%</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase">Quality Standard Compliant</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CME Credits Earned</span>
              <p className="text-3xl font-black text-amber-500">45 / 50</p>
              <p className="text-[10px] text-amber-600 font-bold uppercase">90% Annual Renewal Target</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-4">
              Clinical Governance & Quality Improvement Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
                <p className="font-black text-slate-900 dark:text-slate-100 uppercase">🏆 Clinical Excellence Rating</p>
                <p>98.5% positive patient feedback and 0 adverse clinical event flags for Q3.</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
                <p className="font-black text-slate-900 dark:text-slate-100 uppercase">📜 Infection Control Audit</p>
                <p>Hand hygiene compliance and sterile protocol adherence audited at 100%.</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
