'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, Clock, ShieldCheck, CheckCircle2, 
  Trash2, ArrowRight, Download, Printer, Search, 
  Filter, Building2, Package, Warehouse, MapPin, 
  Loader2, ShieldAlert, ArrowRightLeft, AlertCircle,
  FileCheck2, DollarSign, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import Link from 'next/link';

type BatchRecord = {
  id: string;
  sku: string;
  drugName: string;
  category: string;
  batchNumber: string;
  manufacturer: string;
  binLocation: string;
  binZone: string;
  quantity: number;
  unitPrice: number;
  expiryDate: string; // YYYY-MM-DD
  storageCondition: string;
  status: 'SAFE' | 'EXPIRING_SOON' | 'EXPIRED' | 'QUARANTINED';
};

export default function ExpiryAndBatchTrackingPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PROCUREMENT_OFFICER', 'PHARMACIST'].includes(userRole || 'DIRECTOR');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'UNDER_30' | '30_TO_90' | 'OVER_90' | 'EXPIRED'>('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');

  // Modals
  const [quarantineModalBatch, setQuarantineModalBatch] = useState<BatchRecord | null>(null);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<BatchRecord | null>(null);

  // Master FEFO Batch Ledger
  const [batches, setBatches] = useState<BatchRecord[]>([
    {
      id: 'BTH-01',
      sku: 'PHA-CEF-04',
      drugName: 'Ceftriaxone 1g IV Powder for Injection Vial',
      category: 'PHARMACEUTICAL',
      batchNumber: 'BTH-2026-CEF-99',
      manufacturer: 'Ernest Chemists Labs',
      binLocation: 'Cold Room A-03',
      binZone: 'COLD_ROOM',
      quantity: 85,
      unitPrice: 35.00,
      expiryDate: '2026-09-15', // Expiring in ~23 days!
      storageCondition: 'Cold Chain (2°C - 8°C)',
      status: 'EXPIRING_SOON'
    },
    {
      id: 'BTH-02',
      sku: 'PHA-AZI-04',
      drugName: 'Azithromycin 500mg Tablets (Pack 30)',
      category: 'PHARMACEUTICAL',
      batchNumber: 'BTH-2026-AZI-01',
      manufacturer: 'Tobinco Pharmaceuticals Ltd',
      binLocation: 'Shelf 4C-02',
      binZone: 'CENTRAL_PHARMACY',
      quantity: 40,
      unitPrice: 30.00,
      expiryDate: '2026-08-10', // Already Expired!
      storageCondition: 'Ambient (15°C - 25°C)',
      status: 'EXPIRED'
    },
    {
      id: 'BTH-03',
      sku: 'PHA-PAR-01',
      name: 'Paracetamol 500mg IV Infusion (100ml Bottle)',
      drugName: 'Paracetamol 500mg IV Infusion (100ml Bottle)',
      category: 'PHARMACEUTICAL',
      batchNumber: 'BTH-2026-PAR-08',
      manufacturer: 'Ernest Chemists Ltd',
      binLocation: 'Shelf 4B-01',
      binZone: 'CENTRAL_PHARMACY',
      quantity: 1500,
      unitPrice: 25.00,
      expiryDate: '2028-06-30', // > 90 days
      storageCondition: 'Ambient',
      status: 'SAFE'
    },
    {
      id: 'BTH-04',
      sku: 'PHA-AMX-02',
      drugName: 'Amoxicillin + Clavulanic Acid 1.2g IV Vial',
      category: 'PHARMACEUTICAL',
      batchNumber: 'BTH-2026-AMX-09',
      manufacturer: 'MedTech Ghana',
      binLocation: 'Shelf 4B-04',
      binZone: 'CENTRAL_PHARMACY',
      quantity: 600,
      unitPrice: 65.00,
      expiryDate: '2027-12-31',
      storageCondition: 'Ambient',
      status: 'SAFE'
    },
    {
      id: 'BTH-05',
      sku: 'CON-GLV-01',
      drugName: 'Latex Surgical Sterile Gloves Size 7.5 (Box 100)',
      category: 'CONSUMABLES',
      batchNumber: 'BTH-GLV-88',
      manufacturer: 'Multinec Medical Consumables',
      binLocation: 'Surgical Bin 12-A',
      binZone: 'SURGICAL_THEATRE',
      quantity: 420,
      unitPrice: 48.00,
      expiryDate: '2028-11-30',
      storageCondition: 'Ambient',
      status: 'SAFE'
    },
    {
      id: 'BTH-06',
      sku: 'LAB-REAG-01',
      drugName: 'Automated Hematology 5-Part Lyse Reagent (20L)',
      category: 'LABORATORY',
      batchNumber: 'BTH-LAB-LYS-02',
      manufacturer: 'A-Z Diagnostics',
      binLocation: 'Main Lab Reagent Bay 1',
      binZone: 'MAIN_LAB',
      quantity: 2,
      unitPrice: 850.00,
      expiryDate: '2026-10-25', // ~63 days (30-90 Days)
      storageCondition: 'Controlled (18°C - 22°C)',
      status: 'EXPIRING_SOON'
    },
    {
      id: 'BTH-07',
      sku: 'PHA-INS-09',
      drugName: 'Soluble Insulin Human 100 IU/ml (10ml Vial)',
      category: 'PHARMACEUTICAL',
      batchNumber: 'BTH-2026-INS-11',
      manufacturer: 'Novo Nordisk Distributor',
      binLocation: 'Cold Room A-01',
      binZone: 'COLD_ROOM',
      quantity: 15,
      unitPrice: 125.00,
      expiryDate: '2026-09-05', // Expiring in ~13 days!
      storageCondition: 'Strict Cold Chain (2°C - 8°C)',
      status: 'EXPIRING_SOON'
    },
    {
      id: 'BTH-08',
      sku: 'CON-SUT-05',
      drugName: 'Chromic Catgut 2-0 Suture with Needle (Box 36)',
      category: 'CONSUMABLES',
      batchNumber: 'BTH-SUT-2024-03',
      manufacturer: 'Multinec Consumables',
      binLocation: 'Quarantine Rack Q-1',
      binZone: 'QUARANTINE',
      quantity: 10,
      unitPrice: 120.00,
      expiryDate: '2026-07-31', // Expired
      storageCondition: 'Quarantine Hold',
      status: 'QUARANTINED'
    }
  ]);

  // Helper to calculate days remaining
  const calculateDaysRemaining = (expiryDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Telemetry Calculations
  const telemetry = useMemo(() => {
    const totalBatches = batches.length;
    let under30Count = 0;
    let expiredCount = 0;
    let valueAtRisk = 0;

    batches.forEach(b => {
      const days = calculateDaysRemaining(b.expiryDate);
      if (days < 0 || b.status === 'EXPIRED' || b.status === 'QUARANTINED') {
        expiredCount += 1;
      } else if (days <= 30) {
        under30Count += 1;
        valueAtRisk += (b.quantity * b.unitPrice);
      }
    });

    return {
      totalBatches,
      under30Count,
      expiredCount,
      valueAtRisk
    };
  }, [batches]);

  // Filtered Batches List
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      const matchesSearch = 
        batch.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesZone = zoneFilter === 'ALL' || batch.binZone === zoneFilter;

      const days = calculateDaysRemaining(batch.expiryDate);
      let matchesTimeline = true;

      if (timelineFilter === 'UNDER_30') {
        matchesTimeline = days > 0 && days <= 30;
      } else if (timelineFilter === '30_TO_90') {
        matchesTimeline = days > 30 && days <= 90;
      } else if (timelineFilter === 'OVER_90') {
        matchesTimeline = days > 90;
      } else if (timelineFilter === 'EXPIRED') {
        matchesTimeline = days <= 0 || batch.status === 'EXPIRED' || batch.status === 'QUARANTINED';
      }

      return matchesSearch && matchesZone && matchesTimeline;
    });
  }, [batches, searchQuery, timelineFilter, zoneFilter]);

  const handleMoveToQuarantine = (batch: BatchRecord) => {
    setBatches(prev => prev.map(b => {
      if (b.id === batch.id) {
        return {
          ...b,
          status: 'QUARANTINED',
          binLocation: 'Quarantine Rack Q-1',
          binZone: 'QUARANTINE'
        };
      }
      return b;
    }));

    toast({
      variant: "destructive",
      title: "🔒 Batch Moved to Quarantine",
      description: `${batch.drugName} (${batch.batchNumber}) locked from dispensing. Relocated to Quarantine Rack Q-1.`
    });
    setQuarantineModalBatch(null);
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Expiry & Batch Tracking.</p>
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
      {/* 1. THE FEFO COMMAND BANNER (TOP) WITH EXPIRY TELEMETRY                     */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden space-y-6">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Header Titles */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    FEFO Surveillance
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    • Cold-Chain & Batch Quarantines Active
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-0.5">
                  Batch & Expiry Tracking (FEFO)
                </h1>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl font-medium">
              Monitor pharmaceutical shelf-life, manage quarantine locks, and enforce First-Expired, First-Out (FEFO) dispensing protocols.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
            <button 
              type="button"
              onClick={() => {
                toast({ title: "Audit Report Generated", description: "Batch expiry audit register downloaded successfully." });
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Audit Report
            </button>
            <button 
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Expiry Log
            </button>
            <button 
              type="button"
              onClick={() => router.push('/stores/disposal')}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 shadow-lg shadow-rose-900/30 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> + LOG DISPOSAL / WRITE-OFF
            </button>
          </div>
        </div>

        {/* 4-Card KPI Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80 relative z-10 font-mono">
          
          {/* Total Batches Tracked */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Total Batches Tracked
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {telemetry.totalBatches} Batches
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% FEFO Indexed</span>
            </div>
          </div>

          {/* Expiring in < 30 Days (Amber Alert) */}
          <div className="bg-amber-950/40 rounded-xl p-4 border border-amber-800/60">
            <div className="text-xs font-medium text-amber-300 uppercase tracking-wider font-sans">
              Expiring in &lt; 30 Days
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {telemetry.under30Count} Batches
            </div>
            <div className="text-xs text-amber-300/80 mt-1 flex items-center gap-1 font-sans">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Priority Floor Dispatch</span>
            </div>
          </div>

          {/* CRITICAL: Expired Stock (Red Alert) */}
          <div className="bg-rose-950/50 rounded-xl p-4 border border-rose-800/80">
            <div className="text-xs font-medium text-rose-300 uppercase tracking-wider font-sans">
              Critical: Expired Stock
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {telemetry.expiredCount} Batches
            </div>
            <div className="text-xs text-rose-300/80 mt-1 flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Quarantined from Patients</span>
            </div>
          </div>

          {/* Value at Risk (Next 30 Days) */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Value at Risk (&lt;30d)
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              ₵ {telemetry.valueAtRisk.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>Salvageable via Floor Reqs</span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. THE COMMAND FILTER BAR (TIMELINE & BIN ZONE)                           */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        
        {/* Search Input */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Drug Name, Molecule, SKU, Batch #, or Manufacturer..."
            className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
          />
        </div>

        {/* Timeline Pills & Storage Zone Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          
          {/* Timeline Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Timeline:</span>
            {[
              { id: 'ALL', label: 'All Batches' },
              { id: 'UNDER_30', label: '< 30 Days (Urgent)' },
              { id: '30_TO_90', label: '30 - 90 Days' },
              { id: 'OVER_90', label: '> 90 Days (Safe)' },
              { id: 'EXPIRED', label: 'Expired / Quarantined' },
            ].map(pill => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setTimelineFilter(pill.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  timelineFilter === pill.id
                    ? pill.id === 'EXPIRED'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : pill.id === 'UNDER_30'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Storage Zone Dropdown */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
            >
              <option value="ALL">All Storage Zones</option>
              <option value="COLD_ROOM">Cold Room (2°C - 8°C)</option>
              <option value="CENTRAL_PHARMACY">Central Pharmacy Shelves</option>
              <option value="SURGICAL_THEATRE">Surgical Theatre Bins</option>
              <option value="MAIN_LAB">Main Lab Reagent Bays</option>
              <option value="QUARANTINE">Quarantine Holding Area</option>
            </select>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. THE EXPIRY MATRIX TABLE (THE HIGH-DENSITY GRID)                        */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Drug / Clinical Item & SKU</th>
                <th className="p-4">Batch Number & Maker</th>
                <th className="p-4">Physical Bin Location</th>
                <th className="p-4 text-center">Batch Quantity</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4 text-center">Days Remaining</th>
                <th className="p-4 text-center">FEFO Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                    No pharmaceutical batches found matching your search query or timeline filter.
                  </td>
                </tr>
              ) : (
                filteredBatches.map(batch => {
                  const days = calculateDaysRemaining(batch.expiryDate);
                  const isExpired = days <= 0 || batch.status === 'EXPIRED' || batch.status === 'QUARANTINED';
                  const isUnder30 = days > 0 && days <= 30;
                  const isSafe = days > 90;

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Drug Name & SKU */}
                      <td className="p-4">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                          {batch.drugName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          SKU: {batch.sku} • {batch.category}
                        </span>
                      </td>

                      {/* Batch & Maker */}
                      <td className="p-4 font-mono">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs">
                          {batch.batchNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          {batch.manufacturer}
                        </span>
                      </td>

                      {/* Bin Location */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {batch.binLocation}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block pl-5 font-sans">
                          {batch.storageCondition}
                        </span>
                      </td>

                      {/* Batch Quantity */}
                      <td className="p-4 text-center font-mono">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                          {batch.quantity.toLocaleString()} units
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (₵ {(batch.quantity * batch.unitPrice).toFixed(2)})
                        </span>
                      </td>

                      {/* Expiry Date */}
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {batch.expiryDate}
                      </td>

                      {/* Days Remaining Countdown */}
                      <td className="p-4 text-center font-mono">
                        {isExpired ? (
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                            EXPIRED ({Math.abs(days)}d ago)
                          </span>
                        ) : isUnder30 ? (
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 animate-pulse">
                            {days} Days Left
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {days} Days Left
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="p-4 text-center">
                        {batch.status === 'QUARANTINED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-300 dark:bg-purple-950 dark:text-purple-300">
                            <ShieldAlert className="w-2.5 h-2.5" /> QUARANTINED
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950 dark:text-rose-300">
                            <AlertTriangle className="w-2.5 h-2.5" /> EXPIRED
                          </span>
                        ) : isUnder30 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                            <Clock className="w-2.5 h-2.5" /> EXPIRING SOON
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5" /> SAFE (&gt;90d)
                          </span>
                        )}
                      </td>

                      {/* Row Action Buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* If Expired or in Quarantine */}
                          {isExpired && batch.status !== 'QUARANTINED' && (
                            <button
                              type="button"
                              onClick={() => handleMoveToQuarantine(batch)}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase transition shadow shadow-rose-900/30 flex items-center gap-1 cursor-pointer"
                            >
                              <ShieldAlert className="w-3 h-3" /> QUARANTINE
                            </button>
                          )}

                          {/* If Expiring soon -> Priority Dispatch */}
                          {isUnder30 && (
                            <button
                              type="button"
                              onClick={() => router.push('/stores/requisitions')}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase transition shadow shadow-amber-900/30 flex items-center gap-1 cursor-pointer"
                              title="Push as priority floor dispatch"
                            >
                              <ArrowRight className="w-3 h-3" /> Floor Dispatch
                            </button>
                          )}

                          {/* View Batch Details */}
                          <button
                            type="button"
                            onClick={() => setSelectedBatchDetails(batch)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Details
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BATCH DETAILS MODAL DIALOG                                             */}
      {/* ========================================================================= */}
      {selectedBatchDetails && (
        <Dialog open={!!selectedBatchDetails} onOpenChange={() => setSelectedBatchDetails(null)}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <span>Pharmaceutical Batch Dossier</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                FEFO trace record and storage temperature certification.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3 text-xs">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between"><span className="text-slate-400">Drug Molecule:</span><span className="font-bold text-white">{selectedBatchDetails.drugName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Master SKU:</span><span className="font-mono text-slate-300">{selectedBatchDetails.sku}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Manufacturer Batch #:</span><span className="font-mono text-emerald-400 font-bold">{selectedBatchDetails.batchNumber}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Manufacturer:</span><span className="text-slate-300">{selectedBatchDetails.manufacturer}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Physical Bin Location:</span><span className="font-mono text-white font-bold">{selectedBatchDetails.binLocation}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Storage Environment:</span><span className="text-emerald-400 font-bold">{selectedBatchDetails.storageCondition}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Expiry Date:</span><span className="font-mono font-bold text-white">{selectedBatchDetails.expiryDate}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Days Remaining:</span><span className="font-mono font-bold text-amber-400">{calculateDaysRemaining(selectedBatchDetails.expiryDate)} Days</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Total Batch Valuation:</span><span className="font-mono font-black text-white">₵ {(selectedBatchDetails.quantity * selectedBatchDetails.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={() => setSelectedBatchDetails(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
                Close Dossier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
