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
    title: "General Lab",
    items: [
      { name: "Diagnostic Queue", href: "/lab/queue", icon: LayoutDashboard },
      { name: "Patients Directory", href: "/patients", icon: Users },
      { name: "Test Menu Setup", href: "/lab/setup", icon: Settings },
    ]
  },
  {
    title: "Blood Bank",
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
    <aside className="w-64 h-screen bg-white text-slate-800 flex-col border-r border-slate-200 hidden md:flex">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Beaker size={20} className="text-primary" />
          </div>
          <span className="font-bold text-primary text-xl tracking-tight">Laboratory</span>
        </div>
        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
          Diagnostics & Analysis
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        {/* My Portal Menu Group */}
        <div className="mb-6">
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
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all group ${
                    isActive ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-100'
                  }`}
                >
                  <item.icon size={18} />
                  <span className="text-sm font-medium">{item.name}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-primary" />}
                </Link>
              );
            })}
          </div>
        </div>

        {menuGroups.map((group, idx) => (
          <div key={idx} className="mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 tracking-widest px-3 mb-2 uppercase">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all group ${
                      isActive ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-100'
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-sm font-medium">{item.name}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto text-primary" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-primary border border-slate-300">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{user?.displayName || 'User'}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-destructive cursor-pointer">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
