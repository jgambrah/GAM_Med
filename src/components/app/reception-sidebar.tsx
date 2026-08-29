'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, Calendar, UserCheck, UserPlus, Building2,
  LogOut, ChevronRight, Clock, Wallet, GraduationCap, Award
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { autoClockOutIfNeeded } from '@/lib/attendance';

export function ReceptionSidebar() {
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
  const userRole = userProfile?.role || 'RECEPTIONIST';

  const frontDeskMenuItems = [
    { 
      name: "Front Desk Command", 
      href: "/reception", 
      icon: Building2,
      isActive: (path: string) => path === '/reception'
    },
    { 
      name: "Patient Directory", 
      href: "/patients", 
      icon: Users,
      isActive: (path: string) => path === '/patients'
    },
    { 
      name: "Register New Patient", 
      href: "/patients/register", 
      icon: UserPlus,
      isActive: (path: string) => path === '/patients/register'
    },
    { 
      name: "Appointments Queue", 
      href: "/reception/appointments", 
      icon: Calendar,
      isActive: (path: string) => path.startsWith('/reception/appointments')
    },
    { 
      name: "Assign Doctor & Triage", 
      href: "/reception/assign-doctor", 
      icon: UserCheck,
      isActive: (path: string) => path.startsWith('/reception/assign')
    },
  ];

  const myPortalMenuItems = [
    { 
      name: "Request Leave", 
      href: "/staff/request-leave", 
      icon: Calendar,
      isActive: (path: string) => path.startsWith('/staff/request-leave')
    },
    { 
      name: "Clock In / Out", 
      href: "/staff/clock-in", 
      icon: Clock,
      isActive: (path: string) => path.startsWith('/staff/clock-in')
    },
    isLocum 
      ? { name: "My Locum Claims", href: "/doctor/my-claims", icon: Wallet, isActive: (path: string) => path.startsWith('/doctor/my-claims') } 
      : { name: "My Payslips", href: "/staff/payslips", icon: Wallet, isActive: (path: string) => path.startsWith('/staff/payslips') },
    { 
      name: "My CPD", 
      href: "/staff/my-cpd", 
      icon: GraduationCap,
      isActive: (path: string) => path.startsWith('/staff/my-cpd')
    },
    { 
      name: "My Performance", 
      href: "/staff/my-performance", 
      icon: Award,
      isActive: (path: string) => path.startsWith('/staff/my-performance')
    },
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

  const userName = user?.displayName || userProfile?.fullName || 'Jessica Bansah';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'JB';

  return (
    <aside className="w-64 h-screen bg-slate-950 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 hidden md:flex shadow-2xl relative">
      
      {/* 1. GAM MED RECEPTION HEADER */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-500/30 text-indigo-400 shadow-inner">
            <Building2 size={20} />
          </div>
          <div>
            <span className="font-black text-white text-lg tracking-tight uppercase italic block">GAM MED</span>
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">RECEPTION & OPD</span>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION SECTIONS */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        
        {/* Section 1: FRONT DESK & RECEPTION (Top Priority) */}
        <div>
          <h3 className="text-[10px] font-black text-slate-500 tracking-widest px-3 mb-2 uppercase">
            FRONT DESK & RECEPTION
          </h3>
          <div className="space-y-1">
            {frontDeskMenuItems.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all group ${
                    active 
                      ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-900/40 border-l-4 border-blue-300' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white font-semibold'
                  }`}
                >
                  <item.icon size={18} className={active ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                  <span className="text-xs">{item.name}</span>
                  {active && <ChevronRight size={14} className="ml-auto text-white" />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Section 2: MY PORTAL (Staff Workspace) */}
        <div>
          <h3 className="text-[10px] font-black text-slate-500 tracking-widest px-3 mb-2 uppercase">
            MY PORTAL (STAFF WORKSPACE)
          </h3>
          <div className="space-y-1">
            {myPortalMenuItems.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all group ${
                    active 
                      ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-900/40 border-l-4 border-blue-300' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white font-semibold'
                  }`}
                >
                  <item.icon size={18} className={active ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                  <span className="text-xs">{item.name}</span>
                  {active && <ChevronRight size={14} className="ml-auto text-white" />}
                </Link>
              );
            })}
          </div>
        </div>

      </nav>

      {/* 3. EXECUTIVE USER FOOTER CARD */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-700/60 flex items-center justify-center font-black text-xs text-indigo-400 shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate uppercase">{userName}</p>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">{userRole}</p>
          </div>
          <button 
            onClick={handleLogout} 
            title="Sign Out"
            className="text-slate-400 hover:text-red-400 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-800"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
