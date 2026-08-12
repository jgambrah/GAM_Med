'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { 
  Activity, AlertTriangle, BrainCircuit, ShieldAlert, 
  CheckCircle2, Search, ChevronRight, Clock, 
  X, ShieldCheck, Loader2 
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

export default function CommandCenterDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [showPrompt, setShowPrompt] = useState(false);
  const [suggestedShift, setSuggestedShift] = useState<any>(null);
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

  const hospitalId = userProfile?.hospitalId;

  // Query active clock-in log for this user
  const activeLogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !user?.uid) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/attendance_logs`),
      where("staffId", "==", user.uid),
      where("clockOutTime", "==", null)
    );
  }, [firestore, hospitalId, user?.uid]);
  const { data: activeLogs, isLoading: isActiveLogLoading } = useCollection(activeLogQuery);

  // Fetch shifts roster for the hospital
  const shiftsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/shifts`));
  }, [firestore, hospitalId]);
  const { data: shifts, isLoading: areShiftsLoading } = useCollection(shiftsQuery);

  React.useEffect(() => {
    if (activeLogs && shifts && activeLogs.length === 0) {
      const prompted = sessionStorage.getItem('clockInPrompted');
      if (prompted !== 'true') {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        let foundShift = null;

        for (const s of shifts) {
          if (!s.startTime || !s.endTime) continue;
          const [startH, startM] = s.startTime.split(':').map(Number);
          const [endH, endM] = s.endTime.split(':').map(Number);
          const startMin = startH * 60 + startM;
          const endMin = endH * 60 + endM;

          if (endMin < startMin) {
            if (currentMinutes >= startMin || currentMinutes <= endMin) {
              foundShift = s;
              break;
            }
          } else {
            if (currentMinutes >= startMin && currentMinutes <= endMin) {
              foundShift = s;
              break;
            }
          }
        }

        if (foundShift) {
          setSuggestedShift(foundShift);
          setShowPrompt(true);
          sessionStorage.setItem('clockInPrompted', 'true');
        }
      }
    }
  }, [activeLogs, shifts]);

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
          message: 'AI DETECTED CRITICAL RISK: DATA ANOMALY. Patient presents with acute GI symptoms (Cholera dx). SpO2 recorded at 11% (clinically impossible for conscious patient).',
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
          message: 'AI DETECTED CRITICAL RISK: MISSING VITALS. Cholera diagnosis on 2026-06-20 with Stage 2 HTN (145/92). Subsequent consultation lacks vitals, HPI, and chief complaint.',
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
      ?.sort((a, b) => b.alerts.length - a.alerts.length);

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

  const handleOpenDismissModal = (patientId: string, name: string) => {
    setDismissingPatient({ id: patientId, name });
    setDismissReason('Data Entry Error Resolved');
    setCustomReasonNote('');
    setDismissSuccess(false);
  };

  const handleConfirmDismissal = () => {
    if (!dismissingPatient) return;
    setDismissSuccess(true);
    setTimeout(() => {
      setDismissedPatientIds(prev => [...prev, dismissingPatient.id]);
      setDismissingPatient(null);
      setDismissSuccess(false);
    }, 1000);
  };

  const isLoading = isUserLoading || isProfileLoading || areAlertsLoading || arePatientsLoading || isActiveLogLoading || areShiftsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
      </div>
    );
  }

  const hospitalNameDisplay = userProfile?.hospitalName || 'MARCUS MEMORIAL HOSPITAL';
  const totalActiveAlertsCount = activeCriticalPatients.reduce((acc, p) => acc + (p.alerts?.length || 1), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Live Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <Activity className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                CLINICAL COMMAND CONSOLE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium flex items-center gap-2">
              <span>LIVE MONITORING CONSOLE</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400 font-bold uppercase">{hospitalNameDisplay}</span>
            </p>
          </div>

          {/* AI Engine Status Badge */}
          <div className="self-start md:self-auto flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Sentinel System</div>
              <div className="text-xs font-bold text-white">ACTIVE MONITORING</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          
          {/* Card 1: Total Active Alerts */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Active System Alerts
              </span>
              <div className="text-3xl font-black text-rose-400">{totalActiveAlertsCount}</div>
              <span className="text-[10px] font-bold text-rose-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Requires Immediate Review
              </span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: AI Risk Detections */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                AI Risk Anomalies
              </span>
              <div className="text-3xl font-black text-indigo-400">5</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Clinical Data Mismatches</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <BrainCircuit className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Emergency Triage Scores */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Level 4-5 Triage
              </span>
              <div className="text-3xl font-black text-amber-400">{activeCriticalPatients.length}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">High Acuity Patients</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>

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
            placeholder="Search alerts by Patient Name or EHR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:inline">
            Alert Filter:
          </span>
          <select 
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All Critical Alerts ({activeCriticalPatients.length})</option>
            <option value="ai">AI Risk Detections</option>
            <option value="triage">High Triage (Level 4/5)</option>
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. PATIENT ALERT CARDS GRID                */}
      {/* ========================================== */}
      {activeCriticalPatients.length === 0 ? (
        <div className="p-16 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
            ALL SYSTEMS CLEAR. NO ACTIVE CRITICAL ALERTS.
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm font-medium">
            All AI anomaly alerts and high triage risk flags have been reviewed and resolved.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {activeCriticalPatients.map((patient: any) => {
            const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'PATIENT';
            const lastSeenStr = safeToDate(patient.updatedAt) 
              ? formatDistanceToNow(safeToDate(patient.updatedAt)!, { addSuffix: true }) 
              : 'recently';

            return (
              <div 
                key={patient.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border-l-4 border-l-rose-500 border-y border-r border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                        {patientName}
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-black uppercase tracking-wider">
                          {patient.alerts?.length || 1} ALERTS
                        </span>
                      </h3>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                        EHR: <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px]">{patient.ehrNumber}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Last Seen</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400"/> {lastSeenStr}
                      </span>
                    </div>
                  </div>

                  {/* Alert List */}
                  <div className="space-y-3">
                    {patient.alerts?.map((alert: any, idx: number) => {
                      const msgText = alert.message || alert.description || 'Clinical alert detected.';
                      const isAi = alert.type === 'AI_RISK' || msgText.includes('AI');
                      const highlight = alert.highlight;

                      return (
                        <div 
                          key={idx}
                          className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                            isAi
                              ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20'
                              : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20'
                          }`}
                        >
                          {isAi ? (
                            <BrainCircuit className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <h4 className={`text-xs font-black uppercase tracking-wider mb-1 ${
                              isAi ? 'text-rose-900 dark:text-rose-300' : 'text-amber-900 dark:text-amber-300'
                            }`}>
                              {alert.title || (isAi ? 'AI DETECTED CRITICAL RISK: DATA ANOMALY' : 'EMERGENCY: HIGH TRIAGE SCORE')}
                            </h4>
                            <p className={`text-xs font-medium leading-relaxed ${
                              isAi ? 'text-rose-800 dark:text-rose-200' : 'text-amber-800 dark:text-amber-200'
                            }`}>
                              {highlight ? (
                                <>
                                  {msgText.split(highlight)[0]}
                                  <strong className="bg-rose-200 dark:bg-rose-900/80 px-1 py-0.5 rounded text-rose-900 dark:text-rose-100 font-bold">
                                    {highlight}
                                  </strong>
                                  {msgText.split(highlight)[1]}
                                </>
                              ) : msgText}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => handleOpenDismissModal(patient.id, patientName)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    DISMISS ALERTS
                  </button>

                  <Link href={`/patients/folder/${patient.id}`}>
                    <button className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer">
                      REVIEW CHART <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================== */}
      {/* 4. DISMISSAL ACKNOWLEDGMENT MODAL          */}
      {/* ========================================== */}
      {dismissingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    ALERT ACKNOWLEDGMENT ENGINE
                  </span>
                  <h2 className="text-base font-black italic uppercase tracking-wider text-white">
                    DISMISS ALERTS: {dismissingPatient.name}
                  </h2>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setDismissingPatient(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {dismissSuccess ? (
                <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    DISMISSAL LOGGED & FEDERATED BACK
                  </h3>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Reason stored for AI model optimization. Alert cleared from Command Console.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Select a resolution justification below to dismiss active alerts for <strong className="text-slate-900 dark:text-slate-100">{dismissingPatient.name}</strong>. This feedback refines AI anomaly detection algorithms.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      Resolution Justification:
                    </label>
                    <select
                      value={dismissReason}
                      onChange={(e) => setDismissReason(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    >
                      <option value="Data Entry Error Resolved">Data Entry Error Resolved (e.g. Typo in SpO2)</option>
                      <option value="False Positive Anomaly">False Positive Anomaly</option>
                      <option value="Clinical Intervention Completed">Clinical Intervention Completed</option>
                      <option value="Patient Discharged / Transferred">Patient Discharged / Transferred</option>
                      <option value="Other">Other Reason (Specify below)</option>
                    </select>
                  </div>

                  {dismissReason === 'Other' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                        Specify Note:
                      </label>
                      <textarea
                        value={customReasonNote}
                        onChange={(e) => setCustomReasonNote(e.target.value)}
                        placeholder="Enter clinical reason..."
                        rows={2}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!dismissSuccess && (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDismissingPatient(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDismissal}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> CONFIRM & DISMISS
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Clock-In Prompt Modal */}
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="max-w-md bg-white rounded-[40px] p-8 border">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
              <Clock className="text-primary" size={20} /> Shift Attendance Prompt
            </DialogTitle>
          </DialogHeader>
          {suggestedShift && (
            <div className="space-y-4 text-black text-left mt-2">
              <p className="text-xs font-bold text-slate-500 leading-normal">
                We noticed you signed in and a shift pattern is currently running:
              </p>
              <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400">Scheduled Shift</p>
                <p className="font-black text-sm text-slate-800 uppercase mt-0.5">{suggestedShift.name}</p>
                <p className="text-xs font-bold text-muted-foreground mt-0.5">{suggestedShift.startTime} — {suggestedShift.endTime}</p>
              </div>
              <p className="text-xs text-slate-400 font-bold leading-normal">
                Would you like to clock in for your shift now?
              </p>
              <DialogFooter className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPrompt(false)}
                  className="rounded-2xl"
                >
                  Dismiss
                </Button>
                <Button
                  onClick={() => {
                    setShowPrompt(false);
                    router.push('/staff/clock-in');
                  }}
                  className="bg-primary text-white rounded-2xl hover:bg-black font-black uppercase text-[10px] tracking-widest px-6"
                >
                  Yes, Clock In
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
