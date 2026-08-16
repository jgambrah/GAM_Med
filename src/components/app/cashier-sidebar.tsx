'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  CreditCard, Wallet, Receipt, RefreshCw, FileText, 
  RotateCcw, Timer, CalendarMinus, Banknote, LogOut, 
  ChevronRight, Landmark, BadgePercent, CircleDollarSign
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { autoClockOutIfNeeded } from '@/lib/attendance';

export function CashierSidebar() {
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

  // Strictly Cashier-Relevant Point of Sale & Revenue Collection Navigation
  const navSections = [
    {
      title: "POINT OF SALE",
      links: [
        { name: "Billing Console", href: "/finance/billing", icon: CreditCard },
        { name: "Till Management", href: "/finance/till-management", icon: Wallet },
        { name: "Shift Queries & Audit", href: "/finance/queries", icon: RefreshCw },
      ]
    },
    {
      title: "RECEIPTS & RECORDS",
      links: [
        { name: "Transaction Reports", href: "/finance/reports", icon: Receipt },
        { name: "Tariffs & Payer Registry", href: "/finance/registry-view", icon: BadgePercent },
      ]
    },
    {
      title: "MY PORTAL",
      links: [
        { name: "Clock In / Out", href: "/staff/clock-in", icon: Timer },
        { name: "Request Leave", href: "/staff/request-leave", icon: CalendarMinus },
        { name: "My Payslips", href: "/staff/payslips", icon: Banknote },
      ]
    }
  ];

  const handleLogout = async () => {
    if (auth && firestore && user?.uid) {
      await autoClockOutIfNeeded(user.uid, firestore, userProfile);
    }
    if (auth) {
      await signOut(auth);
      router.replace('/');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'PA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-300 flex flex-col shadow-2xl border-r border-slate-800 shrink-0 select-none">
      
      {/* 1. GAM Med Header */}
      <div className="p-6 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <CircleDollarSign className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">GAM MED</h1>
            <span className="bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest">
              Cashier
            </span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Sections (Strictly POS & Cashiering) */}
      <div className="flex-1 overflow-y-auto py-6 space-y-7 scrollbar-thin scrollbar-thumb-slate-800">
        {navSections.map((section, idx) => (
          <div key={idx}>
            <h3 className="px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 font-mono">
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.links.map(link => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== '/finance/billing' && pathname.startsWith(link.href));
                                 
                return (
                  <li key={link.name}>
                    <Link href={link.href}>
                      <span className={`flex items-center justify-between px-6 py-2.5 text-xs font-semibold transition-all group ${
                        isActive 
                          ? 'bg-emerald-600/10 text-emerald-400 border-l-4 border-emerald-500 font-bold' 
                          : 'text-slate-400 border-l-4 border-transparent hover:bg-slate-800/60 hover:text-white'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                          <span>{link.name}</span>
                        </div>
                        {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-80" />}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* 3. Executive User Footer */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 transition-colors group">
          <div className="w-10 h-10 rounded-full bg-emerald-950 text-emerald-200 flex items-center justify-center font-bold border border-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors text-xs">
            {getInitials(userProfile?.fullName)}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">{userProfile?.fullName || 'Priscilla Adysei'}</p>
            <p className="text-[10px] text-slate-500 truncate font-mono">{userProfile?.staffNumber || user?.email || 'GAM/STF/26/0008'}</p>
          </div>
          <button 
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

    </aside>
  );
}

export default CashierSidebar;
