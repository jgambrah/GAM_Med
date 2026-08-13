'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  Stethoscope, Banknote, Clock, Search, Filter, 
  AlertCircle, CheckCircle2, CreditCard, MoreHorizontal, 
  CalendarClock, UserCheck, Calculator, Loader2, ShieldAlert
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function LocumTrackerHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('UNPAID');
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const locumAttendanceQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/attendance_logs`), 
      where("contractType", "==", "LOCUM"),
      where("paymentStatus", "==", "UNPAID"),
      orderBy('clockInTime', 'desc')
    );
  }, [firestore, hospitalId]);

  const { data: rawLocumLogs, isLoading: areLogsLoading } = useCollection(locumAttendanceQuery);

  const demoLocumShifts = useMemo(() => [
    { 
      id: 'LOC-2026-089', 
      name: 'JAMES OBREMPONG', 
      specialty: 'GENERAL PRACTICE',
      date: 'June 14, 2026',
      shift: 'MORNING SHIFT',
      hoursNum: 1.19,
      hours: '1.19',
      rate: '120.00',
      status: 'UNPAID CLAIM' 
    },
    { 
      id: 'LOC-2026-090', 
      name: 'JAMES OBREMPONG', 
      specialty: 'GENERAL PRACTICE',
      date: 'June 14, 2026',
      shift: 'AFTERNOON SHIFT',
      hoursNum: 2.43,
      hours: '2.43',
      rate: '120.00',
      status: 'UNPAID CLAIM' 
    },
    { 
      id: 'LOC-2026-085', 
      name: 'DR. AMA ADU', 
      specialty: 'SURGEON',
      date: 'June 12, 2026',
      shift: 'NIGHT SHIFT',
      hoursNum: 12.00,
      hours: '12.00',
      rate: '250.00',
      status: 'PROCESSED' 
    }
  ], []);

  const locumShifts = useMemo(() => {
    if (rawLocumLogs && rawLocumLogs.length > 0) {
      return rawLocumLogs.map((log: any, idx: number) => {
        let formattedDate = 'N/A';
        try {
          if (log.clockInTime?.toDate) {
            formattedDate = format(log.clockInTime.toDate(), 'MMMM d, yyyy');
          }
        } catch (e) {}

        const rawHours = Number(log.hoursWorked || log.totalHours || 0);
        const cleanHoursStr = rawHours > 0 ? rawHours.toFixed(2) : '0.00';

        return {
          id: log.id ? `LOC-${log.id.slice(0, 7).toUpperCase()}` : `LOC-2026-00${idx + 1}`,
          name: (log.staffName || 'DOCTOR').toUpperCase(),
          specialty: (log.specialty || log.role || 'GENERAL PRACTICE').toUpperCase(),
          date: formattedDate,
          shift: (log.shiftName || 'GENERAL SHIFT').toUpperCase(),
          hoursNum: rawHours,
          hours: cleanHoursStr,
          rate: (log.hourlyRate || 120).toFixed(2),
          status: log.paymentStatus === 'PAID' ? 'PROCESSED' : 'UNPAID CLAIM',
          raw: log,
        };
      });
    }

    return demoLocumShifts;
  }, [rawLocumLogs, demoLocumShifts]);

  const filteredShifts = useMemo(() => {
    return locumShifts.filter(shift => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || 
        shift.name.toLowerCase().includes(q) || 
        shift.id.toLowerCase().includes(q) || 
        shift.specialty.toLowerCase().includes(q);

      if (!matchQuery) return false;
      if (activeFilter === 'UNPAID' && shift.status !== 'UNPAID CLAIM') return false;
      if (activeFilter === 'PROCESSED' && shift.status !== 'PROCESSED') return false;
      return true;
    });
  }, [locumShifts, searchQuery, activeFilter]);

  const telemetryMetrics = useMemo(() => {
    const unpaidClaims = locumShifts.filter(s => s.status === 'UNPAID CLAIM');
    const unpaidCount = unpaidClaims.length;
    const pendingHours = unpaidClaims.reduce((sum, s) => sum + s.hoursNum, 0);
    const uniqueLocums = new Set(unpaidClaims.map(s => s.name)).size;
    const estLiability = unpaidClaims.reduce((sum, s) => sum + (s.hoursNum * Number(s.rate || 120)), 0);

    return {
      unpaidCount,
      pendingHoursStr: pendingHours.toFixed(2),
      uniqueLocums,
      estLiabilityStr: estLiability.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
  }, [locumShifts]);

  const toggleSelectShift = (id: string) => {
    setSelectedShiftIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const unpaidIds = filteredShifts.filter(s => s.status === 'UNPAID CLAIM').map(s => s.id);
    if (selectedShiftIds.length >= unpaidIds.length && unpaidIds.length > 0) {
      setSelectedShiftIds([]);
    } else {
      setSelectedShiftIds(unpaidIds);
    }
  };

  const isLoading = isUserLoading || isProfileLoading;
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for the locum shift tracker.</p>
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
        {/* Ambient Radial Accent Glows - Indigo/Sky for Clinical Finance */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                LOCUM SHIFT TRACKER
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CONSOLIDATE UNPAID SHIFTS FOR FREELANCE DOCTORS TO GENERATE PAYMENT VOUCHERS.
            </p>
          </div>

          {/* Active User Context & Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 self-start md:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center font-black text-indigo-400 text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">HR DIRECTOR</div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => router.push('/accountant/locum-payments')}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <CreditCard className="w-4 h-4" /> PAYMENT ENGINE
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-amber-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Unpaid Claims</span>
              <div className="text-2xl font-black text-amber-400">{telemetryMetrics.unpaidCount}</div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Pending settlement
              </span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Pending Hours</span>
              <div className="text-2xl font-black text-sky-400">{telemetryMetrics.pendingHoursStr}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Accumulated unbilled time</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <CalendarClock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Locums</span>
              <div className="text-2xl font-black text-white">{telemetryMetrics.uniqueLocums}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Currently owed payment</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Estimated Liability</span>
              <div className="text-2xl font-black text-emerald-400"><span className="text-sm text-emerald-600 mr-1">GHS</span>{telemetryMetrics.estLiabilityStr}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Projected payout cost</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Banknote className="w-6 h-6" />
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
            placeholder="Search by Locum Name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button 
            type="button"
            onClick={() => router.push('/accountant/locum-payments')}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Calculator className="w-4 h-4" /> CONSOLIDATE SELECTED
          </button>
          
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer text-slate-800 dark:text-slate-100"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Claims</option>
              <option value="UNPAID" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Unpaid Claims</option>
              <option value="PROCESSED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Processed / Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. ENTERPRISE LOCUM LEDGER                 */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    onChange={toggleSelectAll}
                    checked={selectedShiftIds.length > 0 && selectedShiftIds.length >= filteredShifts.filter(s => s.status === 'UNPAID CLAIM').length}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-600 cursor-pointer" 
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Locum Identity
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Date & Shift
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Hours Worked
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {areLogsLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading locum shifts...
                  </td>
                </tr>
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    <Stethoscope className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    NO SHIFTS LOGGED IN THIS CATEGORY.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift, idx) => (
                  <tr key={shift.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    
                    {/* Checkbox */}
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedShiftIds.includes(shift.id)}
                        onChange={() => toggleSelectShift(shift.id)}
                        disabled={shift.status === 'PROCESSED'}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-600 cursor-pointer disabled:opacity-50" 
                      />
                    </td>

                    {/* Identity */}
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        {shift.name}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{shift.id}</span>
                        <span>•</span>
                        <span>{shift.specialty}</span>
                      </div>
                    </td>

                    {/* Date & Shift */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">
                        {shift.date}
                      </div>
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {shift.shift}
                      </div>
                    </td>

                    {/* Hours */}
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-mono font-black text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 inline-block px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                        {shift.hours} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans ml-1">HRS</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                        shift.status === 'UNPAID CLAIM' 
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}>
                        {shift.status === 'PROCESSED' && <CheckCircle2 className="w-3 h-3" />}
                        {shift.status === 'UNPAID CLAIM' && <AlertCircle className="w-3 h-3" />}
                        {shift.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {shift.status === 'UNPAID CLAIM' ? (
                        <button 
                          type="button"
                          onClick={() => router.push('/accountant/locum-payments')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm ml-auto opacity-90 group-hover:opacity-100 cursor-pointer"
                        >
                          <Banknote className="w-3.5 h-3.5" /> <span className="hidden xl:inline">PROCESS</span>
                        </button>
                      ) : (
                        <button 
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-auto opacity-90 group-hover:opacity-100 cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      )}
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
