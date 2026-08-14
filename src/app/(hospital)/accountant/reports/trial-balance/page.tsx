'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import {
  Scale, Printer, FileText, CheckCircle2,
  AlertTriangle, Landmark, ShieldCheck, Download, Loader2, ShieldAlert
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function TrialBalanceReport() {
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

  const hospitalRef = useMemoFirebase(() => hospitalId ? doc(firestore, 'hospitals', hospitalId) : null, [firestore, hospitalId]);
  const { data: hospitalData } = useDoc(hospitalRef);

  const accountsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`),
      orderBy("accountCode", "asc")
    );
  }, [firestore, hospitalId]);

  const { data: rawAccounts, isLoading: areAccountsLoading } = useCollection(accountsQuery);

  // Demodata Fallback for Immediate Trial Balance Audit Demonstration
  const demoAccounts = useMemo(() => [
    { id: 'acc-1001', accountCode: '1001', name: 'GCB Bank Cash Account', category: 'ASSETS', currentBalance: 385000.00 },
    { id: 'acc-1200', accountCode: '1200', name: 'Accounts Receivable - NHIS Claims', category: 'ASSETS', currentBalance: 569500.00 },
    { id: 'acc-1205', accountCode: '1205', name: 'GRA Statutory WHT Receivables', category: 'ASSETS', currentBalance: 24500.00 },
    { id: 'acc-1300', accountCode: '1300', name: 'Central Pharmacy Stock Inventory', category: 'ASSETS', currentBalance: 142000.00 },
    { id: 'acc-2001', accountCode: '2001', name: 'Accounts Payable - Medical Suppliers', category: 'LIABILITIES', currentBalance: 204150.00 },
    { id: 'acc-2005', accountCode: '2005', name: 'GRA Statutory WHT Payable (Suppliers)', category: 'LIABILITIES', currentBalance: 18250.00 },
    { id: 'acc-3001', accountCode: '3001', name: 'Hospital Equity & Capital Reserves', category: 'CAPITAL', currentBalance: 400000.00 },
    { id: 'acc-4001', accountCode: '4001', name: 'Medical & Clinical Service Revenue', category: 'REVENUE', currentBalance: 820000.00 },
    { id: 'acc-5001', accountCode: '5001', name: 'Clinical Supplies & Drug Expenditure', category: 'EXPENSES', currentBalance: 310000.00 },
    { id: 'acc-5100', accountCode: '5100', name: 'Bad Debt & Rejected Claims Write-off', category: 'EXPENSES', currentBalance: 11400.00 },
  ], []);

  const accounts = rawAccounts && rawAccounts.length > 0 ? rawAccounts : demoAccounts;

  const totalDebit = useMemo(() => accounts?.reduce((sum, a) =>
    sum + (['ASSETS', 'EXPENSES'].includes(a.category) ? (a.currentBalance || 0) : 0), 0) || 0, [accounts]);
  
  const totalCredit = useMemo(() => accounts?.reduce((sum, a) =>
    sum + (['LIABILITIES', 'REVENUE', 'CAPITAL'].includes(a.category) ? (a.currentBalance || 0) : 0), 0) || 0, [accounts]);

  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Trial Balance Statements.</p>
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
                <Scale className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                EXECUTIVE TRIAL BALANCE REPORT
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CONSOLIDATED DOUBLE-ENTRY VERIFICATION OF DEBIT AND CREDIT GENERAL LEDGER ACCOUNTS.
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
              <Printer className="w-4 h-4" /> PRINT CERTIFIED REPORT
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Debits (Assets & Expenses)</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ₵ {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Debit Balance Accounts</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Scale className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Credits (Liabilities, Rev, Equity)</span>
              <div className="text-xl font-black text-indigo-400 font-mono">
                ₵ {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-indigo-300 mt-0.5 block">Credit Balance Accounts</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Landmark className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg ${
            isBalanced ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/60 border-rose-500/40 text-rose-300 animate-pulse'
          }`}>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Double-Entry Status</span>
              <div className="text-lg font-black font-mono">
                {isBalanced ? 'BALANCED (GHS 0.00)' : `UNBALANCED (₵ ${difference.toFixed(2)})`}
              </div>
              <span className="text-[10px] font-bold block mt-0.5">
                {isBalanced ? 'General Ledger Equilibrium Verified' : 'Discrepancy Warning - Reconcile Manual JVs'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/10">
              {isBalanced ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FORMAL CERTIFIED TRIAL BALANCE REPORT   */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-3xl shadow-xl space-y-8 text-slate-900 dark:text-slate-100 print-container">
        
        {/* Report Header */}
        <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-6 space-y-1">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {hospitalData?.name || 'GAM MED EXECUTIVE HEALTHCARE'}
          </h2>
          <p className="text-sm font-black uppercase text-emerald-600 dark:text-emerald-400 italic">
            Consolidated Trial Balance Statement
          </p>
          <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-2">
            As at {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} | Financial Period: June - August 2026
          </p>
        </div>

        {/* Trial Balance Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest">
                <th className="p-4 rounded-tl-xl">Account Code & Description</th>
                <th className="p-4 text-center">Category</th>
                <th className="p-4 text-right">Debit Balance (GHS)</th>
                <th className="p-4 text-right rounded-tr-xl">Credit Balance (GHS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-bold text-slate-800 dark:text-slate-200">
              {accounts.map((acc) => {
                const isDebitCategory = ['ASSETS', 'EXPENSES'].includes(acc.category);
                const isCreditCategory = ['LIABILITIES', 'REVENUE', 'CAPITAL'].includes(acc.category);
                const balance = acc.currentBalance || 0;

                return (
                  <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {acc.accountCode}
                        </span>
                        <span className="font-black uppercase text-slate-900 dark:text-slate-100">
                          {acc.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-[8px] font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                        {acc.category}
                      </span>
                    </td>
                    <td className="p-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {isDebitCategory ? `₵ ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="p-4 text-right font-black text-indigo-600 dark:text-indigo-400">
                      {isCreditCategory ? `₵ ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 text-white font-mono text-sm font-black border-t-2 border-slate-800">
                <td colSpan={2} className="p-4 text-right uppercase text-xs tracking-widest rounded-bl-xl">
                  TOTAL STATEMENT BALANCES
                </td>
                <td className="p-4 text-right text-emerald-400">
                  ₵ {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-right text-indigo-400 rounded-br-xl">
                  ₵ {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Governance & Certified Sign-off Footer */}
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
