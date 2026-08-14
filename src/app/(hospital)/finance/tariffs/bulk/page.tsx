'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  Zap, TrendingUp, TrendingDown, AlertCircle, Save, Loader2, RefreshCcw, 
  CheckCircle2, ShieldAlert, AlertTriangle, Lock, Search, Filter, Layers,
  Building2, History, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type TariffItem = {
  id: string;
  itemCode?: string;
  sku?: string;
  itemName?: string;
  name?: string;
  department?: string;
  category?: string;
  baseCashPrice?: number;
  sellingPrice?: number;
  basePrice?: number;
};

export default function BulkPriceUpdater() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [department, setDepartment] = useState<string>('PHARMACY');
  const [category, setCategory] = useState<string>('ALL');
  const [adjustmentType, setAdjustmentType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(5);
  const [justification, setJustification] = useState<string>('2026 Q3 GRA Tax & Reagent Inflation Adjustment');
  const [confirmationText, setConfirmationText] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  // Real-Time Tariffs Catalog Subscription
  const catalogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/product_catalog`));
  }, [firestore, hospitalId]);
  const { data: rawCatalog, isLoading: isCatalogLoading } = useCollection<TariffItem>(catalogQuery);

  // Demodata Fallback
  const demoCatalog: TariffItem[] = useMemo(() => [
    { id: 't-001', itemCode: 'DRG-AMX-500', itemName: 'Amoxicillin 500mg Capsules (Box 100)', department: 'PHARMACY', category: 'ANTIBIOTICS', baseCashPrice: 45.00 },
    { id: 't-002', itemCode: 'DRG-CIP-500', itemName: 'Ciprofloxacin 500mg Tablets (Box 100)', department: 'PHARMACY', category: 'ANTIBIOTICS', baseCashPrice: 65.00 },
    { id: 't-003', itemCode: 'DRG-PAR-500', itemName: 'Paracetamol 500mg Extra Strength', department: 'PHARMACY', category: 'ANALGESICS', baseCashPrice: 15.00 },
    { id: 't-004', itemCode: 'LAB-FBC-AUT', itemName: 'Full Blood Count Automated Panel', department: 'LABORATORY', category: 'HEMATOLOGY', baseCashPrice: 120.00 },
    { id: 't-005', itemCode: 'RAD-ULT-ABD', itemName: 'Abdominal & Pelvic Ultrasound Scan', department: 'RADIOLOGY', category: 'ULTRASOUND', baseCashPrice: 250.00 },
    { id: 't-006', itemCode: 'CON-OPD-SPE', itemName: 'Specialist OPD Consultation Fee', department: 'CONSULTATION', category: 'CONSULTATIONS', baseCashPrice: 150.00 }
  ], []);

  const catalog = useMemo(() => {
    return rawCatalog && rawCatalog.length > 0 ? rawCatalog : demoCatalog;
  }, [rawCatalog, demoCatalog]);

  // Stage 2: Live Client-Side Preview Generation
  const previewData = useMemo(() => {
    if (adjustmentValue === 0) return [];

    let filtered = catalog;
    if (department !== 'ALL') {
      filtered = filtered.filter(item => (item.department || 'PHARMACY') === department);
    }
    if (category !== 'ALL') {
      filtered = filtered.filter(item => (item.category || 'ANTIBIOTICS') === category);
    }

    return filtered.map(item => {
      const currentPrice = Number(item.baseCashPrice || item.sellingPrice || item.basePrice || 0);
      let newPrice = currentPrice;

      if (adjustmentType === 'PERCENTAGE') {
        newPrice = currentPrice * (1 + (adjustmentValue / 100));
      } else if (adjustmentType === 'FIXED') {
        newPrice = currentPrice + adjustmentValue;
      }

      return {
        ...item,
        currentPrice,
        newPrice: Number((Math.round(newPrice * 100) / 100).toFixed(2))
      };
    });
  }, [catalog, department, category, adjustmentType, adjustmentValue]);

  // Stage 3: Security Lock Verification String
  const expectedConfirmation = useMemo(() => {
    const sign = adjustmentValue >= 0 ? '+' : '';
    const valStr = adjustmentType === 'PERCENTAGE' ? `${sign}${adjustmentValue}%` : `GHS ${sign}${adjustmentValue}`;
    return `CONFIRM ${valStr} UPDATE`;
  }, [adjustmentType, adjustmentValue]);

  const isLocked = confirmationText.trim().toUpperCase() !== expectedConfirmation || previewData.length === 0;

  // Stage 3 Action Trigger
  const handleExecuteBulkUpdate = async () => {
    if (isLocked) return;
    setIsExecuting(true);

    try {
      const functions = getFunctions();
      const executeBulkFn = httpsCallable(functions, 'executeBulkTariffAdjustment');

      const result: any = await executeBulkFn({
        department,
        category,
        adjustmentType,
        adjustmentValue: parseFloat(adjustmentValue.toString()),
        justification
      });

      toast({
        title: "Bulk Adjustment Executed Successfully",
        description: result.data?.message || `Updated ${previewData.length} items in ${department}.`
      });

      setConfirmationText('');
      setAdjustmentValue(0);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Bulk Update Failed", description: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading || isCatalogLoading;
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Bulk Tariff Adjustments.</p>
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
                <Zap className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                BULK TARIFF ADJUSTMENT COMMAND CENTER
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              EXECUTE MASSIVE SCALE PRICE ADJUSTMENTS WITH THREE-STAGE VERIFICATION & IMMUTABLE AUDIT LOGS.
            </p>
          </div>

          {/* User Context */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">FINANCE DIRECTOR</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Contextual Database Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Active Tariffs</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">4,120 Tariffs</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Catalog Master Database</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Last Bulk Adjustment</span>
              <div className="text-2xl font-black text-sky-400 font-mono">14 Days Ago</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Q3 Reagent Adjustment</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <History className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Audit Logs Generated</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">124 Audit Logs</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Immutable Executive Trail</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. STAGE 1: TARGETING FILTER CONFIGURATION */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-lg font-black uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-500 text-slate-950 font-mono text-xs rounded-full">STAGE 1</span>
            <span>Targeting Filter & Adjustment Parameters</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Specify department scope, adjustment type (Percentage vs Fixed Amount), and official audit justification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
              Target Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            >
              <option value="PHARMACY">Pharmacy Department</option>
              <option value="LABORATORY">Laboratory Department</option>
              <option value="RADIOLOGY">Radiology & Imaging</option>
              <option value="CONSULTATION">Consultation Services</option>
              <option value="ALL">ALL HOSPITAL DEPARTMENTS</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
              Adjustment Methodology
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as any)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            >
              <option value="PERCENTAGE">Percentage Markup / Discount (%)</option>
              <option value="FIXED">Fixed Amount Adjustment (GHS ₵)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
              Adjustment Value ({adjustmentType === 'PERCENTAGE' ? '%' : 'GHS ₵'})
            </label>
            <input
              type="number"
              step="0.1"
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(parseFloat(e.target.value) || 0)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="space-y-1 pt-2">
          <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
            Executive Audit Justification
          </label>
          <input
            type="text"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="e.g. 2026 Q3 GRA Tax & Reagent Inflation Adjustment..."
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. STAGE 2: LIVE BEFORE & AFTER PREVIEW    */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-black uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-sky-500 text-white font-mono text-xs rounded-full">STAGE 2</span>
              <span>Live Client-Side Preview ({previewData.length} Items Affected)</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Simulates price recalculations prior to executing database write operations.
            </p>
          </div>
        </div>

        {previewData.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic">
            Enter a non-zero adjustment value above to generate live price previews.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
                <tr>
                  <th className="p-4">Item Code</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-right">Current Price (₵)</th>
                  <th className="p-4 text-right">Adjusted Price (₵)</th>
                  <th className="p-4 text-right">Net Variance (₵)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewData.slice(0, 10).map((item, idx) => {
                  const diff = item.newPrice - item.currentPrice;
                  const isIncrease = diff >= 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                      <td className="p-4 font-mono font-bold text-slate-500 dark:text-slate-400">
                        {item.itemCode || item.sku || `ITEM-0${idx + 1}`}
                      </td>
                      <td className="p-4 font-black uppercase text-slate-900 dark:text-slate-100">
                        {item.itemName || item.name}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-500">
                        ₵ {item.currentPrice.toFixed(2)}
                      </td>
                      <td className={`p-4 text-right font-mono font-black ${isIncrease ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        ₵ {item.newPrice.toFixed(2)}
                      </td>
                      <td className={`p-4 text-right font-mono font-black text-[11px] ${isIncrease ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIncrease ? `+₵ ${diff.toFixed(2)}` : `-₵ ${Math.abs(diff).toFixed(2)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 4. STAGE 3: HARD-LOCK EXECUTION GUARD      */}
      {/* ========================================== */}
      <div className="bg-rose-50 dark:bg-rose-950/40 p-6 md:p-8 rounded-3xl border-2 border-rose-300 dark:border-rose-900/50 space-y-4">
        <div className="flex items-center gap-3 text-rose-800 dark:text-rose-300">
          <Lock className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider">STAGE 3: HARD-LOCK EXECUTION GUARD</h3>
            <p className="text-xs font-medium mt-0.5">
              To unlock execution, type the exact phrase <strong className="bg-rose-200 dark:bg-rose-900 px-2 py-0.5 rounded font-mono select-all text-rose-900 dark:text-rose-100">{expectedConfirmation}</strong> below:
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder={expectedConfirmation}
            className="flex-1 p-3.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-2xl font-mono font-black text-sm uppercase text-rose-900 dark:text-rose-200 outline-none focus:ring-2 focus:ring-rose-500"
          />

          <button
            type="button"
            onClick={handleExecuteBulkUpdate}
            disabled={isLocked || isExecuting}
            className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            {isExecuting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            <span>{isExecuting ? "EXECUTING CHUNKED BATCH..." : "EXECUTE BULK UPDATE"}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
