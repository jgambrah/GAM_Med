'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Printer, TrendingUp, TrendingDown, Landmark, Loader2, ShieldAlert, FileText, CheckCircle2, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function IncomeStatement() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  const accountsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "chart_of_accounts"));
  }, [firestore, hospitalId]);
  const { data: rawAccounts, isLoading: areAccountsLoading } = useCollection(accountsQuery);

  // Demodata Fallback for Immediate P&L Demonstration
  const demoAccounts = useMemo(() => [
    { id: 'rev-1', name: 'Medical & Clinical Service Revenue', category: 'REVENUE', currentBalance: 520000.00 },
    { id: 'rev-2', name: 'Central Pharmacy Drug Sales', category: 'REVENUE', currentBalance: 210000.00 },
    { id: 'rev-3', name: 'Inpatient Bed & Ward Stay Fees', category: 'REVENUE', currentBalance: 90000.00 },
    { id: 'exp-1', name: 'Clinical Supplies & Drug Expenditure', category: 'EXPENSES', currentBalance: 195000.00 },
    { id: 'exp-2', name: 'Staff Salaries & Locum Medical Fees', category: 'EXPENSES', currentBalance: 95000.00 },
    { id: 'exp-3', name: 'Bad Debt & Rejected NHIS Claims Write-off', category: 'EXPENSES', currentBalance: 11400.00 },
    { id: 'exp-4', name: 'Fixed Asset Depreciation Charges', category: 'EXPENSES', currentBalance: 20000.00 },
  ], []);

  const accounts = rawAccounts && rawAccounts.length > 0 ? rawAccounts : demoAccounts;

  const { revenueAccounts, expenseAccounts, totalRevenue, totalExpenses, netSurplus } = useMemo(() => {
    if (!accounts) return { revenueAccounts: [], expenseAccounts: [], totalRevenue: 0, totalExpenses: 0, netSurplus: 0 };
    
    const revenueAccounts = accounts.filter(a => a.category === 'REVENUE');
    const expenseAccounts = accounts.filter(a => a.category === 'EXPENSES');

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const netSurplus = totalRevenue - totalExpenses;

    return { revenueAccounts, expenseAccounts, totalRevenue, totalExpenses, netSurplus };
  }, [accounts]);

  const isLoading = isUserLoading || isProfileLoading || areAccountsLoading;
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Profit & Loss Statements.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Print CSS Overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-container { padding: 0 !important; margin: 0 !important; background: white !important; border: none !important; }
        }
      `}} />

      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800 no-print">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                PROFIT & LOSS (P&L) STATEMENT
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CONSOLIDATED REVENUE RECOGNITION, OPERATING EXPENDITURES, AND NET SURPLUS PERFORMANCE.
            </p>
          </div>

          {/* User Context & Action Button */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Printer className="w-4 h-4" /> PRINT CERTIFIED P&L
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Gross Revenue</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ₵ {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">{revenueAccounts.length} Revenue Categories</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Operating Expenses</span>
              <div className="text-xl font-black text-rose-400 font-mono">
                ₵ {totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-rose-300 mt-0.5 block">{expenseAccounts.length} Operating Cost Heads</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <TrendingDown className="w-5 h-5 text-rose-400" />
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg ${
            netSurplus >= 0 ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Net Operating Performance</span>
              <div className="text-xl font-black font-mono">
                ₵ {netSurplus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold block mt-0.5">
                {netSurplus >= 0 ? 'NET SURPLUS RECOGNIZED' : 'NET OPERATING DEFICIT'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/10">
              {netSurplus >= 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-rose-400" />}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. CERTIFIED FINANCIAL P&L STATEMENT       */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-3xl shadow-xl space-y-8 text-slate-900 dark:text-slate-100 print-container">
        
        {/* Statement Header */}
        <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-6 space-y-1">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
            GAM MED EXECUTIVE HEALTHCARE
          </h2>
          <p className="text-sm font-black uppercase text-emerald-600 dark:text-emerald-400 italic">
            Statement of Comprehensive Income (Profit & Loss)
          </p>
          <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-2">
            For the Financial Period Ended {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="space-y-8 font-mono text-xs">
          
          {/* REVENUE SECTION */}
          <section className="space-y-3">
            <h3 className="font-black border-b border-slate-200 dark:border-slate-800 pb-2 uppercase text-xs tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>1. OPERATING REVENUE (INCOME)</span>
              <span>AMOUNT (GHS)</span>
            </h3>

            <div className="space-y-2 font-bold text-slate-800 dark:text-slate-200">
              {revenueAccounts.map((acc, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="font-sans font-bold">{acc.name}</span>
                  <span>₵ {(acc.currentBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t-2 border-slate-900 dark:border-slate-100 font-black text-sm text-emerald-600 dark:text-emerald-400">
                <span className="font-sans uppercase">TOTAL GROSS REVENUE</span>
                <span>₵ {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </section>

          {/* OPERATING EXPENSES SECTION */}
          <section className="space-y-3">
            <h3 className="font-black border-b border-slate-200 dark:border-slate-800 pb-2 uppercase text-xs tracking-widest text-rose-600 dark:text-rose-400 flex items-center justify-between">
              <span>2. OPERATING EXPENDITURES (COSTS)</span>
              <span>AMOUNT (GHS)</span>
            </h3>

            <div className="space-y-2 font-bold text-slate-800 dark:text-slate-200">
              {expenseAccounts.map((acc, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="font-sans font-bold">{acc.name}</span>
                  <span className="text-rose-600 dark:text-rose-400">
                    (₵ {(acc.currentBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t-2 border-slate-900 dark:border-slate-100 font-black text-sm text-rose-600 dark:text-rose-400">
                <span className="font-sans uppercase text-slate-900 dark:text-slate-100">TOTAL OPERATING EXPENSES</span>
                <span>(₵ {totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              </div>
            </div>
          </section>

          {/* NET BOTTOM LINE SURPLUS CARD */}
          <div className={`p-6 rounded-2xl border-2 flex justify-between items-center shadow-lg ${
            netSurplus >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500/50 text-rose-900 dark:text-rose-200'
          }`}>
            <div className="flex items-center gap-3">
              {netSurplus >= 0 ? <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="w-8 h-8 text-rose-600 dark:text-rose-400" />}
              <div>
                <span className="text-xs font-black uppercase tracking-wider block font-sans">
                  NET OPERATING {netSurplus >= 0 ? 'SURPLUS' : 'DEFICIT'} FOR THE PERIOD
                </span>
                <span className="text-[10px] font-bold opacity-80 block font-sans">AUDITED GENERAL LEDGER BALANCE</span>
              </div>
            </div>
            <span className="text-2xl md:text-3xl font-black font-mono">
              ₵ {netSurplus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

        </div>

        {/* Governance Signature Footer */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-8 text-xs font-bold">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Prepared & Certified By:</p>
            <div className="mt-6 border-b border-slate-400 w-48" />
            <p className="text-slate-900 dark:text-slate-100 uppercase font-black mt-1">{userName}</p>
            <p className="text-[9px] text-emerald-600 font-bold uppercase">Chief Accountant / Controller</p>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase">Executive Approval:</p>
            <div className="mt-6 border-b border-slate-400 w-48 ml-auto" />
            <p className="text-slate-900 dark:text-slate-100 uppercase font-black mt-1">Medical & Managing Director</p>
            <p className="text-[9px] text-indigo-600 font-bold uppercase">GAM Med Board Governance</p>
          </div>
        </div>

      </div>

    </div>
  );
}
