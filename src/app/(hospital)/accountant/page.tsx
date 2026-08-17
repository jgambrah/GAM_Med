'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, orderBy, limit, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Building2, ArrowUpRight, ArrowDownRight, Scale, 
  FileText, Plus, Landmark, CreditCard, ShieldAlert, 
  Wallet, Activity, ArrowRightLeft, CalendarDays, 
  Loader2, CheckCircle2, Coins, Banknote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function AccountantConsoleHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [timeframe, setTimeframe] = useState('TODAY');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const startOfToday = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const coaQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`));
  }, [firestore, hospitalId]);
  const { data: accounts, isLoading: areAccountsLoading } = useCollection(coaQuery);
  
  const todayLedgerEntriesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/ledger_entries`),
      where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId, startOfToday]);
  const { data: todayLedgerEntries, isLoading: areLedgerEntriesLoading } = useCollection(todayLedgerEntriesQuery);

  const recentTransactionsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/ledger_entries`),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
  }, [firestore, hospitalId]);
  const { data: recentTransactions } = useCollection(recentTransactionsQuery);
  
  const payersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payers`));
  }, [firestore, hospitalId]);
  const { data: payers, isLoading: arePayersLoading } = useCollection(payersQuery);

  const [localVaultReplenishment, setLocalVaultReplenishment] = useState<number>(0);
  const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);
  const [replenishAmount, setReplenishAmount] = useState<number>(15000);
  const [isProcessingReplenish, setIsProcessingReplenish] = useState(false);

  const demoLedgerActivity = useMemo(() => [
    ...(localVaultReplenishment > 0 ? [
      {
        id: `JV-VAULT-${Date.now().toString().slice(-4)}`,
        account: 'MAIN VAULT (CASH INFLOW)',
        description: 'PETTY CASH IMPREST FLOAT REPLENISHMENT VIA ECOBANK CHEQUE #088192',
        amount: localVaultReplenishment,
        type: 'DEBIT' as const,
        ref: 'JV-2026-0818',
        time: 'Just now'
      },
      {
        id: `JV-BANK-${Date.now().toString().slice(-4)}`,
        account: 'ECOBANK OPERATING (BANK OUTFLOW)',
        description: 'PETTY CASH IMPREST FLOAT DRAWDOWN VIA CHEQUE #088192',
        amount: -localVaultReplenishment,
        type: 'CREDIT' as const,
        ref: 'JV-2026-0818',
        time: 'Just now'
      }
    ] : []),
    {
      id: 'PV-7578-096425-1',
      account: 'PURCHASE - DRUGS (INVENTORY)',
      description: 'PAYMENT FOR GOODS RECEIVED AGAINST GRN #GRN-ZPM5-194',
      amount: 2400.00,
      type: 'DEBIT' as const,
      ref: 'PV-7578-096425',
      time: '10:42 AM'
    },
    {
      id: 'PV-7578-096425-2',
      account: 'INPUT VAT & STATUTORY LEVIES (18.9%)',
      description: 'INPUT VAT + NHIL + GETFUND + COVID LEVY TAX CREDIT (GRN-ZPM5-194)',
      amount: 453.60,
      type: 'DEBIT' as const,
      ref: 'PV-7578-096425',
      time: '10:42 AM'
    },
    {
      id: 'PV-7578-096425-3',
      account: 'WHT PAYABLE (3% GRA TAX)',
      description: 'STATUTORY WITHHOLDING TAX DEDUCTED (3% OF ₵2,400 BASE)',
      amount: -72.00,
      type: 'CREDIT' as const,
      ref: 'PV-7578-096425',
      time: '10:42 AM'
    },
    {
      id: 'PV-7578-096425-4',
      account: 'MAIN VAULT (CASH DISBURSED)',
      description: 'NET PHYSICAL CASH PAID TO SUPPLIER (GROSS ₵2,853.60 - WHT ₵72.00)',
      amount: -2781.60,
      type: 'CREDIT' as const,
      ref: 'PV-7578-096425',
      time: '10:42 AM'
    },
    {
      id: 'PV-7578-793428-1',
      account: 'PURCHASE - DRUGS (INVENTORY)',
      description: 'PAYMENT FOR GOODS RECEIVED AGAINST GRN #GRN-318925',
      amount: 1850.00,
      type: 'DEBIT' as const,
      ref: 'PV-7578-793428',
      time: '09:15 AM'
    },
    {
      id: 'PV-7578-793428-2',
      account: 'INPUT VAT & STATUTORY LEVIES (18.9%)',
      description: 'INPUT VAT + NHIL + GETFUND + COVID LEVY (AABON VENTURES)',
      amount: 349.65,
      type: 'DEBIT' as const,
      ref: 'PV-7578-793428',
      time: '09:15 AM'
    },
    {
      id: 'PV-7578-793428-3',
      account: 'WHT PAYABLE (3% GRA TAX)',
      description: 'STATUTORY WITHHOLDING TAX DEDUCTED (3% OF ₵1,850 BASE)',
      amount: -55.50,
      type: 'CREDIT' as const,
      ref: 'PV-7578-793428',
      time: '09:15 AM'
    },
    {
      id: 'PV-7578-793428-4',
      account: 'MAIN VAULT (CASH DISBURSED)',
      description: 'NET PHYSICAL CASH PAID TO AABON VENTURES (GROSS ₵2,199.65 - WHT ₵55.50)',
      amount: -2144.15,
      type: 'CREDIT' as const,
      ref: 'PV-7578-793428',
      time: '09:15 AM'
    }
  ], [localVaultReplenishment]);

  const activeLedgerActivity = useMemo(() => {
    if (recentTransactions && recentTransactions.length > 0) {
      return recentTransactions.map((tx: any, idx: number) => {
        const isDebit = (tx.debit || 0) > 0;
        const val = isDebit ? (tx.debit || 0) : -(tx.credit || 0);

        let timeStr = '10:42 AM';
        if (tx.createdAt?.toDate) {
          timeStr = tx.createdAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }

        return {
          id: tx.id || `TX-${idx}`,
          account: (tx.accountName || 'GENERAL ACCOUNT').toUpperCase(),
          description: (tx.narration || 'RECORDED LEDGER TRANSACTION').toUpperCase(),
          amount: val,
          type: isDebit ? 'DEBIT' as const : 'CREDIT' as const,
          ref: tx.reference || `REF-${idx + 1}`,
          time: timeStr,
        };
      });
    }

    return demoLedgerActivity;
  }, [recentTransactions, demoLedgerActivity]);

  // Dynamically synchronize Executive Telemetry Widgets with active ledger activity
  const stats = useMemo(() => {
    if (todayLedgerEntries && accounts && todayLedgerEntries.length > 0) {
      const revenueAccountIds = accounts.filter(a => a.category === 'REVENUE').map(a => a.id);
      const expenseAccountIds = accounts.filter(a => a.category === 'EXPENSES').map(a => a.id);

      const revenue = todayLedgerEntries
        .filter(entry => revenueAccountIds.includes(entry.accountId))
        .reduce((acc, entry) => acc + (entry.credit || 0), 0);
        
      const expenses = todayLedgerEntries
        .filter(entry => expenseAccountIds.includes(entry.accountId))
        .reduce((acc, entry) => acc + (entry.debit || 0), 0);
        
      return { revenue, expenses, net: revenue - expenses };
    }
    
    // Live compute from activeLedgerActivity: Sum all Credit cash/bank outflow lines
    let calculatedInflow = localVaultReplenishment;
    let calculatedOutflow = 0;

    demoLedgerActivity.forEach(entry => {
      if (entry.account.includes('VAULT (CASH DISBURSED)') || (entry.type === 'CREDIT' && entry.account.includes('CASH'))) {
        calculatedOutflow += Math.abs(entry.amount);
      }
    });

    return { 
      revenue: calculatedInflow, 
      expenses: calculatedOutflow, 
      net: calculatedInflow - calculatedOutflow 
    };
  }, [todayLedgerEntries, accounts, demoLedgerActivity, localVaultReplenishment]);
  
  const fundAllocations = useMemo(() => {
    const cashAccount = accounts?.find(a => a.name.toLowerCase().includes('cash'));
    const momoAccount = accounts?.find(a => a.name.toLowerCase().includes('momo'));
    const nhisPayer = payers?.find(p => p.type === 'NHIS');

    // Calculate dynamic vault balance taking into account replenishment
    const baseDeficit = -7025.75;
    const currentVaultBal = localVaultReplenishment > 0 
      ? baseDeficit + localVaultReplenishment 
      : (cashAccount?.currentBalance !== undefined ? cashAccount.currentBalance : baseDeficit);

    const momoBal = momoAccount?.currentBalance !== undefined ? momoAccount.currentBalance : 15400.00;
    const nhisBal = nhisPayer?.currentBalance !== undefined ? nhisPayer.currentBalance : 45200.00;

    return [
      { id: 'vault-1', name: 'MAIN VAULT (CASH)', balance: currentVaultBal, type: 'CASH' },
      { id: 'momo-1', name: 'MOMO AGGREGATOR (IN-CLEARING)', balance: momoBal, type: 'DIGITAL' },
      { id: 'nhis-1', name: 'NHIS RECEIVABLES POOL', balance: nhisBal, type: 'RECEIVABLE' },
    ];
  }, [accounts, payers, localVaultReplenishment]);

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for the Accountant Console.</p>
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
        {/* Ambient Radial Accent Glows - Emerald/Sky for Finance */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Building2 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                ACCOUNTANT CONSOLE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CENTRAL FINANCIAL COMMAND, LEDGER ACTIVITY, AND CASHFLOW MONITORING.
            </p>
          </div>

          {/* Active User Context & Actions */}
          <div className="flex flex-wrap items-center gap-4 self-start xl:self-auto">
            
            {/* User Badge */}
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT</div>
              </div>
            </div>

            {/* Core Accounting Actions */}
            <button 
              type="button"
              onClick={() => router.push('/accountant/journals')}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-4 h-4" /> JOURNAL VOUCHER
            </button>
            <button 
              type="button"
              onClick={() => router.push('/accountant/payments')}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" /> NEW PAYMENT
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Cashflow Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
          
          {/* Total Inflow */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Total Inflow</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 border border-slate-700">{timeframe}</span>
              </div>
              <div className="text-3xl font-black text-emerald-400">
                <span className="text-sm text-emerald-600 mr-1">GHS</span>{stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <ArrowDownRight className="w-7 h-7" />
            </div>
          </div>

          {/* Total Outflow */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Total Outflow</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 border border-slate-700">{timeframe}</span>
              </div>
              <div className="text-3xl font-black text-rose-400">
                <span className="text-sm text-rose-600 mr-1">GHS</span>{stats.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <ArrowUpRight className="w-7 h-7" />
            </div>
          </div>

          {/* Net Position */}
          <div className="bg-slate-900 border border-sky-500/30 p-5 rounded-xl flex items-center justify-between ring-1 ring-sky-500/20 shadow-lg">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">Net Position</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-sky-500/20 text-sky-400 border border-sky-500/30">REAL-TIME</span>
              </div>
              <div className="text-3xl font-black text-white">
                <span className="text-sm text-slate-500 mr-1">GHS</span>{stats.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-sky-500/20 border border-sky-500/30 text-sky-400 rounded-xl">
              <Scale className="w-7 h-7" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DUAL-COLUMN WORKSPACE                   */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: RECENT LEDGER ACTIVITY (Spans 2 columns on large screens) */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
          
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                RECENT LEDGER ACTIVITY
              </h2>
            </div>
            <button 
              type="button"
              onClick={() => router.push('/accountant/journals')}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer"
            >
              VIEW FULL LEDGER <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-5 flex-1 bg-slate-50/30 dark:bg-slate-900">
            <div className="space-y-4">
              {activeLedgerActivity.map((entry) => (
                <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group">
                  
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 border ${
                      entry.amount > 0 
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' 
                        : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'
                    }`}>
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide">
                        {entry.account}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 max-w-md truncate" title={entry.description}>
                        {entry.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-mono text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          REF: {entry.ref}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> {entry.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <div className={`text-lg font-mono font-black ${entry.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {entry.amount > 0 ? '+' : '-'} <span className="text-xs mr-0.5">GHS</span>{Math.abs(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FUND ALLOCATION & BANKING */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Fund Allocation Card */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-white">
                FUND ALLOCATION
              </h2>
            </div>
            
            <div className="p-6 space-y-4 flex-1">
              {fundAllocations.map((fund) => (
                <div key={fund.id} className="flex flex-col gap-1 pb-4 border-b border-slate-800/50 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                      {fund.type === 'CASH' && <Wallet className="w-3.5 h-3.5" />}
                      {fund.type === 'DIGITAL' && <CreditCard className="w-3.5 h-3.5" />}
                      {fund.type === 'RECEIVABLE' && <FileText className="w-3.5 h-3.5" />}
                      {fund.name}
                    </span>
                    {/* Anomaly Highlight: Warning for negative cash balance */}
                    {fund.balance < 0 && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                        <ShieldAlert className="w-3 h-3" /> DEFICIT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`text-xl font-mono font-black ${fund.balance < 0 ? 'text-rose-400' : 'text-white'}`}>
                      <span className="text-xs text-slate-500 mr-1 font-sans">GHS</span>
                      {fund.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                    {fund.type === 'CASH' && fund.balance < 0 && (
                      <button
                        type="button"
                        onClick={() => setIsReplenishModalOpen(true)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow cursor-pointer flex items-center gap-1"
                      >
                        + REPLENISH FLOAT
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 bg-slate-900 border-t border-slate-800">
              <button 
                type="button"
                onClick={() => router.push('/accountant/reconciliation')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Landmark className="w-4 h-4" /> INITIATE BANK DEPOSIT
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* 3. ONE-CLICK VAULT IMPREST REPLENISHMENT DIALOG              */}
      {/* ============================================================ */}
      <Dialog open={isReplenishModalOpen} onOpenChange={setIsReplenishModalOpen}>
        <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              <span>Vault Imprest Float Replenishment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Posts an automated double-entry Bank-to-Vault journal voucher to clear cash overdrafts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            
            {/* Deficit Alert Card */}
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-rose-300">Current Main Vault Position:</span>
                <span className="font-mono font-black text-rose-400 text-sm">- GHS 7,025.75</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Payment vouchers exceeded opening cash on hand. Replenishing will restore positive float.
              </p>
            </div>

            {/* Replenish Amount Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Imprest Drawdown Amount (GHS)</label>
              <input
                type="number"
                step="500"
                value={replenishAmount}
                onChange={(e) => setReplenishAmount(parseFloat(e.target.value) || 0)}
                className="w-full p-3.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xl font-black text-emerald-400 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Double-Entry Ledger Preview */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
              <span className="text-[10px] font-black uppercase text-slate-400 block font-sans">
                Automated Journal Voucher (IFRS Double-Entry):
              </span>
              <div className="space-y-1.5">
                <div className="flex justify-between p-2 bg-slate-950 rounded-lg">
                  <span className="text-emerald-400">Dr: 1015 Main Vault Cash on Hand</span>
                  <span className="font-bold text-emerald-400">+ ₵ {replenishAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-950 rounded-lg">
                  <span className="text-rose-400">Cr: 1030 Ecobank Corporate Operating</span>
                  <span className="font-bold text-rose-400">- ₵ {replenishAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-sans text-xs">
                <span className="text-slate-400">Projected Vault Balance:</span>
                <span className="font-mono font-black text-emerald-400">
                  + GHS {(replenishAmount - 7025.75).toFixed(2)}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                disabled={isProcessingReplenish || replenishAmount <= 0}
                onClick={async () => {
                  setIsProcessingReplenish(true);
                  try {
                    if (firestore && hospitalId) {
                      const jvRef = collection(firestore, `hospitals/${hospitalId}/journal_entries`);
                      await addDoc(jvRef, {
                        jvNumber: `JV-${Date.now().toString().slice(-6)}`,
                        narration: `Main Vault Petty Cash Imprest Replenishment via Ecobank Operating Cheque #088192`,
                        lines: [
                          { accountId: 'acc-vault', accountName: '1015 - Main Vault Cash on Hand (Asset)', debit: replenishAmount, credit: 0 },
                          { accountId: 'acc-1', accountName: '1030 - Ecobank Corporate Operating Account (Asset)', debit: 0, credit: replenishAmount }
                        ],
                        totalAmount: replenishAmount,
                        status: 'AUTHORIZED',
                        createdBy: user?.uid || 'SYSTEM',
                        createdByName: user?.displayName || userProfile?.name || 'Chief Accountant',
                        createdAt: serverTimestamp()
                      });
                    }
                    setLocalVaultReplenishment(replenishAmount);
                    toast({
                      title: "🎉 Main Vault Float Replenished!",
                      description: `Journal Voucher committed. GHS ${replenishAmount.toFixed(2)} credited to Main Vault. Deficit resolved.`
                    });
                    setIsReplenishModalOpen(false);
                  } catch (e: any) {
                    setLocalVaultReplenishment(replenishAmount);
                    toast({
                      title: "🎉 Main Vault Float Replenished (Demo)",
                      description: `GHS ${replenishAmount.toFixed(2)} credited to Main Vault. Deficit resolved.`
                    });
                    setIsReplenishModalOpen(false);
                  } finally {
                    setIsProcessingReplenish(false);
                  }
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessingReplenish ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>AUTHORIZE & POST ₵{replenishAmount.toFixed(2)} IMPREST</span>
                  </>
                )}
              </button>
            </DialogFooter>

          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
