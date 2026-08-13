'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc, serverTimestamp } from 'firebase/firestore';
import { 
  CalendarRange, Users, Clock, CheckCircle2, Search, Filter, 
  MoreHorizontal, Check, X, CalendarX2, CalendarCheck, Loader2, ShieldAlert 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function LeaveAdministrationHub() {
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
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'].includes(userProfile?.role || 'DIRECTOR');

  const leaveRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/leave_requests`));
  }, [firestore, hospitalId]);
  
  const { data: rawRequests, isLoading: areRequestsLoading } = useCollection(leaveRequestsQuery);

  const demoLeaveRequests = useMemo(() => [
    { 
      id: 'LV-26-089', 
      name: 'DR. AMA ADU', 
      department: 'CLINICAL / GENERAL',
      type: 'ANNUAL LEAVE', 
      startDate: 'Aug 15, 2026',
      endDate: 'Aug 30, 2026', 
      duration: '14 Days', 
      status: 'PENDING' 
    },
    { 
      id: 'LV-26-085', 
      name: 'SAMUEL KORSAH', 
      department: 'FINANCE',
      type: 'SICK LEAVE', 
      startDate: 'Aug 10, 2026',
      endDate: 'Aug 12, 2026', 
      duration: '3 Days', 
      status: 'APPROVED' 
    },
    { 
      id: 'LV-26-082', 
      name: 'TRACY GAMBRAH', 
      department: 'NURSING',
      type: 'STUDY LEAVE', 
      startDate: 'Sep 01, 2026',
      endDate: 'Sep 14, 2026', 
      duration: '14 Days', 
      status: 'REJECTED' 
    }
  ], []);

  const leaveRequests = useMemo(() => {
    if (rawRequests && rawRequests.length > 0) {
      return rawRequests.map((r: any, idx: number) => {
        const nameUpper = (r.staffName || r.name || 'UNKNOWN STAFF').toUpperCase();
        const deptUpper = (r.department || r.role || 'GENERAL').toUpperCase();
        const rawType = (r.leaveType || 'ANNUAL').toUpperCase();
        const typeDisplay = rawType.endsWith('LEAVE') ? rawType : `${rawType} LEAVE`;

        let startDateStr = r.startDate || '';
        let endDateStr = r.endDate || '';
        try {
          if (r.startDate) startDateStr = format(new Date(r.startDate), 'MMM dd, yyyy');
          if (r.endDate) endDateStr = format(new Date(r.endDate), 'MMM dd, yyyy');
        } catch (e) {
          // fallback string
        }

        return {
          id: r.id || `LV-26-0${idx + 10}`,
          name: nameUpper,
          department: deptUpper,
          type: typeDisplay,
          startDate: startDateStr || 'TBD',
          endDate: endDateStr || 'TBD',
          duration: `${r.daysRequested || r.duration || 1} Days`,
          status: (r.status || 'PENDING').toUpperCase(),
          raw: r,
        };
      });
    }
    return demoLeaveRequests;
  }, [rawRequests, demoLeaveRequests]);

  const filteredRequests = useMemo(() => {
    return leaveRequests.filter(req => {
      const q = searchQuery.toLowerCase();
      const queryMatch = !searchQuery || 
        req.name.toLowerCase().includes(q) || 
        req.id.toLowerCase().includes(q) || 
        req.department.toLowerCase().includes(q) ||
        req.type.toLowerCase().includes(q);

      if (!queryMatch) return false;

      if (activeFilter === 'PENDING') return req.status === 'PENDING';
      if (activeFilter === 'APPROVED') return req.status === 'APPROVED';
      if (activeFilter === 'REJECTED') return req.status === 'REJECTED';
      return true;
    });
  }, [leaveRequests, searchQuery, activeFilter]);

  const telemetryMetrics = useMemo(() => {
    const onLeave = leaveRequests.filter(r => r.status === 'APPROVED').length;
    const pending = leaveRequests.filter(r => r.status === 'PENDING').length;
    const approvedMonth = leaveRequests.filter(r => r.status === 'APPROVED').length;
    const returningToday = 0;
    return { onLeave, pending, approvedMonth, returningToday };
  }, [leaveRequests]);

  const updateStatus = (reqId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!firestore || !hospitalId) {
      toast({ title: `Leave Request ${status}`, description: `Request status set to ${status}.` });
      return;
    }
    const requestDocRef = doc(firestore, `hospitals/${hospitalId}/leave_requests`, reqId);
    updateDocumentNonBlocking(requestDocRef, {
      status,
      reviewedBy: user?.uid || '',
      reviewedByName: userProfile?.name || 'ADMIN',
      updatedAt: serverTimestamp()
    });
    toast({ title: `Leave request ${status.toLowerCase()}`, description: `Status updated successfully.` });
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Leave Administration.</p>
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
                <CalendarRange className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                LEAVE ADMINISTRATION
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              MANAGE STAFF ABSENCE, APPROVAL WORKFLOWS, AND ANNUAL ENTITLEMENTS.
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
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Staff on Leave</span>
              <div className="text-2xl font-black text-white">{telemetryMetrics.onLeave}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">Currently Out of Office</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-amber-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Action Required</span>
              <div className="text-2xl font-black text-amber-400">{telemetryMetrics.pending}</div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 block">Pending Approvals</span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Approved This Month</span>
              <div className="text-2xl font-black text-emerald-400">{telemetryMetrics.approvedMonth}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Total processed</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Returning Today</span>
              <div className="text-2xl font-black text-sky-400">{telemetryMetrics.returningToday}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Expected back on shift</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <CalendarCheck className="w-6 h-6" />
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
            placeholder="Search by Employee Name or ID..."
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
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Requests</option>
              <option value="PENDING" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pending Only</option>
              <option value="APPROVED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Approved</option>
              <option value="REJECTED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. ENTERPRISE DATA TABLE                   */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Employee
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Type & Dates
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Duration
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
              {areRequestsLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading leave administration queue...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    <CalendarX2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    NO LEAVE REQUESTS FOUND.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req, idx) => (
                  <tr key={req.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    
                    {/* Employee Info */}
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        {req.name}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{req.id}</span>
                        <span>•</span>
                        <span>{req.department}</span>
                      </div>
                    </td>

                    {/* Leave Type & Dates */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex mb-1.5 items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        req.type.includes('SICK') ? 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' :
                        req.type.includes('ANNUAL') ? 'bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300' :
                        'bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                      }`}>
                        {req.type}
                      </span>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {req.startDate} <span className="text-slate-400 font-medium px-1">→</span> {req.endDate}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <CalendarRange className="w-4 h-4 text-slate-400" /> {req.duration}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                        req.status === 'PENDING' ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' :
                        req.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' :
                        'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                      }`}>
                        {req.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {req.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                        {req.status === 'REJECTED' && <X className="w-3 h-3" />}
                        {req.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            onClick={() => updateStatus(req.id, 'APPROVED')}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 border border-transparent hover:border-emerald-200 rounded-lg transition-all cursor-pointer" 
                            title="Approve Leave"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => updateStatus(req.id, 'REJECTED')}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 border border-transparent hover:border-rose-200 rounded-lg transition-all cursor-pointer" 
                            title="Reject Leave"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors opacity-90 group-hover:opacity-100 cursor-pointer"
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
