'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, setDoc, where, serverTimestamp } from 'firebase/firestore';
import { 
  Target, PieChart, Search, Filter, AlertTriangle, 
  SlidersHorizontal, TrendingDown, Building2, CheckCircle2, 
  Edit3, MoreHorizontal, Save, Loader2, ShieldAlert, 
  FileText, Check, Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function BudgetingConsoleHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');
  
  const [activeTab, setActiveTab] = useState<'allocation' | 'variance'>('allocation');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userProfile?.role || 'DIRECTOR');
  const isDirectorOrAdmin = ['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile?.role || 'DIRECTOR');

  // 1. Fetch Chart of Accounts (COA)
  const coaQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`));
  }, [firestore, hospitalId]);
  const { data: coa, isLoading: isCoaLoading } = useCollection(coaQuery);

  // 2. Fetch existing Budgets
  const budgetsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/budgets`));
  }, [firestore, hospitalId]);
  const { data: budgets, isLoading: isBudgetsLoading } = useCollection(budgetsQuery);

  // 3. Fetch all ledger entries to compute actual spending dynamically
  const ledgerQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/ledger_entries`), where("debit", ">", 0));
  }, [firestore, hospitalId]);
  const { data: ledgerEntries, isLoading: isLedgerLoading } = useCollection(ledgerQuery);

  // Filter COA for spendable categories: EXPENSES and ASSETS
  const spendableAccounts = useMemo(() => {
    if (!coa) return [];
    return coa.filter(a => ['EXPENSES', 'ASSETS'].includes(a.category));
  }, [coa]);

  // Compute spent amount for each account ID dynamically
  const spentMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!ledgerEntries) return map;
    ledgerEntries.forEach(entry => {
      if (entry.accountId) {
        map[entry.accountId] = (map[entry.accountId] || 0) + (entry.debit || 0);
      }
    });
    return map;
  }, [ledgerEntries]);

  const demoAccounts = useMemo(() => [
    { accountId: '1', accountCode: '1001', accountName: 'Cash', category: 'ASSETS', limit: 200000.00, spent: 0.00 },
    { accountId: '2', accountCode: '4001', accountName: 'Purchase - Drugs', category: 'EXPENSES', limit: 200000.00, spent: 4250.00 },
    { accountId: '3', accountCode: '1099', accountName: 'Accumulated Depreciation Account', category: 'ASSETS', limit: 150000.00, spent: 0.00 },
    { accountId: '4', accountCode: '5005', accountName: 'Depreciation Expense Account', category: 'EXPENSES', limit: 120000.00, spent: 0.00 },
  ], []);

  // Combined budgeting rows
  const budgetRows = useMemo(() => {
    if (spendableAccounts && spendableAccounts.length > 0) {
      return spendableAccounts.map(account => {
        const budget = budgets?.find(b => b.accountId === account.id);
        const spent = spentMap[account.id] || 0;
        const limit = budget?.limit || 0;
        const remaining = limit - spent;
        const usagePercent = limit > 0 ? (spent / limit) * 100 : 0;
        const variance = limit - spent;

        return {
          accountId: account.id,
          accountCode: account.accountCode || '0000',
          accountName: account.name || 'UNNAMED ACCOUNT',
          category: account.category || 'EXPENSES',
          limit,
          spent,
          remaining,
          usagePercent,
          variance,
          isFavorable: variance >= 0,
          varianceNote: budget?.varianceNote || '',
          reviewedByName: budget?.reviewedByName || '',
          reviewedAt: budget?.reviewedAt ? new Date(budget.reviewedAt.seconds * 1000) : null,
          reviewStatus: budget?.reviewStatus || (budget?.varianceNote ? 'PENDING' : ''),
          approvedByName: budget?.approvedByName || '',
          approvedAt: budget?.approvedAt ? new Date(budget.approvedAt.seconds * 1000) : null,
          isConfigured: !!budget,
        };
      });
    }

    return demoAccounts.map(row => {
      const remaining = row.limit - row.spent;
      const usagePercent = row.limit > 0 ? (row.spent / row.limit) * 100 : 0;
      return {
        ...row,
        remaining,
        usagePercent,
        variance: remaining,
        isFavorable: remaining >= 0,
        varianceNote: '',
        reviewedByName: '',
        reviewedAt: null,
        reviewStatus: '',
        approvedByName: '',
        approvedAt: null,
        isConfigured: true,
      };
    });
  }, [spendableAccounts, budgets, spentMap, demoAccounts]);

  const filteredBudgetRows = useMemo(() => {
    return budgetRows.filter(row => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || 
        row.accountName.toLowerCase().includes(q) || 
        row.accountCode.toLowerCase().includes(q);

      if (!matchQuery) return false;
      if (categoryFilter !== 'ALL' && row.category !== categoryFilter) return false;
      return true;
    });
  }, [budgetRows, searchQuery, categoryFilter]);

  // Telemetry Calculations
  const telemetry = useMemo(() => {
    const totalLimit = budgetRows.reduce((sum, acc) => sum + acc.limit, 0);
    const totalSpent = budgetRows.reduce((sum, acc) => sum + acc.spent, 0);
    const totalRemaining = totalLimit - totalSpent;
    const overallUsage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    const alertCount = budgetRows.filter(r => r.usagePercent >= 90).length;

    return {
      totalLimit,
      totalSpent,
      totalRemaining,
      overallUsage,
      alertCount,
    };
  }, [budgetRows]);

  const getUsageColor = (percentage: number) => {
    if (percentage > 90) return 'bg-rose-500';
    if (percentage > 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const handleSaveBudget = async (accountId: string, row: any) => {
    if (!firestore || !hospitalId) {
      toast({ title: "Limit Updated (Simulation)", description: `Limit set to GHS ${parseFloat(limitInput || '0').toFixed(2)}.` });
      setEditingId(null);
      setLimitInput('');
      return;
    }
    const numericLimit = parseFloat(limitInput);
    if (isNaN(numericLimit) || numericLimit < 0) {
      toast({ variant: "destructive", title: "Invalid Limit", description: "Please enter a valid positive number." });
      return;
    }

    setSavingId(accountId);
    try {
      const budgetRef = doc(firestore, `hospitals/${hospitalId}/budgets`, accountId);
      await setDoc(budgetRef, {
        accountId,
        accountCode: row.accountCode,
        accountName: row.accountName,
        limit: numericLimit,
        spent: row.spent,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({ title: "Budget Limit Saved", description: `Set limit of GHS ${numericLimit.toFixed(2)} for ${row.accountName}.` });
      setEditingId(null);
      setLimitInput('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveVarianceNote = async (accountId: string, row: any) => {
    if (!firestore || !hospitalId || !user) return;
    try {
      const budgetRef = doc(firestore, `hospitals/${hospitalId}/budgets`, accountId);
      await setDoc(budgetRef, {
        accountId,
        accountCode: row.accountCode,
        accountName: row.accountName,
        limit: row.limit,
        spent: row.spent,
        varianceNote: noteInput.trim(),
        reviewedBy: user.uid,
        reviewedByName: userProfile?.fullName || user.displayName || 'Accountant',
        reviewedAt: serverTimestamp(),
        reviewStatus: 'PENDING',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({ title: "Variance Review Logged", description: `Review note updated for ${row.accountName}.` });
      setEditingNoteId(null);
      setNoteInput('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Review Save Failed", description: e.message });
    }
  };

  const handleApproveVarianceReview = async (accountId: string, row: any) => {
    if (!firestore || !hospitalId || !user) return;
    try {
      const budgetRef = doc(firestore, `hospitals/${hospitalId}/budgets`, accountId);
      await setDoc(budgetRef, {
        reviewStatus: 'APPROVED',
        approvedBy: user.uid,
        approvedByName: userProfile?.fullName || user.displayName || 'Director',
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({ title: "Review Approved", description: `Variance review approved by Director for ${row.accountName}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Approval Failed", description: e.message });
    }
  };

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
          <p className="text-slate-500 text-sm mt-2">Only Accountants and Administrators can allocate budgets.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const isLoadingData = isCoaLoading || isBudgetsLoading || isLedgerLoading;

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Emerald/Indigo for Budgeting */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Target className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                BUDGETING CONSOLE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              ALLOCATE LIMITS, REVIEW VARIANCES, AND TRACK REAL-TIME EXPENDITURES.
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

            {/* In-Banner Tab Controls */}
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => setActiveTab('allocation')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'allocation' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ALLOCATION SETUP
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('variance')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'variance' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                VARIANCE REPORT
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Financial Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Configured Limits</span>
              <div className="text-2xl font-black text-white">
                <span className="text-sm text-slate-500 mr-1">GHS</span>{telemetry.totalLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Across {budgetRows.length} accounts
              </span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Utilized</span>
              <div className="text-2xl font-black text-sky-400">
                <span className="text-sm text-sky-600 mr-1">GHS</span>{telemetry.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">YTD Expenditure</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Remaining Capacity</span>
              <div className="text-2xl font-black text-emerald-400">
                <span className="text-sm text-emerald-600 mr-1">GHS</span>{telemetry.totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block">Global utilization: {telemetry.overallUsage.toFixed(1)}%</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <PieChart className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Threshold Alerts</span>
              <div className="text-2xl font-black text-white">{telemetry.alertCount}</div>
              <span className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {telemetry.alertCount > 0 ? `${telemetry.alertCount} accounts >90%` : 'No accounts >90%'}
              </span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER & SEARCH CONTROL BAR             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Account Name or Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer text-slate-800 dark:text-slate-100 font-bold"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Categories</option>
              <option value="EXPENSES" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Operating Expenses</option>
              <option value="ASSETS" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Capital Assets</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. ENTERPRISE BUDGET LEDGER                */}
      {/* ========================================== */}
      {activeTab === 'allocation' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          
          {/* Ledger Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                EXPENSE & CAPITAL BUDGETS
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> CONTROLS STAGED
            </span>
          </div>

          <div className="overflow-x-auto">
            {isLoadingData ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
                Loading budget data...
              </div>
            ) : filteredBudgetRows.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-medium">
                No budget accounts found matching filter criteria.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      Account
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Configured Limit
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Total Spent
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-right whitespace-nowrap bg-emerald-50/30 dark:bg-emerald-950/20">
                      Remaining
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap w-48">
                      Utilization
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBudgetRows.map((account, idx) => {
                    const remaining = account.limit - account.spent;
                    const utilization = account.limit > 0 ? (account.spent / account.limit) * 100 : 0;
                    const isEditing = editingId === account.accountId;
                    
                    return (
                      <tr key={account.accountId || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                        
                        {/* Account Info */}
                        <td className="px-6 py-4">
                          <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                            {account.accountName}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                              {account.accountCode}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider ${
                              account.category === 'ASSETS' ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              • {account.category}
                            </span>
                          </div>
                        </td>

                        {/* Limit */}
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              className="p-1.5 border rounded-lg w-28 bg-white dark:bg-slate-800 text-right font-black text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                              value={limitInput}
                              onChange={e => setLimitInput(e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <div className="text-sm font-mono font-black text-slate-700 dark:text-slate-200">
                              <span className="text-[10px] text-slate-400 mr-1 font-sans">₵</span>
                              {account.limit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </td>

                        {/* Spent */}
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-mono font-black text-slate-700 dark:text-slate-200">
                            <span className="text-[10px] text-slate-400 mr-1 font-sans">₵</span>
                            {account.spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>

                        {/* Remaining */}
                        <td className="px-6 py-4 text-right bg-emerald-50/30 dark:bg-emerald-950/20">
                          <div className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-400">
                            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mr-1 font-sans">₵</span>
                            {remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>

                        {/* Utilization Progress Bar */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">{utilization.toFixed(1)}% USED</span>
                            <span className="text-[9px] font-bold text-slate-400">{(100 - utilization).toFixed(1)}% REMAINING</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${getUsageColor(utilization)}`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveBudget(account.accountId, account)}
                                disabled={savingId === account.accountId}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                {savingId === account.accountId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} SAVE
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setLimitInput('');
                                }}
                                className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg cursor-pointer"
                              >
                                CANCEL
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                type="button"
                                onClick={() => {
                                  setEditingId(account.accountId);
                                  setLimitInput(account.limit ? account.limit.toString() : '');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> <span className="hidden xl:inline">SET LIMIT</span>
                              </button>
                              <button 
                                type="button"
                                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Variance Report Tab */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                BUDGET VARIANCE AUDIT REPORT
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Review operational variances against configured spending limits.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase rounded-xl flex items-center gap-2 cursor-pointer"
            >
              PRINT REPORT
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  <th className="p-4">Account</th>
                  <th className="p-4 text-right">Limit (GHS)</th>
                  <th className="p-4 text-right">Spent (GHS)</th>
                  <th className="p-4 text-right">Variance (GHS)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Review Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredBudgetRows.map((row, idx) => (
                  <tr key={row.accountId || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors font-medium">
                    <td className="p-4 font-bold uppercase text-slate-900 dark:text-slate-100">
                      {row.accountName}
                      <span className="block text-[9px] text-slate-400 font-mono">{row.accountCode} • {row.category}</span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{row.limit.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{row.spent.toFixed(2)}</td>
                    <td className={`p-4 text-right font-mono font-black ${row.variance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {row.variance.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                        row.variance < 0 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {row.variance < 0 ? 'UNFAVORABLE' : 'FAVORABLE'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      {row.varianceNote || 'No review note logged.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
