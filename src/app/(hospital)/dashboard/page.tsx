'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { 
  Activity, AlertTriangle, BrainCircuit, ShieldAlert, 
  CheckCircle2, Search, ChevronRight, Clock, 
  X, ShieldCheck, Loader2, TrendingUp, DollarSign, Users, Building2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

function safeToDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'object') {
    if (typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
    }
    if (typeof val._seconds === 'number') {
      return new Date(val._seconds * 1000 + (val._nanoseconds || 0) / 1000000);
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

const todayMetrics = {
  date: 'August 15, 2026',
  financials: {
    grossRevenue: 142500.00,
    cashCollected: 85200.00,
    receivablesNHIS: 32000.00,
    receivablesCorporate: 25300.00,
    pendingRemittances: 45000.00
  },
  clinical: {
    totalEncounters: 312,
    admissions: 14,
    discharges: 9,
    averageWaitTime: '42 mins'
  },
  bottlenecks: [
    { dept: 'Pharmacy Dispensing', waiting: 34, status: 'CRITICAL' },
    { dept: 'General OPD Triage', waiting: 12, status: 'NORMAL' },
    { dept: 'Laboratory / Phlebotomy', waiting: 18, status: 'WARNING' }
  ]
};

export default function ExecutiveDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [timeRange, setTimeRange] = useState('TODAY');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Dismissal Modal State
  const [dismissingPatient, setDismissingPatient] = useState<{ id: string; name: string } | null>(null);
  const [dismissReason, setDismissReason] = useState('Data Entry Error Resolved');
  const [customReasonNote, setCustomReasonNote] = useState('');
  const [dismissSuccess, setDismissSuccess] = useState(false);
  const [dismissedPatientIds, setDismissedPatientIds] = useState<string[]>([]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId || 'GAM-GAR-7578';

  // 1. Query for active alerts
  const alertsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/clinical_alerts`),
      where("status", "==", "UNREAD"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);
  const { data: alerts, isLoading: areAlertsLoading } = useCollection<any>(alertsQuery);

  // 2. Group alerts by patient
  const groupedAlerts = useMemo(() => {
    const map: Record<string, any[]> = {};
    if (!alerts) return map;

    alerts.forEach((alert: any) => {
      if (!map[alert.patientId]) {
        map[alert.patientId] = [];
      }
      map[alert.patientId].push(alert);
    });
    return map;
  }, [alerts]);
  
  // 3. Fetch patients
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/patients`));
  }, [firestore, hospitalId]);
  const { data: patients, isLoading: arePatientsLoading } = useCollection<any>(patientsQuery);

  // 4. Fallback demo critical patients if Firestore alerts are clean
  const demoCriticalPatients = useMemo(() => [
    {
      id: 'patient_janet',
      firstName: 'JANET',
      lastName: 'BONAH',
      ehrNumber: 'MMH/EHR/26/0005',
      updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      alerts: [
        {
          id: 'j1',
          type: 'TRIAGE',
          message: 'EMERGENCY: HIGH TRIAGE SCORE (5). Immediate intervention required.',
          severity: 'CRITICAL'
        },
        {
          id: 'j2',
          type: 'AI_RISK',
          message: 'AI DETECTED CRITICAL RISK: DATA ANOMALY. SpO2 recorded at 11% (clinically impossible for conscious patient).',
          severity: 'CRITICAL',
          highlight: 'SpO2 recorded at 11%'
        }
      ]
    },
    {
      id: 'patient_benjamin',
      firstName: 'BENJAMIN',
      lastName: 'HEDIDOR',
      ehrNumber: 'MMH/EHR/26/0007',
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      alerts: [
        {
          id: 'b1',
          type: 'AI_RISK',
          message: 'AI DETECTED CRITICAL RISK: MISSING VITALS. Subsequent consultation lacks vitals, HPI, and chief complaint.',
          severity: 'CRITICAL',
          highlight: 'lacks vitals, HPI, and chief complaint'
        }
      ]
    }
  ], []);

  // 5. Combine & Filter Patients
  const rawCriticalPatients = useMemo(() => {
    if (!patients || !alerts) return demoCriticalPatients;
    const dbList = patients
      ?.filter((p: any) => groupedAlerts[p.id])
      ?.map((p: any) => ({
        ...p,
        alerts: groupedAlerts[p.id],
      }))
      ?.sort((a: any, b: any) => b.alerts.length - a.alerts.length);

    return dbList.length > 0 ? dbList : demoCriticalPatients;
  }, [patients, alerts, groupedAlerts, demoCriticalPatients]);

  const activeCriticalPatients = useMemo(() => {
    return rawCriticalPatients.filter(p => {
      if (dismissedPatientIds.includes(p.id)) return false;
      const nameStr = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      const matchSearch = nameStr.includes(searchQuery.toLowerCase()) || p.ehrNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeFilter === 'ai') {
        const hasAi = p.alerts?.some((a: any) => a.type === 'AI_RISK' || a.message?.includes('AI'));
        return matchSearch && hasAi;
      }
      if (activeFilter === 'triage') {
        const hasTriage = p.alerts?.some((a: any) => a.type === 'TRIAGE' || a.message?.includes('TRIAGE'));
        return matchSearch && hasTriage;
      }
      return matchSearch;
    });
  }, [rawCriticalPatients, dismissedPatientIds, searchQuery, activeFilter]);

  const handleConfirmDismissal = () => {
    if (!dismissingPatient) return;
    setDismissSuccess(true);
    setTimeout(() => {
      setDismissedPatientIds(prev => [...prev, dismissingPatient.id]);
      setDismissingPatient(null);
      setDismissSuccess(false);
    }, 1000);
  };

  const isLoading = isUserLoading || isProfileLoading || areAlertsLoading || arePatientsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  const hospitalNameDisplay = userProfile?.hospitalName || 'MARCUS MEMORIAL HOSPITAL';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      
      {/* ========================================== */}
      {/* 1. GLOBAL C-SUITE COMMAND BANNER           */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white flex items-center gap-3">
                C-SUITE ANALYTICS
              </h1>
              <p className="text-xs md:text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">
                Live Operational & Financial Telemetry • <span className="text-indigo-400">{todayMetrics.date}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 relative z-10">
          {['TODAY', 'THIS WEEK', 'YTD'].map(range => (
            <button 
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                timeRange === range 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FINANCIAL HEALTH MATRIX                 */}
      {/* ========================================== */}
      <div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
          Working Capital & Revenue Realization
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Gross Revenue */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Gross Billed Revenue
              </p>
              <p className="text-2xl font-mono font-black text-slate-900 dark:text-slate-100">
                ₵ {todayMetrics.financials.grossRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-wide">
              <TrendingUp className="w-3.5 h-3.5" />
              +12.4% vs Yesterday
            </div>
          </div>

          {/* Liquid Cash */}
          <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">
                Liquid Cash Collected
              </p>
              <p className="text-2xl font-mono font-black text-emerald-300">
                ₵ {todayMetrics.financials.cashCollected.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="mt-4 pt-3">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: '60%' }}></div>
              </div>
              <p className="text-[9px] font-bold text-emerald-400 mt-1 uppercase tracking-wider text-right">60% Liquidity Ratio</p>
            </div>
          </div>

          {/* Corporate Receivables */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                A/R: NHIS & Corporate
              </p>
              <p className="text-2xl font-mono font-black text-slate-900 dark:text-slate-100">
                ₵ {(todayMetrics.financials.receivablesNHIS + todayMetrics.financials.receivablesCorporate).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Claims Dispatch</p>
            </div>
          </div>

          {/* Treasury Liability */}
          <div className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                Approved Payables (PVs)
              </p>
              <p className="text-2xl font-mono font-black text-indigo-300">
                ₵ {todayMetrics.financials.pendingRemittances.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-indigo-500/20">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Awaiting Bank Remittance</p>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 3. CLINICAL OPERATIONS & BOTTLENECKS       */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Patient Throughput */}
        <div className="col-span-2 space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">
            Clinical Throughput
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-1">{todayMetrics.clinical.totalEncounters}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Encounters</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-1">{todayMetrics.clinical.admissions}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward Admissions</p>
            </div>
            
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center shadow-xl">
              <p className="text-3xl font-mono font-black text-indigo-400 mb-1">{todayMetrics.clinical.averageWaitTime}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. Wait Time</p>
            </div>
          </div>
        </div>

        {/* Live Departmental Bottleneck Alerts */}
        <div className="col-span-1 space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">
            Live Departmental Bottlenecks
          </h3>

          <div className="space-y-3">
            {todayMetrics.bottlenecks.map((dept, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  dept.status === 'CRITICAL' 
                    ? 'bg-rose-500/10 border-rose-500/30' 
                    : dept.status === 'WARNING' 
                    ? 'bg-amber-500/10 border-amber-500/30' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <p className={`text-xs font-black uppercase tracking-wider ${
                    dept.status === 'CRITICAL' ? 'text-rose-300' :
                    dept.status === 'WARNING' ? 'text-amber-300' :
                    'text-slate-800 dark:text-slate-200'
                  }`}>
                    {dept.dept}
                  </p>
                </div>
                <div>
                  <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest flex items-center gap-1 ${
                    dept.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse' :
                    dept.status === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {dept.waiting} WAITING
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
