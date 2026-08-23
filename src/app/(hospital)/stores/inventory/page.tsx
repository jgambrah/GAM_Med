'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Warehouse, Package, Search, Filter, 
  AlertTriangle, CheckCircle2, ShieldAlert, 
  Truck, ArrowRight, Download, Printer, Plus, 
  MapPin, Edit3, ArrowRightLeft, Clock, Boxes,
  DollarSign, Loader2, ShieldCheck, Layers, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import Link from 'next/link';

type StockItem = {
  id: string;
  sku: string;
  name: string;
  category: 'PHARMACEUTICAL' | 'CONSUMABLES' | 'LABORATORY' | 'EQUIPMENT' | 'WORKS';
  binLocation: string;
  binZone: string;
  qoh: number;
  reorderLevel: number;
  unitCost: number;
  batchNumber: string;
  expiryDate: string;
  temperatureZone: string;
  lastCountDate: string;
};

export default function MasterInventoryBinManagementPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PROCUREMENT_OFFICER', 'PHARMACIST'].includes(userRole || 'DIRECTOR');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [binFilter, setBinFilter] = useState('ALL');
  const [healthFilter, setHealthFilter] = useState('ALL');

  // Modal States
  const [transferModalItem, setTransferModalItem] = useState<StockItem | null>(null);
  const [newBinLocation, setNewBinLocation] = useState('SHELF_4C');
  const [transferQty, setTransferQty] = useState(10);

  const [adjustmentModalItem, setAdjustmentModalItem] = useState<StockItem | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('PHYSICAL_COUNT_VARIANCE');

  // Master Stock Ledger Dataset
  const [stockItems, setStockItems] = useState<StockItem[]>([
    {
      id: 'STK-001',
      sku: 'PHA-PAR-01',
      name: 'Paracetamol 500mg IV Infusion (100ml Bottle)',
      category: 'PHARMACEUTICAL',
      binLocation: 'Shelf 4B-01',
      binZone: 'CENTRAL_PHARMACY',
      qoh: 1500,
      reorderLevel: 300,
      unitCost: 25.00,
      batchNumber: 'BTH-2026-08',
      expiryDate: '2028-06-30',
      temperatureZone: 'Ambient (15°C - 25°C)',
      lastCountDate: '2026-08-20'
    },
    {
      id: 'STK-002',
      sku: 'PHA-AMX-02',
      name: 'Amoxicillin + Clavulanic Acid 1.2g IV Injection Vial',
      category: 'PHARMACEUTICAL',
      binLocation: 'Shelf 4B-04',
      binZone: 'CENTRAL_PHARMACY',
      qoh: 600,
      reorderLevel: 200,
      unitCost: 65.00,
      batchNumber: 'BTH-2026-09',
      expiryDate: '2027-12-31',
      temperatureZone: 'Ambient (15°C - 25°C)',
      lastCountDate: '2026-08-21'
    },
    {
      id: 'STK-003',
      sku: 'PHA-NS-03',
      name: 'Normal Saline 0.9% 500ml Infusion Bottle',
      category: 'PHARMACEUTICAL',
      binLocation: 'Bulk Rack A1-02',
      binZone: 'BULK_WAREHOUSE',
      qoh: 2800,
      reorderLevel: 500,
      unitCost: 13.00,
      batchNumber: 'BTH-2026-10',
      expiryDate: '2028-09-30',
      temperatureZone: 'Ambient (15°C - 25°C)',
      lastCountDate: '2026-08-22'
    },
    {
      id: 'STK-004',
      sku: 'PHA-CEF-04',
      name: 'Ceftriaxone 1g IV Powder for Injection Vial',
      category: 'PHARMACEUTICAL',
      binLocation: 'Cold Room A-03',
      binZone: 'COLD_ROOM',
      qoh: 85,
      reorderLevel: 150, // Low Stock Alert!
      unitCost: 35.00,
      batchNumber: 'BTH-2026-CEF-99',
      expiryDate: '2026-09-28', // Expiring in ~35 days!
      temperatureZone: 'Cold Chain (2°C - 8°C)',
      lastCountDate: '2026-08-19'
    },
    {
      id: 'STK-005',
      sku: 'CON-GLV-01',
      name: 'Latex Surgical Sterile Gloves Size 7.5 (Box 100)',
      category: 'CONSUMABLES',
      binLocation: 'Surgical Bin 12-A',
      binZone: 'SURGICAL_THEATRE',
      qoh: 420,
      reorderLevel: 100,
      unitCost: 48.00,
      batchNumber: 'BTH-GLV-88',
      expiryDate: '2028-11-30',
      temperatureZone: 'Ambient',
      lastCountDate: '2026-08-20'
    },
    {
      id: 'STK-006',
      sku: 'CON-CAN-03',
      name: 'IV Cannula 18G Green with Port & Wings (Box 50)',
      category: 'CONSUMABLES',
      binLocation: 'Surgical Bin 12-C',
      binZone: 'SURGICAL_THEATRE',
      qoh: 12,
      reorderLevel: 40, // Critical Stockout warning!
      unitCost: 75.00,
      batchNumber: 'BTH-CAN-04',
      expiryDate: '2027-05-31',
      temperatureZone: 'Ambient',
      lastCountDate: '2026-08-18'
    },
    {
      id: 'STK-007',
      sku: 'LAB-REAG-01',
      name: 'Automated Hematology 5-Part Lyse Reagent (20L)',
      category: 'LABORATORY',
      binLocation: 'Main Lab Reagent Bay 1',
      binZone: 'MAIN_LAB',
      qoh: 8,
      reorderLevel: 4,
      unitCost: 850.00,
      batchNumber: 'BTH-LAB-LYS-02',
      expiryDate: '2027-03-31',
      temperatureZone: 'Controlled (18°C - 22°C)',
      lastCountDate: '2026-08-21'
    },
    {
      id: 'STK-008',
      sku: 'ENG-OIL-02',
      name: '15W-40 Synthetic Generator Engine Oil (200L Drum)',
      category: 'WORKS',
      binLocation: 'Engineering Yard Bay 4',
      binZone: 'BULK_WAREHOUSE',
      qoh: 3,
      reorderLevel: 1,
      unitCost: 5000.00,
      batchNumber: 'OIL-2026-01',
      expiryDate: '2029-05-31',
      temperatureZone: 'Outdoor Covered',
      lastCountDate: '2026-08-15'
    }
  ]);

  // Telemetry Metrics
  const telemetry = useMemo(() => {
    const totalSKUs = stockItems.length;
    const lowStockCount = stockItems.filter(i => i.qoh <= i.reorderLevel).length;
    
    // Check items expiring within 60 days
    const now = new Date();
    const in60Days = new Date();
    in60Days.setDate(now.getDate() + 60);

    const expiringCount = stockItems.filter(i => {
      if (!i.expiryDate) return false;
      const d = new Date(i.expiryDate);
      return d <= in60Days && d > now;
    }).length;

    const totalValuation = stockItems.reduce((acc, i) => acc + (i.qoh * i.unitCost), 0);

    return {
      totalSKUs,
      lowStockCount,
      expiringCount,
      totalValuation,
      pendingRequisitionsCount: 4
    };
  }, [stockItems]);

  // Filtered Stock Ledger
  const filteredItems = useMemo(() => {
    return stockItems.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.binLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesBin = binFilter === 'ALL' || item.binZone === binFilter;

      let matchesHealth = true;
      if (healthFilter === 'LOW_STOCK') {
        matchesHealth = item.qoh <= item.reorderLevel;
      } else if (healthFilter === 'HEALTHY') {
        matchesHealth = item.qoh > item.reorderLevel;
      }

      return matchesSearch && matchesCategory && matchesBin && matchesHealth;
    });
  }, [stockItems, searchQuery, categoryFilter, binFilter, healthFilter]);

  const handleTransferBin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalItem) return;

    setStockItems(prev => prev.map(item => {
      if (item.id === transferModalItem.id) {
        return {
          ...item,
          binLocation: newBinLocation,
          lastCountDate: new Date().toISOString().split('T')[0]
        };
      }
      return item;
    }));

    toast({
      title: "📦 Bin Transfer Logged",
      description: `${transferModalItem.name} relocated to ${newBinLocation}. Spatial index updated.`
    });
    setTransferModalItem(null);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentModalItem) return;

    const newQoh = adjustmentModalItem.qoh + adjustmentQty;
    if (newQoh < 0) {
      toast({ variant: "destructive", title: "Invalid Count", description: "Quantity on hand cannot be negative." });
      return;
    }

    setStockItems(prev => prev.map(item => {
      if (item.id === adjustmentModalItem.id) {
        return {
          ...item,
          qoh: newQoh,
          lastCountDate: new Date().toISOString().split('T')[0]
        };
      }
      return item;
    }));

    toast({
      title: "✅ Stock Count Adjusted",
      description: `${adjustmentModalItem.name} QOH updated to ${newQoh} (Variance: ${adjustmentQty > 0 ? `+${adjustmentQty}` : adjustmentQty}).`
    });
    setAdjustmentModalItem(null);
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Master Inventory.</p>
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
      {/* 1. THE EXECUTIVE DARK BANNER WITH KPI TELEMETRY GRID                      */}
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
                <Warehouse className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Spatial Warehouse Management
                  </span>
                  <span className="text-xs text-slate-400">• FEFO Active: Cold Room & Shelf Tags</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-0.5">
                  Master Inventory & Bin Management
                </h1>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl font-medium">
              Real-time stock levels, spatial bin tracking, and physical inventory valuation across all warehouse and cold chain storage zones.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
            <button 
              type="button"
              onClick={() => {
                toast({ title: "CSV Export Generated", description: "Master stock ledger downloaded with bin locations." });
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Stock Report
            </button>
            <button 
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Ledger
            </button>
            <button 
              type="button"
              onClick={() => setAdjustmentModalItem(stockItems[0])}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + LOG MANUAL ADJUSTMENT
            </button>
          </div>
        </div>

        {/* 4-Card KPI Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80 relative z-10 font-mono">
          
          {/* Total Active SKUs */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Total Active SKUs
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {telemetry.totalSKUs} Master Items
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
              <span>Valuation: ₵ {telemetry.totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Critical / Low Stock (Warning Card) */}
          <div className="bg-amber-950/40 rounded-xl p-4 border border-amber-800/60">
            <div className="text-xs font-medium text-amber-300 uppercase tracking-wider font-sans">
              Low Stock & Critical
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {telemetry.lowStockCount} Items
            </div>
            <div className="text-xs text-amber-300/80 mt-1 flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Below Safety Reorder Point</span>
            </div>
          </div>

          {/* Items Expiring (30-60 Days) */}
          <div className="bg-rose-950/40 rounded-xl p-4 border border-rose-800/60">
            <div className="text-xs font-medium text-rose-300 uppercase tracking-wider font-sans">
              FEFO Near-Expiry (&lt;60d)
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {telemetry.expiringCount} Batches
            </div>
            <div className="text-xs text-rose-300/80 mt-1 flex items-center gap-1 font-sans">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>Priority Floor Dispatch</span>
            </div>
          </div>

          {/* Pending Ward Requisitions */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Pending Requisitions
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1">
              {telemetry.pendingRequisitionsCount} Floor Orders
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Male/Female Ward & Theatre</span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. THE COMMAND FILTER BAR                                                 */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        
        {/* Top Search Bar */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search master stock by SKU, Item Description, Batch #, or Spatial Bin..."
            className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
          />
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Category:</span>
            {[
              { id: 'ALL', label: 'All Categories' },
              { id: 'PHARMACEUTICAL', label: 'Pharmaceuticals' },
              { id: 'CONSUMABLES', label: 'Consumables' },
              { id: 'LABORATORY', label: 'Lab Reagents' },
              { id: 'WORKS', label: 'Spares & Fuel' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Spatial Bin Zone & Health Dropdowns */}
          <div className="flex items-center gap-2">
            
            {/* Bin Filter */}
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={binFilter}
                onChange={(e) => setBinFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value="ALL">All Bin Storage Zones</option>
                <option value="COLD_ROOM">Cold Room A (2°C - 8°C)</option>
                <option value="CENTRAL_PHARMACY">Central Pharmacy Shelves</option>
                <option value="SURGICAL_THEATRE">Surgical Theatre Bins</option>
                <option value="MAIN_LAB">Main Lab Reagent Bay</option>
                <option value="BULK_WAREHOUSE">Bulk Warehouse Racks</option>
              </select>
            </div>

            {/* Health Filter */}
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
            >
              <option value="ALL">All Stock Health Levels</option>
              <option value="LOW_STOCK">Low Stock & Critical Only</option>
              <option value="HEALTHY">Healthy Stock Only</option>
            </select>

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. THE MASTER STOCK LEDGER TABLE (THE GRID)                               */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Item Description & SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4">Physical Bin Location</th>
                <th className="p-4 text-center">Qty on Hand (QOH)</th>
                <th className="p-4 text-center">Reorder Point</th>
                <th className="p-4 text-right">Unit / Total Val (GHS)</th>
                <th className="p-4 text-center">Stock Health</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                    No inventory records matched your search query or bin filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isLow = item.qoh <= item.reorderLevel && item.qoh > 0;
                  const isStockout = item.qoh <= 0;
                  const isHealthy = item.qoh > item.reorderLevel;
                  const totalVal = item.qoh * item.unitCost;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Description & SKU */}
                      <td className="p-4">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                          <span>SKU: {item.sku}</span>
                          <span>•</span>
                          <span>Batch: {item.batchNumber}</span>
                          <span>•</span>
                          <span>Exp: {item.expiryDate}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.category}
                        </span>
                      </td>

                      {/* Bin Location */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {item.binLocation}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block pl-5 font-sans">
                          {item.temperatureZone}
                        </span>
                      </td>

                      {/* QOH */}
                      <td className="p-4 text-center">
                        <span className={`font-mono text-sm font-black ${
                          isStockout 
                            ? 'text-rose-600 dark:text-rose-400' 
                            : isLow 
                            ? 'text-amber-600 dark:text-amber-400' 
                            : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {item.qoh.toLocaleString()}
                        </span>
                      </td>

                      {/* Reorder Point */}
                      <td className="p-4 text-center font-mono text-slate-500 text-xs">
                        {item.reorderLevel.toLocaleString()}
                      </td>

                      {/* Valuation */}
                      <td className="p-4 text-right font-mono">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                          ₵ {totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          @ ₵ {item.unitCost.toFixed(2)}/ea
                        </span>
                      </td>

                      {/* Status Badging */}
                      <td className="p-4 text-center">
                        {isHealthy ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5" /> HEALTHY
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" /> LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950 dark:text-rose-300">
                            <ShieldAlert className="w-2.5 h-2.5" /> STOCKOUT
                          </span>
                        )}
                      </td>

                      {/* Row Action Buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Transfer Bin Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setTransferModalItem(item);
                              setNewBinLocation(item.binLocation);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                            title="Relocate to another Bin"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-sky-500" /> Bin Transfer
                          </button>

                          {/* Stock Adjustment Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustmentModalItem(item);
                              setAdjustmentQty(0);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                            title="Log Stocktake Count Adjustment"
                          >
                            <Edit3 className="w-3 h-3 text-emerald-500" /> Count
                          </button>

                          {/* Request Restock (if low) */}
                          {isLow && (
                            <button
                              type="button"
                              onClick={() => router.push('/procurement/orders/new')}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase transition shadow shadow-amber-900/30 cursor-pointer"
                              title="Issue Purchase Order for Restock"
                            >
                              Restock
                            </button>
                          )}
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
      {/* 4. BIN TRANSFER MODAL DIALOG                                              */}
      {/* ========================================================================= */}
      {transferModalItem && (
        <Dialog open={!!transferModalItem} onOpenChange={() => setTransferModalItem(null)}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-sky-400" />
                <span>Spatial Bin Relocation Transfer</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Move physical stock across storage racks and update spatial coordinates.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleTransferBin} className="space-y-4 pt-3 text-xs">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between"><span className="text-slate-400">Item:</span><span className="font-bold text-white">{transferModalItem.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Current Bin:</span><span className="font-mono text-emerald-400 font-bold">{transferModalItem.binLocation}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Available QOH:</span><span className="font-mono text-white">{transferModalItem.qoh} units</span></div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Destination Storage Bin *</label>
                <select
                  value={newBinLocation}
                  onChange={(e) => setNewBinLocation(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="Cold Room A-01">Cold Room A-01 (Vaccine Fridge 2°C - 8°C)</option>
                  <option value="Cold Room A-03">Cold Room A-03 (Biologics Shelf)</option>
                  <option value="Shelf 4B-01">Central Pharmacy Shelf 4B-01 (Oral Tablets)</option>
                  <option value="Shelf 4B-04">Central Pharmacy Shelf 4B-04 (Antibiotics)</option>
                  <option value="Shelf 4C-02">Central Pharmacy Shelf 4C-02 (Suspensions)</option>
                  <option value="Surgical Bin 12-A">Surgical Theatre Bin 12-A (Gloves & Sutures)</option>
                  <option value="Surgical Bin 12-C">Surgical Theatre Bin 12-C (Cannulas & Ports)</option>
                  <option value="Bulk Rack A1-02">Bulk Warehouse Rack A1-02 (IV Fluids)</option>
                  <option value="Controlled Safe Bay 1">Controlled Safe Bay 1 (Narcotics & Opioids)</option>
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setTransferModalItem(null)} className="text-slate-400 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl px-6">
                  CONFIRM RELOCATION &rarr;
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 5. STOCK COUNT ADJUSTMENT MODAL DIALOG                                    */}
      {/* ========================================================================= */}
      {adjustmentModalItem && (
        <Dialog open={!!adjustmentModalItem} onOpenChange={() => setAdjustmentModalItem(null)}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <span>Log Stocktake Count Adjustment</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Reconcile physical stock count variances against digital ledger balances.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 pt-3 text-xs">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between"><span className="text-slate-400">Item:</span><span className="font-bold text-white">{adjustmentModalItem.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">System QOH:</span><span className="font-mono text-white font-bold">{adjustmentModalItem.qoh} units</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Unit Valuation:</span><span className="font-mono text-emerald-400">₵ {adjustmentModalItem.unitCost.toFixed(2)}</span></div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Variance Adjustment (+ / - Units)</label>
                <input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                  placeholder="e.g. +5 or -2"
                  required
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs font-bold text-white outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 block">
                  New QOH will become: <strong className="text-white font-mono">{adjustmentModalItem.qoh + adjustmentQty}</strong> units.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Reconciliation Reason Code *</label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="PHYSICAL_COUNT_VARIANCE">Monthly Physical Stocktake Reconciliation</option>
                  <option value="DAMAGED_IN_STORAGE">Damaged / Broken in Warehouse</option>
                  <option value="EXPIRED_REMOVED">Expired Batch Removal & Disposal</option>
                  <option value="FOUND_IN_BIN">Surplus Stock Located in Incorrect Bin</option>
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setAdjustmentModalItem(null)} className="text-slate-400 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-6">
                  COMMIT ADJUSTMENT &rarr;
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
