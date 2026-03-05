'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Users, UserPlus, Clock, Calendar, ShieldCheck, HeartPulse, GraduationCap, Gavel, ChevronRight, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

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
  
  const isLoading = isUserLoading || isClaimsLoading || areStaffLoading;

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
            <div className="text-center py-10 text-muted-foreground italic">
                Attendance module not yet active.
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
