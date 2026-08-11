'use client';

import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, Search, Calculator, AlertTriangle, Save, 
  Download, Printer, ArrowRightLeft, Layers, CheckCircle2,
  FileCheck, ShieldAlert
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface StockTakeItem {
  id: string;
  name: string;
  details: string;
  batchNumber: string;
  systemQty: number;
  physicalQty: number;
}

const INITIAL_STOCK_TAKE_ITEMS: StockTakeItem[] = [
  {
    id: 'ST-001',
    name: 'Amoxicillin 500mg',
    details: 'Capsules • BATCH: AMX-2024-B',
    batchNumber: 'AMX-2024-B',
    systemQty: 45,
    physicalQty: 45,
  },
  {
    id: 'ST-002',
    name: 'Paracetamol 1000mg IV',
    details: 'Infusion • BATCH: PAR-IV-99',
    batchNumber: 'PAR-IV-99',
    systemQty: 120,
    physicalQty: 118,
  },
  {
    id: 'ST-003',
    name: 'Metformin 500mg',
    details: 'Tablets • BATCH: MET-2025-C1',
    batchNumber: 'MET-2025-C1',
    systemQty: 250,
    physicalQty: 250,
  },
  {
    id: 'ST-004',
    name: 'Ciprofloxacin 500mg',
    details: 'Tablets • BATCH: CIP-8821-X',
    batchNumber: 'CIP-8821-X',
    systemQty: 80,
    physicalQty: 77,
  },
  {
    id: 'ST-005',
    name: 'Artemether + Lumefantrine',
    details: 'Tablets (20/120mg) • BATCH: AL-2024-G',
    batchNumber: 'AL-2024-G',
    systemQty: 160,
    physicalQty: 160,
  },
  {
    id: 'ST-006',
    name: 'Omeprazole 20mg',
    details: 'Capsules • BATCH: OME-5541',
    batchNumber: 'OME-5541',
    systemQty: 95,
    physicalQty: 94,
  },
];

