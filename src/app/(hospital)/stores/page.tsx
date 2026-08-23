'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Warehouse, Truck, Package, FileCheck2, 
  AlertTriangle, Boxes, Clock, CheckCircle2, 
  ArrowRight, ShieldCheck, DollarSign, Calendar,
  Layers, MapPin, AlertCircle, ShoppingCart
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';

export default function StoresCommandCenterPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userDocRef);

  const managerName = userProfile?.name || user?.displayName || 'Richard Kyei';

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      
      {/* 1. Executive Dark Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Warehouse Operations
              </span>
              <span className="text-xs text-slate-400 font-mono">
                • Segregation of Duties (SoD) Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
              Warehouse & Stores Command Center
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl font-medium">
              Physical inventory intake, bin location spatial tracking, FEFO batch management, and ward distribution gateway for <strong className="text-white">{managerName}</strong> (Store Manager).
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              type="button"
              onClick={() => router.push('/stores/grn/new')}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Truck className="w-4 h-4" /> RECEIVE DELIVERY (GRN) &rarr;
            </button>
          </div>
        </div>

        {/* 4-Card Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 relative z-10 font-mono">
          
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Warehouse Stock Value
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              ₵ 485,200.00
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Warehouse className="w-3.5 h-3.5 text-emerald-400" />
              <span>Asset Account #1300</span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Pending Dock Deliveries
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1">
              3 Inbound
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span>From Approved POs</span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Pending Ward Requisitions
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              4 Requests
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Awaiting Dispatch Release</span>
            </div>
          </div>

          <div className="bg-rose-950/40 rounded-xl p-4 border border-rose-800/60">
            <div className="text-xs font-medium text-rose-300 uppercase tracking-wider font-sans">
              FEFO Near-Expiry (&lt;90d)
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              2 Batches
            </div>
            <div className="text-xs text-rose-300/80 mt-1 flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Priority Floor Dispatch</span>
            </div>
          </div>

        </div>

      </div>

      {/* 2. Operational Quick-Launch Zone Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Goods Receipt & Intake */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20 w-fit">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Goods Receipt Notes (GRN)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verify physical supplier deliveries, assign FEFO manufacturer batch & expiry dates, and map stock into storage bin locations.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Link 
              href="/stores/grn"
              className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              View GRN Registry &rarr;
            </Link>
            <Link 
              href="/stores/grn/new"
              className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase"
            >
              + Receive
            </Link>
          </div>
        </div>

        {/* Card 2: Spatial Inventory & Bin Counts */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="p-3 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-500/20 w-fit">
              <Warehouse className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Bin & Stock Locations
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Real-time spatial inventory mapped across Cold Rooms (2°C - 8°C), Central Shelves, Surgical Bins, and Controlled Narcotics Safes.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link 
              href="/stores/inventory"
              className="text-xs font-black uppercase text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              Manage Bin Locations &rarr;
            </Link>
          </div>
        </div>

        {/* Card 3: Ward Requisitions & Floor Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20 w-fit">
              <Boxes className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Ward Floor Requisitions
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Review and approve internal consumable and drug requests raised by Nurse In-Charges across Male Ward, Female Ward, and Theatre.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link 
              href="/stores/requisitions"
              className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              Fulfill Requisitions &rarr;
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
