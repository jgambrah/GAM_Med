'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Sun, Stethoscope, Users, AlertCircle, Activity, Bed, 
  Baby, HeartPulse, Video, Radio, Smartphone, ClipboardList, 
  CalendarDays, Clock, Timer, Banknote, CalendarMinus, Award, TrendingUp, LogOut 
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { autoClockOutIfNeeded } from '@/lib/attendance';

export function DoctorSidebar() {
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

  const doctorNavigation = [
    {
      group: 'Workspace & Directory',
      items: [
        { name: '"My Day" Command Desk', href: '/doctor/my-day', icon: Sun },
        { name: 'Doctor\'s Desk', href: '/doctor', icon: Stethoscope },
        { name: 'Clinical Command Console', href: '/doctor/console', icon: Activity },
        { name: 'Patients', href: '/patients', icon: Users },
      ]
    },
    {
      group: 'Clinical Care',
      items: [
        { name: 'Emergency & Triage', href: '/emergency', icon: AlertCircle },
        { name: 'Outpatient Desk (OPD)', href: '/opd', icon: Activity },
        { name: 'Ward Rounding Workspace', href: '/inpatient/rounds', icon: Bed },
        { name: 'Pediatrics & NICU', href: '/pediatrics', icon: Baby },
        { name: 'Doctor Specialty Hub', href: '/specialty/dashboard', icon: HeartPulse },
      ]
    },
    {
      group: 'Digital Health',
      items: [
        { name: 'Telehealth Suite', href: '/telehealth', icon: Video },
        { name: 'Remote Patient Monitoring (RPM)', href: '/telehealth/rpm', icon: Radio },
        { name: 'Mobile Clinician App', href: '/doctor/mobile', icon: Smartphone },
      ]
    },
    {
      group: 'Roster & Scheduling',
      items: [
        { name: 'Shift Handover', href: '/nurse/handover', icon: ClipboardList },
        { name: 'Weekly Calendar', href: '/doctor/calendar', icon: CalendarDays },
        { name: 'Set Availability', href: '/doctor/availability', icon: Clock },
      ]
    },
    {
      group: 'My Portal',
      items: [
        { name: 'Clock In / Out', href: '/staff/clock-in', icon: Timer },
        isLocum ? { name: 'My Locum Claims', href: '/doctor/my-claims', icon: Banknote } : { name: 'My Payslips', href: '/staff/payslips', icon: Banknote },
        { name: 'Request Leave', href: '/staff/request-leave', icon: CalendarMinus },
        { name: 'My CPD', href: '/staff/my-cpd', icon: Award },
        { name: 'My Performance', href: '/staff/my-performance', icon: TrendingUp },
      ]
    }
  ];

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

  const displayName = userProfile?.fullName || user?.displayName || 'Tracy Gambrah';
  const roleTitle = userProfile?.specialty || (isLocum ? 'Locum Physician' : 'Lead Physician');
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="w-64 h-screen bg-[#0B1120] text-slate-300 flex flex-col border-r border-slate-800/60 shrink-0 hidden md:flex">
      
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/60 sticky top-0 bg-[#0B1120] z-10">
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center shadow-lg shadow-rose-900/30">
            <Stethoscope className="w-5 h-5 text-white" />
          </span>
          GAM MED
        </h2>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
          Clinical Operations
        </p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {doctorNavigation.map((section, idx) => (
          <div key={idx}>
            <h3 className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
              {section.group}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/doctor' && pathname.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                        isActive 
                          ? 'bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 shadow-sm' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-rose-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-900/50 sticky bottom-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-900/80 text-rose-200 rounded-full flex items-center justify-center font-black border border-rose-700/50 text-sm shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white tracking-wide truncate">{displayName}</h4>
            <span className="text-[10px] text-slate-400 font-medium truncate block">{roleTitle}</span>
          </div>
          <button 
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="text-slate-500 hover:text-rose-400 transition cursor-pointer p-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

    </aside>
  );
}

export default DoctorSidebar;
