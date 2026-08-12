'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, orderBy, limit, doc, getDoc, getDocs, where } from 'firebase/firestore';
import { 
  ArrowLeftRight, Plus, Clock, UserCheck, AlertCircle, 
  PackageCheck, Search, Calendar, ChevronRight, 
  ShieldAlert, CheckCircle2, Loader2, Save, Box
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function ShiftHandoverWorkspace() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = userRole ? ['DIRECTOR', 'ADMIN', 'NURSE', 'DOCTOR'].includes(userRole) : false;

  const [userRolesMap, setUserRolesMap] = useState<Record<string, string>>({});

  // HANDOVER FORM STATE
  const [form, setForm] = useState({
    shiftType: 'Morning (8am - 2pm)',
    totalAdmissions: '1',
    totalDischarges: '2',
    criticalPatients: 'Adam Issaka - Monitor post-op vitals Q2H. Report any hypotensive spikes to attending.',
    consumablesNotes: 'Oxygen: OK, Emergency Drugs: OK. All crash carts inspected and fully restocked prior to shift exit.',
    generalIncident: 'No incidents reported.'
  });
  
  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "nursing_handovers"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
  }, [firestore, hospitalId]);

  const { data: history, isLoading: isHistoryLoading } = useCollection<any>(historyQuery);

  // Fetch creator roles for historical logs that do not store nurseRole directly
  useEffect(() => {
    if (!firestore || !history || !hospitalId) return;

    const missingNurseIds = Array.from(new Set(
      history
        .filter((r: any) => !r.nurseRole && r.nurseId)
        .map((r: any) => r.nurseId)
    )) as string[];

    if (missingNurseIds.length === 0) return;

    missingNurseIds.forEach(async (nurseId) => {
      if (userRolesMap[nurseId]) return;
      try {
        const userRef = doc(firestore, 'users', nurseId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setUserRolesMap(prev => ({ ...prev, [nurseId]: snap.data().role }));
        }
      } catch (err) {
        try {
          const q = query(collection(firestore, 'users'), where('uid', '==', nurseId));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            setUserRolesMap(prev => ({ ...prev, [nurseId]: qSnap.docs[0].data().role }));
          }
        } catch (queryErr) {
          console.error("Failed to fetch nurse role:", queryErr);
        }
      }
    });
  }, [firestore, history, hospitalId, userRolesMap]);

  const submitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !hospitalId) {
      toast({ variant: 'destructive', title: "Error", description: "System not ready." });
      return;
    }
    setLoading(true);
    try {
      addDocumentNonBlocking(collection(firestore, "hospitals", hospitalId, "nursing_handovers"), {
        ...form,
        hospitalId: hospitalId,
        nurseId: user.uid,
        nurseName: user.displayName || userProfile?.fullName || 'Clinician',
        nurseRole: userRole || 'NURSE',
        createdAt: serverTimestamp(),
      });
      toast({ title: "Shift Handover Logged Successfully" });
      setShowForm(false);
      setForm({
        shiftType: 'Morning (8am - 2pm)',
        totalAdmissions: '',
        totalDischarges: '',
        criticalPatients: '',
        consumablesNotes: 'Oxygen: OK, Emergency Drugs: OK',
        generalIncident: 'No incidents reported.'
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Submission Failed", description: e.message });
    }
    setLoading(false);
  };
  
  const filteredHistory = useMemo(() => {
    if (!history) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return history;
    return history.filter((r: any) => 
      r.nurseName?.toLowerCase().includes(q) ||
      r.shiftType?.toLowerCase().includes(q) ||
      r.criticalPatients?.toLowerCase().includes(q)
    );
  }, [history, searchQuery]);

  const pageIsLoading = isUserLoading || isProfileLoading;

  if (pageIsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to view this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  // Fallback demo log if history is empty
  const demoReports = [
    {
      id: 'demo-1',
      shiftType: 'Morning (8am - 2pm)',
      nurseName: 'James Obrempong',
      nurseRole: 'DOCTOR',
      totalAdmissions: '1',
      totalDischarges: '2',
      criticalPatients: 'Adam Issaka - Monitor post-op vitals Q2H. Report any hypotensive spikes to attending.',
      consumablesNotes: 'Oxygen: OK, Emergency Drugs: OK. All crash carts inspected and fully restocked prior to shift exit.',
      formattedDate: '6/14/2026, 3:09:19 PM'
    }
  ];

  const displayLogs = filteredHistory.length > 0 ? filteredHistory : (history && history.length === 0 ? demoReports : []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <ArrowLeftRight className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                SHIFT HANDOVER
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              SINGLE SOURCE OF TRUTH FOR CLINICAL CONTINUITY, WARD ADMISSIONS & CRITICAL WATCHLISTS.
            </p>
          </div>

          {/* Action Button */}
          <button 
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="self-start md:self-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            {showForm ? 'CANCEL & VIEW LOGS' : <><Plus className="w-4 h-4" /> NEW HANDOVER REPORT</>}
          </button>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          
          {/* Card 1: Active Shift Status */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Current Shift
              </span>
              <div className="text-2xl font-black text-white">Morning Shift</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 08:00 AM – 02:00 PM
              </span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Critical Watchlist */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Critical Watchlist
              </span>
              <div className="text-3xl font-black text-rose-400">1 Patient</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Requires High-Frequency Vitals</span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Ward Census Summary */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Shift Movements
              </span>
              <div className="text-2xl font-black text-white flex items-center gap-2">
                <span className="text-emerald-400">1 ADM</span>
                <span className="text-slate-600">•</span>
                <span className="text-sky-400">2 DSC</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">1 Admission / 2 Discharges</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* FORM MODE OR RECENT SHIFT REPORTS LIST    */}
      {/* ========================================== */}
      {showForm ? (
        <form onSubmit={submitHandover} className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 animate-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* WARD STATS */}
            <div className="space-y-6">
              <h3 className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
                <UserCheck className="w-4 h-4"/> Shift Ward Statistics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Shift Type</label>
                  <select 
                    className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={form.shiftType} 
                    onChange={e => setForm({...form, shiftType: e.target.value})}
                  >
                    <option>Morning (8am - 2pm)</option>
                    <option>Afternoon (2pm - 8pm)</option>
                    <option>Night (8pm - 8am)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Admissions</label>
                    <input 
                      type="number" 
                      placeholder="ADM" 
                      required 
                      value={form.totalAdmissions}
                      className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                      onChange={e => setForm({...form, totalAdmissions: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Discharges</label>
                    <input 
                      type="number" 
                      placeholder="DIS" 
                      required 
                      value={form.totalDischarges}
                      className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-bold text-xs bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                      onChange={e => setForm({...form, totalDischarges: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CONSUMABLES */}
            <div className="space-y-6">
              <h3 className="text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Box className="w-4 h-4"/> Essential Inventory & Supplies
              </h3>
              <textarea 
                className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium text-xs h-28 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Status of Oxygen, Emergency Tray, IV Fluids..."
                value={form.consumablesNotes} 
                onChange={e => setForm({...form, consumablesNotes: e.target.value})} 
              />
            </div>
          </div>

          {/* CRITICAL WATCHLIST */}
          <div className="space-y-4">
            <h3 className="text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4"/> Patient Watchlist (Critical Cases)
            </h3>
            <textarea 
              required 
              className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium text-xs h-28 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
              placeholder="List patients requiring high-frequency monitoring or urgent reviews..."
              value={form.criticalPatients} 
              onChange={e => setForm({...form, criticalPatients: e.target.value})} 
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-[2] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? 'Signing Report...' : <><Save className="w-4 h-4"/> Sign & Authenticate Handover</>}
            </button>
          </div>
        </form>
      ) : (
        /* RECENT SHIFT REPORTS LIST */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Recent Shift Handover Logs
              </h2>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search shift reports or clinicians..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Handover Cards List */}
          <div className="space-y-4">
            {isHistoryLoading ? (
              <div className="p-12 text-center flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : displayLogs.map((report: any) => {
              const nurseRole = report.nurseRole || userRolesMap[report.nurseId];
              const titlePrefix = nurseRole === 'DOCTOR' ? 'Dr.' : nurseRole === 'DIRECTOR' ? 'Director' : nurseRole === 'ADMIN' ? 'Admin' : 'Nurse';
              const dateStr = report.formattedDate || (report.createdAt ? (
                (() => {
                  const d = typeof report.createdAt.toDate === 'function' 
                    ? report.createdAt.toDate() 
                    : (report.createdAt.seconds ? new Date(report.createdAt.seconds * 1000) : new Date(report.createdAt));
                  return d.toLocaleString();
                })()
              ) : 'Recently');

              return (
                <div 
                  key={report.id}
                  className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
                >
                  {/* Header / Meta */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                          {report.shiftType?.toUpperCase() || 'MORNING SHIFT'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                            {report.totalAdmissions || 0} ADM
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[10px] font-black uppercase tracking-wider">
                            {report.totalDischarges || 0} DSC
                          </span>
                        </div>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight mt-2">
                        Logged by {titlePrefix} {report.nurseName}
                      </h3>
                      <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dateStr}</span>
                      </div>
                    </div>

                    <button className="self-start md:self-center px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-2 cursor-pointer">
                      FULL LOG DETAILS <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Critical Watchlist Box */}
                    <div className="p-4 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20">
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mb-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Critical Watchlist
                      </span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 italic">
                        "{report.criticalPatients || 'No critical watch items.'}"
                      </p>
                    </div>

                    {/* Inventory & Supplies Box */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
                        <PackageCheck className="w-3.5 h-3.5 text-slate-500" /> Inventory & Supplies
                      </span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 italic">
                        "{report.consumablesNotes || 'Oxygen & Supplies verified.'}"
                      </p>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
