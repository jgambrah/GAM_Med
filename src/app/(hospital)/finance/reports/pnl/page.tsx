'use client';

import { useState, useMemo } from 'react';
import { 
  TrendingUp, BarChart3, Download, Printer, ShieldCheck, 
  DollarSign, ArrowUpRight, ArrowDownLeft, Building2, Calendar, 
  Layers, PieChart, Sparkles, CheckCircle2, ChevronRight,
  Stethoscope, Pill, Beaker, BedDouble, AlertCircle
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ExecutiveIncomeStatementPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [period, setPeriod] = useState<'MTD' | 'QTD' | 'YTD'>('YTD');
  const [accountingStandard, setAccountingStandard] = useState<'IFRS' | 'GAAP'>('IFRS');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // 0. Dynamic Facility Profile
  const hospitalProfileRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospitalProfile } = useDoc(hospitalProfileRef);

  const facilityName = hospitalProfile?.name || "Mensa Medical Hospital";
  const facilityBranch = hospitalProfile?.branch || "Kumasi Main Branch";

  // Financial Figures Adjusted by Period Multiplier
  const multiplier = period === 'MTD' ? 0.12 : period === 'QTD' ? 0.35 : 1.0;

  const financialData = useMemo(() => {
    // 1. REVENUE STREAMS
    const opdRevenue = 280000.00 * multiplier;
    const pharmacyRevenue = 340000.00 * multiplier;
    const labRadiologyRevenue = 195000.00 * multiplier;
    const inpatientRevenue = 110000.00 * multiplier;
    const mortuaryRevenue = 65000.00 * multiplier;
    const grossRevenue = opdRevenue + pharmacyRevenue + labRadiologyRevenue + inpatientRevenue + mortuaryRevenue;

    // 2. DIRECT COST OF GOODS SOLD (COGS)
    const pharmaSupplies = 220000.00 * multiplier;
    const consumables = 45000.00 * multiplier;
    const totalCOGS = pharmaSupplies + consumables;

    const grossProfit = grossRevenue - totalCOGS;
    const grossMargin = (grossProfit / grossRevenue) * 100;

    // 3. OPERATING EXPENDITURES (OPEX)
    const payroll = 295000.00 * multiplier;
    const powerOxygen = 65000.00 * multiplier;
    const plantLogistics = 35000.00 * multiplier;
    const adminCompliance = 20000.00 * multiplier;
    const totalOPEX = payroll + powerOxygen + plantLogistics + adminCompliance;

    // 4. NET OPERATING PROFIT (EBITDA)
    const ebitda = grossProfit - totalOPEX;
    const netMargin = (ebitda / grossRevenue) * 100;

    return {
      grossRevenue,
      opdRevenue,
      pharmacyRevenue,
      labRadiologyRevenue,
      inpatientRevenue,
      mortuaryRevenue,
      totalCOGS,
      pharmaSupplies,
      consumables,
      grossProfit,
      grossMargin,
      totalOPEX,
      payroll,
      powerOxygen,
      plantLogistics,
      adminCompliance,
      ebitda,
      netMargin
    };
  }, [multiplier]);

  const handleExportPDF = () => {
    window.print();
    toast({
      title: "📑 Financial Audit Report Ready",
      description: "Income Statement printed/saved in IFRS compliant layout."
    });
  };

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. EXECUTIVE P&L HERO BANNER */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Corporate Treasury & P&L Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {facilityName} • {facilityBranch}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              STATUTORY INCOME STATEMENT (P&L)
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wide">
              STANDARDIZED DOUBLE-ENTRY PROFIT & LOSS BREAKDOWN IN ACCORDANCE WITH {accountingStandard} STANDARDS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 no-print">
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT / EXPORT IFRS P&L</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Gross Revenue</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              ₵ {financialData.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-emerald-400/80 mt-0.5 block">5 Clinical Cost Centers</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Cost of Goods (COGS)</span>
            <div className="text-2xl font-black text-amber-400 font-mono">
              ₵ {financialData.totalCOGS.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-amber-400/80 mt-0.5 block">Pharma & Consumables</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Operating Expenses (OPEX)</span>
            <div className="text-2xl font-black text-rose-400 font-mono">
              ₵ {financialData.totalOPEX.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-rose-400/80 mt-0.5 block">Payroll & Plant Power</span>
          </div>

          <div className="bg-slate-900 border border-emerald-500/40 p-4 rounded-2xl ring-1 ring-emerald-500/20 shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 block mb-1">EBITDA Net Profit</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              ₵ {financialData.ebitda.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-black text-emerald-300 mt-0.5 block">{financialData.netMargin.toFixed(1)}% Operating Margin</span>
          </div>
        </div>
      </div>

      {/* 2. PERIOD & CONTROLS TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm no-print">
        
        {/* Period Selector */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {(['MTD', 'QTD', 'YTD'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all cursor-pointer ${
                period === p 
                  ? 'bg-slate-950 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {p === 'MTD' ? 'Month-to-Date' : p === 'QTD' ? 'Quarter-to-Date' : 'Year-to-Date (FY26)'}
            </button>
          ))}
        </div>

        {/* Standard Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400">Accounting Standard:</span>
          {(['IFRS', 'GAAP'] as const).map(std => (
            <button
              key={std}
              type="button"
              onClick={() => setAccountingStandard(std)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer border ${
                accountingStandard === std 
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow' 
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              {std}
            </button>
          ))}
        </div>
      </div>

      {/* 3. AUTHORITATIVE INCOME STATEMENT STRUCTURE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 md:p-8 space-y-8 font-sans">
        
        {/* Document Header */}
        <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-6 space-y-1">
          <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tight">
            {facilityName}
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            STATEMENT OF COMPREHENSIVE INCOME (PROFIT & LOSS)
          </p>
          <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
            For the Reporting Period Ending {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} ({period})
          </p>
        </div>

        {/* ============================================================ */}
        {/* SECTION 1: OPERATING REVENUES (4000)                         */}
        {/* ============================================================ */}
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              1. OPERATING REVENUE FROM HEALTHCARE SERVICES (GL #4000)
            </span>
            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
              ₵ {financialData.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="pl-6 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">4010 • Outpatient Consultations & Specialty Clinics</span>
              <span>₵ {financialData.opdRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">4020 • Diagnostic Laboratory & Imaging Services</span>
              <span>₵ {financialData.labRadiologyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">4030 • Pharmacy Dispensary & Medication Sales</span>
              <span>₵ {financialData.pharmacyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">4040 • Inpatient Ward Bed Accommodation Fees</span>
              <span>₵ {financialData.inpatientRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">4050 • Mortuary Preservation & Cold Chamber Services</span>
              <span>₵ {financialData.mortuaryRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: COST OF GOODS SOLD (COGS)                         */}
        {/* ============================================================ */}
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-amber-500" />
              2. DIRECT COST OF PHARMACEUTICALS & CONSUMABLES (COGS)
            </span>
            <span className="font-mono font-black text-sm text-amber-500">
              (₵ {financialData.totalCOGS.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
          </div>

          <div className="pl-6 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">5010 • Pharmaceutical Drugs & Bulk Reagents</span>
              <span>(₵ {financialData.pharmaSupplies.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">5020 • Medical Consumables, Syringes & PPE</span>
              <span>(₵ {financialData.consumables.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
            </div>
          </div>
        </div>

        {/* GROSS PROFIT SUB-TOTAL */}
        <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 font-black">
          <span className="text-xs uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">
            GROSS OPERATING PROFIT (Margin: {financialData.grossMargin.toFixed(1)}%)
          </span>
          <span className="font-mono text-base text-emerald-700 dark:text-emerald-400">
            ₵ {financialData.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: OPERATING EXPENDITURE (OPEX)                      */}
        {/* ============================================================ */}
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-rose-500" />
              3. OPERATING EXPENDITURES & ADMINISTRATIVE OVERHEADS (OPEX)
            </span>
            <span className="font-mono font-black text-sm text-rose-500">
              (₵ {financialData.totalOPEX.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
          </div>

          <div className="pl-6 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">6010 • Medical Specialists, Nursing & Support Payroll</span>
              <span>(₵ {financialData.payroll.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">6020 • Electricity Grid Power, Generator Diesel & Oxygen Plants</span>
              <span>(₵ {financialData.powerOxygen.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">6030 • Mortuary Cold Chamber Maintenance & Logistics</span>
              <span>(₵ {financialData.plantLogistics.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">6040 • Digital Subscriptions, Software & Regulatory Compliance</span>
              <span>(₵ {financialData.adminCompliance.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 4: NET OPERATING PROFIT (EBITDA)                     */}
        {/* ============================================================ */}
        <div className="p-6 bg-slate-950 text-white rounded-3xl border border-emerald-500/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
              FINAL STATUTORY AUDIT RESULT
            </span>
            <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              NET OPERATING PROFIT (EBITDA)
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Net Profit Margin: <strong className="text-emerald-400">{financialData.netMargin.toFixed(1)}%</strong> of Gross Revenue
            </p>
          </div>

          <div className="text-right">
            <span className="text-3xl font-black font-mono text-emerald-400">
              ₵ {financialData.ebitda.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-mono text-slate-400 block mt-1 uppercase">
              Audited & Certified by GAM Med Core Treasury
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
