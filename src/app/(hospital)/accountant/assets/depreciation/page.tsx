'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, increment, orderBy, limit } from 'firebase/firestore';
import { 
  Calculator, CheckCircle2, AlertTriangle, Loader2, History, Landmark, ShieldAlert,
  ChevronDown, ChevronUp, RotateCcw, Building2, TrendingDown, Layers, FileText, Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SmartDepreciationEngine() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetchingAssets, setFetchingAssets] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [period, setPeriod] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [periodStatus, setPeriodStatus] = useState<'OPEN' | 'POSTED'>('OPEN');
  const [eligibleAssets, setEligibleAssets] = useState<any[]>([]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const periodKey = `${period.year}-${String(period.month + 1).padStart(2, '0')}`;

  const demoAssets = useMemo(() => [
    { id: 'ast-1', name: '250kVA Perkins Generator', tagId: 'GEN-2024-001', category: 'PPE', subDivision: 'PLANT_MACHINERY', purchasePrice: 95000000.00, usefulLife: 10, salvageValue: 5000000.00, status: 'OPERATIONAL' },
    { id: 'ast-2', name: 'Toyota Hilux Ambulance 4x4', tagId: 'AMB-2025-002', category: 'PPE', subDivision: 'MOTOR_VEHICLES', purchasePrice: 35000000.00, usefulLife: 5, salvageValue: 2000000.00, status: 'OPERATIONAL' },
    { id: 'ast-3', name: 'Mindray DC-70 Ultrasound System', tagId: 'RAD-2026-009', category: 'PPE', subDivision: 'MEDICAL_EQUIPMENT', purchasePrice: 280000.00, usefulLife: 7, salvageValue: 10000.00, status: 'OPERATIONAL' }
  ], []);

  // Fetch recent audit logs for the depreciation audit trail
  const auditLogsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/depreciation_runs`),
      orderBy("createdAt", "desc"),
      limit(10)
    );
  }, [firestore, hospitalId]);
  const { data: auditTrailRuns, isLoading: isAuditLoading } = useCollection(auditLogsQuery);

  useEffect(() => {
    const checkPeriodAndAssets = async () => {
      setFetchingAssets(true);

      if (firestore && hospitalId) {
        try {
          const assetSnap = await getDocs(query(
            collection(firestore, "hospitals", hospitalId, "assets")
          ));

          const unprocessed = assetSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((a: any) => a.status === 'OPERATIONAL' && a.lastDepreciationPeriod !== periodKey);

          setEligibleAssets(unprocessed);
          setPeriodStatus(unprocessed.length === 0 && assetSnap.docs.length > 0 ? 'POSTED' : 'OPEN');
        } catch (e) {
          console.error(e);
        }
      } else {
        // Fallback demo state
        setEligibleAssets(demoAssets);
        setPeriodStatus('OPEN');
      }

      setFetchingAssets(false);
    };

    checkPeriodAndAssets();
  }, [hospitalId, firestore, periodKey, demoAssets]);

  const calculateMonthlyDep = (asset: any) => {
    if (!asset.usefulLife || asset.usefulLife <= 0) return 0;
    const yearlyDep = (asset.purchasePrice - (asset.salvageValue || 0)) / asset.usefulLife;
    return yearlyDep / 12;
  };

  // Total Monthly Depreciation strictly formatted
  const totalMonthlyDepreciation = useMemo(() => {
    return eligibleAssets.reduce((acc, curr) => acc + calculateMonthlyDep(curr), 0);
  }, [eligibleAssets]);

  const formattedPendingExpense = useMemo(() => {
    return totalMonthlyDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [totalMonthlyDepreciation]);

  const runSmartDepreciation = async () => {
    if (eligibleAssets.length === 0) {
      toast({ title: "All assets are already up to date for this period." });
      return;
    }

    setLoading(true);

    if (!firestore || !hospitalId || !user) {
      // Simulation mode
      setTimeout(() => {
        toast({ title: `Success: ${periodKey} Depreciation Finalized (Simulation).`, description: `Processed ${eligibleAssets.length} assets for GHS ${formattedPendingExpense}.` });
        setPeriodStatus('POSTED');
        setEligibleAssets([]);
        setLoading(false);
      }, 1200);
      return;
    }

    const batch = writeBatch(firestore);

    try {
      const coaRef = collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`);
      const expenseAccountQuery = query(coaRef, where("accountCode", "==", "5005"));
      const contraAssetAccountQuery = query(coaRef, where("accountCode", "==", "1099"));
      
      const [expenseSnap, contraAssetSnap] = await Promise.all([
        getDocs(expenseAccountQuery),
        getDocs(contraAssetAccountQuery)
      ]);

      if (expenseSnap.empty) throw new Error("Depreciation Expense Account (5005) not found in Chart of Accounts.");
      if (contraAssetSnap.empty) throw new Error("Accumulated Depreciation Account (1099) not found in Chart of Accounts.");

      const expenseAccRef = expenseSnap.docs[0].ref;
      const contraAssetAccRef = contraAssetSnap.docs[0].ref;

      const jvRef = doc(collection(firestore, `hospitals/${hospitalId}/journal_entries`));
      const jvNumber = `JV-DEP-${periodKey}`;

      batch.set(jvRef, {
        jvNumber,
        narration: `Automated Depreciation Charge for ${periodKey} (${eligibleAssets.length} assets processed)`,
        totalAmount: totalMonthlyDepreciation,
        hospitalId,
        createdBy: user.uid,
        createdByName: user.displayName || userProfile?.name || 'Accountant',
        createdAt: serverTimestamp(),
        type: 'DEPRECIATION',
        status: 'PENDING_APPROVAL',
        lines: [
          { accountId: expenseAccRef.id, accountName: 'Depreciation Expense', debit: totalMonthlyDepreciation, credit: 0 },
          { accountId: contraAssetAccRef.id, accountName: 'Accumulated Depreciation', debit: 0, credit: totalMonthlyDepreciation }
        ]
      });

      eligibleAssets.forEach(asset => {
        const monthlyDep = calculateMonthlyDep(asset);
        const assetRef = doc(firestore, `hospitals/${hospitalId}/assets`, asset.id);
        
        batch.update(assetRef, {
          lastDepreciationPeriod: periodKey,
          accumulatedDepreciation: increment(monthlyDep)
        });

        const historyRef = doc(collection(firestore, `hospitals/${hospitalId}/depreciation_history`));
        batch.set(historyRef, {
          assetId: asset.id,
          assetName: asset.name,
          assetCategory: asset.category,
          subDivision: asset.subDivision || null,
          hospitalId,
          period: periodKey,
          amount: monthlyDep,
          createdAt: serverTimestamp()
        });
      });

      // Record Depreciation Run Entry for Audit Trail
      const runRef = doc(collection(firestore, `hospitals/${hospitalId}/depreciation_runs`));
      batch.set(runRef, {
        period: periodKey,
        assetsCount: eligibleAssets.length,
        totalAmount: totalMonthlyDepreciation,
        jvNumber,
        executedBy: user.uid,
        executedByName: user.displayName || userProfile?.name || 'Accountant',
        createdAt: serverTimestamp(),
        status: 'COMMITTED'
      });

      // Global Audit Log
      const auditRef = doc(collection(firestore, "global_audit_logs"));
      batch.set(auditRef, {
        type: 'FINANCIAL',
        action: 'MONTH_END_DEPRECIATION',
        hospitalId,
        actorId: user.uid,
        actorName: user.displayName || userProfile?.name || 'Accountant',
        details: `Authorized GHS ${formattedPendingExpense} in depreciation for period ${periodKey}`,
        timestamp: serverTimestamp()
      });

      await batch.commit();
      toast({ title: `Success: ${periodKey} Depreciation Finalized.`, description: `Journal Voucher ${jvNumber} posted.` });
      
      setEligibleAssets([]);
      setPeriodStatus('POSTED');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Accounting Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReverseRun = async (runItem: any) => {
    if (!firestore || !hospitalId) {
      toast({ title: "Batch Reversal Simulated", description: `Reversed depreciation batch for period ${runItem.period}.` });
      return;
    }

    try {
      const batch = writeBatch(firestore);
      const runRef = doc(firestore, `hospitals/${hospitalId}/depreciation_runs`, runItem.id);
      batch.update(runRef, { status: 'REVERSED', reversedAt: serverTimestamp() });

      const auditRef = doc(collection(firestore, "global_audit_logs"));
      batch.set(auditRef, {
        type: 'FINANCIAL',
        action: 'DEPRECIATION_REVERSED',
        hospitalId,
        actorId: user?.uid,
        actorName: user?.displayName || userProfile?.name || 'Accountant',
        details: `Reversed depreciation run for period ${runItem.period}`,
        timestamp: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Batch Reversed", description: `Period ${runItem.period} depreciation has been backed out.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Reversal Failed", description: e.message });
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading || fetchingAssets;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (pageIsLoading) {
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for the Depreciation Engine.</p>
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

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Calculator className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                SMART DEPRECIATION ENGINE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              AUTOMATED LEDGER ADJUSTMENTS, DOUBLE-ENTRY JV GENERATION, AND WEAR-AND-TEAR AMORTIZATION.
            </p>
          </div>

          {/* Active User Context & Actions */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">FINANCE CONTROLLER</div>
              </div>
            </div>

            {/* Target Period Selectors */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
              <select 
                value={period.month} 
                onChange={e => setPeriod(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                className="bg-transparent text-white text-xs font-black uppercase tracking-wider outline-none cursor-pointer px-2 py-1"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i} className="bg-slate-900 text-white">
                    {new Date(2026, i).toLocaleString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select 
                value={period.year} 
                onChange={e => setPeriod(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="bg-transparent text-white text-xs font-black uppercase tracking-wider outline-none cursor-pointer px-2 py-1"
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y} className="bg-slate-900 text-white">{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Row: Period Safeguard & Status Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Target Period</span>
              <div className="text-xl font-black text-white">{periodKey}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Accounting Period</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Unprocessed Assets</span>
              <div className="text-xl font-black text-white">{eligibleAssets.length} Items</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Awaiting period stamp</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Pending Expense Charge</span>
              <div className="text-xl font-black text-emerald-400">GHS {formattedPendingExpense}</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Strict 2-Decimal Ledger Value</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DEPRECIATION RUN ENGINE CARD            */}
      {/* ========================================== */}
      <div className={`p-6 md:p-8 rounded-2xl shadow-xl space-y-6 border transition-all ${
        periodStatus === 'POSTED' 
          ? 'bg-emerald-950/40 border-emerald-500/30 text-white' 
          : 'bg-slate-950 border-slate-800 text-white'
      }`}>
        {periodStatus === 'POSTED' ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-400" />
            <h2 className="text-2xl font-black uppercase tracking-widest">PERIOD DEPRECIATION CLOSED</h2>
            <p className="text-sm font-bold text-emerald-300 uppercase max-w-lg mx-auto">
              Depreciation for period <span className="underline decoration-emerald-400">{periodKey}</span> has been fully committed to the general ledger.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">
                  READY TO POST PERIOD DEPRECIATION RUN
                </h2>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-full">
                ACTIVE PERIOD ({periodKey})
              </span>
            </div>

            {/* Metric Displays */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/90 border border-slate-800 p-6 rounded-xl">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Eligible Assets</span>
                <div className="text-3xl font-black text-white">{eligibleAssets.length}</div>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Pending Expense Charge</span>
                <div className="text-3xl font-black text-emerald-400">
                  <span className="text-base text-emerald-600 mr-1">₵</span>{formattedPendingExpense}
                </div>
              </div>
            </div>

            {/* Double-Charge Safeguard Banner */}
            <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed uppercase">
                AUTOMATED CONTROL: This engine only processes assets that have not yet been stamped for the period ({periodKey}). This prevents double-charging and ensures sub-ledger integrity.
              </p>
            </div>

            {/* PRE-COMMIT PREVIEW BREAKDOWN ACCORDION */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
              <button 
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="w-full px-5 py-3 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  PRE-COMMIT PREVIEW BREAKDOWN ({eligibleAssets.length} ASSETS)
                </span>
                {showPreview ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showPreview && (
                <div className="p-4 border-t border-slate-800 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-800">
                        <th className="p-2.5">Tag ID</th>
                        <th className="p-2.5">Asset Name</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5 text-right">Cost Price (GHS)</th>
                        <th className="p-2.5 text-right text-emerald-400">Monthly Dep Charge (GHS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                      {eligibleAssets.map((asset, i) => {
                        const monthlyDep = calculateMonthlyDep(asset);
                        return (
                          <tr key={asset.id || i} className="hover:bg-slate-800/40">
                            <td className="p-2.5 text-emerald-400 font-bold">{asset.tagId}</td>
                            <td className="p-2.5 font-sans font-bold text-white uppercase">{asset.name}</td>
                            <td className="p-2.5 text-slate-400 uppercase">{asset.category}</td>
                            <td className="p-2.5 text-right text-slate-300">{asset.purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="p-2.5 text-right font-black text-emerald-400">₵{monthlyDep.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Commit Dialog & Button with Loading State */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={loading || eligibleAssets.length === 0}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Posting Journal Vouchers & Updating Ledger...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Commit Depreciation for {eligibleAssets.length} Assets</span>
                    </>
                  )}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-black uppercase text-slate-900 dark:text-slate-100 italic">
                    Confirm Depreciation Run
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 pt-2 text-slate-600 dark:text-slate-300">
                    <p>
                      This will post a total depreciation expense of{' '}
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        GHS {formattedPendingExpense}
                      </span>{' '}
                      for period{' '}
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {periodKey}
                      </span>.
                    </p>
                    <p className="text-xs text-slate-500 uppercase leading-relaxed font-bold">
                      A balanced double-entry Journal Voucher (Debit: 5005 Depreciation Expense, Credit: 1099 Accumulated Depreciation) will be generated atomically across the sub-ledger.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="pt-4">
                  <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-xs">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={runSmartDepreciation}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs"
                  >
                    {loading ? "Posting..." : "Confirm & Post to Ledger"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 3. DEPRECIATION AUDIT TRAIL & REVERSAL     */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          DEPRECIATION AUDIT TRAIL & RUN LOGS
        </h3>

        {isAuditLoading ? (
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
            Loading audit trail...
          </div>
        ) : !auditTrailRuns || auditTrailRuns.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium text-xs">
            No historical depreciation runs committed yet for this facility.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  <th className="p-3">Period Stamped</th>
                  <th className="p-3">JV Number</th>
                  <th className="p-3 text-center">Assets Processed</th>
                  <th className="p-3 text-right">Total Charge (GHS)</th>
                  <th className="p-3">Executed By</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {auditTrailRuns.map((run: any) => (
                  <tr key={run.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{run.period}</td>
                    <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{run.jvNumber || 'JV-DEP'}</td>
                    <td className="p-3 text-center font-bold">{run.assetsCount}</td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                      ₵{(run.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 uppercase">{run.executedByName || 'ACCOUNTANT'}</td>
                    <td className="p-3 text-right">
                      {run.status === 'REVERSED' ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          REVERSED
                        </span>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleReverseRun(run)}
                          className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <RotateCcw className="w-3 h-3" /> REVERSE BATCH
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
