'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { 
  Users, UserPlus, Search, Filter, ShieldCheck, 
  AlertCircle, MoreHorizontal, Mail, Fingerprint, 
  Building2, Stethoscope, FileEdit, Banknote, Loader2, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PersonnelRegisterHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const isAuthorized = ['DIRECTOR', 'HR_MANAGER', 'ADMIN', 'ACCOUNTANT'].includes(userProfile?.role || 'DIRECTOR');
  const hospitalId = userProfile?.hospitalId;

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "users"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);

  const { data: rawStaff, isLoading: isStaffLoading } = useCollection(staffQuery);

  const formatStaffId = (rawUid: string, department: string, existingStaffId?: string) => {
    if (existingStaffId) return existingStaffId;
    const shortString = (rawUid || '00000').substring(0, 5).toUpperCase();
    const deptPrefix = (department || 'GEN').substring(0, 3).toUpperCase();
    return `GAM-${deptPrefix}-${shortString}`;
  };

  const demoStaffMembers = useMemo(() => [
    { id: '2NZVRIVE57...', name: 'SAMUEL KORSAH', email: 'sammuelkorsah@gmail.com', role: 'ACCOUNTANT', department: 'FINANCE', license: 'N/A', complete: true },
    { id: 'IYWVZ2S0FY...', name: 'KWAME ADU', email: 'kwameadu@gmail.com', role: 'RADIOLOGIST', department: 'RADIOLOGY', license: '2342', complete: true },
    { id: 'RRXJ4GMDRY...', name: 'DR. AMA ADU', email: 'dr.adu@test.com', role: 'DOCTOR', department: 'GENERAL', license: 'N/A', complete: false },
    { id: 'WMIDKAVFZA...', name: 'MARCUS AMOSAH HENAKU', email: 'marcusamosah@gmail.com', role: 'DIRECTOR', department: 'GENERAL', license: 'N/A', complete: true },
    { id: 'JNFEAAZOZH...', name: 'TRACY GAMBRAH', email: 'tracygambrah@gmail.com', role: 'NURSE', department: 'ONCOLOGY', license: '132455', complete: true },
    { id: 'TPGFILYY6P...', name: 'SHANE GAMBRAH', email: 'shanegambrah@gmail.com', role: 'PHARMACIST', department: 'PHARMACY', license: '1253747', complete: true },
    { id: 'YM4EFISOYX...', name: 'ISAAC AMANKWAH', email: 'isaacamankwah@gmail.com', role: 'HR_MANAGER', department: 'HR', license: 'N/A', complete: true },
  ], []);

  const staffMembers = useMemo(() => {
    if (rawStaff && rawStaff.length > 0) {
      return rawStaff.map((m: any) => {
        const dept = (m.department || 'GENERAL').toUpperCase();
        const formattedId = formatStaffId(m.id, dept, m.employeeId || m.staffId);
        return {
          id: m.id || 'UID-000',
          formattedStaffId: formattedId,
          name: (m.fullName || m.name || 'UNNAMED STAFF').toUpperCase(),
          email: m.email || 'no-email@gam-med.com',
          role: m.role || 'STAFF',
          department: dept,
          license: m.licenseNumber || 'N/A',
          complete: Boolean(m.onboardingComplete || m.ghanaCardId),
          raw: m,
        };
      });
    }
    return demoStaffMembers.map(s => ({
      ...s,
      formattedStaffId: formatStaffId(s.id, s.department),
    }));
  }, [rawStaff, demoStaffMembers]);

  const filteredStaff = useMemo(() => {
    return staffMembers.filter(member => {
      const q = searchQuery.toLowerCase();
      const queryMatch = !searchQuery || 
        member.name.toLowerCase().includes(q) || 
        member.email.toLowerCase().includes(q) || 
        member.id.toLowerCase().includes(q) ||
        member.formattedStaffId.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q) ||
        member.department.toLowerCase().includes(q);

      if (!queryMatch) return false;

      if (activeFilter === 'CLINICAL') {
        return ['DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST'].includes(member.role);
      }
      if (activeFilter === 'ADMIN') {
        return ['DIRECTOR', 'ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'CASHIER'].includes(member.role);
      }
      if (activeFilter === 'INCOMPLETE') {
        return !member.complete;
      }
      return true;
    });
  }, [staffMembers, searchQuery, activeFilter]);

  const telemetryMetrics = useMemo(() => {
    const total = staffMembers.length;
    const clinical = staffMembers.filter(s => ['DOCTOR', 'NURSE', 'RADIOLOGIST', 'PHARMACIST', 'LAB_TECH'].includes(s.role)).length;
    const credentialed = staffMembers.filter(s => s.license !== 'N/A' && s.license !== 'NA').length;
    const incomplete = staffMembers.filter(s => !s.complete).length;
    return { total, clinical, credentialed, incomplete };
  }, [staffMembers]);

  const getRoleColor = (role: string) => {
    if (['DOCTOR', 'RADIOLOGIST'].includes(role)) return 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
    if (['NURSE'].includes(role)) return 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (['PHARMACIST', 'LAB_TECH'].includes(role)) return 'bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800';
    if (['ACCOUNTANT', 'CASHIER'].includes(role)) return 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  };

  const isLoading = isUserLoading || isProfileLoading || isStaffLoading;

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to view the Personnel Register.</p>
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
                <Users className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                PERSONNEL REGISTER
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CENTRALIZED WORKFORCE DIRECTORY & CREDENTIAL MANAGEMENT.
            </p>
          </div>

          {/* Action Button */}
          <div className="self-start md:self-auto">
            <Link href="/staff/add">
              <button 
                type="button"
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> ADD NEW STAFF
              </button>
            </Link>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Personnel</span>
              <div className="text-2xl font-black text-white">{telemetryMetrics.total}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">Active Accounts</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Clinical Staff</span>
              <div className="text-2xl font-black text-sky-400">{telemetryMetrics.clinical}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Doctors & Nurses</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Stethoscope className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Credentialed</span>
              <div className="text-2xl font-black text-emerald-400">{telemetryMetrics.credentialed}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Active Licenses</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-rose-500/20">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Action Required</span>
              <div className="text-2xl font-black text-rose-400">{telemetryMetrics.incomplete}</div>
              <span className="text-[10px] font-bold text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Incomplete Profiles
              </span>
            </div>
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
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
            placeholder="Search by Name, Email, or Role..."
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
              <option value="CLINICAL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Clinical Only</option>
              <option value="ADMIN" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Admin / Finance</option>
              <option value="INCOMPLETE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Incomplete Profiles</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. STAFF DIRECTORY GRID                    */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStaff.map((staff, idx) => (
          <div key={staff.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden group">
            
            {/* Card Header (Role & Actions) */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${getRoleColor(staff.role)}`}>
                {staff.role}
              </span>
              <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                <Link href={`/hr/payroll/profiles/${staff.id}`} title="Payroll Profile">
                  <button type="button" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors cursor-pointer">
                    <Banknote className="w-4 h-4" />
                  </button>
                </Link>
                <Link href={`/staff/edit/${staff.id}`} title="Edit Profile">
                  <button type="button" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors cursor-pointer">
                    <FileEdit className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Card Body (Identity) */}
            <div className="p-5 flex-1 space-y-3">
              <div>
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase tracking-wide truncate" title={staff.name}>
                  {staff.name}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 truncate" title={staff.email}>
                  <Mail className="w-3 h-3 shrink-0 text-slate-400" /> {staff.email}
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-400 flex items-center gap-1.5"><Building2 className="w-3 h-3"/> DEPT</span>
                  <span className="font-black text-slate-700 dark:text-slate-300 uppercase">{staff.department}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-400 flex items-center gap-1.5"><Fingerprint className="w-3 h-3"/> STAFF ID</span>
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] truncate max-w-[140px]" title={`UID: ${staff.id}`}>
                    {staff.formattedStaffId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-400 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3"/> LICENSE</span>
                  <span className={`font-black uppercase ${staff.license === 'N/A' || staff.license === 'NA' ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {staff.license}
                  </span>
                </div>
              </div>
            </div>

            {/* Incomplete Profile Alert */}
            {!staff.complete && (
              <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-t border-rose-100 dark:border-rose-900 flex items-center gap-2 text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider">Profile Incomplete</span>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
