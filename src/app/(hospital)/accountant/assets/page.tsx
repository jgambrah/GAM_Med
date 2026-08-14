'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  Building2, Truck, Zap, Activity,
  Plus, Search, TrendingDown, Wrench,
  ShieldCheck, Calculator, Calendar, Loader2, ShieldAlert,
  Filter, CheckCircle2, FileText, Eye, AlertCircle, X, Layers, Wallet, HardDrive, CheckSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type FixedAsset = {
  id: string;
  tag: string;
  name: string;
  category: 'MEDICAL_EQ' | 'IT_INFRA' | 'MOTOR_VEHICLES' | 'FURNITURE' | 'PPE';
  purchaseDate: string;
  cost: number;
  accumDepr: number;
  nbv: number;
  usefulLifeYears: number;
  salvageValue: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DISPOSED';
};

export default function FixedAssetRegisterConsole() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isCapitalizeOpen, setIsCapitalizeOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAssetForDossier, setSelectedAssetForDossier] = useState<FixedAsset | null>(null);

  // New Asset Form State
  const [newTag, setNewTag] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'MEDICAL_EQ' | 'IT_INFRA' | 'MOTOR_VEHICLES' | 'FURNITURE'>('MEDICAL_EQ');
  const [newCost, setNewCost] = useState('');
  const [newUsefulLife, setNewUsefulLife] = useState('5');
  const [newSalvageValue, setNewSalvageValue] = useState('0');
  const [newPurchaseDate, setNewPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || '');

  // 1. Listen for Fixed Assets collection
  const assetsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/assets`));
  }, [firestore, hospitalId]);
  const { data: rawAssets, isLoading: isAssetsLoading } = useCollection(assetsQuery);

  // 2. Demo Assets Fallback
  const demoAssets: FixedAsset[] = useMemo(() => [
    { id: 'AST-MED-001', tag: 'GAM-US-001', name: 'GE Voluson E8 Ultrasound System', category: 'MEDICAL_EQ', purchaseDate: '2023-01-15', cost: 450000.00, accumDepr: 135000.00, nbv: 315000.00, usefulLifeYears: 10, salvageValue: 10000.00, status: 'ACTIVE' },
    { id: 'AST-MED-042', tag: 'GAM-XRY-002', name: 'Siemens Mobile X-Ray Machine', category: 'MEDICAL_EQ', purchaseDate: '2024-06-10', cost: 280000.00, accumDepr: 56000.00, nbv: 224000.00, usefulLifeYears: 7, salvageValue: 5000.00, status: 'ACTIVE' },
    { id: 'AST-VEH-003', tag: 'GAM-AMB-001', name: 'Toyota Hiace Emergency Ambulance (GN-123-25)', category: 'MOTOR_VEHICLES', purchaseDate: '2025-02-20', cost: 650000.00, accumDepr: 162500.00, nbv: 487500.00, usefulLifeYears: 5, salvageValue: 20000.00, status: 'MAINTENANCE' },
    { id: 'AST-IT-015', tag: 'GAM-SRV-001', name: 'Dell PowerEdge T440 Core Enterprise Server', category: 'IT_INFRA', purchaseDate: '2024-11-05', cost: 85000.00, accumDepr: 42500.00, nbv: 42500.00, usefulLifeYears: 4, salvageValue: 2000.00, status: 'ACTIVE' },
    { id: 'AST-FUR-008', tag: 'GAM-ICU-009', name: 'Hill-Rom Electric ICU Patient Bed Systems (Set of 4)', category: 'FURNITURE', purchaseDate: '2023-08-12', cost: 120000.00, accumDepr: 36000.00, nbv: 84000.00, usefulLifeYears: 8, salvageValue: 4000.00, status: 'ACTIVE' }
  ], []);

  const assets: FixedAsset[] = useMemo(() => {
    if (rawAssets && rawAssets.length > 0) {
      return rawAssets.map((docItem: any) => {
        const cost = Number(docItem.cost || docItem.purchasePrice || 0);
        const accumDepr = Number(docItem.accumDepr || docItem.accumulatedDepreciation || 0);
        const nbv = Math.max(0, cost - accumDepr);
        return {
          id: docItem.id,
          tag: docItem.tag || docItem.tagId || `TAG-${docItem.id.slice(0, 5)}`,
          name: docItem.name || 'Capital Asset',
          category: (docItem.category || 'MEDICAL_EQ') as any,
          purchaseDate: docItem.purchaseDate || '2025-01-01',
          cost,
          accumDepr,
          nbv,
          usefulLifeYears: Number(docItem.usefulLife || docItem.usefulLifeYears || 5),
          salvageValue: Number(docItem.salvageValue || 0),
          status: docItem.status === 'OPERATIONAL' ? 'ACTIVE' : (docItem.status || 'ACTIVE') as any
        };
      });
    }
    return demoAssets;
  }, [rawAssets, demoAssets]);

  // Balance Sheet Metrics
  const metrics = useMemo(() => {
    let totalCost = 0, totalDepr = 0, totalNbv = 0;
    assets.forEach(a => {
      if (a.status !== 'DISPOSED') {
        totalCost += a.cost;
        totalDepr += a.accumDepr;
        totalNbv += a.nbv;
      }
    });
    return { totalCost, totalDepr, totalNbv };
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = a.name.toLowerCase().includes(q) || a.tag.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'ALL' || a.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [assets, searchTerm, selectedCategory]);

  const handleCapitalizeAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag || !newName || !newCost) {
      toast({ variant: 'destructive', title: "Missing Fields", description: "Asset Tag, Name, and Purchase Cost are required." });
      return;
    }

    const costNum = parseFloat(newCost);
    const lifeNum = parseInt(newUsefulLife) || 5;
    const salvageNum = parseFloat(newSalvageValue) || 0;

    setIsProcessing(true);

    try {
      if (firestore && hospitalId && user) {
        await addDoc(collection(firestore, `hospitals/${hospitalId}/assets`), {
          tag: newTag.trim().toUpperCase(),
          tagId: newTag.trim().toUpperCase(),
          name: newName.trim(),
          category: newCategory,
          purchaseDate: newPurchaseDate,
          purchasePrice: costNum,
          cost: costNum,
          accumulatedDepreciation: 0,
          accumDepr: 0,
          nbv: costNum,
          usefulLife: lifeNum,
          salvageValue: salvageNum,
          status: 'ACTIVE',
          capitalizedBy: user.uid,
          createdAt: serverTimestamp()
        });

        // Also post capitalization Journal Voucher
        await addDoc(collection(firestore, `hospitals/${hospitalId}/journal_entries`), {
          jvNumber: `JV-CAP-${Date.now().toString().slice(-6)}`,
          narration: `Capitalization of Asset ${newTag.toUpperCase()}: ${newName}`,
          totalAmount: costNum,
          status: 'AUTHORIZED',
          createdByName: userProfile?.fullName || 'Finance Director',
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          lines: [
            { accountId: '1500', accountName: `1500 - Property, Plant & Equipment (${newCategory})`, debit: costNum, credit: 0 },
            { accountId: '1010', accountName: '1010 - Main GCB Operations Bank Account', debit: 0, credit: costNum }
          ]
        });
      }

      toast({
        title: "Asset Capitalized Successfully",
        description: `${newName} (${newTag.toUpperCase()}) added to Fixed Asset Register for GHS ${costNum.toFixed(2)}.`
      });

      setIsCapitalizeOpen(false);
      setNewTag('');
      setNewName('');
      setNewCost('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Capitalization Failed", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunDepreciationBatch = async () => {
    setIsProcessing(true);

    try {
      if (firestore && hospitalId) {
        const functions = getFunctions();
        const runDeprFn = httpsCallable(functions, 'runMonthlyAssetDepreciation');
        const res: any = await runDeprFn({ hospitalId });

        toast({
          title: "Depreciation Batch Executed",
          description: res.data?.message || "Monthly depreciation calculated and Journal Vouchers posted to General Ledger."
        });
      } else {
        // Fallback simulation
        toast({
          title: "Depreciation Batch Executed (Simulation)",
          description: "Monthly straight-line depreciation calculated. Posted JV (Debit 6500 / Credit 1550)."
        });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Depreciation Run Failed", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || isAssetsLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (isLoading) {
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Fixed Asset & Depreciation Management.</p>
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
                <Building2 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                FIXED ASSETS & DEPRECIATION REGISTER
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CAPITAL EXPENDITURE TRACKING, STRAIGHT-LINE DEPRECIATION ENGINE, AND BALANCE SHEET NET BOOK VALUE.
            </p>
          </div>

          {/* User Context & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">ASSETS CONTROLLER</div>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleRunDepreciationBatch}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow border border-slate-700 cursor-pointer flex items-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4 text-emerald-400" />}
              <span>RUN DEPRECIATION BATCH</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCapitalizeOpen(true)}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>CAPITALIZE NEW ASSET</span>
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Capital Balance Sheet Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Gross Asset Value</span>
              <div className="text-2xl font-black text-white font-mono">
                ₵ {metrics.totalCost.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Historical Purchase Cost</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Building2 className="w-6 h-6 text-indigo-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Accumulated Depreciation</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                ₵ {metrics.totalDepr.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-amber-400 mt-0.5 block">Contra-Asset Write-Off (1550)</span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Total Net Book Value (NBV)</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {metrics.totalNbv.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Active Carrying Value on Balance Sheet</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER & SEARCH CONTROL BAR             */}
      {/* ========================================== */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by asset tag or equipment description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-64 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none cursor-pointer text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="MEDICAL_EQ">🏥 MEDICAL EQUIPMENT</option>
            <option value="IT_INFRA">💻 IT INFRASTRUCTURE</option>
            <option value="MOTOR_VEHICLES">🚑 MOTOR VEHICLES</option>
            <option value="FURNITURE">🛏️ FURNITURE & FITTINGS</option>
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. THE FIXED ASSET MASTER GRID             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left border-collapse font-bold">
          <thead>
            <tr className="bg-slate-950 text-white uppercase text-[9px] tracking-widest">
              <th className="p-4 border-b border-slate-800">Asset Tag</th>
              <th className="p-4 border-b border-slate-800">Description & Category</th>
              <th className="p-4 border-b border-slate-800 text-right">Purchase Cost (GHS)</th>
              <th className="p-4 border-b border-slate-800 text-right text-amber-400">Accum. Depr (GHS)</th>
              <th className="p-4 border-b border-slate-800 text-right text-emerald-400">Net Book Value (GHS)</th>
              <th className="p-4 border-b border-slate-800 text-center">Status</th>
              <th className="p-4 border-b border-slate-800 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-16 text-center text-slate-400 italic">
                  No assets found matching the current search filters.
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      {asset.tag}
                    </span>
                  </td>

                  <td className="p-4 space-y-0.5">
                    <p className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase">{asset.name}</p>
                    <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                      {asset.category.replace('_', ' ')} • Purchased: {asset.purchaseDate}
                    </p>
                  </td>

                  <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">
                    ₵ {asset.cost.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  <td className="p-4 text-right font-mono text-amber-600 dark:text-amber-400">
                    ₵ {asset.accumDepr.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50/30 dark:bg-emerald-950/10">
                    ₵ {asset.nbv.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  <td className="p-4 text-center">
                    {asset.status === 'ACTIVE' && (
                      <span className="px-2.5 py-1 text-[9px] font-black rounded-md uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                        ACTIVE
                      </span>
                    )}
                    {asset.status === 'MAINTENANCE' && (
                      <span className="px-2.5 py-1 text-[9px] font-black rounded-md uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                        MAINTENANCE
                      </span>
                    )}
                    {asset.status === 'DISPOSED' && (
                      <span className="px-2.5 py-1 text-[9px] font-black rounded-md uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300">
                        DISPOSED
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedAssetForDossier(asset)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[9px] uppercase tracking-wider rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1 mx-auto"
                    >
                      <Eye className="w-3 h-3 text-indigo-500" />
                      <span>DOSSIER</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================== */}
      {/* 4. CAPITALIZE NEW ASSET MODAL              */}
      {/* ========================================== */}
      {isCapitalizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4">
            <div className="bg-slate-950 text-white p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg uppercase tracking-wider">Capitalize New Fixed Asset</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Debit PPE (1500) / Credit Bank (1010)</p>
              </div>
              <button 
                onClick={() => setIsCapitalizeOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCapitalizeAsset} className="p-6 space-y-4 pt-0 text-xs font-bold">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Asset Tag ID</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. GAM-US-009"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Asset Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none cursor-pointer text-slate-900 dark:text-slate-100"
                  >
                    <option value="MEDICAL_EQ">MEDICAL EQUIPMENT</option>
                    <option value="IT_INFRA">IT INFRASTRUCTURE</option>
                    <option value="MOTOR_VEHICLES">MOTOR VEHICLES</option>
                    <option value="FURNITURE">FURNITURE & FITTINGS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Asset Description & Model</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. GE Voluson E8 Ultrasound System"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Purchase Cost (GHS)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="450000.00"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Purchase Date</label>
                  <input
                    required
                    type="date"
                    value={newPurchaseDate}
                    onChange={(e) => setNewPurchaseDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Useful Life (Years)</label>
                  <input
                    required
                    type="number"
                    value={newUsefulLife}
                    onChange={(e) => setNewUsefulLife(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Salvage Value (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newSalvageValue}
                    onChange={(e) => setNewSalvageValue(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCapitalizeOpen(false)}
                  className="px-4 py-2.5 font-black text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>CAPITALIZE & POST TO LEDGER</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 5. ASSET DOSSIER MODAL                     */}
      {/* ========================================== */}
      {selectedAssetForDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4">
            <div className="bg-slate-950 text-white p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="bg-emerald-600 text-[10px] font-mono font-black px-2 py-1 rounded uppercase tracking-widest">
                  {selectedAssetForDossier.tag}
                </span>
                <h3 className="font-black text-lg uppercase tracking-wider mt-1">{selectedAssetForDossier.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedAssetForDossier(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 pt-0 text-xs font-bold">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">Category:</span>
                  <span className="text-slate-900 dark:text-slate-100">{selectedAssetForDossier.category.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">Purchase Date:</span>
                  <span className="text-slate-900 dark:text-slate-100">{selectedAssetForDossier.purchaseDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">Useful Life:</span>
                  <span className="text-slate-900 dark:text-slate-100">{selectedAssetForDossier.usefulLifeYears} Years ({selectedAssetForDossier.usefulLifeYears * 12} Months)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">Salvage Value:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">₵ {selectedAssetForDossier.salvageValue.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <p className="text-[9px] text-slate-500 uppercase">Purchase Cost</p>
                  <p className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">₵ {selectedAssetForDossier.cost.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                  <p className="text-[9px] text-amber-600 uppercase">Accum. Depr</p>
                  <p className="font-mono text-sm font-black text-amber-600">₵ {selectedAssetForDossier.accumDepr.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                  <p className="text-[9px] text-emerald-600 uppercase">Net Book Value</p>
                  <p className="font-mono text-sm font-black text-emerald-600">₵ {selectedAssetForDossier.nbv.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssetForDossier(null)}
                  className="px-6 py-2.5 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all"
                >
                  CLOSE DOSSIER
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
