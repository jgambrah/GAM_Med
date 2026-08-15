'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Beaker, Settings, Droplets,
  LogOut, ChevronRight, Users,
  Calendar, Clock, Wallet, GraduationCap, Award
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { autoClockOutIfNeeded } from '@/lib/attendance';

const menuGroups = [
  {
    title: "GENERAL LAB",
    items: [
      { name: "Diagnostic Queue", href: "/lab/queue", icon: LayoutDashboard },
      { name: "Patients Directory", href: "/patients", icon: Users },
      { name: "Test Menu Setup", href: "/lab/setup", icon: Settings },
    ]
  },
  {
    title: "BLOOD BANK VAULT",
    items: [
      { name: "Pint Inventory", href: "/lab/blood-bank/inventory", icon: Droplets },
      { name: "Donor Registry", href: "/lab/blood-bank/donors", icon: Users },
    ]
  }
];

export function LabSidebar() {
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
  const userRole = userProfile?.role || 'LAB_TECH';

  const myPortalMenu = {
    title: "MY PORTAL",
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

  const userName = user?.displayName || userProfile?.fullName || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  return (
    <aside className="w-64 h-screen bg-slate-950 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 hidden md:flex shadow-2xl relative">
      
      {/* 1. BRANDING HEADER */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/20 p-2.5 rounded-xl border border-red-500/30 text-red-400">
            <Beaker size={20} />
          </div>
          <div>
            <span className="font-black text-white text-lg tracking-tight uppercase italic block">GAM MED</span>
            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest block">DIAGNOSTICS & BLOOD BANK</span>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION LINKS */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        
        {/* My Portal Menu Group */}
        <div>
          <h3 className="text-[10px] font-black text-slate-500 tracking-widest px-3 mb-2 uppercase">
            {myPortalMenu.title}
          </h3>
          <div className="space-y-1">
            {myPortalMenu.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                    isActive 
                      ? 'bg-slate-800 text-white font-bold border-l-4 border-indigo-500 shadow-sm' 
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <item.icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'} />
                  <span className="text-xs font-semibold">{item.name}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-indigo-400" />}
                </Link>
              );
            })}
          </div>
        </div>

        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="text-[10px] font-black text-slate-500 tracking-widest px-3 mb-2 uppercase">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/lab/queue' && pathname.startsWith(item.href));
                const isBloodBank = item.href.includes('blood-bank');
                
                const activeStyle = isBloodBank
                  ? 'bg-red-500/10 text-red-400 font-black border-l-4 border-red-500 shadow-sm'
                  : 'bg-slate-800 text-white font-bold border-l-4 border-indigo-500 shadow-sm';

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                      isActive 
                        ? activeStyle
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <item.icon size={18} className={isActive ? (isBloodBank ? 'text-red-400' : 'text-indigo-400') : 'text-slate-400 group-hover:text-white'} />
                    <span className="text-xs font-semibold">{item.name}</span>
                    {isActive && <ChevronRight size={14} className={`ml-auto ${isBloodBank ? 'text-red-400' : 'text-indigo-400'}`} />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 3. EXECUTIVE USER FOOTER CARD */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-red-400 shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate uppercase">{userName}</p>
            <p className="text-[9px] font-black text-red-400 uppercase tracking-wider">{userRole}</p>
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
