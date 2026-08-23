'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { 
  Boxes, Zap, AlertTriangle, CheckCircle2, 
  ArrowRight, ShieldCheck, DollarSign, Package, 
  Search, Plus, Trash2, Warehouse, MapPin, 
  Clock, Loader2, ShieldAlert, Sparkles, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type WarehouseBatchOption = {
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  binLocation: string;
  availableQoh: number;
  unitCost: number;
};

type RestockCandidate = {
  id: string;
  name: string;
  sku: string;
  category: string;
  pharmacyQoh: number;
  pharmacyParLevel: number;
  unitCost: number;
  unit: string;
  warehouseBatches: WarehouseBatchOption[];
};

type DraftDispatchItem = {
  candidateId: string;
  name: string;
  sku: string;
  pharmacyQoh: number;
  pharmacyParLevel: number;
  transferQty: number;
  selectedBatch: string;
  selectedBin: string;
  selectedExpiry: string;
  unitCost: number;
  availableWarehouseQoh: number;
};

export default function SmartPharmacyRestockPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'PROCUREMENT_OFFICER'].includes(userRole || 'DIRECTOR');

  const [destinationPharmacy, setDestinationPharmacy] = useState('Outpatient Central Pharmacy (CC-102)');
  const [priorityLevel, setPriorityLevel] = useState('HIGH_PRIORITY');
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Suggested Restock Master Candidates (Pharmacy QOH < PAR)
  const [shortageCandidates, setShortageCandidates] = useState<RestockCandidate[]>([
    {
      id: 'CAND-01',
      name: 'Ceftriaxone 1g IV Powder for Injection Vial',
      sku: 'PHA-CEF-04',
      category: 'PHARMACEUTICAL',
      pharmacyQoh: 8,
      pharmacyParLevel: 50, // Severe Deficit!
      unitCost: 35.00,
      unit: 'VIAL',
      warehouseBatches: [
        { batchNumber: 'BTH-2026-CEF-99', expiryDate: '2026-09-15', binLocation: 'Cold Room A-03', availableQoh: 85, unitCost: 35.00 },
        { batchNumber: 'BTH-2027-CEF-02', expiryDate: '2027-04-30', binLocation: 'Cold Room A-04', availableQoh: 200, unitCost: 35.00 }
      ]
    },
    {
      id: 'CAND-02',
      name: 'Azithromycin 500mg Tablets (Pack 30)',
      sku: 'PHA-AZI-04',
      category: 'PHARMACEUTICAL',
      pharmacyQoh: 12,
      pharmacyParLevel: 60, // Deficit
      unitCost: 30.00,
      unit: 'PACK',
      warehouseBatches: [
        { batchNumber: 'BTH-2026-AZI-04', expiryDate: '2027-08-31', binLocation: 'Shelf 4C-02', availableQoh: 150, unitCost: 30.00 },
        { batchNumber: 'BTH-2028-AZI-09', expiryDate: '2028-02-28', binLocation: 'Shelf 4C-03', availableQoh: 300, unitCost: 30.00 }
      ]
    },
    {
      id: 'CAND-03',
      name: 'Paracetamol 500mg IV Infusion (100ml Bottle)',
      sku: 'PHA-PAR-01',
      category: 'PHARMACEUTICAL',
      pharmacyQoh: 45,
      pharmacyParLevel: 150,
      unitCost: 25.00,
      unit: 'BOTTLE',
      warehouseBatches: [
        { batchNumber: 'BTH-2026-PAR-08', expiryDate: '2028-06-30', binLocation: 'Shelf 4B-01', availableQoh: 1500, unitCost: 25.00 }
      ]
    },
    {
      id: 'CAND-04',
      name: 'Soluble Insulin Human 100 IU/ml (10ml Vial)',
      sku: 'PHA-INS-09',
      category: 'PHARMACEUTICAL',
      pharmacyQoh: 2,
      pharmacyParLevel: 25, // Critical Shortage!
      unitCost: 125.00,
      unit: 'VIAL',
      warehouseBatches: [
        { batchNumber: 'BTH-2026-INS-11', expiryDate: '2026-09-05', binLocation: 'Cold Room A-01', availableQoh: 15, unitCost: 125.00 },
        { batchNumber: 'BTH-2027-INS-04', expiryDate: '2027-11-30', binLocation: 'Cold Room A-02', availableQoh: 80, unitCost: 125.00 }
      ]
    },
    {
      id: 'CAND-05',
      name: 'Normal Saline 0.9% 500ml Infusion Bottle',
      sku: 'PHA-NS-03',
      category: 'PHARMACEUTICAL',
      pharmacyQoh: 80,
      pharmacyParLevel: 200,
      unitCost: 13.00,
      unit: 'BOTTLE',
      warehouseBatches: [
        { batchNumber: 'BTH-2026-10', expiryDate: '2028-09-30', binLocation: 'Bulk Rack A1-02', availableQoh: 2800, unitCost: 13.00 }
      ]
    }
  ]);

  // Active Transfer Draft Matrix
  const [draftItems, setDraftItems] = useState<DraftDispatchItem[]>([
    {
      candidateId: 'CAND-01',
      name: 'Ceftriaxone 1g IV Powder for Injection Vial',
      sku: 'PHA-CEF-04',
      pharmacyQoh: 8,
      pharmacyParLevel: 50,
      transferQty: 42, // Deficit: 50 - 8 = 42
      selectedBatch: 'BTH-2026-CEF-99',
      selectedBin: 'Cold Room A-03',
      selectedExpiry: '2026-09-15',
      unitCost: 35.00,
      availableWarehouseQoh: 85
    },
    {
      candidateId: 'CAND-04',
      name: 'Soluble Insulin Human 100 IU/ml (10ml Vial)',
      sku: 'PHA-INS-09',
      pharmacyQoh: 2,
      pharmacyParLevel: 25,
      transferQty: 15,
      selectedBatch: 'BTH-2026-INS-11',
      selectedBin: 'Cold Room A-01',
      selectedExpiry: '2026-09-05',
      unitCost: 125.00,
      availableWarehouseQoh: 15
    }
  ]);

  // Total Draft Valuation
  const totalTransferCOGS = useMemo(() => {
    return draftItems.reduce((sum, item) => sum + (item.transferQty * item.unitCost), 0);
  }, [draftItems]);

  // Critical Shortages Count
  const criticalCount = useMemo(() => {
    return shortageCandidates.filter(c => c.pharmacyQoh <= (c.pharmacyParLevel * 0.25)).length;
  }, [shortageCandidates]);

  // Auto-Fill Suggested Restock Action
  const handleAutoFillSuggested = () => {
    const newItems: DraftDispatchItem[] = shortageCandidates.map(candidate => {
      const neededQty = Math.max(0, candidate.pharmacyParLevel - candidate.pharmacyQoh);
      // Pick earliest expiry batch (FEFO)
      const sortedBatches = [...candidate.warehouseBatches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
      const bestBatch = sortedBatches[0];

      return {
        candidateId: candidate.id,
        name: candidate.name,
        sku: candidate.sku,
        pharmacyQoh: candidate.pharmacyQoh,
        pharmacyParLevel: candidate.pharmacyParLevel,
        transferQty: Math.min(neededQty, bestBatch.availableQoh),
        selectedBatch: bestBatch.batchNumber,
        selectedBin: bestBatch.binLocation,
        selectedExpiry: bestBatch.expiryDate,
        unitCost: candidate.unitCost,
        availableWarehouseQoh: bestBatch.availableQoh
      };
    });

    setDraftItems(newItems);
    toast({
      title: "⚡ Smart Replenishment Auto-Filled",
      description: `Draft loaded with ${newItems.length} items to restore Pharmacy PAR levels based on FEFO picking.`
    });
  };

  // Add individual candidate to draft
  const handleAddCandidate = (candidate: RestockCandidate) => {
    if (draftItems.some(i => i.candidateId === candidate.id)) {
      toast({ title: "Item Already in Draft", description: `${candidate.name} is already listed in the dispatch matrix.` });
      return;
    }

    const neededQty = Math.max(1, candidate.pharmacyParLevel - candidate.pharmacyQoh);
    const sortedBatches = [...candidate.warehouseBatches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    const bestBatch = sortedBatches[0];

    setDraftItems(prev => [
      ...prev,
      {
        candidateId: candidate.id,
        name: candidate.name,
        sku: candidate.sku,
        pharmacyQoh: candidate.pharmacyQoh,
        pharmacyParLevel: candidate.pharmacyParLevel,
        transferQty: Math.min(neededQty, bestBatch.availableQoh),
        selectedBatch: bestBatch.batchNumber,
        selectedBin: bestBatch.binLocation,
        selectedExpiry: bestBatch.expiryDate,
        unitCost: candidate.unitCost,
        availableWarehouseQoh: bestBatch.availableQoh
      }
    ]);

    toast({
      title: "Item Added to Dispatch",
      description: `${candidate.name} added with FEFO batch ${bestBatch.batchNumber}.`
    });
  };

  // Update item quantity
  const handleUpdateQty = (candidateId: string, qty: number) => {
    setDraftItems(prev => prev.map(item => {
      if (item.candidateId === candidateId) {
        return {
          ...item,
          transferQty: Math.max(1, Math.min(qty, item.availableWarehouseQoh))
        };
      }
      return item;
    }));
  };

  // Update item batch selection
  const handleUpdateBatch = (candidateId: string, batchNumber: string) => {
    const candidate = shortageCandidates.find(c => c.id === candidateId);
    if (!candidate) return;
    const batch = candidate.warehouseBatches.find(b => b.batchNumber === batchNumber);
    if (!batch) return;

    setDraftItems(prev => prev.map(item => {
      if (item.candidateId === candidateId) {
        return {
          ...item,
          selectedBatch: batch.batchNumber,
          selectedBin: batch.binLocation,
          selectedExpiry: batch.expiryDate,
          availableWarehouseQoh: batch.availableQoh,
          transferQty: Math.min(item.transferQty, batch.availableQoh)
        };
      }
      return item;
    }));
  };

  // Remove item from draft
  const handleRemoveDraftItem = (candidateId: string) => {
    setDraftItems(prev => prev.filter(i => i.candidateId !== candidateId));
  };

  // Authorize Transfer & Submit
  const handleAuthorizeTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftItems.length === 0) return;

    // Check if any item has missing batch
    if (draftItems.some(i => !i.selectedBatch)) {
      toast({
        variant: "destructive",
        title: "Missing Batch Selection",
        description: "Every transfer item must have an assigned warehouse source batch to enforce FEFO picking."
      });
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "✅ Stock Transfer Authorized & Dispatched",
        description: `Successfully dispatched ${draftItems.length} items (COGS: ₵ ${totalTransferCOGS.toFixed(2)}) to ${destinationPharmacy}. Inventory deducted from Central Warehouse.`
      });
      setDraftItems([]);
    }, 800);
  };

  const isLoading = isUserLoading || isProfileLoading;
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Pharmacy Replenishment.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
      
      {/* ========================================================================= */}
      {/* 1. THE REPLENISHMENT COMMAND BANNER (TOP) WITH TELEMETRY                   */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden space-y-6">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Header Title & Badges */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Smart Push Replenishment
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    • PAR Level Intelligence & FEFO Active
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-0.5">
                  Pharmacy Replenishment & Push Dispatch
                </h1>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl font-medium">
              Proactively fulfill pharmacy shortages based on central warehouse stock levels, min/max PAR thresholds, and FEFO expiry prioritization.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            <button 
              type="button"
              onClick={handleAutoFillSuggested}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" /> + AUTO-FILL SUGGESTED RESTOCK
            </button>
          </div>
        </div>

        {/* 3-Card KPI Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 relative z-10 font-mono">
          
          {/* Critical Shortages */}
          <div className="bg-rose-950/40 rounded-xl p-4 border border-rose-800/60">
            <div className="text-xs font-medium text-rose-300 uppercase tracking-wider font-sans">
              Pharmacy Critical Shortages
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {criticalCount} Items &lt; 25% PAR
            </div>
            <div className="text-xs text-rose-300/80 mt-1 flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Immediate Restock Required</span>
            </div>
          </div>

          {/* Routine Restock Queue */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Routine Restock Candidates
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1">
              {shortageCandidates.length} Deficit SKUs
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Boxes className="w-3.5 h-3.5 text-sky-400" />
              <span>Identified by PAR Intelligence</span>
            </div>
          </div>

          {/* Total Transfer Value */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Total Dispatch Value (Draft)
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              ₵ {totalTransferCOGS.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Internal COGS Transfer</span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. LOGISTICS DESTINATION & PRIORITY HEADER                                 */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
            Destination Department / Pharmacy Unit
          </label>
          <select 
            value={destinationPharmacy}
            onChange={(e) => setDestinationPharmacy(e.target.value)}
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="Outpatient Central Pharmacy (CC-102)">Outpatient Central Pharmacy (CC-102)</option>
            <option value="Inpatient Satellite Pharmacy (CC-104)">Inpatient Satellite Pharmacy (CC-104)</option>
            <option value="Emergency Theatre Pharmacy (CC-108)">Emergency Theatre Pharmacy (CC-108)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
            Replenishment Priority Level
          </label>
          <select 
            value={priorityLevel}
            onChange={(e) => setPriorityLevel(e.target.value)}
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="HIGH_PRIORITY">High Priority (Deliver within 2 Hours)</option>
            <option value="STAT_EMERGENCY">STAT Emergency (Immediate Dispatch)</option>
            <option value="ROUTINE_CYCLE">Routine Daily Replenishment Cycle</option>
          </select>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. PROACTIVE SHORTAGES CANDIDATES (THE SUGGESTED RESTOCK LIST)             */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
              Proactive Pharmacy Shortage Radar (Below PAR)
            </h2>
          </div>
          <span className="text-[10px] font-bold text-slate-400 font-mono">
            {shortageCandidates.length} Items Detected
          </span>
        </div>

        {/* Shortage Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {shortageCandidates.map(candidate => {
            const isAlreadyInDraft = draftItems.some(i => i.candidateId === candidate.id);
            const deficit = candidate.pharmacyParLevel - candidate.pharmacyQoh;
            const isCritical = candidate.pharmacyQoh <= (candidate.pharmacyParLevel * 0.25);

            return (
              <div 
                key={candidate.id}
                className={`p-4 rounded-2xl border transition-all space-y-2 flex flex-col justify-between ${
                  isAlreadyInDraft 
                    ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800/60' 
                    : isCritical
                    ? 'bg-rose-50/40 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/50'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {candidate.name}
                    </h3>
                    {isCritical && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-rose-600 text-white shrink-0">
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    SKU: {candidate.sku}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-500 font-sans">Pharmacy SOH:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {candidate.pharmacyQoh} / PAR: {candidate.pharmacyParLevel}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-500 font-sans">Deficit to Push:</span>
                    <strong className="text-slate-900 dark:text-slate-100 font-bold">
                      +{deficit} units
                    </strong>
                  </div>

                  <button
                    type="button"
                    disabled={isAlreadyInDraft}
                    onClick={() => handleAddCandidate(candidate)}
                    className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      isAlreadyInDraft
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 cursor-default'
                        : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    }`}
                  >
                    {isAlreadyInDraft ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> In Dispatch Draft
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" /> Add to Transfer
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. THE DISPATCH MATRIX (THE INTER-DEPARTMENTAL TRANSFER GRID)             */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
              Transfer Dispatch Matrix ({draftItems.length} Items Selected)
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            Valuation: <strong className="text-emerald-600 dark:text-emerald-400">₵ {totalTransferCOGS.toFixed(2)}</strong>
          </span>
        </div>

        {draftItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs italic space-y-2">
            <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
            <p>Your transfer dispatch draft is empty.</p>
            <p className="text-[10px] text-slate-500">Click <strong>[+ Auto-Fill Suggested Restock]</strong> above or select deficit items to populate the matrix.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
                <tr>
                  <th className="p-3.5">Drug / Item Description & SKU</th>
                  <th className="p-3.5 text-center">Pharmacy SOH vs PAR</th>
                  <th className="p-3.5 text-center">Transfer Qty</th>
                  <th className="p-3.5">Source Warehouse Batch & Bin (FEFO Pick)</th>
                  <th className="p-3.5 text-right">Line COGS</th>
                  <th className="p-3.5 text-center">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {draftItems.map(item => {
                  const candidate = shortageCandidates.find(c => c.id === item.candidateId);
                  const lineCost = item.transferQty * item.unitCost;

                  return (
                    <tr key={item.candidateId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Item & SKU */}
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          SKU: {item.sku}
                        </span>
                      </td>

                      {/* Pharmacy SOH vs PAR */}
                      <td className="p-3.5 text-center font-mono">
                        <span className="text-rose-600 dark:text-rose-400 font-bold block">
                          {item.pharmacyQoh} pcs
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (PAR: {item.pharmacyParLevel})
                        </span>
                      </td>

                      {/* Transfer Quantity Input */}
                      <td className="p-3.5 text-center">
                        <input
                          type="number"
                          min={1}
                          max={item.availableWarehouseQoh}
                          value={item.transferQty}
                          onChange={(e) => handleUpdateQty(item.candidateId, parseInt(e.target.value) || 1)}
                          className="w-20 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center font-bold text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Max: {item.availableWarehouseQoh}
                        </span>
                      </td>

                      {/* Source Batch & Bin Selector (CRUCIAL FEFO SELECTION) */}
                      <td className="p-3.5">
                        <select
                          value={item.selectedBatch}
                          onChange={(e) => handleUpdateBatch(item.candidateId, e.target.value)}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                        >
                          {candidate?.warehouseBatches.map(batch => (
                            <option key={batch.batchNumber} value={batch.batchNumber}>
                              {batch.batchNumber} (Exp: {batch.expiryDate}) — {batch.binLocation} [{batch.availableQoh} pcs]
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans block mt-0.5">
                          📍 Allocated from: <strong>{item.selectedBin}</strong> (Exp: {item.selectedExpiry})
                        </span>
                      </td>

                      {/* Line COGS */}
                      <td className="p-3.5 text-right font-mono">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                          ₵ {lineCost.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          @ ₵ {item.unitCost.toFixed(2)}/ea
                        </span>
                      </td>

                      {/* Action Trash */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(item.candidateId)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                          title="Remove from dispatch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 5. DEFENSIVE FINANCIAL SUBMISSION BAR (FOOTER)                             */}
      {/* ========================================================================= */}
      {draftItems.length > 0 && (
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Inter-Departmental Accounting Transfer
            </span>
            <div className="text-xl font-black text-white font-mono">
              Total Dispatch COGS: <span className="text-emerald-400">₵ {totalTransferCOGS.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Debits Main Warehouse Inventory Asset <strong>#1300</strong> &rarr; Credits Pharmacy Cost Center <strong>#1305</strong>.
            </p>
          </div>

          <button
            type="button"
            disabled={isSubmitting || draftItems.length === 0}
            onClick={handleAuthorizeTransfer}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> DISPATCHING TRANSFER...
              </>
            ) : (
              <>
                AUTHORIZE STOCK TRANSFER & DISPATCH ({draftItems.length} SKUs) &rarr;
              </>
            )}
          </button>

        </div>
      )}

    </div>
  );
}
