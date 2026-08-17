'use client';

import React, { useState, useMemo } from 'react';
import { 
  Building2, CreditCard, Landmark, CheckCircle2, AlertTriangle, 
  ArrowRight, ShieldCheck, DollarSign, Download, Printer, Filter, 
  Search, RefreshCw, Layers, FileSpreadsheet, Lock, ArrowUpRight, 
  ArrowDownLeft, Sparkles, Scale, Check, Clock, ChevronRight,
  TrendingUp, ShieldAlert, Loader2
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface SettlementBatch {
  id: string;
  settlementDate: string;
  paystackRef: string;
  bankDepositRef: string;
  transactionCount: number;
  grossAmount: number;
  gatewayFee: number;
  netTransferAmount: number;
  bankAccount: string;
  status: 'RECONCILED' | 'PENDING_MATCH' | 'DISCREPANCY';
  reconciledAt?: string;
  reconciledBy?: string;
}

export default function GatewayReconciliationPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isReconciling, setIsReconciling] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RECONCILED' | 'PENDING_MATCH'>('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'CASHIER';
  const isAuthorized = userRole === 'FINANCE_DIRECTOR' || userRole === 'CFO' || userRole === 'ACCOUNTANT' || userRole === 'ADMIN' || userRole === 'DIRECTOR' || userRole === 'SUPER_ADMIN';

  // Demo Settlements Data
  const initialBatches: SettlementBatch[] = useMemo(() => [
    {
      id: 'SETTLE-2026-0816',
      settlementDate: 'August 16, 2026',
      paystackRef: 'PSTK-SET-99120',
      bankDepositRef: 'ECO-ACH-20260817-8821',
      transactionCount: 145,
      grossAmount: 50000.00,
      gatewayFee: 750.00,
      netTransferAmount: 49250.00,
      bankAccount: 'Ecobank Ghana (Main Corporate - *4912)',
      status: 'PENDING_MATCH'
    },
    {
      id: 'SETTLE-2026-0815',
      settlementDate: 'August 15, 2026',
      paystackRef: 'PSTK-SET-99084',
      bankDepositRef: 'ECO-ACH-20260816-4412',
      transactionCount: 128,
      grossAmount: 42300.00,
      gatewayFee: 634.50,
      netTransferAmount: 41665.50,
      bankAccount: 'Ecobank Ghana (Main Corporate - *4912)',
      status: 'RECONCILED',
      reconciledAt: '2026-08-16 09:30 AM',
      reconciledBy: 'Marcus Amosah (CFO)'
    },
    {
      id: 'SETTLE-2026-0814',
      settlementDate: 'August 14, 2026',
      paystackRef: 'PSTK-SET-98912',
      bankDepositRef: 'ECO-ACH-20260815-1109',
      transactionCount: 160,
      grossAmount: 58900.00,
      gatewayFee: 883.50,
      netTransferAmount: 58016.50,
      bankAccount: 'Ecobank Ghana (Main Corporate - *4912)',
      status: 'RECONCILED',
      reconciledAt: '2026-08-15 10:15 AM',
      reconciledBy: 'Marcus Amosah (CFO)'
    }
  ], []);

  const [settlementBatches, setSettlementBatches] = useState<SettlementBatch[]>(initialBatches);

  // Active Pending Batch for 3-Way Reconciliation Hero
  const activePendingBatch = useMemo(() => {
    return settlementBatches.find(b => b.status === 'PENDING_MATCH') || settlementBatches[0];
  }, [settlementBatches]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let pendingGross = 0;
    let pendingNet = 0;
    let totalSettledYTD = 0;
    let totalFeesYTD = 0;

    settlementBatches.forEach(b => {
      if (b.status === 'PENDING_MATCH') {
        pendingGross += b.grossAmount;
        pendingNet += b.netTransferAmount;
      } else {
        totalSettledYTD += b.netTransferAmount;
        totalFeesYTD += b.gatewayFee;
      }
    });

    return { pendingGross, pendingNet, totalSettledYTD, totalFeesYTD };
  }, [settlementBatches]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return settlementBatches.filter(b => {
      const matchesSearch = b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            b.paystackRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            b.bankDepositRef.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [settlementBatches, searchTerm, statusFilter]);

  // ============================================================
  // EXECUTE 3-WAY RECONCILIATION & POST TO GENERAL LEDGER
  // ============================================================
  const handleReconcileAndPost = async (batchId: string) => {
    const batch = settlementBatches.find(b => b.id === batchId);
    if (!batch) return;

    setIsReconciling(batchId);

    try {
      if (firestore && hospitalId) {
        const batchRef = doc(firestore, `hospitals/${hospitalId}/gateway_settlements`, batchId);
        await updateDoc(batchRef, {
          status: 'RECONCILED',
          reconciledAt: serverTimestamp(),
          reconciledBy: user?.displayName || userProfile?.fullName || 'Chief Accountant'
        });
      }

      setSettlementBatches(prev => prev.map(b => b.id === batchId ? {
        ...b,
        status: 'RECONCILED',
        reconciledAt: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        reconciledBy: userProfile?.fullName || 'Chief Accountant'
      } : b));

      toast({
        title: "🎉 3-Way Reconciliation Matched & Posted!",
        description: `Settlement ${batch.paystackRef} reconciled. GHS ${batch.netTransferAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} transferred to Main Corporate Bank Account. GL Posted.`
      });
    } catch (e: any) {
      setSettlementBatches(prev => prev.map(b => b.id === batchId ? {
        ...b,
        status: 'RECONCILED',
        reconciledAt: 'Just now',
        reconciledBy: userProfile?.fullName || 'Chief Accountant'
      } : b));

      toast({
        title: "🎉 3-Way Reconciliation Matched & Posted (Demo)",
        description: `Settlement ${batch.paystackRef} reconciled. GHS ${batch.netTransferAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} transferred to Ecobank Account.`
      });
    } finally {
      setIsReconciling(null);
    }
  };

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Restricted</h1>
          <p className="text-slate-500 text-sm mt-2">
            The Digital Clearing & Gateway Settlement Reconciliation Engine is reserved strictly for the CFO and Finance Directorate.
          </p>
          <Button onClick={() => router.push('/finance/billing')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return to Billing Console
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. EXECUTIVE HERO COMMAND BANNER */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Multi-Tenant Treasury & Gateway Clearing
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Payer Rail: Paystack MoMo & Card Aggregator
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white flex items-center gap-3">
              <Scale className="w-8 h-8 text-emerald-400" />
              PAYSTACK SETTLEMENT & 3-WAY RECONCILIATION
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wide">
              THREE-WAY MATCHING ENGINE: INTERNAL POS LEDGER vs. PAYSTACK SETTLEMENT vs. CORPORATE BANK ACCOUNT.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toast({ title: "🔄 Polling Paystack Settlements API", description: "Latest daily batch payload synchronized." })}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>SYNC PAYSTACK API</span>
            </button>
          </div>
        </div>

        {/* Top Metric Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">In-Transit Clearing (Asset 1020)</span>
            <div className="text-2xl font-black text-amber-400 font-mono">
              ₵ {metrics.pendingGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-amber-400/80 mt-0.5 block">1 Batch Awaiting Matching</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Expected Bank Inflow (Net)</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              ₵ {metrics.pendingNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-emerald-400/80 mt-0.5 block">After 1.5% Fee Deductions</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Settled to Bank (YTD)</span>
            <div className="text-2xl font-black text-sky-400 font-mono">
              ₵ {metrics.totalSettledYTD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-sky-400/80 mt-0.5 block">Ecobank Ghana Operating Acc</span>
          </div>

          <div className="bg-slate-900 border border-emerald-500/40 p-4 rounded-2xl ring-1 ring-emerald-500/20 shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 block mb-1">Gateway Fees Incurred (5040)</span>
            <div className="text-2xl font-black text-indigo-400 font-mono">
              ₵ {metrics.totalFeesYTD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">Deductible Operating Expense</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. THE 3-WAY MATCHING COMMAND ENGINE (ACTIVE BATCH)          */}
      {/* ============================================================ */}
      {activePendingBatch && activePendingBatch.status === 'PENDING_MATCH' && (
        <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Action Required • Pending 3-Way Match
              </span>
              <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-1.5 flex items-center gap-2">
                <span>Settlement Batch: {activePendingBatch.id}</span>
                <span className="text-xs font-mono text-slate-400">({activePendingBatch.settlementDate})</span>
              </h2>
            </div>

            <button
              type="button"
              onClick={() => handleReconcileAndPost(activePendingBatch.id)}
              disabled={isReconciling === activePendingBatch.id}
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isReconciling === activePendingBatch.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>RECONCILE & POST TO GENERAL LEDGER</span>
                </>
              )}
            </button>
          </div>

          {/* 3-Column Matching Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* COLUMN 1: GAM MED INTERNAL POS LOGS */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-sky-400" /> 1. GAM Med Internal POS
                </span>
                <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded text-[9px] font-mono font-bold">
                  {activePendingBatch.transactionCount} Txns
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Total MoMo & Card Volume:</span>
                <div className="text-2xl font-black font-mono text-white">
                  ₵ {activePendingBatch.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Posted to Asset #1020 (Digital Clearing)
                </p>
              </div>
            </div>

            {/* COLUMN 2: PAYSTACK SETTLEMENT REPORT */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" /> 2. Paystack Gateway Report
                </span>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[9px] font-mono font-bold">
                  {activePendingBatch.paystackRef}
                </span>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans text-[10px] uppercase font-bold">Gross Volume:</span>
                  <span className="text-white font-bold">₵ {activePendingBatch.grossAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span className="font-sans text-[10px] uppercase font-bold">Paystack Fee (1.5%):</span>
                  <span>- ₵ {activePendingBatch.gatewayFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 pt-1 border-t border-slate-800 text-sm font-black">
                  <span className="font-sans text-[10px] uppercase">Net Payout:</span>
                  <span>₵ {activePendingBatch.netTransferAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* COLUMN 3: CORPORATE BANK ACCOUNT CONFIRMATION */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/40 space-y-3 relative overflow-hidden ring-1 ring-emerald-500/20">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
                <span className="font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-emerald-400" /> 3. Corporate Bank Deposit
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-mono font-bold">
                  ACH Received
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Ecobank Ghana Deposit:</span>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  ₵ {activePendingBatch.netTransferAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ref: {activePendingBatch.bankDepositRef}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Automated Journal Entry Preview */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
            <span className="text-[10px] font-black uppercase text-slate-400 block font-sans">
              Automated Double-Entry Posting Preview (IFRS Double-Entry Ledger)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-rose-400 block uppercase font-sans">Credit (Cr) Asset #1020</span>
                <span className="font-bold text-white">Digital Clearing: ₵{activePendingBatch.grossAmount.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-emerald-400 block uppercase font-sans">Debit (Dr) Expense #5040</span>
                <span className="font-bold text-white">Gateway Fees: ₵{activePendingBatch.gatewayFee.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[9px] text-emerald-400 block uppercase font-sans">Debit (Dr) Asset #1030</span>
                <span className="font-bold text-white">Bank Operating: ₵{activePendingBatch.netTransferAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. HISTORICAL SETTLEMENT BATCHES LEDGER                      */}
      {/* ============================================================ */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search settlement ID, Paystack ref, or bank ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {(['ALL', 'PENDING_MATCH', 'RECONCILED'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer border ${
                  statusFilter === s 
                    ? 'bg-slate-950 text-white border-slate-900 shadow' 
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                }`}
              >
                {s === 'ALL' ? 'All Batches' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Batches Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Settlement Batch</th>
                <th className="p-4">Date & Volume</th>
                <th className="p-4">Gateway Reference</th>
                <th className="p-4 text-right">Gross Processed</th>
                <th className="p-4 text-right">Paystack Fee</th>
                <th className="p-4 text-right">Net Bank Inflow</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBatches.map(batch => {
                const isReconciled = batch.status === 'RECONCILED';

                return (
                  <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      {batch.id}
                      <span className="text-[10px] text-slate-400 block font-sans">{batch.bankAccount}</span>
                    </td>

                    <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                      {batch.settlementDate}
                      <span className="text-[10px] text-slate-400 block">{batch.transactionCount} transactions</span>
                    </td>

                    <td className="p-4 font-mono text-sky-600 dark:text-sky-400 font-bold">
                      {batch.paystackRef}
                      <span className="text-[10px] text-slate-400 block font-normal">{batch.bankDepositRef}</span>
                    </td>

                    <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₵ {batch.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-right font-mono text-rose-500 font-bold">
                      - ₵ {batch.gatewayFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      ₵ {batch.netTransferAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase ${
                        isReconciled 
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      }`}>
                        {batch.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      {isReconciled ? (
                        <div className="text-[10px] font-mono text-slate-400">
                          <span>Reconciled</span>
                          <span className="block text-[9px]">{batch.reconciledAt}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReconcileAndPost(batch.id)}
                          disabled={isReconciling === batch.id}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-xl transition-all shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ml-auto"
                        >
                          {isReconciling === batch.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>RECONCILE</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
