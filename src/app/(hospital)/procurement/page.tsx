'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Truck, ShoppingCart, Package, Building2, 
  ArrowUpRight, CheckCircle2, Clock, AlertTriangle, 
  Plus, Search, ShieldCheck, FileCheck2, Filter,
  Warehouse, DollarSign, Wallet, FileText, ArrowDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function ProcurementDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // Demo Purchase Orders Data
  const demoPurchaseOrders = useMemo(() => [
    { id: 'PO-EC-0048', poNumber: 'PO-2026-0048', vendorName: 'Ernest Chemists Ltd', itemsCount: 14, totalAmount: 45000.00, status: 'APPROVED', directorApproval: 'APPROVED', date: '2026-08-20', grnStatus: 'RECEIVED' },
    { id: 'PO-TP-0049', poNumber: 'PO-2026-0049', vendorName: 'Tobinco Pharmaceuticals Ltd', itemsCount: 8, totalAmount: 12500.00, status: 'APPROVED', directorApproval: 'APPROVED', date: '2026-08-21', grnStatus: 'PENDING_DELIVERY' },
    { id: 'PO-MT-0050', poNumber: 'PO-2026-0050', vendorName: 'Multinec Medical Consumables', itemsCount: 22, totalAmount: 28400.00, status: 'PENDING_DIRECTOR', directorApproval: 'PENDING', date: '2026-08-22', grnStatus: 'AWAITING_PO_SIGN' },
    { id: 'PO-PP-0051', poNumber: 'PO-2026-0051', vendorName: 'Perkins Power Solutions Ghana', itemsCount: 3, totalAmount: 14000.00, status: 'APPROVED', directorApproval: 'APPROVED', date: '2026-08-19', grnStatus: 'RECEIVED' },
  ], []);

  // Demo GRN Receipts
  const demoGRNs = useMemo(() => [
    { id: 'GRN-EC-9912', grnNumber: 'GRN-2026-9912', poNumber: 'PO-2026-0048', vendorName: 'Ernest Chemists Ltd', value: 45000.00, receivedBy: 'Kofi Mensah (Store Mgr)', date: '2026-08-22', matchStatus: '3_WAY_MATCH_READY' },
    { id: 'GRN-PP-9913', grnNumber: 'GRN-2026-9913', poNumber: 'PO-2026-0051', vendorName: 'Perkins Power Solutions Ghana', value: 14000.00, receivedBy: 'Kofi Mensah (Store Mgr)', date: '2026-08-21', matchStatus: '3_WAY_MATCH_READY' },
  ], []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. Command Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-400">
                <Truck className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                PROCUREMENT & STORES COMMAND
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              PURCHASE ORDERS, WAREHOUSE GOODS RECEIPTS (GRN), STOCK BIN MANAGEMENT, AND 3-WAY MATCH FINANCIAL BRIDGE.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              type="button"
              onClick={() => router.push('/procurement/grn/new')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-2"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-400" /> RECEIVE DELIVERY (GRN)
            </button>
            <button 
              type="button"
              onClick={() => router.push('/procurement/orders/new')}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> ISSUE PURCHASE ORDER
            </button>
          </div>
        </div>

        {/* Telemetry KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 font-mono">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Open Commitments</span>
              <div className="text-2xl font-black text-sky-400">₵ 99,900.00</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block font-sans">4 Active POs</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Stock Valuation</span>
              <div className="text-2xl font-black text-emerald-400">₵ 142,000.00</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block font-sans">Warehouse Inventory</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Warehouse className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Pending Delivery</span>
              <div className="text-2xl font-black text-amber-400">1 Order</div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 block font-sans">Tobinco (₵12,500)</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">3-Way Match Ready</span>
              <div className="text-2xl font-black text-emerald-400">2 Invoices</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block font-sans">Pushed to AP Queue</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Operational Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Purchase Orders (POs) Deck */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Active Purchase Orders (POs)
              </h2>
            </div>
            <button 
              type="button" 
              onClick={() => router.push('/procurement/orders')}
              className="text-[10px] font-black text-sky-600 hover:text-sky-700 uppercase"
            >
              View All Orders &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {demoPurchaseOrders.map(po => (
              <div key={po.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900 dark:text-slate-100">{po.poNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                      po.directorApproval === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      Director: {po.directorApproval}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-bold block">{po.vendorName} ({po.itemsCount} Items)</span>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                    ₵ {po.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{po.grnStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warehouse Delivery Receipts (GRN) Deck */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Goods Received Notes (GRN) — AP Bridge
              </h2>
            </div>
            <button 
              type="button" 
              onClick={() => router.push('/procurement/grn')}
              className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase"
            >
              View All GRNs &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {demoGRNs.map(grn => (
              <div key={grn.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{grn.grnNumber}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Ref: {grn.poNumber}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-bold block">{grn.vendorName}</span>
                  <span className="text-[9px] text-slate-400">Intake: {grn.receivedBy}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                    ₵ {grn.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-2.5 h-2.5" /> 3-Way Match Ready
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
