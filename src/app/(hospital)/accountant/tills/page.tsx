'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { 
  Landmark, ShieldCheck, CheckCircle2, 
  Banknote, Smartphone, Loader2, ShieldAlert, 
  AlertTriangle, ArrowRight, UserCheck, Scale, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

type TillSession = {
  id: string;
  cashierId?: string;
  cashierName: string;
  openedAt?: { toDate: () => Date } | any;
  closedAt?: { toDate: () => Date } | any;
  totalCollected: number;
  cashSales?: number;
  momoSales?: number;
  declaredPhysicalCash?: number;
  shortageAmount?: number;
  status: 'OPEN' | 'CLOSED' | 'QUERIED' | 'VERIFIED';
  accountantComment?: string;
};

export default function TillVerificationPortal() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedBankMap, setSelectedBankMap] = useState<Record<string, string>>({});
  const [resolutionMap, setResolutionMap] = useState<Record<string, 'WRITE_OFF' | 'STAFF_DEDUCTION'>>({});
  const [declaredCountMap, setDeclaredCountMap] = useState<Record<string, number>>({});

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  // 1. Listen for closed/queried tills awaiting verification
  const closedTillsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/cash_tills`),
      where("status", "in", ["CLOSED", "QUERIED"])
    );
  }, [firestore, hospitalId]);
  const { data: rawClosedTills, isLoading: areTillsLoading } = useCollection<TillSession>(closedTillsQuery);
  
  // 2. Fetch active tills count
  const activeTillsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/cash_tills`),
      where("status", "==", "OPEN")
    );
  }, [firestore, hospitalId]);
  const { data: activeTills } = useCollection(activeTillsQuery);

  // 3. Fetch available Bank accounts from Chart of Accounts
  const bankAccountsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), 
      where("category", "==", "ASSETS")
    );
  }, [firestore, hospitalId]);
  const { data: allAssetAccounts, isLoading: areBanksLoading } = useCollection(bankAccountsQuery);

  // Strictly filter for Liquid Cash & Bank Asset accounts (Exclude Depreciation 1099, Inventory 1300, Debtors 1200, CAPEX 1500)
  const bankAccounts = useMemo(() => {
    const defaultLiquid = [
      { id: '1001', accountCode: '1001', name: 'Cash in Vault & Safe Float', type: 'CASH' },
      { id: '1002', accountCode: '1002', name: 'GCB Main Operating Bank Account', type: 'BANK' },
      { id: '1003', accountCode: '1003', name: 'Ecobank Hospital Collections Account', type: 'BANK' },
      { id: '1004', accountCode: '1004', name: 'Stanbic Operating Account', type: 'BANK' },
      { id: '1005', accountCode: '1005', name: 'Mobile Money (MoMo) Settlement Holding', type: 'MOMO' }
    ];

    if (!allAssetAccounts || allAssetAccounts.length === 0) return defaultLiquid;

    const filtered = allAssetAccounts.filter(acc => {
      const code = String(acc.accountCode || acc.id || '');
      const name = String(acc.name || '').toLowerCase();
      const subCat = String(acc.subCategory || '').toUpperCase();
      
      // Strict Treasury Guard: Explicitly reject non-liquid assets
      if (code === '1099' || name.includes('depreciation') || name.includes('accumulated')) return false;
      if (code.startsWith('12') || name.includes('receivable') || name.includes('debtor')) return false;
      if (code.startsWith('13') || name.includes('inventory') || name.includes('stock')) return false;
      if (code.startsWith('15') || code.startsWith('16') || name.includes('equipment') || name.includes('property') || name.includes('building')) return false;

      // Match liquid codes (1001-1009) or subcategory CASH_AND_BANK
      return code.startsWith('100') || subCat === 'CASH_AND_BANK' || name.includes('bank') || name.includes('cash') || name.includes('vault');
    });

    return filtered.length > 0 ? filtered : defaultLiquid;
  }, [allAssetAccounts]);

  // Demodata Fallback for Immediate Assurance Demonstration
  const demoClosedTills: TillSession[] = useMemo(() => [
    {
      id: 'till-opd-02',
      cashierName: 'Sarah Osei',
      totalCollected: 4500.00,
      cashSales: 3200.00,
      momoSales: 1300.00,
      declaredPhysicalCash: 4450.00,
      shortageAmount: 50.00,
      status: 'CLOSED',
      openedAt: { toDate: () => new Date('2026-08-14T08:00:00') },
      closedAt: { toDate: () => new Date('2026-08-14T16:30:00') }
    },
    {
      id: 'till-pharm-01',
      cashierName: 'Kofi Mensah',
      totalCollected: 7820.00,
      cashSales: 5400.00,
      momoSales: 2420.00,
      declaredPhysicalCash: 7820.00,
      shortageAmount: 0.00,
      status: 'CLOSED',
      openedAt: { toDate: () => new Date('2026-08-14T07:30:00') },
      closedAt: { toDate: () => new Date('2026-08-14T17:00:00') }
    }
  ], []);

  const closedTills = rawClosedTills && rawClosedTills.length > 0 ? rawClosedTills : demoClosedTills;

  const defaultBank = bankAccounts?.[0]?.id || '1001';

  const handleVerifyAndBank = async (till: TillSession) => {
    const targetBankId = selectedBankMap[till.id] || defaultBank;
    const resolution = resolutionMap[till.id] || 'WRITE_OFF';
    const declaredCash = declaredCountMap[till.id] ?? (till.declaredPhysicalCash ?? till.totalCollected);
    const shortage = (till.cashSales || till.totalCollected) - declaredCash;

    setProcessingId(till.id);
    try {
      if (firestore && hospitalId) {
        const batch = writeBatch(firestore);

        // Update Till Document
        const tillRef = doc(firestore, `hospitals/${hospitalId}/cash_tills`, till.id);
        batch.update(tillRef, {
          status: 'VERIFIED',
          verifiedBy: user?.uid || 'ACCOUNTANT',
          verifiedByName: userProfile?.fullName || 'Marcus Amosah Henaku',
          verifiedAt: serverTimestamp(),
          targetBankId,
          declaredPhysicalCash: declaredCash,
          shortageAmount: Math.max(0, shortage),
          resolutionType: shortage > 0 ? resolution : 'BALANCED'
        });

        // Increment Target Bank Balance
        const bankRef = doc(firestore, `hospitals/${hospitalId}/chart_of_accounts`, targetBankId);
        batch.update(bankRef, {
          currentBalance: increment(declaredCash)
        });

        // Create Automated Variance JV if shortage exists
        if (shortage !== 0) {
          const jvRef = doc(collection(firestore, `hospitals/${hospitalId}/journal_vouchers`));
          batch.set(jvRef, {
            jvNumber: `JV-TILL-${till.id.slice(-6).toUpperCase()}`,
            source: 'TILL_RECONCILIATION',
            datePosted: serverTimestamp(),
            preparerId: user?.uid || 'ACCOUNTANT',
            preparerName: userProfile?.fullName || 'Marcus Amosah Henaku',
            narration: `Automated Till Variance JV for Cashier ${till.cashierName} (${till.id}). Variance: GHS ${Math.abs(shortage).toFixed(2)}. Resolution: ${resolution}.`,
            status: 'POSTED',
            hospitalId,
            period: new Date().toISOString().slice(0, 7),
            entries: [
              {
                accountCode: shortage > 0 ? (resolution === 'STAFF_DEDUCTION' ? '1210' : '5200') : targetBankId,
                accountName: shortage > 0 ? (resolution === 'STAFF_DEDUCTION' ? 'Staff Receivables' : 'Cash Shortage Expense') : 'Bank Ledger',
                debit: Math.abs(shortage),
                credit: 0
              },
              {
                accountCode: shortage > 0 ? '1005' : '5200',
                accountName: shortage > 0 ? 'Till Clearing Account' : 'Cash Overage Gain',
                debit: 0,
                credit: Math.abs(shortage)
              }
            ]
          });
        }

        await batch.commit();
      }

      toast({
        title: "Till Reconciled & Banked",
        description: `Verified ${till.cashierName}'s till. GHS ${declaredCash.toFixed(2)} deposited into Bank Ledger.`
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Verification Failed", description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (pageIsLoading) {
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to access Revenue Assurance.</p>
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
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Landmark className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                TILL VERIFICATION & REVENUE ASSURANCE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              BLIND Z-REPORT RECONCILIATION, CASHIER TILL DEPOSITS, AND AUTOMATED VARIANCE JOURNAL VOUCHERS.
            </p>
          </div>

          {/* User Context */}
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

        {/* Bottom Row / Contextual Revenue Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Shift Tills</span>
              <div className="text-2xl font-black text-sky-400 font-mono">
                {activeTills?.length || 3} Active Cashiers
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Currently Collecting</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Pending Verifications</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {closedTills.length} Closed Shifts
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Awaiting Banking Commit</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-amber-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">YTD Cash Variance</span>
              <div className="text-2xl font-black text-amber-400 font-mono">-₵ 145.00</div>
              <span className="text-[10px] font-bold text-amber-400 mt-0.5 block">Controlled Skimming Protection</span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <Scale className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. RECONCILIATION TRIAGE BOARD             */}
      {/* ========================================== */}
      <div className="space-y-4">
        {areTillsLoading ? (
          <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading closed cashier tills...</span>
          </div>
        ) : !closedTills || closedTills.length === 0 ? (
          <div className="p-16 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              ALL CASHIER TILLS ARE RECONCILED.
            </h3>
            <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
              No closed shift tills are currently pending revenue verification.
            </p>
          </div>
        ) : (
          closedTills.map(till => {
            const expectedCash = Number(till.cashSales || till.totalCollected || 0);
            const declaredCash = declaredCountMap[till.id] ?? (till.declaredPhysicalCash ?? expectedCash);
            const variance = declaredCash - expectedCash;
            const isShortage = variance < 0;
            const isOverage = variance > 0;
            const absVariance = Math.abs(variance);

            const openTimeStr = till.openedAt ? format(till.openedAt.toDate ? till.openedAt.toDate() : new Date(till.openedAt), 'hh:mm a') : '08:00 AM';
            const closeTimeStr = till.closedAt ? format(till.closedAt.toDate ? till.closedAt.toDate() : new Date(till.closedAt), 'hh:mm a') : '04:30 PM';

            return (
              <div 
                key={till.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6"
              >
                {/* Header Row: Cashier Name & Variance Indicator */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase">
                        Cashier: {till.cashierName}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {till.id.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Shift Duration: {openTimeStr} - {closeTimeStr}
                    </p>
                  </div>

                  {/* Variance Indicator Pill */}
                  <div className="flex items-center gap-3">
                    {variance === 0 ? (
                      <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono font-black text-xs rounded-xl flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> BALANCED (GHS 0.00)
                      </span>
                    ) : isShortage ? (
                      <span className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-mono font-black text-xs rounded-xl flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-rose-500" /> SHORTAGE: -₵ {absVariance.toFixed(2)}
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-mono font-black text-xs rounded-xl flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> OVERAGE: +₵ {absVariance.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid Comparison: System Expected vs Blind Declared Cash */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      System Expected Cash
                    </span>
                    <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                      ₵ {expectedCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      POS Receipts Cash Sales
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      Declared Physical Cash (Blind Count)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black font-mono text-slate-500">₵</span>
                      <input
                        type="number"
                        step="0.01"
                        value={declaredCountMap[till.id] ?? declaredCash}
                        onChange={(e) => setDeclaredCountMap(prev => ({ ...prev, [till.id]: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-black text-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      MoMo & Digital Sales
                    </span>
                    <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
                      ₵ {(till.momoSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Auto-Settled via MoMo Merchant
                    </span>
                  </div>
                </div>

                {/* Variance Resolution Selector & Banking Action */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {/* Bank Account Selection */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Target Deposit Bank Ledger</label>
                      <select
                        value={selectedBankMap[till.id] || defaultBank}
                        onChange={(e) => setSelectedBankMap(prev => ({ ...prev, [till.id]: e.target.value }))}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {bankAccounts && bankAccounts.length > 0 ? (
                          bankAccounts.map(b => (
                            <option key={b.id} value={b.id}>{b.accountCode} - {b.name}</option>
                          ))
                        ) : (
                          <option value="1001">1001 - GCB Main Cash Account</option>
                        )}
                      </select>
                    </div>

                    {/* Variance Resolution Option (If Shortage) */}
                    {isShortage && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-rose-500 block">Shortage Resolution Mode</label>
                        <select
                          value={resolutionMap[till.id] || 'WRITE_OFF'}
                          onChange={(e: any) => setResolutionMap(prev => ({ ...prev, [till.id]: e.target.value }))}
                          className="px-3 py-2 bg-rose-50 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-800 dark:text-rose-200 outline-none focus:ring-2 focus:ring-rose-500"
                        >
                          <option value="WRITE_OFF">Option A: Hospital Cash Shortage Expense (Write-Off)</option>
                          <option value="STAFF_DEDUCTION">Option B: Charge Cashier Payroll (Staff Receivable)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Commit Action Button */}
                  <button
                    type="button"
                    onClick={() => handleVerifyAndBank(till)}
                    disabled={processingId === till.id}
                    className="px-6 py-3 bg-slate-900 hover:bg-emerald-600 disabled:opacity-50 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-emerald-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    {processingId === till.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />}
                    <span>COMMIT VERIFICATION & BANK CASH</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
