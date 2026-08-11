'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { 
  Radio, ArrowLeft, AlertOctagon, Droplets, HeartPulse, 
  Activity, Search, ArrowRight, ShieldAlert, Loader2, Scale 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function RPMSyncPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BP' | 'GLUCOSE' | 'WEIGHT'>('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // Mock RPM Log stream for clinical demonstration
  const mockRpmLogs = [
    {
      id: 'rpm_1',
      patientName: 'Ama Serwaa Prempeh',
      ehrNumber: 'GAM/EHR/26/0014',
      readingType: 'GLUCOSE',
      glucoseLevel: 142,
      glucoseTiming: 'FASTING',
      notes: 'Gestational Diabetes daily home monitoring. Slightly high after breakfast.',
      status: 'HIGH_ALERT',
      loggedAt: '10 mins ago',
    },
    {
      id: 'rpm_2',
      patientName: 'Kofi Mensah',
      ehrNumber: 'GAM/EHR/26/0009',
      readingType: 'BP',
      systolic: 158,
      diastolic: 96,
      bp: '158/96',
      pulse: 84,
      notes: 'Morning BP check before taking Lisinopril.',
      status: 'HIGH_ALERT',
      loggedAt: '35 mins ago',
    },
    {
      id: 'rpm_3',
      patientName: 'Abena Osei',
      ehrNumber: 'GAM/EHR/26/0022',
      readingType: 'BP',
      systolic: 118,
      diastolic: 76,
      bp: '118/76',
      pulse: 70,
      notes: 'Evening post-walk reading. Feeling well.',
      status: 'NORMAL',
      loggedAt: '2 hours ago',
    },
    {
      id: 'rpm_4',
      patientName: 'Akosua Mansah',
      ehrNumber: 'GAM/EHR/26/0031',
      readingType: 'WEIGHT',
      weight: 74.2,
      notes: 'Preeclampsia daily weight log. +1.5kg gain in 48 hours.',
      status: 'WARNING',
      loggedAt: '4 hours ago',
    },
  ];

  const filteredLogs = useMemo(() => {
    return mockRpmLogs.filter(log => {
      const matchSearch = log.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || log.ehrNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'ALL' || log.readingType === filterType;
      return matchSearch && matchType;
    });
  }, [searchQuery, filterType]);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
      </div>
    );
  }

  const criticalAlertsCount = mockRpmLogs.filter(l => l.status === 'HIGH_ALERT').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. THE DARK TELEMETRY BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden mb-6">
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 pb-5 border-b border-slate-800/60 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Link href="/telehealth" className="px-3 py-1.5 text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-white rounded-lg transition flex items-center gap-1.5 uppercase tracking-wide w-fit">
                <ArrowLeft className="w-3 h-3" /> Back to Telehealth Suite
              </Link>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <Radio className="w-7 h-7 text-indigo-400" />
              REMOTE PATIENT MONITORING (RPM) SYNC
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Real-Time Sync of Patient Self-Logged BP, Glucose & Weight
            </p>
          </div>
        </div>

        {/* Live RPM Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
          
          {/* CRITICAL ALERTS (Styled for Urgency) */}
          <div className="bg-rose-950/40 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)] rounded-xl p-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
            <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1 pl-2 flex items-center gap-1.5">
              <AlertOctagon className="w-3 h-3" /> Critical Alerts
            </span>
            <div className="pl-2 mt-1">
              <span className="text-2xl font-black text-rose-500">{criticalAlertsCount}</span>
              <span className="block text-[9px] font-medium text-rose-400/80 uppercase mt-0.5 leading-tight">High BP / Glucose<br/>Threshold Exceeded</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-indigo-500/30 transition">
            <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Droplets className="w-3 h-3" /> Gestational DM
            </span>
            <div className="mt-1">
              <span className="text-2xl font-black text-white">6</span>
              <span className="block text-[9px] font-medium text-slate-500 uppercase mt-0.5 leading-tight">Active Home<br/>Glucose Logs</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-sky-500/30 transition">
            <span className="block text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <HeartPulse className="w-3 h-3" /> HTN Cohort
            </span>
            <div className="mt-1">
              <span className="text-2xl font-black text-white">18</span>
              <span className="block text-[9px] font-medium text-slate-500 uppercase mt-0.5 leading-tight">Daily BP<br/>Self-Monitors</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-emerald-500/30 transition">
            <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> Sync Rate
            </span>
            <div className="mt-1">
              <span className="text-2xl font-black text-white">94%</span>
              <span className="block text-[9px] font-medium text-slate-500 uppercase mt-0.5 leading-tight">24-Hour Patient<br/>Compliance</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. FEED FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 outline-none transition shadow-sm" 
            placeholder="Filter RPM feed by patient name or EHR..." 
          />
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800 w-fit overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button 
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition uppercase tracking-wider cursor-pointer ${
              filterType === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            All Syncs
          </button>
          <button 
            type="button"
            onClick={() => setFilterType('BP')}
            className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
              filterType === 'BP' ? 'bg-slate-800 text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <HeartPulse className="w-3 h-3 text-sky-400" /> BP Feeds
          </button>
          <button 
            type="button"
            onClick={() => setFilterType('GLUCOSE')}
            className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
              filterType === 'GLUCOSE' ? 'bg-slate-800 text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Droplets className="w-3 h-3 text-purple-400" /> Glucose Feeds
          </button>
        </div>
      </div>

      {/* 3. RPM LIVE FEED */}
      <div className="space-y-4">
        {filteredLogs.map(log => {
          const isHighAlert = log.status === 'HIGH_ALERT';
          const isWarning = log.status === 'WARNING';
          const initial = log.patientName.charAt(0);

          return (
            <div 
              key={log.id} 
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden ${
                isHighAlert 
                  ? 'border-2 border-rose-200 dark:border-rose-900/60' 
                  : isWarning
                  ? 'border-amber-200 dark:border-amber-900/50'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 ${
                isHighAlert ? 'w-1.5 bg-rose-500' : isWarning ? 'w-1 bg-amber-400' : 'w-1 bg-emerald-400'
              }`}></div>
              
              <div className="flex items-start gap-4 pl-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black mt-1 text-sm ${
                  isHighAlert ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800' :
                  isWarning ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/60 dark:text-amber-400' :
                  'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400'
                }`}>
                  {initial}
                </div>

                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">{log.patientName}</h4>
                    {isHighAlert && (
                      <span className="px-2 py-0.5 text-[9px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-md uppercase tracking-wider flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3" /> High Threshold Alert
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 block mb-2 mt-0.5">{log.ehrNumber}</span>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg p-3">
                    <span className="block text-sm font-black text-slate-800 dark:text-slate-100 mb-1">
                      {log.readingType === 'BP' && <>Home BP Reading: <span className={isHighAlert ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>{log.bp} mmHg</span> <span className="text-slate-500 font-medium text-xs">(Pulse: {log.pulse} bpm)</span></>}
                      {log.readingType === 'GLUCOSE' && <>Home Fasting Blood Glucose: <span className={isHighAlert ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>{log.glucoseLevel} mg/dL</span></>}
                      {log.readingType === 'WEIGHT' && <>Home Body Weight: <span className="text-amber-600 dark:text-amber-400">{log.weight} kg</span></>}
                    </span>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 italic">"{log.notes}"</p>
                    <span className="text-[10px] font-bold text-slate-400 block mt-2 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Sync {log.loggedAt}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                {isHighAlert ? (
                  <button className="w-full py-2.5 text-[10px] font-black text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center justify-center gap-2 uppercase tracking-widest cursor-pointer">
                    Review & Contact <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button className="w-full py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg shadow-sm transition flex items-center justify-center gap-2 uppercase tracking-widest cursor-pointer">
                    Open EHR Chart <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
