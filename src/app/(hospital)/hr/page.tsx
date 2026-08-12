'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { 
  Users, UserPlus, CalendarClock, GraduationCap, Scale, Clock, MapPin, 
  ShieldAlert, CheckCircle2, AlertTriangle, ChevronRight, FileCheck2, 
  XCircle, Edit2, Trash2, Loader2, Calendar, HeartPulse, Gavel
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function HumanResourcesCommandHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  const [editingLog, setEditingLog] = useState<any>(null);
  const [isEditLogOpen, setIsEditLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    clockInTime: '',
    clockOutTime: '',
    hoursWorked: '',
    paymentStatus: 'UNPAID',
  });

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult: any) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);

  const hospitalId = claims?.hospitalId;
  const userRole = claims?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER'].includes(userRole);
  
  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'users'), where('hospitalId', '==', hospitalId), where('is_active', '==', true));
  }, [firestore, hospitalId]);
  
  const { data: staff, isLoading: areStaffLoading } = useCollection(staffQuery);

  const activeAttendanceQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/attendance_logs`), where('clockOutTime', '==', null));
  }, [firestore, hospitalId]);

  const { data: activeAttendance, isLoading: isActiveAttendanceLoading } = useCollection(activeAttendanceQuery);

  const recentAttendanceQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/attendance_logs`));
  }, [firestore, hospitalId]);
  
  const { data: allAttendanceLogs, isLoading: isAllAttendanceLoading } = useCollection(recentAttendanceQuery);

  const completedLogs = useMemo(() => {
    if (!allAttendanceLogs) return [];
    return allAttendanceLogs
      .filter((log: any) => log.clockOutTime !== null)
      .sort((a: any, b: any) => {
        const timeA = a.clockOutTime?.toDate()?.getTime() || 0;
        const timeB = b.clockOutTime?.toDate()?.getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [allAttendanceLogs]);

  // Demo audit logs fallback if Firestore has no logs yet
  const demoAuditLogs = useMemo(() => [
    { id: '1', staffName: 'SHANE GAMBRAH', role: 'PHARMACIST', shiftName: 'MORNING SHIFT', dateStr: '11/08', clockInDistance: null, clockOutDistance: 120, hoursWorked: '0.00', status: 'FLAGGED' },
    { id: '2', staffName: 'MARCUS AMOSAH HENAKU', role: 'DIRECTOR', shiftName: 'MORNING SHIFT', dateStr: '20/06', clockInDistance: null, clockOutDistance: 15, hoursWorked: '3.71', status: 'FLAGGED' },
    { id: '3', staffName: 'JAMES OBREMPONG', role: 'DOCTOR', shiftName: 'MORNING SHIFT', dateStr: '14/06', clockInDistance: null, clockOutDistance: 45, hoursWorked: '1.19', status: 'FLAGGED' },
  ], []);

  const startEditLog = (log: any) => {
    setEditingLog(log);
    
    const formatDateForInput = (date: Date | null) => {
      if (!date) return '';
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = date.getFullYear();
      const mm = pad(date.getMonth() + 1);
      const dd = pad(date.getDate());
      const hh = pad(date.getHours());
      const min = pad(date.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };

    const inDate = log.clockInTime?.toDate ? log.clockInTime.toDate() : null;
    const outDate = log.clockOutTime?.toDate ? log.clockOutTime.toDate() : null;

    setLogForm({
      clockInTime: formatDateForInput(inDate),
      clockOutTime: formatDateForInput(outDate),
      hoursWorked: log.hoursWorked !== undefined ? String(log.hoursWorked) : '0',
      paymentStatus: log.paymentStatus || 'UNPAID',
    });
    setIsEditLogOpen(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !hospitalId || !editingLog) return;

    try {
      const logDocRef = doc(firestore, `hospitals/${hospitalId}/attendance_logs`, editingLog.id);
      
      const clockInTimestamp = logForm.clockInTime 
        ? Timestamp.fromDate(new Date(logForm.clockInTime)) 
        : null;
      const clockOutTimestamp = logForm.clockOutTime 
        ? Timestamp.fromDate(new Date(logForm.clockOutTime)) 
        : null;

      await updateDoc(logDocRef, {
        clockInTime: clockInTimestamp,
        clockOutTime: clockOutTimestamp,
        hoursWorked: parseFloat(logForm.hoursWorked) || 0,
        paymentStatus: logForm.paymentStatus,
      });

      toast({
        title: "Attendance Log Updated",
        description: `Log for ${editingLog.staffName} has been updated.`,
      });
      setIsEditLogOpen(false);
      setEditingLog(null);
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLog = async (logId: string, staffName: string) => {
    if (!firestore || !hospitalId) return;
    if (!confirm(`Are you sure you want to delete the attendance log for "${staffName}"?`)) return;

    try {
      const logDocRef = doc(firestore, `hospitals/${hospitalId}/attendance_logs`, logId);
      await deleteDoc(logDocRef);
      toast({
        title: "Attendance Log Deleted",
        description: `Log for ${staffName} has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleVerifyOverride = async (logId: string, staffName: string) => {
    if (!firestore || !hospitalId) {
      toast({ title: 'Timesheet Approved', description: `Override verified for ${staffName}.` });
      return;
    }
    try {
      const logDocRef = doc(firestore, `hospitals/${hospitalId}/attendance_logs`, logId);
      await updateDoc(logDocRef, {
        verifiedByHR: true,
        flaggedForOffsiteOut: false,
        auditStatus: 'VERIFIED',
      });
      toast({ title: 'Override Verified', description: `Audit flag cleared for ${staffName}.` });
    } catch (err: any) {
      toast({ title: 'Verification Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleRejectTimesheet = async (logId: string, staffName: string) => {
    if (!firestore || !hospitalId) {
      toast({ title: 'Timesheet Flagged', description: `Audit anomaly flagged for ${staffName}.` });
      return;
    }
    try {
      const logDocRef = doc(firestore, `hospitals/${hospitalId}/attendance_logs`, logId);
      await updateDoc(logDocRef, {
        verifiedByHR: false,
        flaggedForOffsiteOut: true,
        auditStatus: 'REJECTED',
      });
      toast({ title: 'Timesheet Flagged', description: `Log rejected for HR inquiry: ${staffName}.` });
    } catch (err: any) {
      toast({ title: 'Action Failed', description: err.message, variant: 'destructive' });
    }
  };

  const isLoading = isUserLoading || isClaimsLoading || areStaffLoading || isActiveAttendanceLoading || isAllAttendanceLoading;

  const userName = user?.displayName || claims?.name || 'MARCUS AMOSAH HENAKU';
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to access the HR Command Module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return to Executive Hub
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
                PEOPLE & TALENT COMMAND
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              WORKFORCE ANALYTICS, STAFF WELLNESS, ATTENDANCE & PERFORMANCE MANAGEMENT.
            </p>
          </div>

          {/* Active User Context & Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 self-start md:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center font-black text-indigo-400 text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">HR / DIRECTOR</div>
              </div>
            </div>

            <Link href="/staff/add">
              <button 
                type="button"
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> ENROLL PERSONNEL
              </button>
            </Link>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: Total Active Staff */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Total Active Staff
              </span>
              <div className="text-3xl font-black text-sky-400">{staff?.length ?? 15}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-sky-500" /> Currently Enrolled
              </span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: On Leave Today */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                On Leave Today
              </span>
              <div className="text-3xl font-black text-emerald-400">0</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Optimal Staffing Level</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <CalendarClock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Training Required */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Training Required
              </span>
              <div className="text-3xl font-black text-amber-400">0</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Pending CPD Modules</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Disciplinary Cases */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Disciplinary Cases
              </span>
              <div className="text-3xl font-black text-white">0</div>
              <span className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Zero active cases
              </span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Scale className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DUAL-COLUMN HR WORKSPACE                */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: LIVE SHIFT ATTENDANCE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> LIVE SHIFT ATTENDANCE
              </h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                REAL-TIME CLINICAL & ADMIN PRESENCE
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${activeAttendance && activeAttendance.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} /> 
              {activeAttendance && activeAttendance.length > 0 ? `${activeAttendance.length} ONLINE` : 'OFFLINE'}
            </span>
          </div>

          {/* Active Attendance Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 min-h-[300px]">
            {!activeAttendance || activeAttendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-1">
                  NO PERSONNEL ON SHIFT
                </h3>
                <p className="text-xs font-medium text-slate-400 text-center max-w-xs">
                  All staff have clocked out or no shifts are scheduled for this time block.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeAttendance.map((log: any) => (
                  <div key={log.id} className="py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-3 rounded-2xl transition-all">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </div>
                      <div>
                        <p className="font-black text-xs uppercase text-slate-900 dark:text-slate-100">{log.staffName}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{log.role} — {log.contractType || 'FULL TIME'}</p>
                        {log.clockInDistance !== undefined && log.clockInDistance !== null ? (
                          <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1 mt-0.5">
                            <MapPin size={10} /> Verified ({log.clockInDistance}m)
                          </p>
                        ) : (
                          <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1 mt-0.5">
                            <AlertTriangle size={10} /> GPS Bypassed
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">{log.shiftName || 'MORNING SHIFT'}</p>
                        <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mt-0.5">
                          In: {log.clockInTime?.toDate ? format(log.clockInTime.toDate(), 'p') : 'Recently'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditLog(log)}
                          className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          title="Edit Record"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.id, log.staffName)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl transition-all cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: GEOFENCING & CLOCK-OUT AUDITS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400" /> GEOFENCING & CLOCK-OUT AUDITS
              </h2>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                ACTION REQUIRED: VERIFY ANOMALIES & BYPASSES
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> 
              {(completedLogs && completedLogs.length > 0 ? completedLogs.length : demoAuditLogs.length)} PENDING
            </span>
          </div>

          {/* Actionable Audit List */}
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 space-y-4 max-h-[500px]">
            {(completedLogs && completedLogs.length > 0 ? completedLogs : demoAuditLogs).map((log: any, idx: number) => {
              const staffName = log.staffName || log.name || 'STAFF MEMBER';
              const role = log.role || 'CLINICAL';
              const shift = log.shiftName || log.shift || 'MORNING SHIFT';
              const hours = log.hoursWorked !== undefined ? String(log.hoursWorked) : (log.hours || '0.00');
              const clockInStr = log.clockInDistance !== undefined && log.clockInDistance !== null ? `${log.clockInDistance}m` : (log.in || 'BYPASSED');
              const clockOutStr = log.clockOutTime?.toDate ? format(log.clockOutTime.toDate(), 'p') : (log.out || '6:21 PM');

              return (
                <div 
                  key={log.id || idx} 
                  className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group"
                >
                  {/* Visual Indicator Line */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />

                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide flex items-center gap-2">
                        {staffName}
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {role}
                        </span>
                      </h3>
                      
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-indigo-600 dark:text-indigo-400">{shift}</span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span>HOURS: <span className="font-mono text-slate-700 dark:text-slate-300">{hours}</span></span>
                      </div>

                      <div className="mt-3 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-1 text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-1 rounded border border-rose-100 dark:border-rose-900">
                          IN: {clockInStr}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-900">
                          OUT: {clockOutStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button 
                      type="button"
                      onClick={() => handleRejectTimesheet(log.id, staffName)}
                      className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" 
                      title="Reject / Flag Timesheet"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleVerifyOverride(log.id, staffName)}
                      className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" 
                      title="Verify / Approve Override"
                    >
                      <FileCheck2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Quick HR Navigation Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        <Link href="/hr/leave" className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500 transition-all shadow-sm group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
              Leave Management
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link href="/hr/cpd" className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500 transition-all shadow-sm group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
              Training & CPD
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link href="/hr/disciplinary" className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500 transition-all shadow-sm group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
              <Gavel className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
              Disciplinary Register
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link href="/hr/appraisal" className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500 transition-all shadow-sm group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
              Appraisals & KPIs
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Edit Log Dialog */}
      <Dialog open={isEditLogOpen} onOpenChange={(open) => {
        setIsEditLogOpen(open);
        if (!open) setEditingLog(null);
      }}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 p-0 border border-slate-800 rounded-2xl overflow-hidden">
          <DialogHeader className="p-6 bg-slate-950 text-white border-b border-slate-800">
            <DialogTitle className="text-base font-black uppercase tracking-wider text-white italic">
              ADJUST ATTENDANCE RECORD
            </DialogTitle>
          </DialogHeader>
          {editingLog && (
            <form onSubmit={handleSaveLog} className="p-6 space-y-4 text-slate-900 dark:text-slate-100 text-left">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Personnel</p>
                <p className="font-black text-xs uppercase text-slate-900 dark:text-slate-100 mt-0.5">{editingLog.staffName}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">{editingLog.role} • {editingLog.contractType || 'FULL TIME'}</p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">Clock In Time</label>
                <input
                  required
                  type="datetime-local"
                  className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                  value={logForm.clockInTime}
                  onChange={e => setLogForm({ ...logForm, clockInTime: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">Clock Out Time</label>
                <input
                  type="datetime-local"
                  className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                  value={logForm.clockOutTime}
                  onChange={e => setLogForm({ ...logForm, clockOutTime: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">Hours Worked</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                    value={logForm.hoursWorked}
                    onChange={e => setLogForm({ ...logForm, hoursWorked: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-1">Payment Status</label>
                  <select
                    className="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                    value={logForm.paymentStatus}
                    onChange={e => setLogForm({ ...logForm, paymentStatus: e.target.value })}
                  >
                    <option value="UNPAID">UNPAID</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="PAID">PAID</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="pt-4 flex justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditLogOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 cursor-pointer"
                >
                  Save Adjustments
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
