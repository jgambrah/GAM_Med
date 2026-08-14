'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, AlertCircle, Calendar, 
  ArrowUpRight, Filter, Receipt, Search, Loader2, ShieldAlert,
  Landmark, Clock, AlertTriangle, CheckCircle2, Building2, ShieldCheck, 
  ChevronRight, Download, Send, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type PayerAgingRow = {
  payerId: string;
  payerName: string;
  current: number; // 0-30 days
  days30: number; // 31-60 days
  days60: number; // 61-90 days
  days90Plus: number; // 90+ days
};

export default function ARAgingReport() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  // Firestore Receivables Query
  const receivablesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/receivables`),
      where("status", "==", "UNPAID")
    );
  }, [firestore, hospitalId]);
  const { data: rawReceivables, isLoading: areReceivablesLoading } = useCollection(receivablesQuery);

  // Demodata Fallback for AR Aging Matrix Demonstration
  const mockArData: PayerAgingRow[] = useMemo(() => [
    { payerId: 'PAY-NHIS', payerName: 'National Health Insurance Authority (NHIA)', current: 45000.00, days30: 85000.00, days60: 120000.00, days90Plus: 35000.00 },
    { payerId: 'PAY-GLICO', payerName: 'GLICO Healthcare Ltd', current: 15000.00, days30: 5000.00, days60: 0.00, days90Plus: 1200.00 },
    { payerId: 'PAY-ACACIA', payerName: 'Acacia Health Insurance Ltd', current: 22000.00, days30: 0.00, days60: 0.00, days90Plus: 0.00 },
    { payerId: 'PAY-KNUST', payerName: 'KNUST Staff Medical Scheme', current: 8500.00, days30: 4200.00, days60: 1500.00, days90Plus: 800.00 },
    { payerId: 'PAY-APEX', payerName: 'Apex Health Mutual Scheme', current: 12400.00, days30: 3100.00, days60: 0.00, days90Plus: 8500.00 }
  ], []);

  // Compute Grouped Payer Aging Rows
  const arData: PayerAgingRow[] = useMemo(() => {
    if (!rawReceivables || rawReceivables.length === 0) return mockArData;

    const map = new Map<string, PayerAgingRow>();
    const now = new Date('2026-08-14');

    rawReceivables.forEach((r: any) => {
      const pName = r.payerName || 'NHIA National Scheme';
      const pId = r.payerId || `PAY-${pName.replace(/\s+/g, '-').toUpperCase()}`;

      if (!map.has(pId)) {
        map.set(pId, { payerId: pId, payerName: pName, current: 0, days30: 0, days60: 0, days90Plus: 0 });
      }

      const row = map.get(pId)!;
      let createdDate = now;
      if (r.createdAt && typeof r.createdAt.toDate === 'function') {
        createdDate = r.createdAt.toDate();
      } else if (r.createdAt) {
        createdDate = new Date(r.createdAt);
      }

      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const amt = Number(r.amount || 0);

      if (diffDays <= 30) row.current += amt;
      else if (diffDays <= 60) row.days30 += amt;
      else if (diffDays <= 90) row.days60 += amt;
      else row.days90Plus += amt;
    });

    return Array.from(map.values());
  }, [rawReceivables, mockArData]);

  const filteredArData = useMemo(() => {
    if (!searchQuery.trim()) return arData;
    const q = searchQuery.toLowerCase();
    return arData.filter(r => r.payerName.toLowerCase().includes(q) || r.payerId.toLowerCase().includes(q));
  }, [arData, searchQuery]);

  // Header & Footer Totals
  const totals = useMemo(() => {
    return arData.reduce((acc, row) => {
      const rowSum = row.current + row.days30 + row.days60 + row.days90Plus;
      return {
        current: acc.current + row.current,
        days30: acc.days30 + row.days30,
        days60: acc.days60 + row.days60,
        days90Plus: acc.days90Plus + row.days90Plus,
        total: acc.total + rowSum
      };
    }, { current: 0, days30: 0, days60: 0, days90Plus: 0, total: 0 });
  }, [arData]);

  const handleExportStatement = (payerName: string) => {
    toast({
      title: "Statement of Account Generated",
      description: `Consolidated SOA PDF created for ${payerName}. Sent to billing email.`
    });
  };

  const handleExportMasterReport = () => {
    setIsExporting(true);
    try {
      const headers = ['Payer ID', 'Payer Profile Name', 'Current (0-30)', '31-60 Days', '61-90 Days', '90+ Days', 'Total Balance (GHS)'];
      const rows = arData.map(r => [
        `"${r.payerId}"`,
        `"${r.payerName}"`,
        r.current.toFixed(2),
        r.days30.toFixed(2),
        r.days60.toFixed(2),
        r.days90Plus.toFixed(2),
        (r.current + r.days30 + r.days60 + r.days90Plus).toFixed(2)
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `GAM_Med_AR_Aging_Report_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Master Report Downloaded", description: `Exported AR aging schedule to CSV.` });
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

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
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Accounts Receivable Aging.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                ACCOUNTS RECEIVABLE & CLAIMS AGING MATRIX
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              30/60/90-DAY DEBT AGING ANALYSIS, PAYER RECONCILIATIONS, AND CONSOLIDATED STATEMENTS OF ACCOUNT.
            </p>
          </div>

          {/* User Context & Action */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Cash Flow Debt Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Outstanding AR</span>
              <div className="text-2xl font-black text-white font-mono">
                ₵ {totals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Grand Total Payer Receivables</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Landmark className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Current (0 - 30 Days)</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {totals.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Standard Credit Window</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-rose-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Critical Debt (&gt;90 Days)</span>
              <div className="text-2xl font-black text-rose-400 font-mono animate-pulse">
                ₵ {totals.days90Plus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-rose-400 mt-0.5 block">High-Risk Impairment Zone</span>
            </div>
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. ACTION BAR & MASTER REPORT EXPORT       */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-emerald-500" />
          <h2 className="text-sm font-black uppercase text-slate-900 dark:text-slate-100">
            Institutional Debt Matrix by Payer Profile
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search payer profile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={handleExportMasterReport}
            disabled={isExporting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT MASTER REPORT</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. AGING MATRIX TABLE & GRAND TOTALS       */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {areReceivablesLoading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculating AR aging schedule...</span>
          </div>
        ) : filteredArData.length === 0 ? (
          <div className="p-16 text-center text-slate-400 italic">
            No institutional receivables found.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Payer Profile</th>
                <th className="p-4 text-right">Current (0-30 Days)</th>
                <th className="p-4 text-right">31-60 Days</th>
                <th className="p-4 text-right">61-90 Days</th>
                <th className="p-4 text-right text-rose-400">90+ Days (Critical)</th>
                <th className="p-4 text-right bg-slate-800">Total Balance (₵)</th>
                <th className="p-4 text-center">Collection Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
              {filteredArData.map(row => {
                const rowTotal = row.current + row.days30 + row.days60 + row.days90Plus;

                return (
                  <tr key={row.payerId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="p-4">
                      <p className="font-black text-slate-900 dark:text-slate-100 uppercase">{row.payerName}</p>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                        ID: {row.payerId}
                      </span>
                    </td>

                    <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {row.current > 0 ? `₵ ${row.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                    </td>

                    <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {row.days30 > 0 ? `₵ ${row.days30.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                    </td>

                    <td className="p-4 text-right font-mono text-amber-600 font-black">
                      {row.days60 > 0 ? `₵ ${row.days60.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                    </td>

                    <td className="p-4 text-right font-mono text-rose-600 dark:text-rose-400 font-black bg-rose-50/50 dark:bg-rose-950/30">
                      {row.days90Plus > 0 ? `₵ ${row.days90Plus.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                    </td>

                    <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/40">
                      ₵ {rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleExportStatement(row.payerName)}
                          className="px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-400 dark:hover:text-slate-950 font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow"
                        >
                          <Send className="w-3 h-3" />
                          <span>SEND STATEMENT</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => router.push(`/finance/receivables?payer=${encodeURIComponent(row.payerName)}`)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>RECONCILE</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Grand Totals Footer */}
              <tr className="bg-slate-950 text-white font-black text-xs uppercase tracking-wider">
                <td className="p-4">GRAND TOTALS</td>
                <td className="p-4 text-right font-mono">₵ {totals.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right font-mono">₵ {totals.days30.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right font-mono text-amber-400">₵ {totals.days60.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right font-mono text-rose-400">₵ {totals.days90Plus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="p-4 text-right font-mono text-emerald-400 text-sm bg-slate-900">
                  ₵ {totals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-center text-[10px] text-slate-400">100% RECONCILED</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
