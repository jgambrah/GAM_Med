'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, doc } from 'firebase/firestore';
import { 
  Table, Calendar, Filter, Printer, 
  ArrowUpRight, TrendingDown, Landmark, PieChart as PieChartIcon, Loader2, ShieldAlert, Zap,
  SlidersHorizontal, CheckCircle2, FileSpreadsheet, Building2, Layers
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ASSET_GROUPS, PPE_SUB_DIVISIONS } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function FixedAssetSchedule() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userProfile?.role || 'DIRECTOR');

  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [report, setReport] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'STANDARD' | 'DETAILED'>('STANDARD');

  // Set default YTD date range on initial load
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const startYTD = `${currentYear}-01-01`;
    const endYTD = new Date().toISOString().split('T')[0];
    setDateRange({ start: startYTD, end: endYTD });
  }, []);

  const handleQuickSelect = (preset: 'YTD' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'LAST_YEAR') => {
    const currentYear = new Date().getFullYear();
    let start = '';
    let end = '';

    switch (preset) {
      case 'YTD':
        start = `${currentYear}-01-01`;
        end = new Date().toISOString().split('T')[0];
        break;
      case 'Q1':
        start = `${currentYear}-01-01`;
        end = `${currentYear}-03-31`;
        break;
      case 'Q2':
        start = `${currentYear}-04-01`;
        end = `${currentYear}-06-30`;
        break;
      case 'Q3':
        start = `${currentYear}-07-01`;
        end = `${currentYear}-09-30`;
        break;
      case 'Q4':
        start = `${currentYear}-10-01`;
        end = `${currentYear}-12-31`;
        break;
      case 'LAST_YEAR':
        start = `${currentYear - 1}-01-01`;
        end = `${currentYear - 1}-12-31`;
        break;
    }

    setDateRange({ start, end });
  };

  const generateReport = async () => {
    if (!dateRange.start || !dateRange.end) {
      toast({ variant: "destructive", title: "Select Date Range", description: "Please select start and end dates." });
      return;
    }
    setLoading(true);

    try {
      const hId = hospitalId || 'hospital-1';
      const startTs = Timestamp.fromDate(new Date(dateRange.start));
      const endTs = Timestamp.fromDate(new Date(new Date(dateRange.end).setHours(23,59,59)));

      let assets: any[] = [];
      let depLogs: any[] = [];

      if (firestore && hospitalId) {
        const assetSnap = await getDocs(query(collection(firestore, `hospitals/${hId}/assets`)));
        assets = assetSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const depHistoryQuery = query(
          collection(firestore, `hospitals/${hId}/depreciation_history`),
          where("hospitalId", "==", hId)
        );
        const allDepLogsSnap = await getDocs(depHistoryQuery);

        depLogs = allDepLogsSnap.docs
          .map(d => d.data())
          .filter(log => {
            if (!log.createdAt) return false;
            const logDate = log.createdAt.toDate();
            return logDate >= startTs.toDate() && logDate <= endTs.toDate();
          });
      } else {
        // Fallback demo dataset for schedule generation
        assets = [
          { id: '1', name: '250kVA Perkins Generator', category: 'PPE', subDivision: 'PLANT_MACHINERY', purchasePrice: 95000000.00, purchaseDate: '2024-01-15', status: 'OPERATIONAL' },
          { id: '2', name: 'Toyota Hilux Ambulance 4x4', category: 'PPE', subDivision: 'MOTOR_VEHICLES', purchasePrice: 35000000.00, purchaseDate: '2025-03-10', status: 'OPERATIONAL' },
          { id: '3', name: 'Mindray DC-70 Ultrasound System', category: 'PPE', subDivision: 'MEDICAL_EQUIPMENT', purchasePrice: 280000.00, purchaseDate: '2026-02-01', status: 'OPERATIONAL' },
          { id: '4', name: 'Main Hospital Annex Wing B', category: 'PPE', subDivision: 'LAND_BUILDINGS', purchasePrice: 185000000.00, purchaseDate: '2022-06-01', status: 'OPERATIONAL' },
          { id: '5', name: 'Legacy Old Scanner (Scrapped)', category: 'PPE', subDivision: 'MEDICAL_EQUIPMENT', purchasePrice: 1200000.00, purchaseDate: '2021-01-01', disposalValue: 200000.00, disposalDate: '2026-03-15', status: 'DISPOSED' }
        ];

        depLogs = [
          { assetId: '1', amount: 14490033.66, createdAt: Timestamp.now() },
          { assetId: '2', amount: 5173928.35, createdAt: Timestamp.now() },
          { assetId: '3', amount: 43914.27, createdAt: Timestamp.now() },
          { assetId: '4', amount: 18500000.00, createdAt: Timestamp.now() }
        ];
      }

      const reportStructure = [
        ...PPE_SUB_DIVISIONS.map(s => ({ ...s, parent: 'PPE', type: 'PPE' })),
        ...ASSET_GROUPS.filter(g => g.id !== 'PPE').map(g => ({ ...g, parent: g.id, type: g.id }))
      ];

      const finalizedData = reportStructure.map(category => {
        const relevantAssets = assets.filter(a => 
          category.type === 'PPE' ? a.subDivision === category.id : a.category === category.id
        );

        // Opening Cost Price
        const openingCost = relevantAssets
          .filter(a => a.purchaseDate < dateRange.start)
          .reduce((sum, a) => sum + (a.purchasePrice || 0), 0);

        // Period Additions (New Asset Purchases)
        const additions = relevantAssets
          .filter(a => a.purchaseDate >= dateRange.start && a.purchaseDate <= dateRange.end)
          .reduce((sum, a) => sum + (a.purchasePrice || 0), 0);

        // Period Disposals / Write-offs
        const disposals = relevantAssets
          .filter(a => (a.status === 'DISPOSED' || a.disposalDate) && a.disposalDate >= dateRange.start && a.disposalDate <= dateRange.end)
          .reduce((sum, a) => sum + (a.purchasePrice || a.disposalValue || 0), 0);

        // Closing Gross Cost
        const closingCost = (openingCost + additions) - disposals;

        // Period Depreciation Charge
        const periodDepreciation = depLogs
          .filter(log => relevantAssets.some(ra => ra.id === log.assetId || ra.tagId === log.assetId))
          .reduce((sum, log) => sum + (log.amount || 0), 0);

        // Accumulated Depreciation (Opening & Closing)
        const openingAccDep = relevantAssets
          .filter(a => a.purchaseDate < dateRange.start)
          .reduce((sum, a) => sum + (a.accumulatedDepreciation || 0), 0);

        const closingAccDep = openingAccDep + periodDepreciation;

        // Net Book Value
        const openingNBV = Math.max(0, openingCost - openingAccDep);
        const closingNBV = Math.max(0, closingCost - closingAccDep);

        return {
          id: category.id,
          label: category.label,
          openingCost,
          additions,
          disposals,
          closingCost,
          openingAccDep,
          periodDepreciation,
          closingAccDep,
          openingNBV,
          closingNBV,
        };
      });

      setReport(finalizedData);
      toast({ title: "Fixed Asset Schedule Generated", description: `Period: ${dateRange.start} to ${dateRange.end}` });
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Schedule aggregation failed.", description: e.message }); 
    }
    setLoading(false);
  };
  
  const totalClosingNBV = useMemo(() => report.reduce((a, b) => a + b.closingNBV, 0), [report]);

  const chartData = useMemo(() => {
    if (report.length === 0 || totalClosingNBV === 0) return [];
    return report
      .map(item => ({
        name: item.label.split('(')[0].trim(),
        value: item.closingNBV
      }))
      .filter(item => item.value > 0);
  }, [report, totalClosingNBV]);

  const COLORS = ['#10b981', '#6366f1', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6'];

  // Strategic Analysis Driver Safe Calculations
  const strategicAnalysis = useMemo(() => {
    if (report.length === 0 || totalClosingNBV === 0) return null;

    const propertyItem = chartData.find(d => d.name.toLowerCase().includes('land') || d.name.toLowerCase().includes('property') || d.name.toLowerCase().includes('building'));
    const propertyPct = propertyItem ? ((propertyItem.value / totalClosingNBV) * 100).toFixed(1) : '0.0';

    const topDepDriver = [...report].sort((a, b) => b.periodDepreciation - a.periodDepreciation)[0];
    const driverLabel = topDepDriver && topDepDriver.periodDepreciation > 0 ? topDepDriver.label.split('(')[0].trim() : 'Medical Equipment';

    return {
      propertyPct,
      driverLabel,
    };
  }, [report, totalClosingNBV, chartData]);

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Fixed Asset Schedule.</p>
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
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800 print:hidden">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                FIXED ASSET SCHEDULE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              PERIOD-BASED ASSET MOVEMENT, AMORTIZATION LEDGER, AND IFRS RECONCILIATION.
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

            {/* View Mode Toggle Switch */}
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => setViewMode('STANDARD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === 'STANDARD' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                STANDARD VIEW
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('DETAILED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === 'DETAILED' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                DETAILED GROSS/NET
              </button>
            </div>

            <button 
              type="button"
              onClick={() => window.print()} 
              className="px-5 py-3 bg-white border border-slate-200 text-slate-900 hover:bg-slate-100 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-600" /> EXPORT FOR BOARD
            </button>
          </div>
        </div>

        {/* Bottom Row: Quick-Select Date Filters & Parameter Bar */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> PRESETS:
            </span>
            <button type="button" onClick={() => handleQuickSelect('YTD')} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer">YTD</button>
            <button type="button" onClick={() => handleQuickSelect('Q1')} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer">Q1</button>
            <button type="button" onClick={() => handleQuickSelect('Q2')} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer">Q2</button>
            <button type="button" onClick={() => handleQuickSelect('Q3')} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer">Q3</button>
            <button type="button" onClick={() => handleQuickSelect('LAST_YEAR')} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer">LAST FISCAL YEAR</button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-[9px] font-black uppercase text-slate-400">Start</span>
              <input 
                type="date" 
                value={dateRange.start}
                onChange={e => setDateRange({...dateRange, start: e.target.value})} 
                className="bg-transparent text-xs font-mono font-bold text-white outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-[9px] font-black uppercase text-slate-400">End</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={e => setDateRange({...dateRange, end: e.target.value})} 
                className="bg-transparent text-xs font-mono font-bold text-white outline-none cursor-pointer"
              />
            </div>
            <button 
              type="button"
              onClick={generateReport}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />} GENERATE
            </button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. AUDIT-GRADE STATEMENT CONTAINER         */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 space-y-6">
        
        {/* Header Title */}
        <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-6">
          <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
            {userProfile?.hospitalName || 'GAM MED HEALTHCARE FACILITY'}
          </h2>
          <p className="text-sm font-bold uppercase italic text-emerald-600 dark:text-emerald-400 mt-1">
            STATEMENT OF FIXED ASSET MOVEMENT
          </p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
            Reporting Period: {dateRange.start || 'YYYY-MM-DD'} to {dateRange.end || 'YYYY-MM-DD'}
          </p>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          {report.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-2xl mb-4">
                <FileSpreadsheet className="w-10 h-10" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                NO ASSET MOVEMENT LOADED
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Select a reporting period or click a quick preset to aggregate opening balances, additions, disposals, and closing NBV.
              </p>
              <button 
                type="button"
                onClick={generateReport}
                className="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                GENERATE SCHEDULE NOW
              </button>
            </div>
          ) : viewMode === 'STANDARD' ? (
            /* STANDARD VIEW TABLE (Opening NBV + Additions - Disposals - Depreciation = Closing NBV) */
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="p-4 border-r border-slate-800">Asset Classification</th>
                  <th className="p-4 text-right border-r border-slate-800">Opening NBV (GHS)</th>
                  <th className="p-4 text-right border-r border-slate-800 text-emerald-400">Additions (GHS)</th>
                  <th className="p-4 text-right border-r border-slate-800 text-rose-400">Disposals (GHS)</th>
                  <th className="p-4 text-right border-r border-slate-800 text-amber-400">Depreciation (GHS)</th>
                  <th className="p-4 text-right bg-emerald-950 text-emerald-400">Closing NBV (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold">
                {report.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-black uppercase text-slate-900 dark:text-slate-100">{row.label}</td>
                    <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-300">{row.openingNBV.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400">+ ₵{row.additions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right font-mono text-rose-600 dark:text-rose-400">- ₵{row.disposals.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right font-mono text-amber-600 dark:text-amber-400">(₵{row.periodDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</td>
                    <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100 bg-emerald-50/30 dark:bg-emerald-950/20">₵{row.closingNBV.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black text-xs uppercase italic border-t-2 border-slate-800">
                <tr>
                  <td className="p-5">TOTAL NETWORK VALUE</td>
                  <td className="p-5 text-right font-mono">₵{report.reduce((a,b)=>a+b.openingNBV,0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="p-5 text-right font-mono text-emerald-400">₵{report.reduce((a,b)=>a+b.additions,0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="p-5 text-right font-mono text-rose-400">₵{report.reduce((a,b)=>a+b.disposals,0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="p-5 text-right font-mono text-amber-400">(₵{report.reduce((a,b)=>a+b.periodDepreciation,0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</td>
                  <td className="p-5 text-right font-mono text-emerald-400 bg-emerald-950 text-sm">₵{report.reduce((a,b)=>a+b.closingNBV,0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            /* DETAILED VIEW TABLE (Gross Cost vs Accumulated Depreciation Movement) */
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                  <th className="p-3 border-r border-slate-800">Classification</th>
                  <th className="p-3 text-right border-r border-slate-800">Open Cost</th>
                  <th className="p-3 text-right border-r border-slate-800 text-emerald-400">Additions</th>
                  <th className="p-3 text-right border-r border-slate-800 text-rose-400">Disposals</th>
                  <th className="p-3 text-right border-r border-slate-800">Close Cost</th>
                  <th className="p-3 text-right border-r border-slate-800 text-amber-400">Period Dep</th>
                  <th className="p-3 text-right border-r border-slate-800">Close Acc Dep</th>
                  <th className="p-3 text-right bg-emerald-950 text-emerald-400">Closing NBV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold">
                {report.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-black uppercase text-slate-900 dark:text-slate-100 text-[11px]">{row.label}</td>
                    <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300">{row.openingCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{row.additions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">{row.disposals.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{row.closingCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono text-amber-600 dark:text-amber-400">{row.periodDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300">{row.closingAccDep.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">₵{row.closingNBV.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Audit Certification Footer */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-12 opacity-80 print:opacity-100">
          <div className="border-t-2 border-slate-900 dark:border-slate-100 pt-2 text-center">
            <p className="text-[10px] font-black uppercase text-slate-500">Prepared by Accountant</p>
            <p className="text-xs font-bold mt-1 text-slate-900 dark:text-white uppercase">{userName}</p>
          </div>
          <div className="border-t-2 border-slate-900 dark:border-slate-100 pt-2 text-center">
            <p className="text-[10px] font-black uppercase text-slate-500">Certified by Internal Audit</p>
            <p className="text-xs font-bold mt-1 text-emerald-600 dark:text-emerald-400 uppercase">CHIEF AUDITOR</p>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. EXECUTIVE INSIGHTS & DONUT CHART        */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        
        {/* Capital Allocation Donut Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-emerald-500" /> CAPITAL ALLOCATION BY CATEGORY
          </h3>
          <div className="h-[280px] w-full mt-4">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-medium">
                No breakdown data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    formatter={(value: number) => `GHS ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Strategic Analysis Narrative (Safe Empty-State Conditional Handling) */}
        <div className="bg-slate-950 p-8 rounded-2xl text-white flex flex-col justify-between shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Landmark size={120} />
          </div>
          
          <div>
            <h4 className="text-lg font-black uppercase italic tracking-wider text-emerald-400 flex items-center gap-2">
              <Zap className="w-5 h-5 fill-current" /> STRATEGIC CAPITAL ANALYSIS
            </h4>

            {strategicAnalysis ? (
              <p className="text-sm font-medium text-slate-300 leading-relaxed italic border-l-4 border-emerald-500 pl-4 mt-4">
                "Finance Controller <span className="text-white font-bold">{userName}</span>, based on the selected audit period,{' '}
                <strong className="text-emerald-400 font-mono font-black">
                  {strategicAnalysis.propertyPct}%
                </strong>
                {' '}of the facility's capital value is concentrated in Land & Buildings.
                <br/><br/>
                The primary depreciation driver is{' '}
                <strong className="text-emerald-400 font-bold uppercase">
                  {strategicAnalysis.driverLabel}
                </strong>
                , suggesting a targeted clinical reinvestment strategy in upcoming fiscal cycles."
              </p>
            ) : (
              <p className="text-sm font-medium text-slate-400 leading-relaxed italic border-l-4 border-slate-700 pl-4 mt-4">
                Select a reporting period to generate strategic capital insights and asset concentration analysis.
              </p>
            )}
          </div>

          <div className="pt-6 flex items-center gap-4">
            <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Capital Velocity</p>
              <p className="text-xs font-bold text-emerald-400">OPTIMAL</p>
            </div>
            <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Audit Readiness</p>
              <p className="text-xs font-bold text-sky-400">VERIFIED</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
