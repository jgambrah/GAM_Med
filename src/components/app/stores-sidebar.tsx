'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Truck, Package, 
  FileText, CheckCircle2, AlertTriangle, 
  Layers, Clock, Calendar, LogOut, ChevronRight,
  ShieldCheck, FileCheck2, Boxes, Plus,
  ClipboardList, Warehouse, DollarSign, Wallet
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { autoClockOutIfNeeded } from '@/lib/attendance';

const menuGroups = [
  {
    title: "1. Warehouse & Intake",
    items: [
      { name: "Warehouse Command", href: "/stores", icon: LayoutDashboard },
      { name: "Goods Receipt Notes (GRN)", href: "/stores/grn", icon: FileCheck2 },
      { name: "Receive New Delivery", href: "/stores/grn/new", icon: Truck },
    ]
  },
  {
    title: "2. Inventory & FEFO",
    items: [
      { name: "Bin & Stock Counts", href: "/stores/inventory", icon: Warehouse },
      { name: "Expiry & Batch Tracking", href: "/stores/expiry-tracking", icon: AlertTriangle },
      { name: "Pharmacy Restocking", href: "/stores/pharmacy-restock", icon: Boxes },
    ]
  },
  {
    title: "3. Internal Distributions",
    items: [
      { name: "Ward Requisitions", href: "/stores/requisitions", icon: ClipboardList },
      { name: "Stock Valuation (COGS)", href: "/stores/valuation", icon: DollarSign },
      { name: "Disposal & Write-Offs", href: "/stores/disposal", icon: Package },
    ]
  }
];

export function StoresSidebar() {
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

  const myPortalMenu = {
    title: "4. My Portal (HR & Self-Service)",
    items: [
       { name: "Request Leave", href: "/staff/request-leave", icon: Calendar },
       { name: "Clock In / Out", href: "/staff/clock-in", icon: Clock },
       { name: "My Payslips", href: "/staff/payslips", icon: Wallet },
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
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
            <Warehouse className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-wider uppercase text-white">
              GAM Med Stores
            </h2>
            <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">
              Warehouse & Inventory
            </p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        
        {/* Core Stores Menu Groups 1 - 3 */}
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="text-[10px] font-black text-slate-400 tracking-widest px-3 mb-2 uppercase">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/stores' && pathname.startsWith(item.href));
                const IconComp = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-emerald-600 text-white font-black shadow-lg shadow-emerald-600/30' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComp size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <ChevronRight size={14} className="text-white" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* My Portal Self-Service */}
        <div>
          <h3 className="text-[10px] font-black text-slate-400 tracking-widest px-3 mb-2 uppercase">
            {myPortalMenu.title}
          </h3>
          <div className="space-y-1">
            {myPortalMenu.items.map((item) => {
              const isActive = pathname === item.href;
              const IconComp = item.icon;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-slate-800 text-white font-black shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight size={14} className="text-white" />}
                </Link>
              );
            })}
          </div>
        </div>

      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-white">
            {(userProfile?.name || user?.displayName || 'SM').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-none mb-1 truncate max-w-[110px]">
              {userProfile?.name || user?.displayName || 'Richard Kyei'}
            </div>
            <div className="text-[9px] font-black text-emerald-400 uppercase tracking-wider leading-none">
              STORE MANAGER
            </div>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>

    </aside>
  );
}
