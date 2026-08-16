'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  HeartPulse, Activity, AlertTriangle, UserCheck, BedDouble, 
  ClipboardList, Baby, Users, Radio, Video, Timer, 
  CalendarMinus, Banknote, LogOut, ChevronRight, Stethoscope
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { autoClockOutIfNeeded } from '@/lib/attendance';

export function NurseSidebar() {
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

  const nurseNavigation = [
    {
      group: 'MY PORTAL',
      items: [
        { name: 'Clock In / Out', href: '/staff/clock-in', icon: Timer },
        { name: 'Request Leave', href: '/staff/request-leave', icon: CalendarMinus },
        { name: 'My Payslips', href: '/staff/payslips', icon: Banknote },
      ]
    },
    {
      group: 'OUTPATIENT & TRIAGE',
      items: [
        { name: 'Triage Queue', href: '/nurse/triage', icon: Activity },
        { name: 'Outpatient Desk (OPD)', href: '/opd', icon: HeartPulse },
        { name: 'Emergency (ER) Board', href: '/emergency', icon: AlertTriangle },
      ]
    },
    {
      group: 'INPATIENT CARE & WARDS',
      items: [
        { name: 'Nursing Station', href: '/nurse', icon: UserCheck },
        { name: 'Ward Rounding Workspace', href: '/inpatient/rounds', icon: BedDouble },
        { name: 'Shift Handover', href: '/nurse/handover', icon: ClipboardList },
        { name: 'Pediatrics & NICU', href: '/pediatrics', icon: Baby },
      ]
    },
    {
      group: 'CLINICAL TOOLS',
      items: [
        { name: 'Patient Directory', href: '/patients', icon: Users },
        { name: 'Remote Patient Monitoring (RPM)', href: '/telehealth/rpm', icon: Radio },
        { name: 'Telehealth Suite', href: '/telehealth', icon: Video },
      ]
    }
  ];

  const handleLogout = async () => {
    if (auth && firestore && user?.uid) {
      await autoClockOutIfNeeded(firestore, user.uid);
    }
    if (auth) {
      await signOut(auth);
      router.replace('/');
    }
  };

  return (
    <aside className="w-72 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-tight text-white text-base uppercase">GAM Med</span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-500/30">NURSE</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[170px]">
              {userProfile?.fullName || 'Clinical Station'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {nurseNavigation.map((section) => (
          <div key={section.group} className="space-y-1">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 mb-2 font-mono">
              {section.group}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/nurse' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 font-bold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-80" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / User Profile & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-rose-400">
              {userProfile?.fullName?.[0]?.toUpperCase() || 'N'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{userProfile?.fullName || 'Staff Nurse'}</p>
              <p className="text-[10px] text-slate-400 truncate">{userProfile?.staffNumber || 'Clinical Dept'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
