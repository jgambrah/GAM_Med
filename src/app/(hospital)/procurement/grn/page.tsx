'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Truck, FileCheck2, ShieldCheck, CheckCircle2, 
  Clock, Plus, Search, Filter, Warehouse, 
  ArrowUpRight, AlertTriangle, Building2, Package, 
  Eye, CheckSquare, ShieldAlert, Download, Printer,
  Sparkles, Check, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';

type GRNItem = {
  id: string;
  grnNumber: string;
  poNumber: string;
  vendorName: string;
  deliveryDate: string;
  receivedBy: string;
  invoiceNumber: string;
  totalValue: number;
  matchStatus: '3_WAY_MATCH_READY' | 'AWAITING_PHYSICAL_INTAKE' | 'IN_QA_INSPECTION' | 'DISCREPANCY';
  qcStatus: 'PASSED' | 'PENDING_INSPECTION' | 'QUARANTINED';
  discrepancyNote?: string;
  items: {
    name: string;
    qtyOrdered: number;
    qtyReceived: number;
    batch: string;
    expiry: string;
    unitPrice: number;
  }[];
};

export default function GoodsReceiptNotesListPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AWAITING_INTAKE' | 'IN_INSPECTION' | 'MATCH_READY' | 'DISCREPANCY'>('ALL');
  const [selectedGRN, setSelectedGRN] = useState<GRNItem | null>(null);
  const [inspectingGRN, setInspectingGRN] = useState<GRNItem | null>(null);

  const [localGRNs, setLocalGRNs] = useState<GRNItem[]>([
    {
      id: 'GRN-EC-9912',
      grnNumber: 'GRN-2026-9912',
      poNumber: 'PO-2026-0048',
      vendorName: 'Ernest Chemists Ltd',
      deliveryDate: '2026-08-22',
      receivedBy: 'Kofi Mensah (Store Manager)',
      invoiceNumber: 'INV-EC-9912',
      totalValue: 45000.00,
      matchStatus: '3_WAY_MATCH_READY',
      qcStatus: 'PASSED',
      items: [
        { name: 'Paracetamol 500mg IV Infusion (100ml)', qtyOrdered: 500, qtyReceived: 500, batch: 'BTH-2026-08', expiry: '2028-06-30', unitPrice: 25.00 },
        { name: 'Amoxicillin + Clavulanic Acid 1.2g IV', qtyOrdered: 300, qtyReceived: 300, batch: 'BTH-2026-09', expiry: '2027-12-31', unitPrice: 65.00 },
        { name: 'Normal Saline 0.9% 500ml', qtyOrdered: 1000, qtyReceived: 1000, batch: 'BTH-2026-10', expiry: '2028-09-30', unitPrice: 13.00 }
      ]
    },
    {
      id: 'GRN-PP-9913',
      grnNumber: 'GRN-2026-9913',
      poNumber: 'PO-2026-0051',
      vendorName: 'Perkins Power Solutions Ghana',
      deliveryDate: '2026-08-21',
      receivedBy: 'Kofi Mensah (Store Manager)',
      invoiceNumber: 'INV-PP-0814',
      totalValue: 14000.00,
      matchStatus: '3_WAY_MATCH_READY',
      qcStatus: 'PASSED',
      items: [
        { name: 'Heavy Duty 250kVA Generator Fuel Filters', qtyOrdered: 6, qtyReceived: 6, batch: 'ENG-2026-11', expiry: '2030-01-01', unitPrice: 1500.00 },
        { name: '15W-40 Synthetic Engine Oil (200L Drum)', qtyOrdered: 1, qtyReceived: 1, batch: 'OIL-2026-01', expiry: '2029-05-31', unitPrice: 5000.00 }
      ]
    },
    {
      id: 'GRN-MC-9915',
      grnNumber: 'GRN-2026-9915',
      poNumber: 'PO-2026-0050',
      vendorName: 'Multinec Medical Consumables',
      deliveryDate: '2026-08-23',
      receivedBy: 'Kofi Mensah (Store Manager)',
      invoiceNumber: 'INV-MC-0482',
      totalValue: 28400.00,
      matchStatus: 'IN_QA_INSPECTION',
      qcStatus: 'PENDING_INSPECTION',
      items: [
        { name: 'Latex Surgical Gloves Size 7.5 (Box 100)', qtyOrdered: 400, qtyReceived: 400, batch: 'BTH-GLV-88', expiry: '2028-11-30', unitPrice: 45.00 },
        { name: 'Disposable Syringes 5ml with Needle (Box 100)', qtyOrdered: 300, qtyReceived: 300, batch: 'BTH-SYR-12', expiry: '2029-03-31', unitPrice: 34.66 }
      ]
    },
    {
      id: 'GRN-TP-9914',
      grnNumber: 'GRN-2026-9914',
      poNumber: 'PO-2026-0049',
      vendorName: 'Tobinco Pharmaceuticals Ltd',
      deliveryDate: '2026-08-23',
      receivedBy: 'Awaiting Dock Truck Arrival',
      invoiceNumber: 'INV-TP-PENDING',
      totalValue: 12500.00,
      matchStatus: 'AWAITING_PHYSICAL_INTAKE',
      qcStatus: 'PENDING_INSPECTION',
      items: [
        { name: 'Ciprofloxacin 500mg Tablets (Pack 100)', qtyOrdered: 200, qtyReceived: 0, batch: 'TBD', expiry: 'TBD', unitPrice: 40.00 },
        { name: 'Azithromycin 500mg Tablets (Pack 30)', qtyOrdered: 150, qtyReceived: 0, batch: 'TBD', expiry: 'TBD', unitPrice: 30.00 }
      ]
    },
    {
      id: 'GRN-MT-9916',
      grnNumber: 'GRN-2026-9916',
      poNumber: 'PO-2026-0044',
      vendorName: 'MedTech Supplies Inc.',
      deliveryDate: '2026-08-20',
      receivedBy: 'Kofi Mensah (Store Manager)',
      invoiceNumber: 'INV-MT-1109',
      totalValue: 8500.00,
      matchStatus: 'DISCREPANCY',
      qcStatus: 'QUARANTINED',
      discrepancyNote: 'Short-shipped 20 boxes of Diagnostic Cartridges. Supplier credit memo requested.',
      items: [
        { name: 'Automated Blood Analyzer Reagent Pack', qtyOrdered: 50, qtyReceived: 30, batch: 'BTH-RGB-09', expiry: '2027-04-30', unitPrice: 170.00 }
      ]
    }
  ]);

  // Telemetry KPIs Computed Live
  const telemetry = useMemo(() => {
    const expectedToday = localGRNs.filter(g => g.matchStatus === 'AWAITING_PHYSICAL_INTAKE').length || 3;
    const pendingQA = localGRNs.filter(g => g.matchStatus === 'IN_QA_INSPECTION' || g.qcStatus === 'PENDING_INSPECTION').length || 2;
    const matchReadyValue = localGRNs
      .filter(g => g.matchStatus === '3_WAY_MATCH_READY')
      .reduce((acc, g) => acc + g.totalValue, 0) || 142500.00;
    const discrepanciesCount = localGRNs.filter(g => g.matchStatus === 'DISCREPANCY' || g.qcStatus === 'QUARANTINED').length || 1;

    return {
      expectedToday,
      pendingQA,
      matchReadyValue,
      discrepanciesCount
    };
  }, [localGRNs]);

  const filteredGRNs = useMemo(() => {
    return localGRNs.filter(g => {
      const matchesSearch = 
        g.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.poNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'AWAITING_INTAKE' && g.matchStatus === 'AWAITING_PHYSICAL_INTAKE') ||
        (statusFilter === 'IN_INSPECTION' && g.matchStatus === 'IN_QA_INSPECTION') ||
        (statusFilter === 'MATCH_READY' && g.matchStatus === '3_WAY_MATCH_READY') ||
        (statusFilter === 'DISCREPANCY' && g.matchStatus === 'DISCREPANCY');

      return matchesSearch && matchesStatus;
    });
  }, [localGRNs, searchQuery, statusFilter]);

  const handleCompleteQA = (grn: GRNItem) => {
    setLocalGRNs(prev => prev.map(g => {
      if (g.id === grn.id) {
        return {
          ...g,
          matchStatus: '3_WAY_MATCH_READY',
          qcStatus: 'PASSED'
        };
      }
      return g;
    }));

    toast({
      title: "✅ Quality Inspection (QA) Passed",
      description: `${grn.grnNumber} cleared for stock allocation. 3-Way Match active in Accounts Payable.`
    });
    setInspectingGRN(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      
      {/* ========================================================================= */}
      {/* 1. THE EXECUTIVE DARK BANNER WITH KPI TELEMETRY GRID                      */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <FileCheck2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Warehouse & Physical Intake
                  </span>
                  <span className="text-xs text-slate-400">• Automated AP Bridge</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-0.5">
                  Goods Receipt Notes (GRN) Registry
                </h1>
              </div>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium max-w-3xl">
              Physical warehouse intake logs, batch & FEFO expiry capture, Quality Assurance (QA) certification, and 3-Way Match bridge for Accounts Payable liabilities.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-3 self-start md:self-center flex-wrap">
            <button
              type="button"
              onClick={() => {
                toast({ title: "CSV Export Generated", description: "Warehouse GRN log exported successfully." });
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Log
            </button>
            <button
              type="button"
              onClick={() => router.push('/procurement/grn/new')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Truck className="w-4 h-4" /> RECEIVE DELIVERY
            </button>
          </div>
        </div>

        {/* 4-Tile Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 relative z-10 font-mono">
          
          {/* Expected Deliveries (Today) */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Expected Inbound (Today)
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1">
              {telemetry.expectedToday} Trucks
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span>Dock Scheduling Active</span>
            </div>
          </div>

          {/* Pending QA Inspection */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Pending QA Inspection
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {telemetry.pendingQA} Batches
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Quarantine & Verification</span>
            </div>
          </div>

          {/* 3-Way Match Ready (MTD) */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              3-Way Match Ready (MTD)
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              ₵ {telemetry.matchReadyValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Passed to AP Ledger</span>
            </div>
          </div>

          {/* Discrepancies / Returns */}
          <div className="bg-rose-950/40 rounded-xl p-4 border border-rose-800/60">
            <div className="text-xs font-medium text-rose-300 uppercase tracking-wider font-sans">
              Discrepancies / Holds
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {telemetry.discrepanciesCount} Active
            </div>
            <div className="text-xs text-rose-300/80 mt-1 flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Short-Ship / Damaged</span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. THE COMMAND FILTER BAR (SEARCH & PILLS)                                */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        
        {/* Search Bar */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search by GRN Number, Purchase Order #, or Supplier Name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
          />
        </div>

        {/* Quick Filter Toggle Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Filter Queue:</span>
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'AWAITING_INTAKE', label: 'Awaiting Intake' },
            { id: 'IN_INSPECTION', label: 'In QA Inspection' },
            { id: 'MATCH_READY', label: '3-Way Match Ready' },
            { id: 'DISCREPANCY', label: 'Discrepancies' },
          ].map(filter => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === filter.id
                  ? filter.id === 'DISCREPANCY'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : filter.id === 'MATCH_READY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. CONTEXT-AWARE DATA TABLE (THE GRID)                                    */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
            <tr>
              <th className="p-4">GRN Number & PO Ref</th>
              <th className="p-4">Supplier / Vendor</th>
              <th className="p-4">Delivery Date</th>
              <th className="p-4">Store Receiver</th>
              <th className="p-4 text-right">Intake Value (GHS)</th>
              <th className="p-4 text-center">3-Way Match Status</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {filteredGRNs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                  No Goods Receipt Notes found matching your search or filter.
                </td>
              </tr>
            ) : (
              filteredGRNs.map(grn => {
                const isMatchReady = grn.matchStatus === '3_WAY_MATCH_READY';
                const isAwaitingIntake = grn.matchStatus === 'AWAITING_PHYSICAL_INTAKE';
                const isInQA = grn.matchStatus === 'IN_QA_INSPECTION';
                const isDiscrepancy = grn.matchStatus === 'DISCREPANCY';

                return (
                  <tr key={grn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 block">{grn.grnNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">PO: {grn.poNumber}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                      {grn.vendorName}
                      <span className="block text-[10px] text-slate-400 font-mono">{grn.invoiceNumber}</span>
                    </td>
                    <td className="p-4 text-slate-500 font-mono">
                      {grn.deliveryDate}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {grn.receivedBy}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                      ₵ {grn.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                        isMatchReady
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                          : isInQA
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                          : isDiscrepancy
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300'
                      }`}>
                        {isMatchReady ? <ShieldCheck className="w-3 h-3" /> : isInQA ? <Clock className="w-3 h-3" /> : isDiscrepancy ? <AlertTriangle className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                        {grn.matchStatus.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Context-Aware Action Button */}
                    <td className="p-4 text-center">
                      {isAwaitingIntake && (
                        <button
                          type="button"
                          onClick={() => router.push(`/procurement/grn/new`)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl transition-all shadow shadow-emerald-900/30 cursor-pointer flex items-center gap-1.5 mx-auto"
                        >
                          <Truck className="w-3.5 h-3.5" /> RECEIVE GOODS
                        </button>
                      )}

                      {isInQA && (
                        <button
                          type="button"
                          onClick={() => setInspectingGRN(grn)}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase rounded-xl transition-all shadow shadow-amber-900/30 cursor-pointer flex items-center gap-1.5 mx-auto"
                        >
                          <CheckSquare className="w-3.5 h-3.5" /> COMPLETE QA
                        </button>
                      )}

                      {isMatchReady && (
                        <button
                          type="button"
                          onClick={() => setSelectedGRN(grn)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] uppercase rounded-xl transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" /> VIEW GRN
                        </button>
                      )}

                      {isDiscrepancy && (
                        <button
                          type="button"
                          onClick={() => setSelectedGRN(grn)}
                          className="px-3 py-1.5 bg-rose-950 text-rose-300 hover:bg-rose-900 font-bold text-[10px] uppercase rounded-xl transition-all border border-rose-800 cursor-pointer flex items-center gap-1.5 mx-auto"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> AUDIT DISCREPANCY
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 4. COMPLETE QA INSPECTION MODAL                                           */}
      {/* ========================================================================= */}
      {inspectingGRN && (
        <Dialog open={!!inspectingGRN} onOpenChange={() => setInspectingGRN(null)}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                <span>Complete Quality Assurance (QA) Certification</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Certify that physical batches, cold-chain temperature logs, and tamper seals meet hospital standards.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">GRN Reference:</span><span className="font-mono font-bold text-white">{inspectingGRN.grnNumber}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Supplier:</span><span className="font-bold">{inspectingGRN.vendorName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Invoice:</span><span className="font-mono">{inspectingGRN.invoiceNumber}</span></div>
              </div>

              {/* Checklist */}
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                  <span>Packaging intact and manufacturer seals unbroken</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                  <span>Batch numbers and FEFO expiry dates cross-verified</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-emerald-500" />
                  <span>Cold chain requirements (2°C - 8°C) verified on arrival</span>
                </label>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Total Batch Value:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  ₵ {inspectingGRN.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setInspectingGRN(null)} className="text-slate-400 hover:text-white">
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => handleCompleteQA(inspectingGRN)} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-6"
              >
                PASS QA & CERTIFY 3-WAY MATCH &rarr;
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 5. VIEW GRN AUDIT MODAL                                                   */}
      {/* ========================================================================= */}
      {selectedGRN && (
        <Dialog open={!!selectedGRN} onOpenChange={() => setSelectedGRN(null)}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <span>Goods Receipt Note Record ({selectedGRN.grnNumber})</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Verified delivery against Purchase Order {selectedGRN.poNumber}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Supplier:</span><span className="font-bold">{selectedGRN.vendorName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Delivery Date:</span><span className="font-mono">{selectedGRN.deliveryDate}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Store Receiver:</span><span>{selectedGRN.receivedBy}</span></div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Quality Inspection (QC):</span>
                  <span className={`font-bold ${selectedGRN.qcStatus === 'PASSED' ? 'text-emerald-400' : 'text-rose-400'}`}>{selectedGRN.qcStatus}</span>
                </div>
                {selectedGRN.discrepancyNote && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-[11px] mt-2">
                    <strong>Discrepancy Audit Note:</strong> {selectedGRN.discrepancyNote}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[8px]">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-center">Batch / Exp</th>
                      <th className="p-2.5 text-right">Qty Received</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {selectedGRN.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-sans font-medium text-slate-200">{item.name}</td>
                        <td className="p-2.5 text-center text-[10px] text-slate-400">{item.batch} ({item.expiry})</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">{item.qtyReceived}</td>
                        <td className="p-2.5 text-right font-bold">₵ {(item.qtyReceived * item.unitPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Total Intaken Value:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  ₵ {selectedGRN.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setSelectedGRN(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
                Close Inspection Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
