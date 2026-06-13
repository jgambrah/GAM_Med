'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, setDoc, where, serverTimestamp } from 'firebase/firestore';
import { 
  Calculator, Plus, Edit, Save, Loader2, ShieldAlert, 
  TrendingUp, AlertTriangle, ArrowUpRight, CheckCircle2, 
  Printer, MessageSquare, Search, ThumbsUp, ThumbsDown, FileText, Check, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function BudgetManager() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');
  
  const [activeTab, setActiveTab] = useState<'allocation' | 'variance'>('allocation');
  const [varianceSearch, setVarianceSearch] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userProfile?.role || '');
  const isDirectorOrAdmin = ['DIRECTOR', 'ADMIN'].includes(userProfile?.role || '');

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

  // Filter COA for spendable categories: EXPENSES and ASSETS (Capital expenditures)
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

  // Combined budgeting rows
  const budgetRows = useMemo(() => {
    return spendableAccounts.map(account => {
      const budget = budgets?.find(b => b.accountId === account.id);
      const spent = spentMap[account.id] || 0;
      const limit = budget?.limit || 0;
      const remaining = limit - spent;
      const usagePercent = limit > 0 ? (spent / limit) * 100 : 0;
      const variance = limit - spent; // Favorable if remaining/variance is positive

      return {
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.name,
        category: account.category,
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
  }, [spendableAccounts, budgets, spentMap]);

  // Variance statistics
  const stats = useMemo(() => {
    let totalLimit = 0;
    let totalSpent = 0;
    let unfavorableCount = 0;

    budgetRows.forEach(r => {
      if (r.limit > 0) {
        totalLimit += r.limit;
        totalSpent += r.spent;
        if (r.spent > r.limit) {
          unfavorableCount++;
        }
      }
    });

    const netVariance = totalLimit - totalSpent;

    return {
      totalLimit,
      totalSpent,
      netVariance,
      unfavorableCount
    };
  }, [budgetRows]);

  // Filtered rows for the variance analysis search
  const filteredVarianceRows = useMemo(() => {
    const term = varianceSearch.toLowerCase().trim();
    if (!term) return budgetRows;
    return budgetRows.filter(r => 
      r.accountCode?.toLowerCase().includes(term) ||
      r.accountName?.toLowerCase().includes(term)
    );
  }, [budgetRows, varianceSearch]);

  const handleSaveBudget = async (accountId: string, row: any) => {
    if (!firestore || !hospitalId) return;
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

  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-4">
        <div className="text-center bg-white p-10 rounded-[40px] border shadow-sm max-w-md">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">Only Accountants and Administrators can allocate budgets.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 font-black uppercase text-xs tracking-widest rounded-2xl py-4 h-auto w-full">Return Home</Button>
        </div>
      </div>
    );
  }

  const isLoadingData = isCoaLoading || isBudgetsLoading || isLedgerLoading;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-800">
      
      {/* Print stylesheet override */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print-full-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
          }
        }
      `}} />

      <div className="flex justify-between items-start flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">
            Budgeting <span className="text-primary">Console</span>
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider italic mt-1">
            Allocate limits, review variances, and track real-time expenditures
          </p>
        </div>
        
        {/* Toggle between setup and variance report */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex border gap-1">
          <button 
            onClick={() => setActiveTab('allocation')}
            className={`px-5 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center gap-2 ${activeTab === 'allocation' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Calculator size={14} /> Allocation Setup
          </button>
          <button 
            onClick={() => setActiveTab('variance')}
            className={`px-5 py-2 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center gap-2 ${activeTab === 'variance' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <FileText size={14} /> Variance Report
          </button>
        </div>
      </div>

      {activeTab === 'allocation' ? (
        // Allocation setup table
        <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden no-print">
          <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Expense & Capital Budgets</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Set alerts and enforce limits on operational accounts</p>
            </div>
            <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2 text-primary">
              <TrendingUp size={16} />
              <span className="text-[9px] font-black uppercase tracking-widest">Controls Staged</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoadingData ? (
              <div className="py-20 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /></div>
            ) : budgetRows.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground italic uppercase text-xs">No expenditure accounts found in the Chart of Accounts.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest border-b">
                    <th className="p-5 border-r border-slate-800">Account Code</th>
                    <th className="p-5 border-r border-slate-800">Account Name</th>
                    <th className="p-5 border-r border-slate-800 text-right">Limit (GHS)</th>
                    <th className="p-5 border-r border-slate-800 text-right">Spent (GHS)</th>
                    <th className="p-5 border-r border-slate-800 text-right">Remaining (GHS)</th>
                    <th className="p-5 border-r border-slate-800 text-center w-64">Usage</th>
                    <th className="p-5 text-center w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {budgetRows.map(row => {
                    const isEditing = editingId === row.accountId;
                    const percent = Math.min(row.usagePercent, 100);
                    
                    let barColor = 'bg-green-500';
                    let textColor = 'text-green-600';
                    
                    if (row.usagePercent >= 90) {
                      barColor = 'bg-red-500 animate-pulse';
                      textColor = 'text-red-600 font-extrabold';
                    } else if (row.usagePercent >= 70) {
                      barColor = 'bg-yellow-500';
                      textColor = 'text-yellow-600 font-extrabold';
                    }

                    return (
                      <tr key={row.accountId} className="hover:bg-slate-50 transition-all font-bold text-slate-800">
                        <td className="p-4 border-r font-mono text-primary font-black shrink-0">{row.accountCode}</td>
                        <td className="p-4 border-r">
                          <span className="block">{row.accountName}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{row.category}</span>
                        </td>
                        <td className="p-4 border-r text-right bg-slate-50/50">
                          {isEditing ? (
                            <input
                              type="number"
                              className="p-2 border rounded-xl w-32 bg-white text-right font-black outline-none focus:border-primary"
                              value={limitInput}
                              onChange={e => setLimitInput(e.target.value)}
                              autoFocus
                            />
                          ) : row.limit > 0 ? (
                            <span className="font-mono">₵ {row.limit.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-300 italic text-xs">Unconfigured</span>
                          )}
                        </td>
                        <td className="p-4 border-r text-right font-mono text-slate-600">₵ {row.spent.toFixed(2)}</td>
                        <td className="p-4 border-r text-right font-mono" style={{ color: row.remaining < 0 ? '#dc2626' : '#475569' }}>
                          ₵ {row.remaining.toFixed(2)}
                        </td>
                        <td className="p-4 border-r">
                          {row.limit > 0 ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-black uppercase">
                                <span className={textColor}>{row.usagePercent.toFixed(1)}% Used</span>
                                <span className="text-slate-400">Remaining: {((row.limit - row.spent) / row.limit * 100).toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-xs block text-center">N/A (No Limit Set)</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1.5">
                              <Button 
                                size="sm" 
                                className="bg-primary hover:bg-black text-white px-3 py-1.5 h-auto rounded-xl"
                                onClick={() => handleSaveBudget(row.accountId, row)}
                                disabled={savingId === row.accountId}
                              >
                                {savingId === row.accountId ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Save size={14} />}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="px-3 py-1.5 h-auto rounded-xl"
                                onClick={() => {
                                  setEditingId(null);
                                  setLimitInput('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl px-4 py-2"
                              onClick={() => {
                                setEditingId(row.accountId);
                                setLimitInput(row.limit ? row.limit.toString() : '');
                              }}
                            >
                              <Edit size={14} className="mr-1.5" /> Set Limit
                            </Button>
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
        // Variance Report Tab (Printable full-page container)
        <div className="space-y-8 print-full-page">
          
          {/* Variance KPI summaries */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
            <div className="p-6 bg-slate-50 border rounded-3xl">
              <p className="text-[10px] font-black uppercase text-slate-400">Total Budget Limit</p>
              <p className="text-2xl font-black italic mt-1 text-slate-900">₵ {stats.totalLimit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div className="p-6 bg-slate-50 border rounded-3xl">
              <p className="text-[10px] font-black uppercase text-slate-400">Total Actual Spent</p>
              <p className="text-2xl font-black italic mt-1 text-slate-900">₵ {stats.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div className="p-6 rounded-3xl border" style={{ backgroundColor: stats.netVariance < 0 ? '#fef2f2' : '#f0fdf4', borderColor: stats.netVariance < 0 ? '#fee2e2' : '#dcfce7' }}>
              <p className="text-[10px] font-black uppercase" style={{ color: stats.netVariance < 0 ? '#ef4444' : '#22c55e' }}>Net Period Variance</p>
              <p className="text-2xl font-black italic mt-1" style={{ color: stats.netVariance < 0 ? '#991b1b' : '#166534' }}>₵ {stats.netVariance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div className="p-6 rounded-3xl border" style={{ backgroundColor: stats.unfavorableCount > 0 ? '#fffbeb' : '#f0fdf4', borderColor: stats.unfavorableCount > 0 ? '#fef3c7' : '#dcfce7' }}>
              <p className="text-[10px] font-black uppercase" style={{ color: stats.unfavorableCount > 0 ? '#d97706' : '#22c55e' }}>Over-Budget (Unfavorable)</p>
              <p className="text-2xl font-black italic mt-1" style={{ color: stats.unfavorableCount > 0 ? '#92400e' : '#166534' }}>{stats.unfavorableCount} Head(s)</p>
            </div>
          </div>

          {/* Variance Report Header Control Bar */}
          <div className="bg-white p-6 rounded-[30px] border shadow-sm flex flex-wrap gap-4 items-center justify-between no-print">
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 border px-4 py-2.5 rounded-2xl w-full md:w-80">
              <Search size={16} />
              <input 
                placeholder="Search report lines..."
                value={varianceSearch}
                onChange={e => setVarianceSearch(e.target.value)}
                className="bg-transparent outline-none w-full text-xs font-bold"
              />
            </div>
            <Button 
              onClick={() => window.print()} 
              className="bg-slate-900 hover:bg-primary text-white font-black uppercase text-xs tracking-widest px-8 rounded-xl h-11"
            >
              <Printer size={16} className="mr-2" /> Print Variance Report
            </Button>
          </div>

          {/* Main Report Document */}
          <div className="bg-white p-8 md:p-12 rounded-[40px] border shadow-sm space-y-8 print:shadow-none print:border-0">
            
            {/* Report Header Letterhead */}
            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  {userProfile?.hospitalName || 'GAM_MED CLINICAL HUB'}
                </h1>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                  Budget Variance Analysis & Expenditure Review Report
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Generated: {format(new Date(), 'dd MMMM yyyy, hh:mm a')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-full uppercase tracking-widest">
                  Variance Log
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-4 border-slate-900 text-xs">
                <thead>
                  <tr className="bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest border-b">
                    <th className="p-4 border-r border-slate-800">Account Head</th>
                    <th className="p-4 border-r border-slate-800 text-right">Budget (GHS)</th>
                    <th className="p-4 border-r border-slate-800 text-right">Actual (GHS)</th>
                    <th className="p-4 border-r border-slate-800 text-right">Variance (GHS)</th>
                    <th className="p-4 border-r border-slate-800 text-center">Variance Status</th>
                    <th className="p-4">Accountant Review Comment / Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100 font-bold text-slate-700">
                  {isLoadingData ? (
                    <tr><td colSpan={6} className="text-center p-12"><Loader2 className="animate-spin mx-auto text-primary" /></td></tr>
                  ) : filteredVarianceRows.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-12 text-slate-400 italic">No budget heads match search query.</td></tr>
                  ) : (
                    filteredVarianceRows.map(row => {
                      const isEditingNote = editingNoteId === row.accountId;
                      
                      return (
                        <tr key={row.accountId} className="hover:bg-slate-50/40">
                          <td className="p-4 border-r">
                            <p className="font-mono text-slate-900 font-black">{row.accountCode}</p>
                            <p className="uppercase text-[10px] text-slate-500 font-bold leading-tight">{row.accountName}</p>
                          </td>
                          <td className="p-4 border-r text-right font-mono">
                            {row.limit > 0 ? `₵ ${row.limit.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-4 border-r text-right font-mono">
                            `₵ ${row.spent.toFixed(2)}`
                          </td>
                          <td className="p-4 border-r text-right font-mono" style={{ color: row.variance < 0 ? '#ef4444' : '#16a34a' }}>
                            {row.limit > 0 ? `₵ ${row.variance.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-4 border-r text-center">
                            {row.limit > 0 ? (
                              <span className={`inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                                row.isFavorable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {row.isFavorable ? <ThumbsUp size={10} /> : <ThumbsDown size={10} />}
                                {row.isFavorable ? 'Favorable' : 'Unfavorable'}
                              </span>
                            ) : (
                              <span className="text-slate-300 italic text-[10px]">Unmonitored</span>
                            )}
                          </td>
                          <td className="p-3">
                            {isEditingNote ? (
                              <div className="flex items-center gap-2 no-print">
                                <input
                                  className="border rounded-xl p-2 font-bold text-xs bg-slate-50 focus:border-primary outline-none flex-1 w-full text-slate-900"
                                  value={noteInput}
                                  onChange={e => setNoteInput(e.target.value)}
                                  placeholder="Provide variance note..."
                                  autoFocus
                                />
                                <button 
                                  onClick={() => handleSaveVarianceNote(row.accountId, row)}
                                  className="p-2 bg-slate-900 hover:bg-primary text-white rounded-lg"
                                >
                                  <Check size={14} />
                                </button>
                                <button 
                                  onClick={() => setEditingNoteId(null)}
                                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  {row.varianceNote ? (
                                    <div className="space-y-1">
                                      <p className="text-[10px] leading-relaxed uppercase text-slate-800 font-bold">{row.varianceNote}</p>
                                      
                                      {/* Status Badges */}
                                      <div className="flex gap-1.5 flex-wrap items-center">
                                        {row.reviewStatus === 'APPROVED' ? (
                                          <span className="inline-flex items-center gap-0.5 text-[8px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-black border border-green-200 uppercase tracking-wide">
                                            <Check size={8} /> Approved Review
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-0.5 text-[8px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-black border border-amber-200 uppercase tracking-wide animate-pulse">
                                            Awaiting Approval
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-slate-300 italic text-[10px]">No explanation log</p>
                                  )}
                                  
                                  {row.reviewedByName && (
                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                                      Reviewed: {row.reviewedByName} {row.reviewedAt ? `on ${row.reviewedAt.toLocaleDateString()}` : ''}
                                    </p>
                                  )}
                                  {row.approvedByName && (
                                    <p className="text-[8px] text-green-600 font-bold uppercase mt-0.5">
                                      Authorized: {row.approvedByName} {row.approvedAt ? `on ${row.approvedAt.toLocaleDateString()}` : ''}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0 no-print">
                                  {/* Accountant review action */}
                                  {row.reviewStatus !== 'APPROVED' && (
                                    <button 
                                      onClick={() => {
                                        setEditingNoteId(row.accountId);
                                        setNoteInput(row.varianceNote);
                                      }}
                                      className="text-primary hover:text-slate-900 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                                    >
                                      <MessageSquare size={12} /> {row.varianceNote ? 'Edit' : 'Review'}
                                    </button>
                                  )}

                                  {/* Director/Admin approval action */}
                                  {isDirectorOrAdmin && row.varianceNote && row.reviewStatus !== 'APPROVED' && (
                                    <button 
                                      onClick={() => handleApproveVarianceReview(row.accountId, row)}
                                      className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm transition-all border-0"
                                    >
                                      <Check size={10} /> Approve Review
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-100 border-t-4 border-slate-900 font-black text-xs text-slate-900">
                  <tr>
                    <td className="p-4 uppercase">Total Period Variance Summaries</td>
                    <td className="p-4 text-right font-mono">₵ {stats.totalLimit.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono">₵ {stats.totalSpent.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono" style={{ color: stats.netVariance < 0 ? '#ef4444' : '#16a34a' }}>
                      ₵ {stats.netVariance.toFixed(2)}
                    </td>
                    <td colSpan={2} className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[8px] font-black px-2.5 py-1 rounded-full uppercase ${
                        stats.netVariance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        Net: {stats.netVariance >= 0 ? 'Favorable (Under Budget)' : 'Unfavorable (Over Budget)'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Verification Sign-offs for Governance */}
            <div className="pt-12 grid grid-cols-2 gap-8 items-end opacity-60 print:pt-20">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">
                  Verified Report: GamMed Budgeting Control Protocol
                </span>
              </div>
              <div className="text-right space-y-6">
                <p className="text-[10px] italic text-slate-900">Sign: ____________________________________ (Internal Auditor)</p>
                <p className="text-[9px] font-black uppercase text-slate-400">GAM_MED CLINICAL ACCOUNTING PROTOCOL</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
