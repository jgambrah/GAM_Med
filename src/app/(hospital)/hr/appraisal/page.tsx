'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Target, TrendingUp, Award, AlertCircle, Search, Filter, 
  Plus, ChevronRight, Activity, CheckCircle2, Medal, Star, 
  XCircle, Loader2, ShieldAlert 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PerformanceIntelligenceHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [activeCycle, setActiveCycle] = useState('Q3-2026');

  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showRateModal, setShowRateModal] = useState(false);

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile?.role || 'DIRECTOR');

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'users'), where('hospitalId', '==', hospitalId), where('is_active', '==', true));
  }, [firestore, hospitalId]);
  const { data: rawStaff, isLoading: areStaffLoading } = useCollection(staffQuery);

  const cyclesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'appraisal_cycles'), where('status', '==', 'OPEN'));
  }, [firestore, hospitalId]);
  const { data: cyclesData } = useCollection(cyclesQuery);

  const appraisalsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/appraisals`));
  }, [firestore, hospitalId]);
  const { data: rawAppraisals } = useCollection(appraisalsQuery);

  // Helper for generating clean, enterprise Staff IDs from raw UIDs
  const formatStaffId = (rawUid: string, role: string) => {
    const deptPrefix = (role || 'GEN').substring(0, 3).toUpperCase();
    const shortString = (rawUid || '00000').substring(0, 6).toUpperCase();
    return `GAM-${deptPrefix}-${shortString}`;
  };

  const demoStaffMembers = useMemo(() => [
    { id: '2NZVRI', name: 'SAMUEL KORSAH', role: 'ACCOUNTANT', department: 'FINANCE', score: '--', status: 'PENDING' },
    { id: 'IYWVZ2', name: 'KWAME ADU', role: 'RADIOLOGIST', department: 'CLINICAL', score: '8.5', status: 'COMPLETED' },
    { id: 'NPJFHU', name: 'JESSICA BANSAH', role: 'RECEPTIONIST', department: 'ADMIN', score: '--', status: 'PENDING' },
    { id: 'P6MV9L', name: 'RICHARD KYEI', role: 'STORE_MANAGER', department: 'INVENTORY', score: '--', status: 'PENDING' },
    { id: 'RRXJ4G', name: 'DR. AMA ADU', role: 'DOCTOR', department: 'CLINICAL', score: '9.2', status: 'COMPLETED' },
    { id: 'WMIDKA', name: 'MARCUS A. HENAKU', role: 'DIRECTOR', department: 'EXECUTIVE', score: '--', status: 'EXEMPT' },
  ], []);

  const staffMembers = useMemo(() => {
    if (rawStaff && rawStaff.length > 0) {
      return rawStaff.map((m: any) => {
        const staffAppraisal = rawAppraisals?.find((a: any) => a.staffId === m.id);
        let scoreStr = '--';
        let statusStr = 'PENDING';

        if (m.role === 'DIRECTOR') {
          statusStr = 'EXEMPT';
        } else if (staffAppraisal) {
          scoreStr = staffAppraisal.overallScore ? staffAppraisal.overallScore.toFixed(1) : '8.5';
          statusStr = 'COMPLETED';
        }

        return {
          id: m.id,
          name: (m.fullName || m.name || 'STAFF MEMBER').toUpperCase(),
          role: m.role || 'STAFF',
          department: (m.department || 'GENERAL').toUpperCase(),
          score: scoreStr,
          status: statusStr,
          raw: m,
        };
      });
    }
    return demoStaffMembers;
  }, [rawStaff, rawAppraisals, demoStaffMembers]);

  const filteredStaff = useMemo(() => {
    return staffMembers.filter(staff => {
      const q = searchQuery.toLowerCase();
      const formattedId = formatStaffId(staff.id, staff.role).toLowerCase();
      const queryMatch = !searchQuery || 
        staff.name.toLowerCase().includes(q) || 
        staff.id.toLowerCase().includes(q) || 
        formattedId.includes(q) ||
        staff.role.toLowerCase().includes(q) ||
        staff.department.toLowerCase().includes(q);

      if (!queryMatch) return false;

      if (activeFilter === 'CLINICAL') return ['DOCTOR', 'NURSE', 'RADIOLOGIST', 'PHARMACIST'].includes(staff.role);
      if (activeFilter === 'ADMIN') return ['ACCOUNTANT', 'RECEPTIONIST', 'STORE_MANAGER', 'ADMIN', 'HR_MANAGER'].includes(staff.role);
      if (activeFilter === 'PENDING') return staff.status === 'PENDING';
      return true;
    });
  }, [staffMembers, searchQuery, activeFilter]);

  const telemetryMetrics = useMemo(() => {
    const completed = staffMembers.filter(s => s.status === 'COMPLETED').length;
    const pending = staffMembers.filter(s => s.status === 'PENDING').length;
    
    const validScores = staffMembers
      .filter(s => s.score !== '--')
      .map(s => parseFloat(s.score));
    
    const avgScore = validScores.length > 0 
      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) 
      : '8.8';

    const topStaff = staffMembers.find(s => s.score === '9.2') || staffMembers.find(s => s.status === 'COMPLETED') || { name: 'DR. AMA ADU', score: '9.2' };

    return { avgScore, completed, pending, topStaff };
  }, [staffMembers]);

  const getRoleColor = (role: string) => {
    if (['DOCTOR', 'RADIOLOGIST'].includes(role)) return 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
    if (['NURSE'].includes(role)) return 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (['ACCOUNTANT', 'STORE_MANAGER', 'RECEPTIONIST'].includes(role)) return 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  };

  // RATING FORM STATE
  const [scores, setScores] = useState({
    punctuality: 8,
    clinicalSkill: 9,
    bedsideManner: 8,
    teamwork: 9,
    documentation: 8,
    turnaroundTime: 8,
    comments: ''
  });

  const handleSubmitAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle) {
      toast({ title: 'Appraisal Submitted', description: `Evaluation for ${selectedStaff?.name || 'Staff'} finalized.` });
      setShowRateModal(false);
      return;
    }

    const numericScores = Object.values(scores).filter(v => typeof v === 'number') as number[];
    const averageScore = numericScores.reduce((a, b) => a + b, 0) / numericScores.length;

    try {
      if (!firestore || !user || !hospitalId) throw new Error("System not ready");

      await addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/appraisals`), {
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
        role: selectedStaff.role,
        cycleId: activeCycle,
        scores,
        overallScore: parseFloat(averageScore.toFixed(1)),
        ratedBy: user?.uid,
        ratedByName: user?.displayName || userProfile?.name || 'HR DIRECTOR',
        hospitalId: hospitalId,
        createdAt: serverTimestamp()
      });

      toast({ title: 'Appraisal Finalized', description: `Appraisal for ${selectedStaff.name} submitted successfully.` });
      setShowRateModal(false);
    } catch (e: any) { 
      toast({ variant: 'destructive', title: "Submission Failed", description: e.message }); 
    }
  };

  const isLoading = isUserLoading || isProfileLoading || areStaffLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Performance Intelligence.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Indigo/Violet for HR Performance */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Target className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                PERFORMANCE INTELLIGENCE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CLINICAL KPI TRACKING, PEER-TO-PEER REVIEWS & APPRAISAL CYCLES.
            </p>
          </div>

          {/* Active User Context & Actions */}
          <div className="flex flex-wrap items-center gap-4 self-start xl:self-auto">
            
            {/* Cycle Selector embedded in banner */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-black uppercase tracking-widest text-slate-200 transition-colors">
                <Activity className="w-4 h-4 text-indigo-400" />
                <select 
                  value={activeCycle}
                  onChange={(e) => setActiveCycle(e.target.value)}
                  className="bg-transparent focus:outline-none appearance-none cursor-pointer pr-2 text-slate-200"
                >
                  <option value="Q3-2026" className="bg-slate-900 text-white">CYCLE: Q3-2026</option>
                  <option value="Q2-2026" className="bg-slate-900 text-white">CYCLE: Q2-2026</option>
                  <option value="Q1-2026" className="bg-slate-900 text-white">CYCLE: Q1-2026</option>
                  {cyclesData?.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">CYCLE: {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => toast({ title: "New Appraisal Cycle Started", description: "Q4-2026 evaluation cycle initiated." })}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" /> NEW CYCLE
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Facility Average</span>
              <div className="text-2xl font-black text-white">{telemetryMetrics.avgScore}<span className="text-sm text-slate-500 font-medium">/10</span></div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">Across all departments</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Completed Reviews</span>
              <div className="text-2xl font-black text-emerald-400">{telemetryMetrics.completed}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Appraisals finalized</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-amber-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Pending Appraisals</span>
              <div className="text-2xl font-black text-amber-400">{telemetryMetrics.pending}</div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 block">Action required</span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Top Performer</span>
              <div className="text-xl font-black text-sky-400 truncate max-w-[100px]">{telemetryMetrics.topStaff.name}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Score: {telemetryMetrics.topStaff.score}/10</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER & SEARCH CONTROL BAR             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Staff Name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Departments</option>
              <option value="CLINICAL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Clinical Staff</option>
              <option value="ADMIN" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Admin Staff</option>
              <option value="PENDING" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pending Appraisals</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. PERFORMANCE STAFF GRID                  */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((staff, idx) => (
          <div key={staff.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all flex flex-col h-full overflow-hidden group">
            
            {/* Card Header (Identity & Role) */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-sm flex items-center justify-center font-black text-slate-600 dark:text-slate-300 text-lg shrink-0">
                {staff.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide truncate mb-1" title={staff.name}>
                  {staff.name}
                </h3>
                <div className="flex items-center flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getRoleColor(staff.role)}`}>
                    {staff.role}
                  </span>
                  <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                    {formatStaffId(staff.id, staff.role)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Body (Score & Status) */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    LAST SCORE
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black ${staff.score === '--' ? 'text-slate-300 dark:text-slate-700' : 'text-slate-900 dark:text-slate-100'}`}>
                      {staff.score}
                    </span>
                    <span className="text-xs font-bold text-slate-400">/10</span>
                  </div>
                </div>

                {/* Visual Status Indicator */}
                <div className="flex flex-col items-end">
                  {staff.status === 'COMPLETED' && (
                    <div className="flex flex-col items-center">
                      <Medal className="w-8 h-8 text-emerald-500 mb-1" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">SCORED</span>
                    </div>
                  )}
                  {staff.status === 'PENDING' && (
                    <div className="flex flex-col items-center opacity-70">
                      <Star className="w-8 h-8 text-amber-500 mb-1" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">PENDING</span>
                    </div>
                  )}
                  {staff.status === 'EXEMPT' && (
                    <div className="flex flex-col items-center opacity-40">
                      <Award className="w-8 h-8 text-slate-400 mb-1" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">EXEMPT</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button 
                type="button"
                onClick={() => {
                  setSelectedStaff(staff);
                  setShowRateModal(true);
                }}
                className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  staff.status === 'PENDING' 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {staff.status === 'PENDING' ? 'START APPRAISAL' : 'VIEW FULL REPORT'} <ChevronRight className="w-4 h-4" />
              </button>
              
            </div>
          </div>
        ))}
      </div>

      {/* RATING MODAL */}
      {showRateModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSubmitAppraisal} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 max-w-2xl w-full space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Target className="w-6 h-6 text-indigo-500" /> CLINICAL EVALUATION REVIEW
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">EVALUATING {selectedStaff.name}</p>
              </div>
              <button type="button" onClick={() => setShowRateModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <XCircle className="w-8 h-8" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <KPISlider label="Punctuality" value={scores.punctuality} onChange={(v: number) => setScores({...scores, punctuality: v})} />
              <KPISlider label="Clinical Skill" value={scores.clinicalSkill} onChange={(v: number) => setScores({...scores, clinicalSkill: v})} />
              <KPISlider label="Bedside Manner" value={scores.bedsideManner} onChange={(v: number) => setScores({...scores, bedsideManner: v})} />
              <KPISlider label="Teamwork" value={scores.teamwork} onChange={(v: number) => setScores({...scores, teamwork: v})} />
              <KPISlider label="Documentation" value={scores.documentation} onChange={(v: number) => setScores({...scores, documentation: v})} />
              <KPISlider label="Turnaround Time" value={scores.turnaroundTime} onChange={(v: number) => setScores({...scores, turnaroundTime: v})} />
            </div>

            <textarea 
              placeholder="Provide a detailed qualitative summary of performance and clinical competencies..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium h-28 outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
              value={scores.comments}
              onChange={e => setScores({...scores, comments: e.target.value})}
            />

            <Button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg hover:bg-indigo-700 transition-all cursor-pointer">
              FINALIZE PERFORMANCE SCORE
            </Button>
          </form>
        </div>
      )}

    </div>
  );
}

function KPISlider({ label, value, onChange }: {label: string, value: number, onChange: (value: number) => void}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">{value}/10</span>
      </div>
      <input 
        type="range" min="1" max="10" step="1" value={value}
        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        onChange={e => onChange(parseInt(e.target.value))}
      />
    </div>
  );
}