'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc, writeBatch, increment } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2, Truck, Zap, Activity,
  Plus, Search, TrendingDown, Wrench,
  ShieldCheck, Calculator, Calendar, Loader2, ShieldAlert,
  Filter, CheckCircle2, FileText, MoreHorizontal, Edit3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { ASSET_GROUPS, PPE_SUB_DIVISIONS } from '@/lib/constants';
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

const assetGroupIds = ASSET_GROUPS.map(g => g.id) as [string, ...string[]];

const assetSchema = z.object({
  name: z.string().min(1, "Asset Name is required."),
  category: z.enum(assetGroupIds, { required_error: "Category is required."}),
  subDivision: z.string().optional(),
  tagId: z.string().min(1, "Asset Tag ID is required."),
  purchaseDate: z.string().min(1, "Purchase Date is required."),
  purchasePrice: z.coerce.number().min(0, "Purchase Price must be a positive number."),
  usefulLife: z.coerce.number().min(1, "Useful Life must be at least 1 year."),
  salvageValue: z.coerce.number().min(0, "Salvage Value cannot be negative."),
  status: z.string().min(1, "Status is required."),
}).refine(data => {
  if (data.category === 'PPE' && !data.subDivision) {
    return false;
  }
  return true;
}, {
  message: "Sub-Division is required for PPE assets.",
  path: ["subDivision"],
});

type AssetFormValues = z.infer<typeof assetSchema>;

