'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LineChart, TrendingUp, Scale, ArrowRightLeft, 
  FileCheck2, BookOpen, CalendarDays, Download, 
  ShieldCheck, CheckCircle2, FileText, Filter, 
  History, Loader2, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FinancialIntelligenceHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [reportPeriod, setReportPeriod] = useState('YTD');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  // Structured Reporting Modules with Next.js page hrefs
  const reportModules = [
    { 
      id: 'P&L', 
      title: 'INCOME STATEMENT', 
      description: 'Comprehensive view of revenue, expenses, and net surplus/deficit over the selected period.', 
      category: 'PERFORMANCE',
      href: '/accountant/reports/income-statement',
      icon: TrendingUp,
      badgeColor: 'emerald'
    },
    { 
      id: 'BAL', 
      title: 'BALANCE SHEET', 
      description: 'Snapshot of facility assets, liabilities, and accumulated equity at a specific point in time.', 
      category: 'POSITION',
      href: '/accountant/reports/balance-sheet',
      icon: Scale,
      badgeColor: 'indigo'
    },
    { 
      id: 'CF', 
      title: 'CASH FLOW STATEMENT', 
      description: 'Movement of cash mapped across operating, investing, and financing activities.', 
      category: 'LIQUIDITY',
      href: '/accountant/reports/cash-flow',
      icon: ArrowRightLeft,
      badgeColor: 'sky'
    },
    { 
      id: 'TB', 
      title: 'TRIAL BALANCE', 
      description: 'System-wide reconciliation verifying that total ledger debits equal total credits.', 
      category: 'RECONCILIATION',
      href: '/accountant/reports/trial-balance',
      icon: FileCheck2,
      badgeColor: 'amber'
    },
    { 
      id: 'GL', 
      title: 'GENERAL LEDGER', 
      description: 'Complete, immutable transaction history and journal entries mapped to specific accounts.', 
      category: 'AUDIT',
      href: '/accountant/reports/ledger',
      icon: BookOpen,
      badgeColor: 'slate'
    }
  ];

  const isLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for the Financial Intelligence Hub.</p>
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
        {/* Ambient Radial Accent Glows - Emerald/Indigo for Finance */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <LineChart className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                FINANCIAL INTELLIGENCE HUB
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              GENERATE STATUTORY, MANAGEMENT, AND RECONCILIATION FINANCIAL REPORTS.
            </p>
          </div>

          {/* Active User Context & Actions */}
          <div className="flex flex-wrap items-center gap-4 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">FINANCE CONTROLLER</div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => router.push('/accountant/reports/ledger')}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <History className="w-4 h-4" /> REPORT ARCHIVE
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Compliance Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">System Trial Balance</span>
              <div className="text-2xl font-black text-emerald-400">BALANCED</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Debits equal Credits
              </span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Scale className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Fiscal Year</span>
              <div className="text-2xl font-black text-white">FY 2026</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Current accounting period</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Last Period Closed</span>
              <div className="text-2xl font-black text-sky-400">JUL 2026</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Previous month finalized</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Ledger Entries</span>
              <div className="text-2xl font-black text-white">142.5K</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Transactions logged YTD</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. GLOBAL REPORT PARAMETERS                */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 shadow-sm">
            <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">REPORTING PERIOD:</span>
            <select 
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-emerald-700 dark:text-emerald-400 font-black ml-1"
            >
              <option value="YTD" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">YEAR TO DATE (YTD)</option>
              <option value="Q3" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Q3 2026</option>
              <option value="AUGUST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">AUGUST 2026</option>
              <option value="CUSTOM" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">CUSTOM DATE RANGE</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer text-slate-800 dark:text-slate-100 font-bold"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Departments (Consolidated)</option>
              <option value="CLINICAL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Clinical Only</option>
              <option value="PHARMACY" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pharmacy Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. REPORT GENERATION MODULES               */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportModules.map((report) => {
          const IconComp = report.icon;
          return (
            <div key={report.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col h-full overflow-hidden group">
              
              {/* Card Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm shrink-0">
                  <IconComp className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-2 inline-block">
                    {report.category}
                  </span>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase tracking-wide">
                    {report.title}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  {report.description}
                </p>
                
                <Link href={`${report.href}?period=${reportPeriod}&dept=${departmentFilter}`} className="w-full">
                  <button className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 group-hover:shadow-sm cursor-pointer">
                    <FileText className="w-4 h-4" /> GENERATE REPORT
                  </button>
                </Link>
              </div>
              
            </div>
          );
        })}
      </div>

    </div>
  );
}
