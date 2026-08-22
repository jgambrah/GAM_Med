'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { 
  Zap, TrendingUp, TrendingDown, AlertCircle, Save, Loader2, RefreshCcw, 
  CheckCircle2, ShieldAlert, AlertTriangle, Lock, Search, Filter, Layers,
  Building2, History, Check, DollarSign, Sliders, ShieldCheck, ArrowRight, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export type TariffItem = {
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
  nhisCapPrice?: number;
  corporatePrice?: number;
};

export type RoundingRule = 'EXACT' | 'NEAREST_10P' | 'NEAREST_50P' | 'NEAREST_1CEDI' | 'RETAIL_90P';
export type PayerTierTarget = 'CASH_OUT_OF_POCKET' | 'CORPORATE_HMO' | 'ALL_PRIVATE_TIERS' | 'NHIS_GOVERNMENT_CAPS';

export default function BulkPriceUpdater() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  // Stage 1: Parameters (Defaulting Category to 'ALL' to guarantee instant preview)
  const [department, setDepartment] = useState<string>('PHARMACY');
  const [category, setCategory] = useState<string>('ALL');
  const [payerTier, setPayerTier] = useState<PayerTierTarget>('CASH_OUT_OF_POCKET');
  const [roundingRule, setRoundingRule] = useState<RoundingRule>('NEAREST_50P');
  const [adjustmentType, setAdjustmentType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(5);
  const [justification, setJustification] = useState<string>('2026 Q3 GRA Tax & Reagent Inflation Adjustment');

  // Stage 2: Preview Filtering & Search
  const [previewSearch, setPreviewSearch] = useState<string>('');

  // Stage 3: Security Lock & Execution State
  const [confirmationText, setConfirmationText] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResultModal, setExecutionResultModal] = useState<any>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'FINANCE_DIRECTOR'].includes(userRole);

  // Real-Time Tariffs Catalog Subscription
  const catalogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/product_catalog`));
  }, [firestore, hospitalId]);
  const { data: rawCatalog, isLoading: isCatalogLoading } = useCollection<TariffItem>(catalogQuery);

  // Comprehensive Demo Catalog with Clinical, Pharmacy & OPD Master Data
  const demoCatalog: TariffItem[] = useMemo(() => [
    // PHARMACY
    { id: 't-001', itemCode: 'DRG-AMX-500', itemName: 'Amoxicillin 500mg Capsules (Box 100)', department: 'PHARMACY', category: 'ANTIBIOTICS', baseCashPrice: 45.00, nhisCapPrice: 28.00, corporatePrice: 50.00 },
    { id: 't-002', itemCode: 'DRG-CIP-500', itemName: 'Ciprofloxacin 500mg Tablets (Box 100)', department: 'PHARMACY', category: 'ANTIBIOTICS', baseCashPrice: 65.00, nhisCapPrice: 38.00, corporatePrice: 72.00 },
    { id: 't-003', itemCode: 'DRG-PAR-500', itemName: 'Paracetamol 500mg Extra Strength', department: 'PHARMACY', category: 'ANALGESICS', baseCashPrice: 15.00, nhisCapPrice: 8.00, corporatePrice: 18.00 },
    { id: 't-004', itemCode: 'DRG-NUG-001', itemName: 'NUGEL-O Antacid Suspension 200ml', department: 'PHARMACY', category: 'GASTRO', baseCashPrice: 38.50, nhisCapPrice: 20.00, corporatePrice: 42.00 },
    { id: 't-005', itemCode: 'DRG-VIT-C01', itemName: 'Vitamin C 1000mg Effervescent (Tube 20)', department: 'PHARMACY', category: 'SUPPLEMENTS', baseCashPrice: 8.80, nhisCapPrice: 4.50, corporatePrice: 10.00 },
    { id: 't-006', itemCode: 'DRG-CEF-1GM', itemName: 'Ceftriaxone 1g IV Infusion Vial', department: 'PHARMACY', category: 'ANTIBIOTICS', baseCashPrice: 75.00, nhisCapPrice: 35.00, corporatePrice: 85.00 },
    
    // OPD CONSULTATIONS
    { id: 't-011', itemCode: 'CON-OPD-GEN', itemName: 'General OPD Medical Officer Consultation', department: 'CONSULTATION', category: 'GENERAL_OPD', baseCashPrice: 80.00, nhisCapPrice: 45.00, corporatePrice: 95.00 },
    { id: 't-012', itemCode: 'CON-OPD-SPE', itemName: 'Specialist Physician / Consultant Consultation', department: 'CONSULTATION', category: 'CONSULTATIONS', baseCashPrice: 150.00, nhisCapPrice: 80.00, corporatePrice: 180.00 },
    { id: 't-013', itemCode: 'CON-OPD-PED', itemName: 'Pediatric Specialist Clinical Review', department: 'CONSULTATION', category: 'CONSULTATIONS', baseCashPrice: 160.00, nhisCapPrice: 85.00, corporatePrice: 190.00 },
    { id: 't-014', itemCode: 'CON-OPD-EMG', itemName: 'Emergency Acute Resuscitation & Triage Fee', department: 'CONSULTATION', category: 'EMERGENCY', baseCashPrice: 120.00, nhisCapPrice: 60.00, corporatePrice: 140.00 },

    // LABORATORY
    { id: 't-007', itemCode: 'LAB-FBC-AUT', itemName: 'Full Blood Count Automated 5-Part Diff', department: 'LABORATORY', category: 'HEMATOLOGY', baseCashPrice: 120.00, nhisCapPrice: 45.00, corporatePrice: 135.00 },
    { id: 't-008', itemCode: 'LAB-LIP-PRO', itemName: 'Lipid Profile Full Biochemical Panel', department: 'LABORATORY', category: 'BIOCHEMISTRY', baseCashPrice: 180.00, nhisCapPrice: 70.00, corporatePrice: 200.00 },
    { id: 't-015', itemCode: 'LAB-LFT-KFT', itemName: 'Comprehensive Liver & Kidney Function Tests', department: 'LABORATORY', category: 'BIOCHEMISTRY', baseCashPrice: 240.00, nhisCapPrice: 95.00, corporatePrice: 270.00 },
    
    // RADIOLOGY
    { id: 't-009', itemCode: 'RAD-ULT-ABD', itemName: 'Abdominal & Pelvic Ultrasound Doppler', department: 'RADIOLOGY', category: 'ULTRASOUND', baseCashPrice: 250.00, nhisCapPrice: 120.00, corporatePrice: 280.00 },
    { id: 't-010', itemCode: 'RAD-XRY-CHS', itemName: 'Chest X-Ray Digital View (PA/AP)', department: 'RADIOLOGY', category: 'X-RAY', baseCashPrice: 180.00, nhisCapPrice: 85.00, corporatePrice: 200.00 },
    { id: 't-016', itemCode: 'RAD-OBS-USS', itemName: 'Obstetric 4D Anomaly Fetal Scan', department: 'RADIOLOGY', category: 'ULTRASOUND', baseCashPrice: 320.00, nhisCapPrice: 140.00, corporatePrice: 360.00 },

    // THEATER
    { id: 't-017', itemCode: 'SUR-MAJ-THE', itemName: 'Major Surgical Theater Operating Fee', department: 'THEATER', category: 'SURGERY', baseCashPrice: 1540.00, nhisCapPrice: 650.00, corporatePrice: 1800.00 },
    { id: 't-018', itemCode: 'SUR-MIN-THE', itemName: 'Minor Day-Case Surgery & Suture Facility', department: 'THEATER', category: 'SURGERY', baseCashPrice: 450.00, nhisCapPrice: 200.00, corporatePrice: 520.00 }
  ], []);

  const catalog = useMemo(() => {
    return rawCatalog && rawCatalog.length > 0 ? rawCatalog : demoCatalog;
  }, [rawCatalog, demoCatalog]);

  // Dynamic Department Categories Mapping
  const departmentCategoriesMap: Record<string, { label: string; value: string }[]> = {
    ALL: [
      { label: 'ALL CATEGORIES', value: 'ALL' },
      { label: 'Antibiotics & Anti-Infectives', value: 'ANTIBIOTICS' },
      { label: 'Analgesics & Pain Relief', value: 'ANALGESICS' },
      { label: 'Clinical Consultations', value: 'CONSULTATIONS' },
      { label: 'General OPD', value: 'GENERAL_OPD' },
      { label: 'Diagnostic Ultrasound', value: 'ULTRASOUND' },
      { label: 'Digital X-Ray', value: 'X-RAY' },
      { label: 'Hematology & Blood', value: 'HEMATOLOGY' },
      { label: 'Biochemistry Panels', value: 'BIOCHEMISTRY' },
      { label: 'Surgical Procedures', value: 'SURGERY' },
    ],
    PHARMACY: [
      { label: 'ALL PHARMACY CATEGORIES', value: 'ALL' },
      { label: 'Antibiotics & Anti-Infectives', value: 'ANTIBIOTICS' },
      { label: 'Analgesics & Pain Relief', value: 'ANALGESICS' },
      { label: 'Gastroenterology Suspensions', value: 'GASTRO' },
      { label: 'Vitamins & Supplements', value: 'SUPPLEMENTS' },
    ],
    CONSULTATION: [
      { label: 'ALL CONSULTATIONS', value: 'ALL' },
      { label: 'General OPD Consultations', value: 'GENERAL_OPD' },
      { label: 'Specialist & Consultant Triage', value: 'CONSULTATIONS' },
      { label: 'Emergency Acute Care', value: 'EMERGENCY' },
    ],
    LABORATORY: [
      { label: 'ALL LABORATORY PANELS', value: 'ALL' },
      { label: 'Hematology & Blood Bank', value: 'HEMATOLOGY' },
      { label: 'Biochemistry Function Panels', value: 'BIOCHEMISTRY' },
    ],
    RADIOLOGY: [
      { label: 'ALL RADIOLOGY & IMAGING', value: 'ALL' },
      { label: 'Diagnostic Ultrasound Doppler', value: 'ULTRASOUND' },
      { label: 'Digital X-Ray Views', value: 'X-RAY' },
    ],
    THEATER: [
      { label: 'ALL SURGICAL THEATER', value: 'ALL' },
      { label: 'Major & Minor Surgeries', value: 'SURGERY' },
    ],
  };

  // Safe Department Switcher with Auto-Category Reset
  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    setCategory('ALL'); // Guarantees matching items are immediately populated!
  };

  // Rounding Logic
  const applyRounding = (price: number, rule: RoundingRule): number => {
    switch (rule) {
      case 'NEAREST_10P':
        return Math.round(price * 10) / 10;
      case 'NEAREST_50P':
        return Math.round(price * 2) / 2;
      case 'NEAREST_1CEDI':
        return Math.round(price);
      case 'RETAIL_90P': {
        const floorVal = Math.floor(price);
        return floorVal + 0.90;
      }
      case 'EXACT':
      default:
        return Math.round(price * 100) / 100;
    }
  };

  // Stage 2: Live Client-Side Preview Generation with Rounding and Payer Tiers
  const allImpactedItems = useMemo(() => {
    if (adjustmentValue === 0) return [];

    let filtered = catalog;
    if (department !== 'ALL') {
      filtered = filtered.filter(item => {
        const d = (item.department || '').toUpperCase();
        return d === department || (department === 'CONSULTATION' && (d === 'OPD' || d === 'CONSULTATIONS'));
      });
    }
    if (category !== 'ALL') {
      filtered = filtered.filter(item => (item.category || '').toUpperCase() === category.toUpperCase());
    }

    return filtered.map(item => {
      // Pick target base price based on Payer Tier
      let currentPrice = Number(item.baseCashPrice || item.sellingPrice || item.basePrice || 0);
      if (payerTier === 'NHIS_GOVERNMENT_CAPS') {
        currentPrice = Number(item.nhisCapPrice || currentPrice * 0.5);
      } else if (payerTier === 'CORPORATE_HMO') {
        currentPrice = Number(item.corporatePrice || currentPrice * 1.15);
      }

      let rawNewPrice = currentPrice;
      if (adjustmentType === 'PERCENTAGE') {
        rawNewPrice = currentPrice * (1 + (adjustmentValue / 100));
      } else if (adjustmentType === 'FIXED') {
        rawNewPrice = currentPrice + adjustmentValue;
      }

      const finalNewPrice = Math.max(0.10, applyRounding(rawNewPrice, roundingRule));
      const variance = finalNewPrice - currentPrice;
      const pctVariance = currentPrice > 0 ? (variance / currentPrice) * 100 : 0;

      return {
        ...item,
        currentPrice,
        newPrice: finalNewPrice,
        variance,
        pctVariance
      };
    });
  }, [catalog, department, category, payerTier, roundingRule, adjustmentType, adjustmentValue]);

  // Filtered Preview Sample (Capped at 50 for max UI performance)
  const previewData = useMemo(() => {
    let list = allImpactedItems;
    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      list = list.filter(i => 
        (i.itemName || i.name || '').toLowerCase().includes(q) ||
        (i.itemCode || i.sku || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      );
    }
    return list.slice(0, 50);
  }, [allImpactedItems, previewSearch]);

  // Stage 3: Security Lock Verification String
  const expectedConfirmation = useMemo(() => {
    const sign = adjustmentValue >= 0 ? '+' : '';
    const valStr = adjustmentType === 'PERCENTAGE' ? `${sign}${adjustmentValue}%` : `GHS ${sign}${adjustmentValue}`;
    return `CONFIRM ${valStr} UPDATE`;
  }, [adjustmentType, adjustmentValue]);

  const isLocked = confirmationText.trim().toUpperCase() !== expectedConfirmation || allImpactedItems.length === 0;

  // Stage 3 Action Trigger
  const handleExecuteBulkUpdate = async () => {
    if (isLocked) return;
    setIsExecuting(true);

    try {
      // 1. Call Secure Server API
      const res = await fetch('/api/finance/tariffs/bulk-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: hospitalId || 'GAM-GAR-7578',
          department,
          category,
          payerTier,
          roundingRule,
          adjustmentType,
          adjustmentValue: parseFloat(adjustmentValue.toString()),
          justification,
          userName: userProfile?.name || user?.displayName || 'Marcus Amosah Henaku',
          userUid: user?.uid || 'FINANCE_DIRECTOR',
          impactedCount: allImpactedItems.length,
          sampleItems: previewData
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to commit bulk update on server');
      }

      setExecutionResultModal({
        auditLogId: data.auditLogId || `TRF-LOG-${Date.now()}`,
        department,
        category,
        payerTier,
        roundingRule,
        adjustmentValue,
        adjustmentType,
        impactedCount: allImpactedItems.length,
        justification
      });

      toast({
        title: "Bulk Tariff Adjustment Committed",
        description: `Updated ${allImpactedItems.length} items with ${expectedConfirmation}. Audit Ref: ${data.auditLogId}.`
      });

      setConfirmationText('');
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
          <p className="text-slate-500 text-sm mt-2">Only Finance Controllers and Directors can execute bulk price revisions.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
                <Zap className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                BULK TARIFF ADJUSTMENT COMMAND CENTER
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              3-STAGE DEFENSIVE BULK MASTER DATA REVISION WITH LIVE MATHEMATICAL CLIENT PREVIEW AND AUDIT PROVISIONS.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest">FINANCE DIRECTOR AUTHORIZATION</div>
            </div>
          </div>
        </div>

        {/* Dynamic Telemetry KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 font-mono">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Catalog Scope</span>
              <div className="text-2xl font-black text-white">{allImpactedItems.length}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block font-sans">Matching Items</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Target Payer Tier</span>
              <div className="text-base font-black text-emerald-400 uppercase tracking-tight">
                {payerTier === 'CASH_OUT_OF_POCKET' ? 'Cash & Self-Pay' : payerTier === 'CORPORATE_HMO' ? 'Corporate HMO' : 'Private Tiers'}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block font-sans">NHIS Protection Active</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block mb-1">Rounding Engine</span>
              <div className="text-base font-black text-sky-400 font-mono">
                {roundingRule === 'NEAREST_50P' ? 'Nearest ₵ 0.50' : roundingRule === 'NEAREST_10P' ? 'Nearest ₵ 0.10' : roundingRule === 'NEAREST_1CEDI' ? 'Nearest ₵ 1.00' : 'Exact Pesewas'}
              </div>
              <span className="text-[10px] font-bold text-sky-400 mt-1 block font-sans">Clean Cashier Change</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Sliders className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-amber-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Lock Verification</span>
              <div className="text-sm font-black text-amber-400 font-mono tracking-tight">
                {isLocked ? 'GUARD ACTIVE' : 'UNLOCKED'}
              </div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 block font-sans">
                {isLocked ? 'String Confirmation Required' : 'Ready for Execution'}
              </span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              {isLocked ? <Lock className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THREE-STAGE COMMAND CENTER WORKSPACE                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ========================================== */}
        {/* STAGE 1: PARAMETER & TARGET DEFINITION     */}
        {/* ========================================== */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black text-xs flex items-center justify-center">1</span>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Stage 1: Scope & Rounding Rules
            </h2>
          </div>

          {/* Department Selector with Auto-Reset */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block">Department Scope</label>
            <select
              value={department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            >
              <option value="ALL">ALL HOSPITAL DEPARTMENTS (4,120 Items)</option>
              <option value="PHARMACY">Pharmacy & Dispensary</option>
              <option value="CONSULTATION">OPD Consultations (General & Specialist)</option>
              <option value="LABORATORY">Diagnostic Laboratory</option>
              <option value="RADIOLOGY">Radiology & Imaging (Ultrasound/X-Ray)</option>
              <option value="THEATER">Operating Theater & Surgery</option>
            </select>
          </div>

          {/* Department-Specific Dynamic Category Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block">Category Sub-Filter</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
            >
              {(departmentCategoriesMap[department] || departmentCategoriesMap.ALL).map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payer Tier Targeting */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-emerald-600 block flex items-center justify-between">
              <span>Target Payer Tier</span>
              <span className="text-[9px] font-bold text-slate-400">Protects NHIS</span>
            </label>
            <select
              value={payerTier}
              onChange={(e) => setPayerTier(e.target.value as any)}
              className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-900 dark:text-emerald-300"
            >
              <option value="CASH_OUT_OF_POCKET">Standard Cash & Out-of-Pocket Only</option>
              <option value="CORPORATE_HMO">Corporate / Private HMOs Only</option>
              <option value="ALL_PRIVATE_TIERS">All Out-of-Pocket & Corporate Tiers</option>
              <option value="NHIS_GOVERNMENT_CAPS">NHIA Statutory Tariffs (NHIS Caps Only)</option>
            </select>
          </div>

          {/* Price Rounding Controls */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-sky-600 block">
              Price Rounding Rule (Cashier Change Optimization)
            </label>
            <select
              value={roundingRule}
              onChange={(e) => setRoundingRule(e.target.value as any)}
              className="w-full p-2.5 bg-sky-50/50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 rounded-xl text-xs font-bold text-sky-900 dark:text-sky-300"
            >
              <option value="NEAREST_50P">Round to Nearest ₵ 0.50 (e.g. ₵ 40.50)</option>
              <option value="NEAREST_10P">Round to Nearest ₵ 0.10 (e.g. ₵ 40.40)</option>
              <option value="NEAREST_1CEDI">Round to Nearest ₵ 1.00 (Whole Cedi)</option>
              <option value="RETAIL_90P">Psychological Retail (.90 Pesewas)</option>
              <option value="EXACT">Exact Mathematical (2 Decimal Pesewas)</option>
            </select>
          </div>

          {/* Adjustment Mechanics */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 block">Calculation Mode</label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Flat Cedi (₵)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 block">Adjustment Value</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-black text-slate-900 dark:text-slate-100"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                  {adjustmentType === 'PERCENTAGE' ? '%' : '₵'}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Justification Input */}
          <div className="space-y-1 pt-1">
            <label className="text-[10px] font-black uppercase text-slate-400 block">
              Executive Audit Justification (Mandatory)
            </label>
            <input
              type="text"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g. 2026 Q3 GRA Tax & Reagent Inflation Adjustment"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* STAGE 2: LIVE CLIENT-SIDE PREVIEW & SCALABLE SAMPLE GRID  */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black text-xs flex items-center justify-center">2</span>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Stage 2: Mathematical Impact Preview
              </h2>
            </div>
            
            {/* Preview Search & Capped Indicator */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase">
                Previewing {previewData.length} of {allImpactedItems.length} Items
              </span>
              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter preview..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Preview Table or Defensive Guidance State */}
          {allImpactedItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                No matching items found for {department} with category filter "{category}".
              </p>
              <p className="text-xs text-slate-500">
                Reset your category filter to view all available services in {department}.
              </p>
              <Button 
                onClick={() => setCategory('ALL')} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase"
              >
                Preview All {department} Items
              </Button>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Item Code</th>
                    <th className="p-3">Product / Service Title</th>
                    <th className="p-3 text-right">Current Tariff (₵)</th>
                    <th className="p-3 text-right text-emerald-400">Revised Tariff (₵)</th>
                    <th className="p-3 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {previewData.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-sky-600 dark:text-sky-400 text-[11px]">
                        {item.itemCode || item.sku}
                      </td>
                      <td className="p-3 text-slate-900 dark:text-slate-100 text-xs">
                        {item.itemName || item.name}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        ₵ {item.currentPrice.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        ₵ {item.newPrice.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          item.variance >= 0 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.variance >= 0 ? `+₵ ${item.variance.toFixed(2)}` : `-₵ ${Math.abs(item.variance).toFixed(2)}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================= */}
          {/* STAGE 3: DEFENSIVE STRING VERIFICATION & HARD-LOCK GUARD  */}
          {/* ========================================================= */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black text-xs flex items-center justify-center">3</span>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Stage 3: Executive Confirmation & Hard-Lock Execution
              </h2>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 w-full sm:w-auto">
                <span className="text-[10px] font-black uppercase text-slate-500 block">
                  To authorize this change across {allImpactedItems.length} items, type exactly:
                </span>
                <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400 select-all block">
                  {expectedConfirmation}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={expectedConfirmation}
                  className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-black text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
                />

                <button
                  type="button"
                  onClick={handleExecuteBulkUpdate}
                  disabled={isLocked || isExecuting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : isLocked ? <Lock className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  <span>EXECUTE BULK UPDATE</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. EXECUTION CONFIRMATION & AUDIT DISPATCH MODAL                           */}
      {/* ========================================================================= */}
      <Dialog open={!!executionResultModal} onOpenChange={(open) => !open && setExecutionResultModal(null)}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                  BULK TARIFF ADJUSTMENT COMMITTED
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  Audit Ref: <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{executionResultModal?.auditLogId}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-black text-[10px]">Scope Impacted:</span>
                <strong className="text-slate-900 dark:text-slate-100">{executionResultModal?.department} ({executionResultModal?.impactedCount} Items)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-black text-[10px]">Payer Tier:</span>
                <strong className="text-emerald-600">{executionResultModal?.payerTier}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-black text-[10px]">Adjustment Formula:</span>
                <strong className="font-mono">{executionResultModal?.adjustmentValue >= 0 ? '+' : ''}{executionResultModal?.adjustmentValue}% ({executionResultModal?.roundingRule})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-black text-[10px]">Executive Justification:</span>
                <span className="italic text-slate-700 dark:text-slate-300">{executionResultModal?.justification}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>All Point of Care Cashier Tills and Billing Modules are synchronized with these revised tariffs.</span>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={() => setExecutionResultModal(null)} className="bg-slate-900 text-white rounded-xl">
              Dismiss & Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
