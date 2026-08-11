'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, Truck, Building2,
  Settings, LogOut, ChevronRight, ChevronDown, Archive, ArrowUpRight,
  Calendar, Clock, Wallet, GraduationCap, Award, ClipboardList, Trash2,
  BedDouble, Users, AlertTriangle, FileText, ListChecks, ShieldAlert, Activity
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { autoClockOutIfNeeded } from '@/lib/attendance';

// Smart Operations Engine Menu Blueprint
const operationalMenuGroups = [
  {
    title: "Clinical Dispensing (The Frontline)",
    items: [
      { name: "Pharmacy Command Hub", href: "/pharmacy", icon: LayoutDashboard },
      { name: "Active Queue", href: "/pharmacy/dispensing", icon: ClipboardList },
      { name: "Ward Fulfillment", href: "/pharmacy/ward-fulfillment", icon: BedDouble },
      { name: "Patient Profiles", href: "/patients", icon: Users },
    ]
  },
  {
    title: "Inventory & Supply Chain (The Core)",
    items: [
      { name: "Stock Directory", href: "/pharmacy/inventory", icon: Package },
      { name: "Requisitions Registry", href: "/pharmacy/requisitions", icon: ClipboardList },
      { name: "New Requisition", href: "/requisitions/new", icon: ArrowUpRight },
      { name: "Expiry & Wastage (FEFO)", href: "/pharmacy/disposal", icon: AlertTriangle },
      { name: "Disposal Archive", href: "/supply-chain/disposal/logs", icon: Archive },
    ]
  },
  {
    title: "Financial & Shift Reconciliation",
    items: [
      { name: "Shift Reports", href: "/pharmacy/shift-reports", icon: FileText },
      { name: "Stock-Taking Sheet", href: "/pharmacy/stock-take", icon: ListChecks },
    ]
  }
];

export function PharmacySidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [isPortalExpanded, setIsPortalExpanded] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  const isLocum = userProfile?.contractType === 'LOCUM';

  const myPortalMenu = {
    title: "My Portal (Employee Tools)",
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
    <aside className="w-64 h-screen bg-slate-950 text-slate-100 flex-col border-r border-slate-800 hidden md:flex shrink-0">
      
      {/* BRANDING HEADER */}
      <div className="p-5 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
            <Package size={20} className="text-rose-500" />
          </div>
          <div>
            <span className="font-black text-white text-lg tracking-tight uppercase italic block leading-none">
              GAM Med
            </span>
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
              Pharmacy & Audit Engine
            </span>
          </div>
        </div>
      </div>

      {/* OPERATIONS NAVIGATION */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        
        {/* OPERATIONAL ENGINES (FRONTLINE, INVENTORY, RECONCILIATION) */}
        {operationalMenuGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="text-[9px] font-bold text-slate-400 tracking-widest px-3 mb-2 uppercase">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/pharmacy' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                      isActive 
                        ? 'bg-rose-600/15 text-rose-400 font-bold border border-rose-500/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <item.icon size={17} className={isActive ? 'text-rose-500' : 'text-slate-400 group-hover:text-slate-200'} />
                    <span className="text-xs font-medium">{item.name}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto text-rose-500" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* MY PORTAL (EMPLOYEE TOOLS - PLACED AT THE BOTTOM, COLLAPSIBLE) */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setIsPortalExpanded(!isPortalExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-widest transition cursor-pointer"
          >
            <span>{myPortalMenu.title}</span>
            {isPortalExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          {isPortalExpanded && (
            <div className="space-y-1 mt-1 pl-1">
              {myPortalMenu.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all group ${
                      isActive 
                        ? 'bg-indigo-600/15 text-indigo-400 font-bold border border-indigo-500/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <item.icon size={16} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
                    <span className="text-xs font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </nav>

      {/* USER FOOTER */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-rose-400 border border-slate-700">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.displayName || 'Shane Gambrah'}</p>
            <p className="text-[10px] text-slate-500 truncate">{userProfile?.role || 'Pharmacist'}</p>
          </div>
          <button 
            onClick={handleLogout} 
            title="Sign Out"
            className="text-slate-500 hover:text-rose-400 transition cursor-pointer p-1"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

    </aside>
  );
}
