'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Users, UserPlus, Clock, Calendar, ShieldCheck, HeartPulse, GraduationCap, Gavel, ChevronRight, Loader2, ShieldAlert, MapPin, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function HRDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
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
                      <div className="text-right">
                         <p className="text-xs font-black uppercase text-slate-800">{log.shiftName}</p>
                         <p className="text-[9px] font-bold text-primary uppercase mt-0.5">
                            Clocked in at {log.clockInTime ? format(log.clockInTime.toDate(), 'p') : 'N/A'}
                         </p>
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
                      <div className="text-right text-[10px]">
                         <p className="font-mono font-bold text-slate-700">
                            {log.clockInTime && format(log.clockInTime.toDate(), 'dd/MM')} — {log.hoursWorked} hrs
                         </p>
                         <p className="text-[8px] font-semibold text-muted-foreground mt-0.5 uppercase">
                            Out: {log.clockOutTime ? format(log.clockOutTime.toDate(), 'p') : 'N/A'}
                         </p>
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
