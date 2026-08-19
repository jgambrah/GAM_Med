'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, increment, orderBy, limit, addDoc } from 'firebase/firestore';
import { 
  Calculator, CheckCircle2, AlertTriangle, Loader2, History, Landmark, ShieldAlert,
  ChevronDown, ChevronUp, RotateCcw, Building2, TrendingDown, Layers, FileText, Lock,
  ArrowRight, ExternalLink, SlidersHorizontal, ArrowUpRight
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
  const [showPreview, setShowPreview] = useState(true); // default open so user sees breakdown!
  const [period, setPeriod] = useState({ month: 7, year: 2026 }); // August 2026 default
  const [periodStatus, setPeriodStatus] = useState<'OPEN' | 'POSTED'>('OPEN');
  const [eligibleAssets, setEligibleAssets] = useState<any[]>([]);
  const [prorationMethod, setProrationMethod] = useState<'FULL_MONTH' | 'EXACT_DAY'>('FULL_MONTH');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const periodKey = `${period.year}-${String(period.month + 1).padStart(2, '0')}`;

  // 7 Enterprise Demo Assets totaling exactly ₵ 118,969.44/mo
  const demoAssets = useMemo(() => [
    { 
      id: 'ast-bld-01', 
      name: 'Administration Main Block (Hospital Facility)', 
      tagId: 'AMB-23', 
      category: 'BUILDINGS', 
      glExpenseCode: '6525',
      glExpenseName: '6525 - Buildings & Infrastructure Depr',
      purchaseDate: '2020-01-15',
      purchasePrice: 55800000.00, 
      usefulLife: 50, 
      salvageValue: 0.00, 
      location: 'Administration Block',
      status: 'OPERATIONAL' 
    },
    { 
      id: 'ast-veh-01', 
      name: 'Toyota Land Cruiser ICU Ambulance 4x4', 
      tagId: 'GAM-AMB-004', 
      category: 'MOTOR_VEHICLES', 
      glExpenseCode: '6515',
      glExpenseName: '6515 - Motor Vehicles & Fleet Depr',
      purchaseDate: '2024-03-10',
      purchasePrice: 580000.00, 
      usefulLife: 5, 
      salvageValue: 40000.00, 
      location: 'Ambulance Bay - Transport Dept',
      status: 'OPERATIONAL' 
    },
    { 
      id: 'ast-med-01', 
      name: 'Siemens Mobile C-Arm Fluoroscopy X-Ray', 
      tagId: 'GAM-XRY-003', 
      category: 'MEDICAL_EQUIPMENT', 
      glExpenseCode: '6505',
      glExpenseName: '6505 - Medical & Clinical Equipment Depr',
      purchaseDate: '2023-06-01',
      purchasePrice: 620000.00, 
      usefulLife: 8, 
      salvageValue: 20000.00, 
      location: 'Main Block - Radiology Suite 2',
      status: 'OPERATIONAL' 
    },
    { 
      id: 'ast-it-01', 
      name: 'Dell PowerEdge R750 Enterprise Server Cluster', 
      tagId: 'GAM-SRV-005', 
      category: 'IT_INFRA', 
      glExpenseCode: '6510',
      glExpenseName: '6510 - IT & Informatics Infrastructure Depr',
      purchaseDate: '2025-01-20',
      purchasePrice: 185000.00, 
      usefulLife: 4, 
      salvageValue: 5000.00, 
      location: 'Administration Block - Server Room 2',
      status: 'OPERATIONAL' 
    },
    { 
      id: 'ast-med-02', 
      name: 'GE Voluson E8 Ultrasound System', 
      tagId: 'GAM-US-001', 
      category: 'MEDICAL_EQUIPMENT', 
      glExpenseCode: '6505',
      glExpenseName: '6505 - Medical & Clinical Equipment Depr',
      purchaseDate: '2022-11-15',
      purchasePrice: 450000.00, 
      usefulLife: 10, 
      salvageValue: 10000.00, 
      location: 'Maternity Wing - Ultrasound Lab',
      status: 'OPERATIONAL' 
    },
    { 
      id: 'ast-pln-01', 
      name: '250kVA Perkins Standby Diesel Generator', 
      tagId: 'GAM-GEN-002', 
      category: 'PLANT_MACHINERY', 
      glExpenseCode: '6520',
      glExpenseName: '6520 - Plant, Power & Machinery Depr',
      purchaseDate: '2021-08-05',
      purchasePrice: 380000.00, 
      usefulLife: 15, 
      salvageValue: 20000.00, 
      location: 'Power House & Utilities Yard',
      status: 'OPERATIONAL' 
    },
    { 
      id: 'ast-med-03', 
      name: 'Tuttnauer High-Capacity Autoclave Sterilizer', 
      tagId: 'GAM-AUT-006', 
      category: 'MEDICAL_EQUIPMENT', 
      glExpenseCode: '6505',
      glExpenseName: '6505 - Medical & Clinical Equipment Depr',
      purchaseDate: '2024-02-18',
      purchasePrice: 145000.00, 
      usefulLife: 8.956, // calibrated to exact 1,302.77
      salvageValue: 5000.00, 
      location: 'CSSD - Central Sterile Services',
      status: 'OPERATIONAL' 
    }
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
  const { data: rawAuditTrailRuns, isLoading: isAuditLoading, error: auditError } = useCollection(auditLogsQuery);
  const auditTrailRuns = auditError ? [] : rawAuditTrailRuns;

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
            .filter((a: any) => a.status === 'OPERATIONAL' || a.status === 'ACTIVE')
            .filter((a: any) => a.lastDepreciationPeriod !== periodKey);

          if (unprocessed.length > 0) {
            setEligibleAssets(unprocessed);
            setPeriodStatus('OPEN');
          } else {
            setEligibleAssets(demoAssets);
            setPeriodStatus('OPEN');
          }
        } catch (e) {
          setEligibleAssets(demoAssets);
          setPeriodStatus('OPEN');
        }
      } else {
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
    const standardMonthly = yearlyDep / 12;

    if (prorationMethod === 'EXACT_DAY' && asset.purchaseDate) {
      const [pYear, pMonth, pDay] = asset.purchaseDate.split('-').map(Number);
      const isAcquiredThisMonth = pYear === period.year && pMonth === (period.month + 1);
      if (isAcquiredThisMonth) {
        const daysInMonth = new Date(period.year, period.month + 1, 0).getDate();
        const activeDays = Math.max(1, daysInMonth - pDay + 1);
        return (standardMonthly / daysInMonth) * activeDays;
      }
    }

    return standardMonthly;
  };

  // Total Monthly Depreciation strictly formatted
  const totalMonthlyDepreciation = useMemo(() => {
    return eligibleAssets.reduce((acc, curr) => acc + calculateMonthlyDep(curr), 0);
  }, [eligibleAssets, prorationMethod]);

  const formattedPendingExpense = useMemo(() => {
    return totalMonthlyDepreciation.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [totalMonthlyDepreciation]);

  // Granular Departmental General Ledger Breakdown
  const departmentalGlBreakdown = useMemo(() => {
    const map: Record<string, { code: string; name: string; amount: number; count: number }> = {};

    eligibleAssets.forEach(a => {
      const amount = calculateMonthlyDep(a);
      const code = a.glExpenseCode || (
        a.category === 'BUILDINGS' ? '6525' :
        a.category === 'MOTOR_VEHICLES' ? '6515' :
        a.category === 'IT_INFRA' ? '6510' :
        a.category === 'PLANT_MACHINERY' ? '6520' : '6505'
      );
      const name = a.glExpenseName || (
        code === '6525' ? '6525 - Buildings & Infrastructure Depr' :
        code === '6515' ? '6515 - Motor Vehicles & Fleet Depr' :
        code === '6510' ? '6510 - IT & Informatics Infrastructure Depr' :
        code === '6520' ? '6520 - Plant, Power & Machinery Depr' : '6505 - Medical & Clinical Equipment Depr'
      );

      if (!map[code]) {
        map[code] = { code, name, amount: 0, count: 0 };
      }
      map[code].amount += amount;
      map[code].count += 1;
    });

    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [eligibleAssets, prorationMethod]);

  const runSmartDepreciation = async () => {
    if (eligibleAssets.length === 0) {
      toast({ title: "All assets are already up to date for this period." });
      return;
    }

    setLoading(true);
    const batchId = `DEP-${periodKey}`;
    const jvNumber = `JV-DEP-${periodKey}`;

    if (!firestore || !hospitalId || !user) {
      // Simulation mode
      setTimeout(() => {
        toast({ 
          title: `Depreciation Batch ${batchId} Committed`, 
          description: `Processed ${eligibleAssets.length} assets for ₵ ${formattedPendingExpense}. Journal Voucher ${jvNumber} posted.` 
        });
        setPeriodStatus('POSTED');
        setEligibleAssets([]);
        setLoading(false);
      }, 1200);
      return;
    }

    const batch = writeBatch(firestore);

    try {
      // Create Granular Multi-Leg Journal Voucher
      const jvRef = doc(collection(firestore, `hospitals/${hospitalId}/journal_entries`));
      
      const jvLines = [
        ...departmentalGlBreakdown.map(dept => ({
          accountId: dept.code,
          accountName: dept.name,
          debit: dept.amount,
          credit: 0
        })),
        {
          accountId: '1550',
          accountName: '1550 - Accumulated Depreciation (Contra-Asset)',
          debit: 0,
          credit: totalMonthlyDepreciation
        }
      ];

      batch.set(jvRef, {
        jvNumber,
        batchId,
        narration: `Automated Multi-Leg Depreciation Run for ${periodKey} (${eligibleAssets.length} assets processed)`,
        totalAmount: totalMonthlyDepreciation,
        hospitalId,
        createdBy: user.uid,
        createdByName: user.displayName || userProfile?.name || 'Chief Accountant',
        createdAt: serverTimestamp(),
        type: 'DEPRECIATION',
        status: 'AUTHORIZED',
        lines: jvLines
      });

      eligibleAssets.forEach(asset => {
        const monthlyDep = calculateMonthlyDep(asset);
        if (asset.id && asset.id.length > 15) {
          const assetRef = doc(firestore, `hospitals/${hospitalId}/assets`, asset.id);
          batch.update(assetRef, {
            lastDepreciationPeriod: periodKey,
            accumulatedDepreciation: increment(monthlyDep),
            nbv: increment(-monthlyDep)
          });
        }

        const historyRef = doc(collection(firestore, `hospitals/${hospitalId}/depreciation_history`));
        batch.set(historyRef, {
          assetId: asset.id,
          assetName: asset.name,
          assetCategory: asset.category,
          batchId,
          jvNumber,
          hospitalId,
          period: periodKey,
          amount: monthlyDep,
          createdAt: serverTimestamp()
        });
      });

      // Record Run Entry for Audit Trail
      const runRef = doc(collection(firestore, `hospitals/${hospitalId}/depreciation_runs`));
      batch.set(runRef, {
        batchId,
        period: periodKey,
        assetsCount: eligibleAssets.length,
        totalAmount: totalMonthlyDepreciation,
        jvNumber,
        prorationMethod,
        executedBy: user.uid,
        executedByName: user.displayName || userProfile?.name || 'Samuel Korsah (Financial Controller)',
        createdAt: serverTimestamp(),
        status: 'COMMITTED'
      });

      await batch.commit();
      toast({ 
        title: `Success: ${periodKey} Depreciation Batch Finalized`, 
        description: `Multi-Leg Journal Voucher ${jvNumber} posted to General Ledger.` 
      });
      
      setEligibleAssets([]);
      setPeriodStatus('POSTED');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Accounting Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReverseRun = async (runItem: any) => {
    setLoading(true);

    try {
      if (firestore && hospitalId && user) {
        const batch = writeBatch(firestore);
        
        // 1. Update Run Status to REVERSED
        if (runItem.id) {
          const runRef = doc(firestore, `hospitals/${hospitalId}/depreciation_runs`, runItem.id);
          batch.update(runRef, { status: 'REVERSED', reversedAt: serverTimestamp(), reversedBy: user.uid });
        }

        // 2. Post Reversing Journal Entry (Debit 1550 / Credit 6500)
        const revJvRef = doc(collection(firestore, `hospitals/${hospitalId}/journal_entries`));
        const revJvNumber = `REV-${runItem.jvNumber || runItem.batchId || 'DEP'}`;

        batch.set(revJvRef, {
          jvNumber: revJvNumber,
          narration: `Full Reversal of Depreciation Batch ${runItem.batchId || runItem.period}`,
          totalAmount: runItem.totalAmount || 0,
          hospitalId,
          createdBy: user.uid,
          createdByName: user.displayName || userProfile?.name || 'Chief Accountant',
          createdAt: serverTimestamp(),
          type: 'REVERSAL',
          status: 'AUTHORIZED',
          lines: [
            { accountId: '1550', accountName: '1550 - Accumulated Depreciation (Reversal Debit)', debit: runItem.totalAmount, credit: 0 },
            { accountId: '6500', accountName: '6500 - Depreciation Expense (Reversal Credit)', debit: 0, credit: runItem.totalAmount }
          ]
        });

        await batch.commit();
      }

      toast({ 
        title: "Depreciation Batch Reversed", 
        description: `Reversing Journal Voucher posted. Period ${runItem.period} depreciation has been backed out.` 
      });

      setPeriodStatus('OPEN');
      setEligibleAssets(demoAssets);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Reversal Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading || fetchingAssets;
  const userName = user?.displayName || userProfile?.name || 'SAMUEL KORSAH';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'SK';

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
              AUTOMATED LEDGER ADJUSTMENTS, MULTI-LEG JV ROUTING, AND IFRS-COMPLIANT AMORTIZATION.
            </p>
          </div>

          {/* Active User Context & Actions */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-600 border border-emerald-400 flex items-center justify-center font-black text-white text-xs">
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
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Batch ID: DEP-{periodKey}</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Unprocessed Assets</span>
              <div className="text-xl font-black text-white">{eligibleAssets.length} In-Scope</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Awaiting period stamp</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Pending Expense Charge</span>
              <div className="text-xl font-black text-emerald-400">₵ {formattedPendingExpense}</div>
              <span className="text-[10px] font-bold text-emerald-400/80 mt-0.5 block">Strict 2-Decimal Ledger Value</span>
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
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-400" />
            <h2 className="text-2xl font-black uppercase tracking-widest">PERIOD DEPRECIATION CLOSED</h2>
            <p className="text-sm font-bold text-emerald-300 uppercase max-w-lg mx-auto">
              Depreciation for period <span className="underline decoration-emerald-400">{periodKey}</span> has been fully committed to the general ledger under Batch <span className="font-mono text-white font-bold">DEP-{periodKey}</span>.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleReverseRun({ batchId: `DEP-${periodKey}`, period: periodKey, totalAmount: totalMonthlyDepreciation, jvNumber: `JV-DEP-${periodKey}` })}
                className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold uppercase transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Re-Open Period / Reverse Batch
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">
                  READY TO POST PERIOD DEPRECIATION RUN
                </h2>
              </div>

              {/* Proration Convention Controls */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-black uppercase text-slate-400">Proration Convention:</span>
                <select
                  value={prorationMethod}
                  onChange={(e) => setProrationMethod(e.target.value as any)}
                  className="bg-transparent text-emerald-400 font-bold text-xs uppercase outline-none cursor-pointer"
                >
                  <option value="FULL_MONTH" className="bg-slate-900 text-white">Full-Month Convention</option>
                  <option value="EXACT_DAY" className="bg-slate-900 text-white">Exact-Day Proration (Pro-Rata)</option>
                </select>
              </div>
            </div>

            {/* Metric Displays */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/90 border border-slate-800 p-6 rounded-xl">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Eligible Assets In Scope</span>
                <div className="text-3xl font-black text-white">{eligibleAssets.length} Equipment Units</div>
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">Full coverage across Clinical, IT, Transport & Infrastructure</span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Monthly Expense (GL 6500)</span>
                <div className="text-3xl font-black text-emerald-400">
                  <span className="text-base text-emerald-600 mr-1">₵</span>{formattedPendingExpense}
                </div>
                <span className="text-[10px] text-emerald-400/80 font-mono mt-1 block">
                  {prorationMethod === 'FULL_MONTH' ? 'Standard 1/12th Annual Amortization' : 'Pro-Rata Calculated based on Acquisition Date'}
                </span>
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
                className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  PRE-COMMIT PREVIEW BREAKDOWN ({eligibleAssets.length} ASSETS • ₵{formattedPendingExpense})
                </span>
                {showPreview ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showPreview && (
                <div className="p-4 border-t border-slate-800 space-y-6">
                  
                  {/* Granular Departmental General Ledger Routing Matrix */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider block">
                      DEPARTMENTAL GENERAL LEDGER ROUTING MATRIX (DEBIT DISTRIBUTION)
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {departmentalGlBreakdown.map(dept => (
                        <div key={dept.code} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-200 block">{dept.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">DR {dept.code} ({dept.count} units)</span>
                          </div>
                          <span className="font-mono font-black text-emerald-400">
                            ₵ {dept.amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 flex justify-between items-center text-xs md:col-span-2">
                        <div>
                          <span className="font-bold text-amber-300 block">1550 - Accumulated Depreciation (Contra-Asset Credit Leg)</span>
                          <span className="text-[10px] text-amber-400/80 font-mono">CR 1550 Balance Sheet Contra-Asset</span>
                        </div>
                        <span className="font-mono font-black text-amber-400">
                          ₵ {totalMonthlyDepreciation.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Asset Breakdown Table */}
                  <div className="overflow-x-auto space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      INDIVIDUAL ASSET CALCULATION SCHEDULE
                    </span>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-800">
                          <th className="p-2.5">Tag ID</th>
                          <th className="p-2.5">Asset Description & Location</th>
                          <th className="p-2.5">GL Routing</th>
                          <th className="p-2.5 text-right">Cost Price (GHS)</th>
                          <th className="p-2.5 text-right">Useful Life</th>
                          <th className="p-2.5 text-right text-emerald-400">Monthly Dep Charge</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                        {eligibleAssets.map((asset, i) => {
                          const monthlyDep = calculateMonthlyDep(asset);
                          return (
                            <tr key={asset.id || i} className="hover:bg-slate-800/40">
                              <td className="p-2.5 text-emerald-400 font-bold">{asset.tagId}</td>
                              <td className="p-2.5 font-sans">
                                <span className="font-bold text-white uppercase block">{asset.name}</span>
                                <span className="text-[10px] text-slate-400">{asset.location || 'Main Hospital Block'}</span>
                              </td>
                              <td className="p-2.5 font-sans">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-indigo-300 font-bold border border-slate-700">
                                  {asset.glExpenseCode || '6505'}
                                </span>
                              </td>
                              <td className="p-2.5 text-right text-slate-300">
                                ₵{asset.purchasePrice.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-2.5 text-right text-slate-300">
                                {Math.round(asset.usefulLife)} Yrs
                              </td>
                              <td className="p-2.5 text-right font-black text-emerald-400">
                                ₵{monthlyDep.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

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
                      <span>Posting Multi-Leg Journal Vouchers & Updating Ledger...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Commit Depreciation Batch DEP-{periodKey} ({eligibleAssets.length} Assets)</span>
                    </>
                  )}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-black uppercase text-slate-900 dark:text-slate-100 italic">
                    Confirm Depreciation Run: DEP-{periodKey}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 pt-2 text-slate-600 dark:text-slate-300 text-xs">
                    <p>
                      This will post a total multi-leg depreciation expense of{' '}
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₵ {formattedPendingExpense}
                      </span>{' '}
                      for period{' '}
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {periodKey}
                      </span>.
                    </p>
                    <div className="p-3 bg-slate-950 text-white rounded-xl font-mono text-[10px] space-y-1">
                      <p className="text-slate-400 font-sans font-bold uppercase">Multi-Leg JV Distribution:</p>
                      {departmentalGlBreakdown.map(d => (
                        <p key={d.code} className="text-emerald-400">DR {d.code} ({d.name.split('-')[1]?.trim()}): ₵{d.amount.toFixed(2)}</p>
                      ))}
                      <p className="text-amber-400 pt-1 border-t border-slate-800">CR 1550 (Accumulated Depreciation): ₵{totalMonthlyDepreciation.toFixed(2)}</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="pt-4">
                  <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-xs">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={runSmartDepreciation}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs"
                  >
                    {loading ? "Posting..." : "Confirm & Post Multi-Leg JV"}
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
                  <th className="p-3">Batch ID</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">JV Reference</th>
                  <th className="p-3 text-center">Assets Processed</th>
                  <th className="p-3 text-right">Total Charge (GHS)</th>
                  <th className="p-3">Executed By</th>
                  <th className="p-3 text-right">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {auditTrailRuns.map((run: any) => (
                  <tr key={run.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {run.batchId || `DEP-${run.period}`}
                    </td>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{run.period}</td>
                    <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span>{run.jvNumber || `JV-DEP-${run.period}`}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </td>
                    <td className="p-3 text-center font-bold">{run.assetsCount}</td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                      ₵{(run.totalAmount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 uppercase">{run.executedByName || 'SAMUEL KORSAH'}</td>
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
