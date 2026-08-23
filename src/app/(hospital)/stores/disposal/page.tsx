'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { 
  Trash2, AlertTriangle, ShieldAlert, FileWarning, 
  CheckCircle2, Loader2, Archive, Search, DollarSign, 
  MapPin, Clock, Building2, UploadCloud, FileText, 
  ArrowRight, ShieldCheck, HelpCircle, Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import Link from 'next/link';

type DecommissionBatch = {
  id: string;
  sku: string;
  name: string;
  batchNumber: string;
  binLocation: string;
  binZone: string;
  qoh: number;
  unitCost: number;
  expiryDate: string;
  category: string;
  status: 'EXPIRED' | 'DAMAGED' | 'QUARANTINED' | 'NEAR_EXPIRY';
};

export default function RegulatoryDisposalPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PHARMACIST'].includes(userRole || 'DIRECTOR');

  // Search & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<DecommissionBatch | null>(null);

  // Form State
  const [disposalQty, setDisposalQty] = useState<number>(0);
  const [reasonCode, setReasonCode] = useState('EXPIRED_GRACE_PERIOD');
  const [disposalMethod, setDisposalMethod] = useState('HIGH_TEMP_INCINERATION');
  const [witnessName, setWitnessName] = useState('Dr. Alex Boateng (Head Pharmacist)');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [attachedEvidence, setAttachedEvidence] = useState<string | null>('shattered_vial_photo_evidence.jpg');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  // Available Batches for Decommissioning
  const [batches, setBatches] = useState<DecommissionBatch[]>([
    {
      id: 'BTH-AZI-01',
      sku: 'PHA-AZI-04',
      name: 'Azithromycin 500mg Tablets (Pack 30)',
      batchNumber: 'BTH-2026-AZI-01',
      binLocation: 'Shelf 4C-02',
      binZone: 'CENTRAL_PHARMACY',
      qoh: 40,
      unitCost: 30.00,
      expiryDate: '2026-08-10',
      category: 'PHARMACEUTICAL',
      status: 'EXPIRED'
    },
    {
      id: 'BTH-CEF-99',
      sku: 'PHA-CEF-04',
      name: 'Ceftriaxone 1g IV Powder for Injection Vial',
      batchNumber: 'BTH-2026-CEF-99',
      binLocation: 'Cold Room A-03',
      binZone: 'COLD_ROOM',
      qoh: 85,
      unitCost: 35.00,
      expiryDate: '2026-09-15',
      category: 'PHARMACEUTICAL',
      status: 'NEAR_EXPIRY'
    },
    {
      id: 'BTH-CAN-04',
      sku: 'CON-CAN-03',
      name: 'IV Cannula 18G Green with Port & Wings (Box 50)',
      batchNumber: 'BTH-CAN-2025-04',
      binLocation: 'Surgical Bin 12-C',
      binZone: 'SURGICAL_THEATRE',
      qoh: 12,
      unitCost: 75.00,
      expiryDate: '2027-05-31',
      category: 'CONSUMABLES',
      status: 'DAMAGED'
    },
    {
      id: 'BTH-SUT-03',
      sku: 'CON-SUT-05',
      name: 'Chromic Catgut 2-0 Suture with Needle (Box 36)',
      batchNumber: 'BTH-SUT-2024-03',
      binLocation: 'Quarantine Rack Q-1',
      binZone: 'QUARANTINE',
      qoh: 10,
      unitCost: 120.00,
      expiryDate: '2026-07-31',
      category: 'CONSUMABLES',
      status: 'EXPIRED'
    },
    {
      id: 'BTH-AMX-09',
      sku: 'PHA-AMX-02',
      name: 'Amoxicillin + Clavulanic Acid 1.2g IV Vial',
      batchNumber: 'BTH-2026-AMX-09',
      binLocation: 'Shelf 4B-04',
      binZone: 'CENTRAL_PHARMACY',
      qoh: 25,
      unitCost: 65.00,
      expiryDate: '2026-08-01',
      category: 'PHARMACEUTICAL',
      status: 'EXPIRED'
    }
  ]);

  // Filtered Batches List (Filters out QOH <= 0)
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      if (batch.qoh <= 0) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        batch.name.toLowerCase().includes(q) ||
        batch.sku.toLowerCase().includes(q) ||
        batch.batchNumber.toLowerCase().includes(q) ||
        batch.binLocation.toLowerCase().includes(q)
      );
    });
  }, [batches, searchQuery]);

  // Financial Loss Calculation
  const totalFinancialLoss = useMemo(() => {
    if (!selectedBatch || disposalQty <= 0) return 0;
    return disposalQty * selectedBatch.unitCost;
  }, [selectedBatch, disposalQty]);

  // Select Batch Handler
  const handleSelectBatch = (batch: DecommissionBatch) => {
    setSelectedBatch(batch);
    setDisposalQty(batch.qoh); // Default to full batch
  };

  // Submit Decommissioning Handler
  const handleSubmitDecommission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    if (disposalQty <= 0 || disposalQty > selectedBatch.qoh) {
      toast({
        variant: "destructive",
        title: "Invalid Quantity",
        description: `Quantity must be between 1 and ${selectedBatch.qoh}.`
      });
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Deduct from local ledger
      setBatches(prev => prev.map(b => {
        if (b.id === selectedBatch.id) {
          return {
            ...b,
            qoh: b.qoh - disposalQty
          };
        }
        return b;
      }));

      setIsSubmitting(false);

      toast({
        title: "🗑️ Decommissioning Submitted for Director Approval",
        description: `Write-off of ${disposalQty} units of ${selectedBatch.name} (Loss: ₵ ${totalFinancialLoss.toFixed(2)}) logged to audit docket #DEC-${Date.now().toString().slice(-6)}.`
      });

      setSelectedBatch(null);
      setDisposalQty(0);
      setIncidentNotes('');
    }, 800);
  };

  const isLoading = isUserLoading || isProfileLoading;
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">Only Store Managers, Pharmacists, and Directors can access Decommissioning.</p>
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
      {/* 1. THE DECOMMISSIONING COMMAND BANNER (TOP)                               */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden space-y-6">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Header Title & Badges */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Statutory Audit Control
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    • MoH & Pharmacy Council Protocols
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-0.5">
                  Regulatory Decommissioning & Write-Offs
                </h1>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl font-medium">
              Log damaged, expired, or recalled pharmaceutical inventory for certified biohazard disposal, financial shrinkage accounting, and Director sign-off.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            <button 
              type="button"
              onClick={() => setIsArchiveOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Archive className="w-4 h-4 text-amber-400" /> Disposal Archive Log
            </button>
          </div>
        </div>

        {/* 3-Card KPI Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 relative z-10 font-mono">
          
          {/* Total Write-Offs (MTD) */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Total Write-Offs (MTD)
            </div>
            <div className="text-2xl font-black text-white mt-1">
              14 Batches
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Certified Incinerated</span>
            </div>
          </div>

          {/* Financial Shrinkage (YTD) - Red Alert */}
          <div className="bg-rose-950/40 rounded-xl p-4 border border-rose-800/60">
            <div className="text-xs font-medium text-rose-300 uppercase tracking-wider font-sans">
              Financial Shrinkage (YTD)
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              ₵ 3,250.00
            </div>
            <div className="text-xs text-rose-300/80 mt-1 flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>COGS Account #5200</span>
            </div>
          </div>

          {/* Pending Director Approvals */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Pending Approvals
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              2 Batches
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>In Director Review Queue</span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. TWO-COLUMN WORKFLOW: STEP 1 SELECT vs STEP 2 DECOMMISSION               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ======================================================================= */}
        {/* LEFT COLUMN: STOCK SELECTION MATRIX (STEP 1)                            */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-black">
                1
              </span>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
                Select Physical Batch
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {filteredBatches.length} Available
            </span>
          </div>

          {/* Search Filter */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Drug, SKU, or Batch #..."
              className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          {/* Batches List Cards */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredBatches.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-xs">
                No active batches found matching search.
              </div>
            ) : (
              filteredBatches.map(batch => {
                const isSelected = selectedBatch?.id === batch.id;
                return (
                  <div
                    key={batch.id}
                    onClick={() => handleSelectBatch(batch)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-rose-50/50 border-rose-500 dark:bg-rose-950/20 dark:border-rose-500 shadow-md ring-2 ring-rose-500/20'
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-tight">
                          {batch.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-mono">
                          SKU: {batch.sku}
                        </span>
                      </div>
                      
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        batch.status === 'EXPIRED' 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300' 
                          : batch.status === 'DAMAGED'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                      }`}>
                        {batch.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <div>
                        <span className="text-slate-400 block">Batch #:</span>
                        <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {batch.batchNumber}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Bin Location:</span>
                        <strong className="font-mono text-slate-700 dark:text-slate-300">
                          {batch.binLocation}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Expiry Date:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {batch.expiryDate}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Available QOH:</span>
                        <span className="font-mono font-black text-slate-900 dark:text-slate-100">
                          {batch.qoh} units (₵ {(batch.qoh * batch.unitCost).toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: THE DECOMMISSIONING FORM (STEP 2)                         */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-black">
              2
            </span>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
              Decommissioning Protocol & Loss Reconciliation
            </h2>
          </div>

          {!selectedBatch ? (
            <div className="py-20 text-center space-y-3">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full w-fit mx-auto">
                <FileWarning className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                No Batch Selected
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Please select a physical stock batch from the left column to populate the statutory write-off parameters and financial impact calculator.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitDecommission} className="space-y-5 text-xs">
              
              {/* Selected Target Asset Banner */}
              <div className="p-4 bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                    TARGET ASSET FOR DESTRUCTION
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Unit Cost: ₵ {selectedBatch.unitCost.toFixed(2)}
                  </span>
                </div>
                <div className="font-bold text-sm text-white">
                  {selectedBatch.name}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-300 pt-1">
                  <span>Batch: <strong className="text-emerald-400">{selectedBatch.batchNumber}</strong></span>
                  <span>•</span>
                  <span>Bin: <strong className="text-white">{selectedBatch.binLocation}</strong></span>
                  <span>•</span>
                  <span>QOH Available: <strong className="text-white">{selectedBatch.qoh} units</strong></span>
                </div>
              </div>

              {/* Disposal Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Quantity to Decommission */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Quantity to Decommission (Max: {selectedBatch.qoh}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedBatch.qoh}
                    value={disposalQty || ''}
                    onChange={(e) => setDisposalQty(parseInt(e.target.value) || 0)}
                    required
                    placeholder="Enter units"
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                {/* Reason Code Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Statutory Reason Code *
                  </label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                  >
                    <option value="EXPIRED_GRACE_PERIOD">Expired Beyond 30-Day Grace Period</option>
                    <option value="DAMAGED_IN_TRANSIT">Damaged / Shattered Vials in Transit</option>
                    <option value="TEMPERATURE_BREACH">Cold Chain Temperature Breach (&gt;8°C)</option>
                    <option value="MANUFACTURER_RECALL">Regulatory FDA / Manufacturer Recall</option>
                    <option value="CONTAMINATED_SEAL">Compromised Packaging / Contaminated Seal</option>
                  </select>
                </div>

                {/* Disposal Method */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Certified Disposal Method *
                  </label>
                  <select
                    value={disposalMethod}
                    onChange={(e) => setDisposalMethod(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                  >
                    <option value="HIGH_TEMP_INCINERATION">High-Temperature Incineration</option>
                    <option value="CHEMICAL_NEUTRALIZATION">Chemical Neutralization & Flushing</option>
                    <option value="BIOHAZARD_WASTE_PIT">Hazardous Biohazard Waste Burial</option>
                    <option value="RETURNED_TO_MANUFACTURER">Returned to Manufacturer under Quarantine</option>
                  </select>
                </div>

                {/* Witness / Verifier */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Witness / QA Pharmacist Verifier *
                  </label>
                  <input
                    type="text"
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    required
                    placeholder="e.g. Dr. Alex Boateng (Pharmacist)"
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

              </div>

              {/* Evidence Upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-rose-500" />
                  Upload Photo Evidence / Official Recall Memo
                </label>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                      {attachedEvidence}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Attached
                  </span>
                </div>
              </div>

              {/* Incident Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Audit Notes & Destruction Observations
                </label>
                <textarea
                  rows={2}
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  placeholder="Provide incident context, certificate details, or bin segregation notes for the Director..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              {/* CRUCIAL: FINANCIAL IMPACT CALCULATOR */}
              <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-2xl space-y-2 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 font-sans">
                    Financial Impact & Shrinkage Loss:
                  </span>
                  <span className="text-xl font-black text-rose-400">
                    ₵ {totalFinancialLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[10px] text-rose-300/80 font-sans leading-relaxed">
                  ⚠️ This write-off will directly debit General Ledger <strong>#5200 (Inventory Shrinkage & Write-Offs)</strong> upon Director sign-off.
                </div>
              </div>

              {/* Footer Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting || disposalQty <= 0}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-rose-900/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> COMMITTING TO AUDIT DOCKET...
                    </>
                  ) : (
                    <>
                      SUBMIT FOR WRITE-OFF APPROVAL (₵ {totalFinancialLoss.toFixed(2)}) &rarr;
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. DISPOSAL ARCHIVE LOG MODAL                                             */}
      {/* ========================================================================= */}
      {isArchiveOpen && (
        <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-400" />
                <span>Regulatory Disposal & Write-Off Archive</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Audited historical decommissioning logs and biohazard disposal certificates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-3 text-xs max-h-[400px] overflow-y-auto">
              {[
                { id: 'DEC-00912', item: 'Paracetamol 500mg IV (100ml)', batch: 'BTH-2025-PAR-01', qty: 50, loss: 1250.00, date: '2026-08-18', reason: 'EXPIRED', approver: 'Hospital Director' },
                { id: 'DEC-00911', item: 'Ciprofloxacin 500mg Tab', batch: 'BTH-2025-CIP-88', qty: 30, loss: 1200.00, date: '2026-08-12', reason: 'DAMAGED_CRATE', approver: 'Hospital Director' },
                { id: 'DEC-00910', item: 'Latex Gloves Size 7.5', batch: 'BTH-GLV-77', qty: 15, loss: 720.00, date: '2026-08-05', reason: 'COMPROMISED_SEAL', approver: 'Chief Pharmacist' },
              ].map(log => (
                <div key={log.id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-xs">{log.item}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Batch: {log.batch} • {log.date} • Docket #{log.id}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-rose-400 block">
                      -₵ {log.loss.toFixed(2)} ({log.qty} pcs)
                    </span>
                    <span className="text-[9px] text-emerald-400 font-sans">
                      Approved by {log.approver}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={() => setIsArchiveOpen(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
                Close Archive Log
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