export default function FixedAssetManagementPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const assetsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'assets'));
  }, [firestore, hospitalId]);
  const { data: rawAssets, isLoading: areAssetsLoading } = useCollection(assetsQuery);

  const coaQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`));
  }, [firestore, hospitalId]);
  const { data: coa } = useCollection(coaQuery);

  const [periodMonth, setPeriodMonth] = useState(() => new Date().getMonth());
  const [periodYear, setPeriodYear] = useState(() => new Date().getFullYear());

  const periodKey = useMemo(() => {
    return `${periodYear}-${String(periodMonth + 1).padStart(2, '0')}`;
  }, [periodMonth, periodYear]);

  const demoAssets = useMemo(() => [
    {
      id: 'ast-1',
      name: '250kVA Perkins Generator',
      tagId: 'GEN-2024-001',
      category: 'PPE',
      subDivision: 'PLANT_MACHINERY',
      purchaseDate: '2024-01-15',
      purchasePrice: 95000000.00,
      usefulLife: 10,
      salvageValue: 5000000.00,
      accumulatedDepreciation: 14490033.66,
      status: 'OPERATIONAL'
    },
    {
      id: 'ast-2',
      name: 'Toyota Hilux Ambulance 4x4',
      tagId: 'AMB-2025-002',
      category: 'PPE',
      subDivision: 'MOTOR_VEHICLES',
      purchaseDate: '2025-03-10',
      purchasePrice: 35000000.00,
      usefulLife: 5,
      salvageValue: 2000000.00,
      accumulatedDepreciation: 5173928.35,
      status: 'OPERATIONAL'
    },
    {
      id: 'ast-3',
      name: 'Mindray DC-70 Ultrasound System',
      tagId: 'RAD-2026-009',
      category: 'PPE',
      subDivision: 'MEDICAL_EQUIPMENT',
      purchaseDate: '2026-02-01',
      purchasePrice: 280000.00,
      usefulLife: 7,
      salvageValue: 10000.00,
      accumulatedDepreciation: 43914.27,
      status: 'OPERATIONAL'
    }
  ], []);

  const calculateDepreciation = (asset: any) => {
    if (!asset.purchaseDate) return { accumulatedDep: asset.accumulatedDepreciation || 0, netBookValue: asset.purchasePrice || 0 };
    const purchaseDate = new Date(asset.purchaseDate);
    const today = new Date();
    const ageInYears = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    const yearlyDep = (asset.purchasePrice - (asset.salvageValue || 0)) / (asset.usefulLife || 1);
    const calculatedAccumulatedDep = Math.min(asset.purchasePrice - (asset.salvageValue || 0), yearlyDep * Math.max(0, ageInYears));
    const accumulatedDep = asset.accumulatedDepreciation || calculatedAccumulatedDep;
    const netBookValue = Math.max(0, asset.purchasePrice - accumulatedDep);

    return { accumulatedDep, netBookValue };
  };

  const calculateMonthlyDep = (asset: any) => {
    if (!asset.usefulLife || asset.usefulLife <= 0) return 0;
    const yearlyDep = (asset.purchasePrice - (asset.salvageValue || 0)) / asset.usefulLife;
    const monthlyDep = yearlyDep / 12;
    
    const currentDep = asset.accumulatedDepreciation || 0;
    const maxDep = asset.purchasePrice - (asset.salvageValue || 0);
    const remainingDep = maxDep - currentDep;
    
    return Math.max(0, Math.min(monthlyDep, remainingDep));
  };

  const activeAssetsList = useMemo(() => {
    if (rawAssets && rawAssets.length > 0) return rawAssets;
    return demoAssets;
  }, [rawAssets, demoAssets]);

  const filteredAssets = useMemo(() => {
    return activeAssetsList.filter((asset: any) => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery ||
        asset.name.toLowerCase().includes(q) ||
        asset.tagId.toLowerCase().includes(q) ||
        asset.category.toLowerCase().includes(q);

      if (!matchQuery) return false;
      if (categoryFilter !== 'ALL' && asset.category !== categoryFilter) return false;
      return true;
    });
  }, [activeAssetsList, searchQuery, categoryFilter]);

  const eligibleAssets = useMemo(() => {
    return activeAssetsList.filter((a: any) => 
      a.status === 'OPERATIONAL' && 
      a.lastDepreciationPeriod !== periodKey &&
      calculateMonthlyDep(a) > 0
    );
  }, [activeAssetsList, periodKey]);

  // Integrated Telemetry Calculations with STRICT 2-DECIMAL Formatting
  const telemetry = useMemo(() => {
    const totalCost = activeAssetsList.reduce((sum, b) => sum + (b.purchasePrice || 0), 0);
    const totalNBV = activeAssetsList.reduce((sum, b) => sum + calculateDepreciation(b).netBookValue, 0);
    const maintenanceCount = activeAssetsList.filter((b: any) => b.status === 'MAINTENANCE' || b.status === 'NEEDS_REPAIR').length;

    return {
      totalCostStr: totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalNBVStr: totalNBV.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      maintenanceCount,
      assetCount: activeAssetsList.length,
    };
  }, [activeAssetsList]);

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Fixed Asset Management.</p>
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
        {/* Ambient Radial Accent Glows - Emerald/Indigo for Assets */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Building2 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                FIXED ASSET MANAGEMENT
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CAPITAL ASSET TRACKING, DEPRECIATION LOGGING, AND NET BOOK VALUE RECONCILIATION.
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
                value={periodMonth} 
                onChange={e => setPeriodMonth(parseInt(e.target.value))}
                className="bg-transparent text-white text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer px-2 py-1"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i} className="bg-slate-900 text-white">
                    {new Date(2026, i).toLocaleString('en-US', { month: 'short' })}
                  </option>
                ))}
              </select>
              <select 
                value={periodYear} 
                onChange={e => setPeriodYear(parseInt(e.target.value))}
                className="bg-transparent text-white text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer px-2 py-1"
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y} className="bg-slate-900 text-white">{y}</option>
                ))}
              </select>
            </div>

            <PostDepreciationButton 
              hospitalId={hospitalId || 'hospital-1'} 
              eligibleAssets={eligibleAssets} 
              coa={coa || []} 
              periodKey={periodKey} 
              calculateMonthlyDep={calculateMonthlyDep}
            />

            <AddAssetDialog hospitalId={hospitalId || 'hospital-1'} isOpen={isAddAssetOpen} setIsOpen={setIsAddAssetOpen} />
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Financial Asset Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Asset Cost</span>
              <div className="text-2xl font-black text-white">
                <span className="text-sm text-slate-500 mr-1">GHS</span>{telemetry.totalCostStr}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Across {telemetry.assetCount} registered items
              </span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Net Book Value</span>
              <div className="text-2xl font-black text-emerald-400">
                <span className="text-sm text-emerald-600 mr-1">GHS</span>{telemetry.totalNBVStr}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block">Carrying value after depreciation</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Maintenance Due</span>
              <div className="text-2xl font-black text-sky-400">{telemetry.maintenanceCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Assets requiring inspection</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Wrench className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Depreciation Status</span>
              <div className="text-2xl font-black text-white">
                {eligibleAssets.length > 0 ? 'RUN STAGED' : 'UP TO DATE'}
              </div>
              <span className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Period {periodKey}
              </span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
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
            placeholder="Search Asset Name, Tag ID, or Category..."
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
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Asset Categories</option>
              {ASSET_GROUPS.map(g => (
                <option key={g.id} value={g.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{g.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. ENTERPRISE FIXED ASSET LEDGER           */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Ledger Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
              MASTER ASSET REGISTER & DEPRECIATION LEDGER
            </h2>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> IFRS COMPLIANT
          </span>
        </div>

        <div className="overflow-x-auto">
          {areAssetsLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
              Loading fixed asset register...
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium">
              No asset records found matching search query.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    Asset Identity & Tag
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    Major Category
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    Sub-Division
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                    Cost Price (GHS)
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-right whitespace-nowrap bg-emerald-50/30 dark:bg-emerald-950/20">
                    Net Book Value (GHS)
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAssets.map((asset: any) => {
                  const { netBookValue } = calculateDepreciation(asset);
                  
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                      
                      {/* Name & Tag */}
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                          {asset.name}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-slate-200 dark:border-slate-700">
                            TAG: {asset.tagId}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {asset.category.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Sub-Division */}
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                          {asset.subDivision ? asset.subDivision.replace('_', ' ') : 'N/A'}
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-mono font-black text-slate-700 dark:text-slate-200">
                          <span className="text-[10px] text-slate-400 mr-1 font-sans">₵</span>
                          {asset.purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Net Book Value STRICT 2-DECIMAL FIX */}
                      <td className="px-6 py-4 text-right bg-emerald-50/30 dark:bg-emerald-950/20">
                        <div className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-400">
                          <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mr-1 font-sans">₵</span>
                          {netBookValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          asset.status === 'OPERATIONAL' 
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}

const PostDepreciationButton = ({ 
  hospitalId, 
  eligibleAssets, 
  coa, 
  periodKey,
  calculateMonthlyDep
}: { 
  hospitalId: string; 
  eligibleAssets: any[]; 
  coa: any[]; 
  periodKey: string; 
  calculateMonthlyDep: (asset: any) => number;
}) => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const totalMonthlyDepreciation = useMemo(() => {
    return eligibleAssets.reduce((acc, curr) => acc + calculateMonthlyDep(curr), 0);
  }, [eligibleAssets, calculateMonthlyDep]);

  const handlePostDepreciation = async () => {
    if (!firestore || !hospitalId || !user) return;
    if (eligibleAssets.length === 0) {
      toast({ title: "No Assets Pending Depreciation", description: "All operational assets are already up to date for this period." });
      return;
    }

    setLoading(true);
    const batch = writeBatch(firestore);

    try {
      const expenseAccount = coa?.find(a => a.accountCode === "5005");
      const contraAssetAccount = coa?.find(a => a.accountCode === "1099");

      if (!expenseAccount) throw new Error("Depreciation Expense Account (5005) not found in Chart of Accounts.");
      if (!contraAssetAccount) throw new Error("Accumulated Depreciation Account (1099) not found in Chart of Accounts.");

      const jvRef = doc(collection(firestore, `hospitals/${hospitalId}/journal_entries`));
      const jvNumber = `JV-DEP-${periodKey}-${Date.now().toString().slice(-4)}`;

      batch.set(jvRef, {
        jvNumber,
        narration: `Automated Depreciation Charge for ${periodKey} (${eligibleAssets.length} assets processed)`,
        totalAmount: totalMonthlyDepreciation,
        hospitalId,
        createdBy: user.uid,
        createdByName: user.displayName || "Accountant",
        createdAt: serverTimestamp(),
        type: 'DEPRECIATION',
        status: 'PENDING_APPROVAL',
        lines: [
          { accountId: expenseAccount.id, accountName: expenseAccount.name, debit: totalMonthlyDepreciation, credit: 0 },
          { accountId: contraAssetAccount.id, accountName: contraAssetAccount.name, debit: 0, credit: totalMonthlyDepreciation }
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

      const auditRef = doc(collection(firestore, "global_audit_logs"));
      batch.set(auditRef, {
        type: 'FINANCIAL',
        action: 'DEPRECIATION_JV_STAGED',
        hospitalId,
        actorId: user.uid,
        actorName: user.displayName || "Accountant",
        details: `Staged GHS ${totalMonthlyDepreciation.toFixed(2)} depreciation JV for period ${periodKey}`,
        timestamp: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Depreciation JV Submitted", description: `Journal Voucher ${jvNumber} has been sent to the Auditor console.` });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Depreciation Posting Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button 
          type="button"
          disabled={eligibleAssets.length === 0} 
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
        >
          <Calculator className="w-4 h-4 text-emerald-400" /> POST DEPRECIATION JV ({eligibleAssets.length})
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white dark:bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-black uppercase text-slate-900 dark:text-slate-100 italic">
            Confirm Depreciation Journal Entry
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2 text-slate-600 dark:text-slate-300">
            <p>
              This will stage a depreciation charge of <span className="font-extrabold text-emerald-600 dark:text-emerald-400">GHS {totalMonthlyDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> for the period <span className="font-extrabold text-slate-900 dark:text-white">{periodKey}</span>.
            </p>
            <p className="text-xs text-slate-500 uppercase leading-relaxed font-bold">
              It will create a pending double-entry Journal Voucher (Debit: Depreciation Expense 5005, Credit: Accumulated Depreciation 1099) and submit it for Auditor approval.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-4">
          <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-xs">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handlePostDepreciation}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs"
          >
            {loading ? "Posting..." : "Confirm & Send to Auditor"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const AddAssetDialog = ({ hospitalId, isOpen, setIsOpen }: { hospitalId: string, isOpen: boolean, setIsOpen: (open: boolean) => void }) => {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: '',
      category: 'PPE',
      subDivision: '',
      tagId: '',
      purchaseDate: '',
      purchasePrice: 0,
      usefulLife: 5,
      salvageValue: 0,
      status: 'OPERATIONAL'
    }
  });
  
  const category = form.watch('category');

  const onSubmit = (values: AssetFormValues) => {
    if (!firestore || !hospitalId) {
      toast({ title: "Asset Registered (Simulation)", description: `${values.name} added.` });
      setIsOpen(false);
      return;
    }
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/assets`), {
      ...values,
      hospitalId,
      accumulatedDepreciation: 0,
      createdAt: serverTimestamp()
    });
    toast({ title: "Asset Registered", description: `${values.name} added to the master ledger.` });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button 
          type="button"
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" /> NEW ASSET
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase text-slate-900 dark:text-slate-100 italic">
            Asset Registration
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-slate-500">Asset Name (e.g. 250kVA Perkins Generator)</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage/>
              </FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-slate-500">Category (IFRS Standard)</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('subDivision', '');
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                      {ASSET_GROUPS.map(group => (
                        <SelectItem key={group.id} value={group.id}>{group.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage/>
                </FormItem>
              )}/>
              <FormField control={form.control} name="subDivision" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-slate-500">Sub-Division</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={category !== 'PPE'}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder={category === 'PPE' ? "Select PPE Sub-Division" : "N/A"} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PPE_SUB_DIVISIONS.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage/>
                </FormItem>
              )}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tagId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-slate-500">Asset Tag ID</FormLabel>
                  <FormControl><Input placeholder="e.g. GEN-2024-001" {...field} /></FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>
              <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-slate-500">Purchase Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-slate-500">Cost Price (GHS)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>
              <FormField control={form.control} name="usefulLife" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-slate-500">Useful Life (Years)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>
              <FormField control={form.control} name="salvageValue" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-slate-500">Salvage Value (GHS)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage/>
                </FormItem>
              )}/>
            </div>

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-slate-500">Operational Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="OPERATIONAL">OPERATIONAL</SelectItem>
                    <SelectItem value="MAINTENANCE">UNDER MAINTENANCE</SelectItem>
                    <SelectItem value="DISPOSED">DISPOSED / SCRAPPED</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage/>
              </FormItem>
            )}/>

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs">
                {form.formState.isSubmitting ? <Loader2 className="animate-spin w-4 h-4"/> : 'Register Asset'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