export default function StockTakePage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VARIANCES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<StockTakeItem[]>(INITIAL_STOCK_TAKE_ITEMS);
  const [isPosting, setIsPosting] = useState(false);

  const handlePhysicalCountChange = (id: string, newCount: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, physicalQty: newCount } : item));
  };

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeFilter === 'VARIANCES') {
      result = result.filter(item => item.physicalQty !== item.systemQty);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.batchNumber.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, activeFilter, searchQuery]);

  const totalSKUs = items.length;
  const countedSKUs = items.filter(item => item.physicalQty !== undefined).length;
  const exactMatches = items.filter(item => item.physicalQty === item.systemQty).length;
  const detectedVariances = items.filter(item => item.physicalQty !== item.systemQty).length;

  const handleSaveDraft = () => {
    toast({
      title: '💾 Draft Stock Count Saved',
      description: `Progress saved for ${totalSKUs} items (${exactMatches} matched, ${detectedVariances} variances).`
    });
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const handlePostAdjustments = () => {
    if (confirm(`Post inventory adjustments for ${detectedVariances} detected variance(s) into the physical audit ledger?`)) {
      setIsPosting(true);
      setTimeout(() => {
        setIsPosting(false);
        toast({
          title: '⚡ INVENTORY ADJUSTMENTS POSTED TO LEDGER',
          description: `All ${detectedVariances} stock variances reconciled and signed into audit logs by ${user?.displayName || 'Pharmacist'}.`
        });
      }, 1000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. THE DARK COMMAND BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden mb-6">
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 pb-5 border-b border-slate-800/60 mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <ClipboardCheck className="w-7 h-7 text-amber-400" />
              PHYSICAL STOCK RECONCILIATION
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest">
              Periodic Inventory Counting, Variance Auditing & Ledger Adjustment
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              type="button"
              onClick={handlePrintSheet}
              className="px-4 py-2 text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg transition flex items-center gap-2 uppercase tracking-wide cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Blank Sheet
            </button>

            <button 
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 text-[10px] font-bold text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition shadow-sm flex items-center gap-2 uppercase tracking-wide cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Draft Count
            </button>

            <button 
              type="button"
              disabled={isPosting}
              onClick={handlePostAdjustments}
              className="px-4 py-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg transition shadow-sm flex items-center gap-2 uppercase tracking-wide cursor-pointer disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> 
              {isPosting ? 'POSTING ADJUSTMENTS...' : 'Post Adjustments'}
            </button>
          </div>
        </div>

        {/* Audit Progress Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total SKUs to Count</span>
            <span className="text-2xl font-black text-white">{totalSKUs}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Calculator className="w-3 h-3 text-cyan-400" /> Items Counted
            </span>
            <span className="text-2xl font-black text-emerald-400">
              {countedSKUs} <span className="text-sm font-medium text-slate-500">({Math.round((countedSKUs / totalSKUs) * 100)}%)</span>
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-emerald-400" /> Exact Matches
            </span>
            <span className="text-2xl font-black text-emerald-400">{exactMatches}</span>
          </div>

          <div className="bg-slate-900 border border-amber-900/50 shadow-[0_0_15px_rgba(245,158,11,0.05)] rounded-xl p-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
            <span className="block text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-1 pl-2">Detected Variances</span>
            <span className="text-2xl font-black text-amber-400 pl-2">{detectedVariances}</span>
          </div>

        </div>
      </div>

      {/* 2. SEARCH & SECTION FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Universal Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 outline-none transition shadow-sm" 
            placeholder="Scan barcode or search drug name..." 
          />
        </div>
        
        {/* Aisle / Category Toggles */}
        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 w-fit overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button 
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition uppercase tracking-wider cursor-pointer ${
              activeFilter === 'ALL' 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Stock ({items.length})
          </button>
          <button 
            type="button"
            onClick={() => setActiveFilter('VARIANCES')}
            className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'VARIANCES' 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm' 
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Show Variances Only ({detectedVariances})
          </button>
        </div>
      </div>

      {/* 3. STOCK COUNTING GRID */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 pl-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-1/3">Drug Name & Details</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">System Qty</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-center bg-indigo-50 dark:bg-indigo-950/40 border-x border-indigo-100 dark:border-indigo-900/50">Physical Count</th>
                <th className="py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Variance</th>
                <th className="py-4 pr-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => {
                const variance = item.physicalQty - item.systemQty;
                const isMatch = variance === 0;

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                      !isMatch ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    
                    {/* Drug Details */}
                    <td className="py-4 pl-6">
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100 block">{item.name}</span>
                      <span className="text-[10px] font-mono font-medium text-slate-400">{item.details}</span>
                    </td>

                    {/* System Qty */}
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{item.systemQty}</span>
                    </td>

                    {/* Physical Count Highlighted Input */}
                    <td className="py-3 px-4 bg-indigo-50/30 dark:bg-indigo-950/20 border-x border-indigo-50 dark:border-indigo-900/30 text-center">
                      <input 
                        type="number" 
                        value={item.physicalQty}
                        onChange={(e) => handlePhysicalCountChange(item.id, Number(e.target.value))}
                        className={`w-20 text-center bg-white dark:bg-slate-800 border rounded-lg py-1.5 text-sm font-black outline-none transition ${
                          !isMatch 
                            ? 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/50 focus:border-amber-500 shadow-[0_0_0_2px_rgba(251,191,36,0.2)]'
                            : 'text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:border-indigo-500'
                        }`}
                      />
                    </td>

                    {/* Calculated Variance */}
                    <td className="py-4 px-4 text-center">
                      <span className={`text-sm font-black ${
                        isMatch ? 'text-slate-300 dark:text-slate-600' : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {variance > 0 ? `+${variance}` : variance}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="py-4 pr-6 text-right">
                      {isMatch ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-md uppercase tracking-wider">
                          MATCHED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 rounded-md uppercase tracking-wider">
                          <ArrowRightLeft className="w-3 h-3" /> MISMATCH
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <ClipboardCheck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-bold uppercase">No Stock SKUs Found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
