'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Users, UserPlus, Clock, Calendar, ShieldCheck, HeartPulse, GraduationCap, Gavel, ChevronRight, Loader2, ShieldAlert, MapPin, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function HRDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const { toast } = useToast();

  const [editingLog, setEditingLog] = useState<any>(null);
  const [isEditLogOpen, setIsEditLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    clockInTime: '',
    clockOutTime: '',
    hoursWorked: '',
    paymentStatus: 'UNPAID',
  });

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

    const inDate = log.clockInTime?.toDate() || null;
    const outDate = log.clockOutTime?.toDate() || null;

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
      .slice(0, 5);
  }, [allAttendanceLogs]);
  
  const isLoading = isUserLoading || isClaimsLoading || areStaffLoading || isActiveAttendanceLoading || isAllAttendanceLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to access the HR module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">People <span className="text-primary">Management</span></h1>
          <p className="text-muted-foreground font-medium">Staff Wellness, Attendance & Performance.</p>
        </div>
        <Link href="/staff/add">
           <Button className="bg-primary text-primary-foreground shadow-xl hover:bg-foreground transition-all flex items-center gap-2">
              <UserPlus size={18}/> Enroll New Personnel
           </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <HRKPI label="Total Active Staff" value={staff?.length ?? 0} icon={<Users/>} color="blue" />
        <HRKPI label="On Leave Today" value="0" icon={<Calendar/>} color="orange" />
        <HRKPI label="Training Required" value="0" icon={<GraduationCap/>} color="purple" />
        <HRKPI label="Disciplinary Cases" value="0" icon={<Gavel/>} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-card p-8 rounded-[40px] border shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-4">
               <Clock size={16} className="text-primary" /> Live Shift Attendance
            </h3>
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
               {activeAttendance?.length === 0 ? (
                 <div className="text-center py-10 text-muted-foreground italic font-semibold text-xs uppercase tracking-wider">
                     No personnel currently on shift.
                 </div>
               ) : (
                 activeAttendance?.map((log: any) => (
                   <div key={log.id} className="py-4 flex justify-between items-center hover:bg-slate-50/50 px-3 rounded-2xl transition-all">
                      <div className="flex items-center gap-3">
                         <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                         </div>
                          <div>
                             <p className="font-black text-xs uppercase text-slate-900">{log.staffName}</p>
                             <p className="text-[9px] font-bold text-muted-foreground uppercase">{log.role} — {log.contractType}</p>
                             {log.clockInDistance !== undefined && log.clockInDistance !== null ? (
                                <p className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1 mt-0.5 text-left">
                                   <MapPin size={10} /> Verified ({log.clockInDistance}m)
                                </p>
                             ) : (
                                <p className="text-[9px] font-black text-amber-600 uppercase flex items-center gap-1 mt-0.5 text-left">
                                   <AlertTriangle size={10} /> GPS Bypassed
                                </p>
                             )}
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="text-right">
                            <p className="text-xs font-black uppercase text-slate-800">{log.shiftName}</p>
                            <p className="text-[9px] font-bold text-primary uppercase mt-0.5">
                               Clocked in at {log.clockInTime ? format(log.clockInTime.toDate(), 'p') : 'N/A'}
                            </p>
                         </div>
                         <div className="flex items-center gap-1">
                            <button
                               onClick={() => startEditLog(log)}
                               className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                               title="Edit Record"
                            >
                               <Edit2 size={12} />
                            </button>
                            <button
                               onClick={() => handleDeleteLog(log.id, log.staffName)}
                               className="p-2 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                               title="Delete Record"
                            >
                               <Trash2 size={12} />
                            </button>
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
         </div>

         <div className="bg-card p-8 rounded-[40px] border shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-4 text-left">
               <ShieldCheck size={16} className="text-primary" /> Geofencing & Clock-Out Audits
            </h3>
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
               {completedLogs?.length === 0 ? (
                 <div className="text-center py-10 text-muted-foreground italic font-semibold text-xs uppercase tracking-wider">
                     No recently completed shifts.
                 </div>
               ) : (
                 completedLogs?.map((log: any) => (
                   <div key={log.id} className="py-4 flex justify-between items-start hover:bg-slate-50/50 px-3 rounded-2xl transition-all">
                      <div className="space-y-1 text-left">
                         <p className="font-black text-xs uppercase text-slate-900 flex items-center gap-1.5 flex-wrap">
                            {log.staffName}
                            {log.flaggedForOffsiteOut && (
                               <span className="bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-0.5">
                                  <ShieldAlert size={8} /> Off-Site Out
                               </span>
                            )}
                         </p>
                         <p className="text-[9px] font-bold text-muted-foreground uppercase">{log.role} — {log.shiftName}</p>
                         <div className="flex gap-2 text-[9px] font-bold text-slate-400 uppercase mt-1">
                            <span className="flex items-center gap-0.5">
                               In: {log.clockInDistance !== undefined && log.clockInDistance !== null ? `${log.clockInDistance}m` : 'Bypassed'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                               Out: {log.clockOutDistance !== undefined && log.clockOutDistance !== null ? `${log.clockOutDistance}m` : 'N/A'}
                            </span>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="text-right text-[10px]">
                            <p className="font-mono font-bold text-slate-700">
                               {log.clockInTime && format(log.clockInTime.toDate(), 'dd/MM')} — {log.hoursWorked} hrs
                            </p>
                            <p className="text-[8px] font-semibold text-muted-foreground mt-0.5 uppercase">
                               Out: {log.clockOutTime ? format(log.clockOutTime.toDate(), 'p') : 'N/A'}
                            </p>
                         </div>
                         <div className="flex flex-col gap-1">
                            <button
                               onClick={() => startEditLog(log)}
                               className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                               title="Edit Record"
                            >
                               <Edit2 size={10} />
                            </button>
                            <button
                               onClick={() => handleDeleteLog(log.id, log.staffName)}
                               className="p-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                               title="Delete Record"
                            >
                               <Trash2 size={10} />
                            </button>
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
         </div>

         <div className="space-y-4">
            <HRAction icon={<Calendar className="text-blue-600"/>} label="Leave Management" href="/hr/leave" />
            <HRAction icon={<GraduationCap className="text-purple-600"/>} label="Training & CPD" href="/hr/cpd" />
            <HRAction icon={<Gavel className="text-red-600"/>} label="Disciplinary Register" href="/hr/disciplinary" />
            <HRAction icon={<HeartPulse className="text-green-600"/>} label="Appraisals & KPIs" href="/hr/appraisal" />
         </div>
      </div>

      {/* Edit Log Dialog */}
      <Dialog open={isEditLogOpen} onOpenChange={(open) => {
        setIsEditLogOpen(open);
        if (!open) setEditingLog(null);
      }}>
        <DialogContent className="max-w-md bg-white rounded-[40px] p-8 border">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900">Adjust Attendance Record</DialogTitle>
          </DialogHeader>
          {editingLog && (
            <form onSubmit={handleSaveLog} className="space-y-4 text-black text-left">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Personnel</p>
                <p className="font-black text-xs uppercase text-slate-900 mt-0.5">{editingLog.staffName}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">{editingLog.role} • {editingLog.contractType}</p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Clock In Time</label>
                <input
                  required
                  type="datetime-local"
                  className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary/20 transition-all text-slate-900"
                  value={logForm.clockInTime}
                  onChange={e => setLogForm({ ...logForm, clockInTime: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Clock Out Time</label>
                <input
                  type="datetime-local"
                  className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary/20 transition-all text-slate-900"
                  value={logForm.clockOutTime}
                  onChange={e => setLogForm({ ...logForm, clockOutTime: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Hours Worked</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary/20 transition-all text-slate-900"
                    value={logForm.hoursWorked}
                    onChange={e => setLogForm({ ...logForm, hoursWorked: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Payment Status</label>
                  <select
                    className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary/20 transition-all text-slate-900"
                    value={logForm.paymentStatus}
                    onChange={e => setLogForm({ ...logForm, paymentStatus: e.target.value })}
                  >
                    <option value="UNPAID">UNPAID</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="PAID">PAID</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditLogOpen(false)}
                  className="rounded-2xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-white rounded-2xl hover:bg-black"
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

function HRKPI({ label, value, icon, color }: any) {
    const colors: any = { blue: "bg-blue-50 text-blue-600", orange: "bg-orange-50 text-orange-600", red: "bg-red-50 text-red-600", purple: "bg-purple-50 text-purple-600" };
    return (
        <div className={`p-8 rounded-[32px] border-2 shadow-sm flex items-center justify-between ${colors[color]} hover:scale-105 transition-all`}>
            <div><p className="text-[10px] font-black uppercase opacity-60 tracking-widest">{label}</p><p className="text-3xl font-black">{value}</p></div>
            <div className="p-4 bg-white/50 rounded-3xl">{icon}</div>
        </div>
    );
}

function HRAction({ label, icon, href }: any) {
    return (
        <Link href={href} className="flex items-center justify-between p-6 bg-card border shadow-sm rounded-3xl hover:border-primary transition-all">
            <div className="flex items-center gap-4">{icon} <span className="text-xs font-black uppercase text-card-foreground">{label}</span></div>
            <ChevronRight size={16} className="text-slate-300" />
        </Link>
    );
}
