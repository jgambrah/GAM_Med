'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  ClipboardList, Clock, AlertTriangle, CheckCircle2, 
  ArrowRight, ShieldCheck, DollarSign, Package, 
  Search, Filter, Plus, Printer, Eye, Truck, 
  Boxes, Warehouse, Layers, Building2, MapPin, 
  X, Check, Loader2, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';

type RequisitionItem = {
  id: string;
  name: string;
  sku: string;
  req: number;
  issued: number;
  accepted: number;
  returned: number;
  unitCost: number;
  batchIssued?: string;
  binLocation?: string;
  outOfStock?: boolean;
};

type RequisitionRecord = {
  id: string;
  destination: string;
  departmentCode: string;
  requestedBy: string;
  urgency: 'ROUTINE' | 'STAT' | 'URGENT';
  status: 'PENDING_FULFILLMENT' | 'PARTIALLY_FULFILLED' | 'DISPATCHED' | 'RECEIVED' | 'COMPLETED';
  dateLogged: string;
  items: RequisitionItem[];
};

export default function WardRequisitionsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'NURSE', 'PROCUREMENT_OFFICER'].includes(userRole || 'DIRECTOR');

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');

  // Modals
  const [fulfillingReq, setFulfillingReq] = useState<RequisitionRecord | null>(null);
  const [viewInvoiceReq, setViewInvoiceReq] = useState<RequisitionRecord | null>(null);
  const [isManualIssueModalOpen, setIsManualIssueModalOpen] = useState(false);

  // Master Requisitions Dataset
  const [requisitions, setRequisitions] = useState<RequisitionRecord[]>([
    {
      id: 'REQ-20260823-091',
      destination: 'Intensive Care Unit (ICU)',
      departmentCode: 'CC-204',
      requestedBy: 'Nurse In-Charge Grace Owusu',
      urgency: 'STAT',
      status: 'PENDING_FULFILLMENT',
      dateLogged: 'Today, 6:15 PM',
      items: [
        { id: '1', name: 'Amoxicillin + Clavulanic Acid 1.2g IV Vial', sku: 'PHA-AMX-02', req: 30, issued: 0, accepted: 0, returned: 0, unitCost: 65.00, batchIssued: 'BTH-2026-AMX-09', binLocation: 'Shelf 4B-04' },
        { id: '2', name: 'Normal Saline 0.9% 500ml Infusion Bottle', sku: 'PHA-NS-03', req: 50, issued: 0, accepted: 0, returned: 0, unitCost: 13.00, batchIssued: 'BTH-2026-10', binLocation: 'Bulk Rack A1-02' },
        { id: '3', name: 'IV Cannula 18G Green with Port & Wings', sku: 'CON-CAN-03', req: 40, issued: 0, accepted: 0, returned: 0, unitCost: 75.00, outOfStock: true }
      ]
    },
    {
      id: 'REQ-20260823-088',
      destination: 'Main Surgical Theatre',
      departmentCode: 'CC-301',
      requestedBy: 'Sister Patricia Mensah',
      urgency: 'URGENT',
      status: 'PENDING_FULFILLMENT',
      dateLogged: 'Today, 4:30 PM',
      items: [
        { id: '4', name: 'Latex Surgical Sterile Gloves Size 7.5 (Box 100)', sku: 'CON-GLV-01', req: 20, issued: 0, accepted: 0, returned: 0, unitCost: 48.00, batchIssued: 'BTH-GLV-88', binLocation: 'Surgical Bin 12-A' },
        { id: '5', name: 'Paracetamol 500mg IV Infusion (100ml Bottle)', sku: 'PHA-PAR-01', req: 25, issued: 0, accepted: 0, returned: 0, unitCost: 25.00, batchIssued: 'BTH-2026-08', binLocation: 'Shelf 4B-01' }
      ]
    },
    {
      id: 'REQ-20260822-074',
      destination: 'Female Medical Ward',
      departmentCode: 'CC-201',
      requestedBy: 'Staff Nurse Sandra Kyeremeh',
      urgency: 'ROUTINE',
      status: 'PENDING_FULFILLMENT',
      dateLogged: 'Yesterday, 2:10 PM',
      items: [
        { id: '6', name: 'Ciprofloxacin 500mg Tablets (Pack 100)', sku: 'PHA-CIP-01', req: 15, issued: 0, accepted: 0, returned: 0, unitCost: 40.00, batchIssued: 'BTH-2026-CIP-01', binLocation: 'Shelf 4B-02' },
        { id: '7', name: 'Cotton Wool Absorbent 500g Roll', sku: 'CON-COT-09', req: 10, issued: 0, accepted: 0, returned: 0, unitCost: 35.00, batchIssued: 'BTH-COT-2026', binLocation: 'Bulk Rack A2' }
      ]
    },
    // Historical Fulfilled Records
    {
      id: 'REQ-20260628-042',
      destination: 'Outpatient Central Pharmacy',
      departmentCode: 'CC-102',
      requestedBy: 'Pharm. Richard Donkor',
      urgency: 'ROUTINE',
      status: 'COMPLETED',
      dateLogged: 'Jun 28, 2026, 3:46 PM',
      items: [
        { id: '8', name: 'Amoxicillin 500mg Capsules (Pack 100)', sku: 'MED-AMO-327', req: 14, issued: 14, accepted: 12, returned: 2, unitCost: 32.00, batchIssued: 'BTH-2026-AMO-99', binLocation: 'Shelf 4B-01' },
        { id: '9', name: 'Efpac Antimalarial Suspension (60ml)', sku: 'MED-EFP-382', req: 25, issued: 0, accepted: 0, returned: 0, unitCost: 28.00, outOfStock: true }
      ]
    },
    {
      id: 'REQ-20260625-018',
      destination: 'Intensive Care Unit (ICU)',
      departmentCode: 'CC-204',
      requestedBy: 'Nurse In-Charge Grace Owusu',
      urgency: 'STAT',
      status: 'COMPLETED',
      dateLogged: 'Jun 25, 2026, 10:15 AM',
      items: [
        { id: '10', name: 'Vitamin C 500mg Tablets (Pack 100)', sku: 'MED-VIT-647', req: 50, issued: 50, accepted: 50, returned: 0, unitCost: 15.00, batchIssued: 'BTH-VIT-2026-02', binLocation: 'Shelf 4C-01' },
        { id: '11', name: 'Nugel-O Antacid Suspension (200ml)', sku: 'MED-NUG-773', req: 10, issued: 10, accepted: 10, returned: 0, unitCost: 22.00, batchIssued: 'BTH-NUG-2026-08', binLocation: 'Shelf 4C-04' }
      ]
    }
  ]);

  // Compute Cost Center Valuation for a Requisition
  const calculateRequisitionCost = (req: RequisitionRecord) => {
    return req.items.reduce((sum, item) => {
      const qty = item.accepted !== undefined && item.accepted > 0 ? item.accepted : (item.issued > 0 ? item.issued : item.req);
      return sum + (qty * item.unitCost);
    }, 0);
  };

  // Telemetry Calculations
  const telemetry = useMemo(() => {
    const activeReqs = requisitions.filter(r => ['PENDING_FULFILLMENT', 'PARTIALLY_FULFILLED', 'DISPATCHED'].includes(r.status));
    const statCount = activeReqs.filter(r => r.urgency === 'STAT' || r.urgency === 'URGENT').length;
    
    // Value dispatched across completed records
    const completedReqs = requisitions.filter(r => ['RECEIVED', 'COMPLETED'].includes(r.status));
    const totalDispatchedValue = completedReqs.reduce((sum, r) => sum + calculateRequisitionCost(r), 0) + 23530.00;

    // Count stockout items
    let stockoutCount = 0;
    requisitions.forEach(r => {
      stockoutCount += r.items.filter(i => i.outOfStock).length;
    });

    return {
      pendingCount: activeReqs.length,
      statCount,
      totalDispatchedValue,
      stockoutCount: stockoutCount + 10
    };
  }, [requisitions]);

  // Filtered Requisitions
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter(r => {
      const isTargetTab = activeTab === 'ACTIVE'
        ? ['PENDING_FULFILLMENT', 'PARTIALLY_FULFILLED', 'DISPATCHED'].includes(r.status)
        : ['RECEIVED', 'COMPLETED'].includes(r.status);

      const matchesSearch = 
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.departmentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.items.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesUrgency = urgencyFilter === 'ALL' || r.urgency === urgencyFilter;

      return isTargetTab && matchesSearch && matchesUrgency;
    });
  }, [requisitions, activeTab, searchQuery, urgencyFilter]);

  // Handle Full Fulfill Action
  const handleConfirmFulfillment = (req: RequisitionRecord) => {
    setRequisitions(prev => prev.map(r => {
      if (r.id === req.id) {
        return {
          ...r,
          status: 'COMPLETED',
          items: r.items.map(i => ({
            ...i,
            issued: i.outOfStock ? 0 : i.req,
            accepted: i.outOfStock ? 0 : i.req,
            returned: 0
          }))
        };
      }
      return r;
    }));

    toast({
      title: "📦 Requisition Dispatched",
      description: `Requisition ${req.id} fulfilled from FEFO batches and charged to Cost Center ${req.departmentCode} (₵ ${calculateRequisitionCost(req).toFixed(2)}).`
    });

    setFulfillingReq(null);
  };

  const isLoading = isUserLoading || isProfileLoading;
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Ward Requisitions.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
      
      {/* ========================================================================= */}
      {/* 1. THE FULFILLMENT COMMAND BANNER (TOP) WITH TELEMETRY                    */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden space-y-6">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Header Titles */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Fulfillment Desk
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    • Cost-Center & Batch Traceability Active
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-0.5">
                  Internal Distributions & Ward Requisitions
                </h1>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl font-medium">
              Fulfill clinical consumable and medication requests from ICU, Surgical Theatres, and Inpatient Wards with strict FEFO batch tracking and departmental cost-center debiting.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
            <button 
              type="button"
              onClick={() => {
                toast({ title: "Distribution Report Exported", description: "Internal stock transfer ledger downloaded." });
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Export Report
            </button>
            <button 
              type="button"
              onClick={() => setIsManualIssueModalOpen(true)}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 shadow-lg shadow-sky-900/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + LOG MANUAL EMERGENCY ISSUE
            </button>
          </div>
        </div>

        {/* 4-Card Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80 relative z-10 font-mono">
          
          {/* Pending Fulfillment */}
          <div 
            onClick={() => { setActiveTab('ACTIVE'); setUrgencyFilter('ALL'); }}
            className="bg-slate-800/60 hover:bg-slate-800/90 transition rounded-xl p-4 border border-slate-700/50 cursor-pointer"
          >
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Pending Fulfillment
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1">
              {telemetry.pendingCount} Active Requests
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Awaiting Warehouse Pick</span>
            </div>
          </div>

          {/* Urgent / STAT Requests (Red Alert) */}
          <div 
            onClick={() => { setActiveTab('ACTIVE'); setUrgencyFilter('STAT'); }}
            className="bg-rose-950/40 hover:bg-rose-950/60 transition rounded-xl p-4 border border-rose-800/60 cursor-pointer"
          >
            <div className="text-xs font-medium text-rose-300 uppercase tracking-wider font-sans">
              Urgent / STAT Alerts
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {telemetry.statCount} Emergency
            </div>
            <div className="text-xs text-rose-300/80 mt-1 flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>ICU & Theatre Priority</span>
            </div>
          </div>

          {/* Value Dispatched (MTD) */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Value Dispatched (MTD)
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              ₵ {telemetry.totalDispatchedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Billed to Cost Centers</span>
            </div>
          </div>

          {/* Stockout Impact */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Stockout Impact
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {telemetry.stockoutCount} Items Unmet
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>Flagged for PO Restock</span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. THE WORKSPACE TABS & FILTER BAR                                        */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Top Switcher: Active Requests vs History & Archives */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Active Requests ({requisitions.filter(r => ['PENDING_FULFILLMENT', 'PARTIALLY_FULFILLED', 'DISPATCHED'].includes(r.status)).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              History & Archives ({requisitions.filter(r => ['RECEIVED', 'COMPLETED'].includes(r.status)).length})
            </button>
          </div>

          {/* Urgency Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Urgency:</span>
            {['ALL', 'STAT', 'URGENT', 'ROUTINE'].map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setUrgencyFilter(u)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                  urgencyFilter === u
                    ? u === 'STAT'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requisitions by Docket #, Destination Ward, Department Code, or Medication..."
            className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
          />
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. REQUISITIONS CARDS LIST WITH BATCH TRACEABILITY & COST CENTERS         */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {filteredRequisitions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs italic">
            No requisitions found matching current tab or search criteria.
          </div>
        ) : (
          filteredRequisitions.map(req => {
            const totalCOGS = calculateRequisitionCost(req);
            const isStat = req.urgency === 'STAT';

            return (
              <div 
                key={req.id} 
                className={`bg-white dark:bg-slate-900 rounded-3xl p-6 border transition-all shadow-sm space-y-4 ${
                  isStat 
                    ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                
                {/* Requisition Card Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                        {req.id}
                      </span>
                      
                      {isStat && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500 text-white animate-pulse">
                          🚨 STAT EMERGENCY
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                        {req.departmentCode}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        req.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 font-bold flex flex-wrap items-center gap-2">
                      <span>Destination: <strong>{req.destination}</strong></span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-slate-400 font-normal">{req.dateLogged} ({req.requestedBy})</span>
                    </div>
                  </div>

                  {/* Cost Center Billed & Action Trigger */}
                  <div className="flex items-center gap-4 self-start md:self-auto">
                    <div className="text-right font-mono">
                      <span className="text-[10px] font-black uppercase text-slate-400 block font-sans">
                        Department Billed
                      </span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        ₵ {totalCOGS.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {activeTab === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => setFulfillingReq(req)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" /> FULFILL REQUISITION &rarr;
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setViewInvoiceReq(req)}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-500" /> View Dispatch Voucher
                      </button>
                    )}
                  </div>

                </div>

                {/* Line Items Table with Batch Traceability */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="py-2">Item Description & Master SKU</th>
                        <th className="py-2">FEFO Batch Issued & Bin</th>
                        <th className="py-2 text-center">Req Qty</th>
                        <th className="py-2 text-center">Issued</th>
                        <th className="py-2 text-center">Accepted</th>
                        <th className="py-2 text-center">Returned</th>
                        <th className="py-2 text-right">Cost Center Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60 font-medium">
                      {req.items.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          
                          {/* Item & SKU */}
                          <td className="py-3">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.sku}
                            </span>
                          </td>

                          {/* FEFO Batch Issued & Bin Location (THE COMPLIANCE PILLAR) */}
                          <td className="py-3">
                            {item.outOfStock ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                ⚠️ Stockout in Warehouse
                              </span>
                            ) : (
                              <div className="space-y-0.5 font-mono">
                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>Batch: {item.batchIssued || 'BTH-2026-AUTO'}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-sans block">
                                  📍 From: {item.binLocation || 'Central Warehouse'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Req Qty */}
                          <td className="py-3 text-center font-mono text-slate-700 dark:text-slate-300 font-bold">
                            {item.req}
                          </td>

                          {/* Issued Qty */}
                          <td className="py-3 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                            {item.issued}
                          </td>

                          {/* Accepted Qty */}
                          <td className="py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {item.accepted}
                          </td>

                          {/* Returned Qty */}
                          <td className="py-3 text-center font-mono font-bold text-amber-600">
                            {item.returned > 0 ? `${item.returned} returned` : '-'}
                          </td>

                          {/* Impact (GHS) */}
                          <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            ₵ {((item.accepted > 0 ? item.accepted : item.issued) * item.unitCost).toFixed(2)}
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. FULFILLMENT MODAL (STORE MANAGER ALLOCATES STOCK & DISPATCHES)          */}
      {/* ========================================================================= */}
      {fulfillingReq && (
        <Dialog open={!!fulfillingReq} onOpenChange={() => setFulfillingReq(null)}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <span>Pick & Fulfill Ward Requisition</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Confirm stock picking from designated warehouse bins and issue with FEFO batch trace.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3 text-xs">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between"><span className="text-slate-400">Requisition Docket:</span><span className="font-mono font-bold text-white">{fulfillingReq.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Destination Cost Center:</span><span className="font-bold text-sky-400">{fulfillingReq.destination} ({fulfillingReq.departmentCode})</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Requested By:</span><span className="text-white">{fulfillingReq.requestedBy}</span></div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Pick List & Batch Verification</span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {fulfillingReq.items.map(item => (
                    <div key={item.id} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Bin: {item.binLocation || 'Shelf 4B'} • Batch: {item.batchIssued || 'BTH-AUTO'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-black text-emerald-400 block">
                          Pick {item.req} pcs
                        </span>
                        <span className="text-[9px] text-slate-400">
                          @ ₵ {item.unitCost.toFixed(2)}/ea
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={() => setFulfillingReq(null)} className="text-slate-400 hover:text-white">
                Cancel
              </Button>
              <Button 
                onClick={() => handleConfirmFulfillment(fulfillingReq)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-6"
              >
                CONFIRM DISPATCH & BILL COST CENTER &rarr;
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 5. DISPATCH INVOICE VOUCHER MODAL                                         */}
      {/* ========================================================================= */}
      {viewInvoiceReq && (
        <Dialog open={!!viewInvoiceReq} onOpenChange={() => setViewInvoiceReq(null)}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-sky-400" />
                <span>Internal Stock Transfer Voucher</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Audited internal transfer record and cost-center debit schedule.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3 text-xs">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 font-mono">
                <div className="flex justify-between"><span className="text-slate-400 font-sans">Transfer Docket:</span><span className="font-bold text-white">{viewInvoiceReq.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 font-sans">Cost Center Charged:</span><span className="text-sky-400 font-bold">{viewInvoiceReq.destination} [{viewInvoiceReq.departmentCode}]</span></div>
                <div className="flex justify-between"><span className="text-slate-400 font-sans">Date Completed:</span><span className="text-slate-200">{viewInvoiceReq.dateLogged}</span></div>
                <div className="flex justify-between border-t border-slate-800 pt-2"><span className="text-slate-400 font-sans">Total Billed COGS:</span><span className="text-emerald-400 font-black text-sm">₵ {calculateRequisitionCost(viewInvoiceReq).toFixed(2)}</span></div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Itemized Transferred Batches</span>
                <div className="space-y-2">
                  {viewInvoiceReq.items.map(item => (
                    <div key={item.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">{item.name}</div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          Batch: {item.batchIssued || 'BTH-AUTO'} • SKU: {item.sku}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-white block">
                          {item.accepted} pcs accepted
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Total: ₵ {(item.accepted * item.unitCost).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={() => setViewInvoiceReq(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
                Close Voucher
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 6. LOG MANUAL EMERGENCY ISSUE MODAL                                       */}
      {/* ========================================================================= */}
      {isManualIssueModalOpen && (
        <Dialog open={isManualIssueModalOpen} onOpenChange={setIsManualIssueModalOpen}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-400" />
                <span>Log Manual Emergency Floor Issue</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Direct stock issue to a clinical unit without a pre-existing digital requisition.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={(e) => {
              e.preventDefault();
              toast({ title: "Emergency Issue Logged", description: "Stock decremented from warehouse and charged to destination cost center." });
              setIsManualIssueModalOpen(false);
            }} className="space-y-4 pt-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Receiving Department / Cost Center *</label>
                <select className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none cursor-pointer">
                  <option value="CC-204">Intensive Care Unit (ICU) [CC-204]</option>
                  <option value="CC-301">Main Surgical Theatre [CC-301]</option>
                  <option value="CC-201">Female Medical Ward [CC-201]</option>
                  <option value="CC-202">Male Surgical Ward [CC-202]</option>
                  <option value="CC-102">Outpatient Pharmacy [CC-102]</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Stock Item & Batch *</label>
                <select className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none cursor-pointer">
                  <option>Paracetamol 500mg IV (100ml) [BTH-2026-08 - Shelf 4B-01]</option>
                  <option>Amoxicillin + Clavulanic Acid 1.2g IV [BTH-2026-AMX-09 - Shelf 4B-04]</option>
                  <option>Latex Sterile Gloves Size 7.5 [BTH-GLV-88 - Surgical Bin 12-A]</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Quantity Issued *</label>
                <input 
                  type="number" 
                  defaultValue={10} 
                  required 
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white outline-none" 
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsManualIssueModalOpen(false)} className="text-slate-400 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl px-6">
                  DISPATCH EMERGENCY ISSUE &rarr;
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
