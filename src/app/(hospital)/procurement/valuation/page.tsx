'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, Warehouse, BarChart3, TrendingUp, 
  ArrowUpRight, Download, ShieldCheck, Filter, 
  Calendar, Layers, CheckCircle2, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InventoryValuationReportPage() {
  const { user } = useUser();
  const router = useRouter();

  const valuationCategories = useMemo(() => [
    { category: 'Pharmaceuticals (Injectables & IV Fluids)', totalUnits: 14200, unitCostAvg: 18.50, totalValuation: 262700.00, cogsMonthToDate: 45200.00, glAccount: '1300 - Stock Inventory (Pharmacy)' },
    { category: 'Oral Tablets & Antibiotics', totalUnits: 28900, unitCostAvg: 4.20, totalValuation: 121380.00, cogsMonthToDate: 28400.00, glAccount: '1300 - Stock Inventory (Pharmacy)' },
    { category: 'Surgical & Medical Consumables', totalUnits: 9800, unitCostAvg: 12.00, totalValuation: 117600.00, cogsMonthToDate: 19800.00, glAccount: '1310 - Medical Consumables Stock' },
    { category: 'Laboratory Reagents & Diagnostic Kits', totalUnits: 450, unitCostAvg: 220.00, totalValuation: 99000.00, cogsMonthToDate: 14500.00, glAccount: '1320 - Lab Reagents Inventory' },
    { category: 'Radiology Films & Contrast Media', totalUnits: 320, unitCostAvg: 145.00, totalValuation: 46400.00, cogsMonthToDate: 8200.00, glAccount: '1330 - Radiology Stock' },
    { category: 'Engineering Spares & Generator Fuel', totalUnits: 18, unitCostAvg: 2500.00, totalValuation: 45000.00, cogsMonthToDate: 6000.00, glAccount: '1340 - General Hospital Stores' }
  ], []);

  const totalHoldingValue = useMemo(() => {
    return valuationCategories.reduce((acc, cat) => acc + cat.totalValuation, 0);
  }, [valuationCategories]);

  const totalCOGS = useMemo(() => {
    return valuationCategories.reduce((acc, cat) => acc + cat.cogsMonthToDate, 0);
  }, [valuationCategories]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* Header Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <DollarSign className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black italic uppercase tracking-wider text-white">
                Inventory Valuation & COGS Report
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              MONTHLY CLOSING STOCK VALUATION, COST OF GOODS SOLD (COGS), AND GENERAL LEDGER (GL 1300s) SYNCHRONIZATION.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/accountant/coa')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow border border-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-400" /> GL CHART OF ACCOUNTS &rarr;
            </button>
          </div>
        </div>

        {/* Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 font-mono">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Total Stock Holding Value</span>
            <div className="text-2xl font-black text-emerald-400">
              ₵ {totalHoldingValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 font-sans mt-1 block">Balance in GL #1300 (Assets)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block mb-1">Month-to-Date Dispensed (COGS)</span>
            <div className="text-2xl font-black text-sky-400">
              ₵ {totalCOGS.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 font-sans mt-1 block">Expense in GL #5000 (Cost of Sales)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Audit Status</span>
            <div className="text-2xl font-black text-amber-400">100% RECONCILED</div>
            <span className="text-[10px] text-slate-400 font-sans mt-1 block">Weighted Average Costing (WAC)</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
            <tr>
              <th className="p-4">Inventory Category</th>
              <th className="p-4">Linked GL Asset Account</th>
              <th className="p-4 text-right">Total Units</th>
              <th className="p-4 text-right">Avg Unit Cost</th>
              <th className="p-4 text-right">Ending Value (GHS)</th>
              <th className="p-4 text-right">Month COGS (GHS)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {valuationCategories.map((cat, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                  {cat.category}
                </td>
                <td className="p-4 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  {cat.glAccount}
                </td>
                <td className="p-4 text-right font-mono">
                  {cat.totalUnits.toLocaleString()}
                </td>
                <td className="p-4 text-right font-mono">
                  ₵ {cat.unitCostAvg.toFixed(2)}
                </td>
                <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                  ₵ {cat.totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-right font-mono font-black text-sky-600 dark:text-sky-400">
                  ₵ {cat.cogsMonthToDate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-950 text-white font-black font-mono">
            <tr>
              <td className="p-4 font-sans uppercase">TOTALS</td>
              <td className="p-4"></td>
              <td className="p-4"></td>
              <td className="p-4"></td>
              <td className="p-4 text-right text-emerald-400 text-sm">
                ₵ {totalHoldingValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="p-4 text-right text-sky-400 text-sm">
                ₵ {totalCOGS.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}
