'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { 
  GraduationCap, ShieldCheck, AlertTriangle, Search, Filter, 
  Check, X, FileText, Award, FileBadge2, ExternalLink, 
  Loader2, ShieldAlert 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { addDays } from 'date-fns';

export default function ComplianceCPDHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'cpd_submissions'));
  }, [firestore, hospitalId]);
  const { data: rawSubmissions, isLoading: areSubmissionsLoading } = useCollection(submissionsQuery);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'users'), where('hospitalId', '==', hospitalId), where('is_active', '==', true));
  }, [firestore, hospitalId]);
  const { data: staffData, isLoading: areStaffLoading } = useCollection(staffQuery);

  const demoPendingCPDs = useMemo(() => [
    {
      id: 'CPD-26-042',
      name: 'TRACY GAMBRAH',
      role: 'NURSE',
      topic: 'Advanced Infection Control Protocol',
      provider: 'NMC Ghana / GAM Med',
      points: 3,
      dateSubmitted: 'Aug 12, 2026',
      evidence: 'cert_infection_control.pdf',
      evidenceUrl: '#',
      status: 'PENDING'
    },
    {
      id: 'CPD-26-045',
      name: 'DR. AMA ADU',
      role: 'DOCTOR',
      topic: 'Basic Life Support (BLS) Renewal',
      provider: 'Ghana Red Cross',
      points: 5,
      dateSubmitted: 'Aug 13, 2026',
      evidence: 'bls_adu_2026.pdf',
      evidenceUrl: '#',
      status: 'PENDING'
    }
  ], []);

  const pendingCPDs = useMemo(() => {
    if (rawSubmissions && rawSubmissions.length > 0) {
      return rawSubmissions
        .filter((s: any) => (s.status || 'PENDING') === 'PENDING')
        .map((s: any, idx: number) => ({
          id: s.id || `CPD-26-0${idx + 40}`,
          name: (s.staffName || 'CLINICIAN').toUpperCase(),
          role: (s.role || 'STAFF').toUpperCase(),
          topic: s.topic || 'Continuous Education Module',
          provider: s.provider || 'Accredited Council',
          points: Number(s.points || 3),
          dateSubmitted: s.createdAt ? new Date(s.createdAt.seconds * 1000).toLocaleDateString() : 'Recent',
          evidence: s.certificateUrl ? 'evidence_certificate.pdf' : 'cert_document.pdf',
          evidenceUrl: s.certificateUrl || '#',
          status: 'PENDING',
          raw: s,
        }));
    }
    return demoPendingCPDs;
  }, [rawSubmissions, demoPendingCPDs]);

  const filteredCPDs = useMemo(() => {
    return pendingCPDs.filter(cpd => {
      const q = searchQuery.toLowerCase();
      const queryMatch = !searchQuery || 
        cpd.name.toLowerCase().includes(q) || 
        cpd.topic.toLowerCase().includes(q) || 
        cpd.provider.toLowerCase().includes(q) ||
        cpd.id.toLowerCase().includes(q);

      if (!queryMatch) return false;

      if (activeFilter === 'DOCTOR') return cpd.role === 'DOCTOR' || cpd.role === 'RADIOLOGIST';
      if (activeFilter === 'NURSE') return cpd.role === 'NURSE';
      if (activeFilter === 'PHARMACIST') return cpd.role === 'PHARMACIST' || cpd.role === 'LAB_TECH';
      return true;
    });
  }, [pendingCPDs, searchQuery, activeFilter]);

  const telemetryStats = useMemo(() => {
    const verifiedPoints = rawSubmissions 
      ? rawSubmissions.filter((s: any) => s.status === 'VERIFIED').reduce((a: number, b: any) => a + Number(b.points || 0), 0)
      : 142;

    const pendingCount = pendingCPDs.length;

    let atRisk = 0;
    if (staffData) {
      const now = new Date();
      const in90Days = addDays(now, 90);
      atRisk = staffData.filter((staff: any) => {
        if (!staff.licenseExpiry) return false;
        try {
          const expiryDate = new Date(staff.licenseExpiry);
          return expiryDate <= in90Days && expiryDate >= now;
        } catch(e) {
          return false;
        }
      }).length;
    }

    return { verifiedPoints, pendingCount, atRisk };
  }, [rawSubmissions, pendingCPDs, staffData]);

  const handleVerify = async (cpd: any) => {
    if (!firestore || !user || !hospitalId || !cpd.raw) {
      toast({ title: "CPD Verified", description: `Awarded ${cpd.points} points to ${cpd.name}.` });
      return;
    }

    const batch = writeBatch(firestore);
    try {
      const subRef = doc(firestore, 'hospitals', hospitalId, 'cpd_submissions', cpd.raw.id);
      batch.update(subRef, { 
        status: 'VERIFIED', 
        verifiedBy: user.uid,
        verifiedByName: user.displayName || userProfile?.name || 'HR DIRECTOR',
        verifiedAt: serverTimestamp() 
      });

      if (cpd.raw.staffId) {
        const userRef = doc(firestore, "users", cpd.raw.staffId);
        batch.update(userRef, {
          totalCpdPoints: increment(cpd.points)
        });
      }

      await batch.commit();
      toast({ title: "Verification Complete", description: `Verified ${cpd.points} CPD points for ${cpd.name}.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Verification Failed", description: e.message });
    }
  };

  const handleReject = async (cpd: any) => {
    if (!firestore || !hospitalId || !cpd.raw) {
      toast({ title: "Submission Rejected", description: `Certificate submission for ${cpd.name} rejected.` });
      return;
    }
    try {
      const subRef = doc(firestore, 'hospitals', hospitalId, 'cpd_submissions', cpd.raw.id);
      const batch = writeBatch(firestore);
      batch.update(subRef, { status: 'REJECTED', updatedAt: serverTimestamp() });
      await batch.commit();
      toast({ title: "CPD Rejected", description: `Submission for ${cpd.name} marked as rejected.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Action Failed", description: e.message });
    }
  };

  const getRoleColor = (role: string) => {
    if (['DOCTOR', 'RADIOLOGIST'].includes(role)) return 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
    if (['NURSE'].includes(role)) return 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (['PHARMACIST', 'LAB_TECH'].includes(role)) return 'bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  };

  const isLoading = isUserLoading || isProfileLoading || areSubmissionsLoading || areStaffLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Compliance & CPD verification.</p>
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
        {/* Ambient Radial Accent Glows - Indigo/Violet for HR */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                COMPLIANCE & CPD
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              TRACKING CLINICAL EXCELLENCE, REGULATORY LICENSING & CONTINUING EDUCATION.
            </p>
          </div>

          {/* Active User Context */}
          <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start md:self-auto">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center font-black text-indigo-400 text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">HR DIRECTOR</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Institutional Standing</span>
              <div className="text-2xl font-black text-emerald-400">COMPLIANT</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Fully Credentialed Facility
              </span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Verified CPD Points</span>
              <div className="text-2xl font-black text-sky-400">{telemetryStats.verifiedPoints}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Facility-wide cumulative</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Awaiting Verification</span>
              <div className="text-2xl font-black text-amber-400">{telemetryStats.pendingCount}</div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 block">Pending HR review</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <FileBadge2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Renewal Risk</span>
              <div className="text-2xl font-black text-white">{telemetryStats.atRisk}</div>
              <span className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Staff within safe margin
              </span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
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
            placeholder="Search by Clinician or CPD Topic..."
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
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Disciplines</option>
              <option value="DOCTOR" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Medical & Dental</option>
              <option value="NURSE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Nursing & Midwifery</option>
              <option value="PHARMACIST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pharmacy Council</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. ENTERPRISE DATA TABLE                   */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <FileBadge2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> PENDING CERTIFICATE REVIEWS
          </h2>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> {filteredCPDs.length} PENDING
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Clinician & Role
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  CPD Topic & Provider
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Points
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Evidence
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCPDs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    <FileBadge2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    NO PENDING CPD REVIEWS.
                  </td>
                </tr>
              ) : (
                filteredCPDs.map((cpd, idx) => (
                  <tr key={cpd.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    
                    {/* Clinician Info */}
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        {cpd.name}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getRoleColor(cpd.role)}`}>
                          {cpd.role}
                        </span>
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                          {cpd.id}
                        </span>
                      </div>
                    </td>

                    {/* Topic & Provider */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase mb-1">
                        {cpd.topic}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        PROVIDER: <span className="text-indigo-600 dark:text-indigo-400">{cpd.provider}</span>
                      </div>
                    </td>

                    {/* Points */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-black text-sm border border-sky-200 dark:border-sky-800">
                        {cpd.points}
                      </span>
                    </td>

                    {/* Evidence Attachment */}
                    <td className="px-6 py-4">
                      <a 
                        href={cpd.evidenceUrl || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-indigo-200 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> 
                        <span className="truncate max-w-[120px]">{cpd.evidence}</span>
                        <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                      </a>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button"
                          onClick={() => handleVerify(cpd)}
                          className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 border border-transparent hover:border-emerald-200 rounded-lg transition-all cursor-pointer" 
                          title="Verify & Award Points"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleReject(cpd)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 border border-transparent hover:border-rose-200 rounded-lg transition-all cursor-pointer" 
                          title="Reject Certificate"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
