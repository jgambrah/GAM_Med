'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingCart, Truck, Package, 
  Building2, FileText, CheckCircle2, AlertTriangle, 
  Layers, Clock, Calendar, LogOut, ChevronRight,
  ShieldCheck, FileCheck2, ArrowRightLeft, Boxes, Plus,
  ClipboardList, ArrowDownRight, Warehouse, DollarSign, Wallet
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { autoClockOutIfNeeded } from '@/lib/attendance';

const menuGroups = [
  {
    title: "1. Sourcing & Orders",
    items: [
      { name: "Procurement Command", href: "/procurement", icon: LayoutDashboard },
      { name: "Purchase Orders (POs)", href: "/procurement/orders", icon: ShoppingCart },
      { name: "Issue New PO", href: "/procurement/orders/new", icon: Plus },
      { name: "Vendor Registry", href: "/procurement/vendors", icon: Building2 },
    ]
  },
  {
    title: "2. Warehouse & Stores",
    items: [
      { name: "Goods Receipt Notes (GRN)", href: "/procurement/grn", icon: FileCheck2 },
      { name: "Receive New Delivery", href: "/procurement/grn/new", icon: Truck },
      { name: "Bin & Stock Counts", href: "/procurement/inventory", icon: Warehouse },
      { name: "Expiry & Batch Tracking", href: "/procurement/expiry-tracking", icon: AlertTriangle },
    ]
  },
  {
    title: "3. Distributions & Accounts Bridge",
    items: [
      { name: "Ward Requisitions", href: "/procurement/requisitions", icon: ClipboardList },
      { name: "Pharmacy Restocking", href: "/procurement/pharmacy-restock", icon: Boxes },
      { name: "Stock Valuation (COGS)", href: "/procurement/valuation", icon: DollarSign },
      { name: "Disposal & Write-Offs", href: "/procurement/disposal", icon: Package },
    ]
  }
];

export function ProcurementSidebar() {
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
          <div className="bg-sky-500/10 p-2 rounded-xl border border-sky-500/20">
            <Truck size={20} className="text-sky-400" />
          </div>
          <span className="font-black text-white text-xl tracking-tight uppercase italic">Procurement</span>
        </div>
        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
          Supply Chain & Stores
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        
        {/* Core Procurement Menu Groups 1 - 3 */}
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="text-[10px] font-black text-slate-400 tracking-widest px-3 mb-2 uppercase">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/procurement' && pathname.startsWith(item.href));
                const IconComp = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-sky-600 text-white font-black shadow-lg shadow-sky-600/30' 
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
            {(userProfile?.name || user?.displayName || 'PO').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-none mb-1 truncate max-w-[110px]">
              {userProfile?.name || user?.displayName || 'Richard Kyei'}
            </div>
            <div className="text-[9px] font-black text-sky-400 uppercase tracking-wider leading-none">
              {userProfile?.role ? userProfile.role.replace(/_/g, ' ') : 'SUPPLY CHAIN'}
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
