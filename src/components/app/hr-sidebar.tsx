'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, UserCheck, Clock, Calendar, 
  HeartPulse, GraduationCap, Gavel, Settings,
  LogOut, ChevronRight, Calculator, Landmark, LayoutGrid, ListChecks, Layers, History,
  Wallet, Award
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { autoClockOutIfNeeded } from '@/lib/attendance';

const menuGroups = [
  {
    title: "HR Management",
    items: [
      { name: "HR Dashboard", href: "/hr", icon: Users },
      { name: "Staff Directory", href: "/staff", icon: Users },
      { name: "Department Manager", href: "/hr/departments", icon: LayoutGrid },
      { name: "Attendance Setup", href: "/hr/attendance/setup", icon: Clock },
      { name: "Leave Management", href: "/hr/leave", icon: Calendar },
      { name: "Appraisals & KPIs", href: "/hr/appraisal", icon: HeartPulse },
      { name: "Training & CPD", href: "/hr/cpd", icon: GraduationCap },
      { name: "Disciplinary Register", href: "/hr/disciplinary", icon: Gavel },
    ]
  },
  {
    title: "Payroll",
    items: [
      { name: "Payroll Config", href: "/hr/payroll/config", icon: Settings },
      { name: "Salary Grades", href: "/hr/payroll/grades", icon: Layers },
      { name: "Payroll Items", href: "/hr/payroll/items", icon: ListChecks },
      { name: "Run Payroll", href: "/hr/payroll/run", icon: Calculator },
      { name: "Payroll Archives", href: "/hr/payroll/archives", icon: History },
      { name: "Locum Tracker", href: "/hr/locum-tracker", icon: UserCheck },
      { name: "Remittance Schedules", href: "/hr/payroll/schedules", icon: Landmark },
    ]
  }
];

export function HRSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  const isLocum = userProfile?.contractType === 'LOCUM';

  const myPortalMenu = {
    title: "My Portal",
    items: [
       { name: "Request Leave", href: "/staff/request-leave", icon: Calendar },
       { name: "Clock In / Out", href: "/staff/clock-in", icon: Clock },
       isLocum ? { name: "My Locum Claims", href: "/doctor/my-claims", icon: Wallet } : { name: "My Payslips", href: "/staff/payslips", icon: Wallet },
       { name: "My CPD", href: "/staff/my-cpd", icon: GraduationCap },
       { name: "My Performance", href: "/staff/my-performance", icon: Award },
    ]
  };

  const handleLogout = async () => {
    if (auth && firestore && user?.uid) {
      try {
        await autoClockOutIfNeeded(user.uid, firestore, userProfile);
      } catch (err) {
        console.error("Error during auto clock-out on logout:", err);
      }
    }
    if (auth) {
        await signOut(auth);
    }
    router.push('/');
  };

  return (
    <aside className="w-64 h-screen bg-slate-950 text-slate-100 flex flex-col border-r border-slate-800 hidden md:flex shrink-0">
      <div className="p-6 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
            <UserCheck size={20} className="text-indigo-400" />
          </div>
          <span className="font-black text-white text-xl tracking-tight uppercase italic">Human Resources</span>
        </div>
        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
          People & Payroll
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* My Portal Menu Group */}
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 tracking-widest px-3 mb-2 uppercase">
            {myPortalMenu.title}
          </h3>
          <div className="space-y-1">
            {myPortalMenu.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                    isActive 
                      ? 'bg-indigo-600/15 text-indigo-400 font-bold border border-indigo-500/20' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <item.icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'} />
                  <span className="text-sm font-medium">{item.name}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-indigo-400" />}
                </Link>
              );
            })}
          </div>
        </div>

        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-widest px-3 mb-2 uppercase">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                      isActive 
                        ? 'bg-indigo-600/15 text-indigo-400 font-bold border border-indigo-500/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <item.icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'} />
                    <span className="text-sm font-medium">{item.name}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto text-indigo-400" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-indigo-400 border border-slate-700">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.displayName || 'User'}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-indigo-400 transition cursor-pointer p-1">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
