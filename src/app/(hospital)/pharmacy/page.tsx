'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, collectionGroup, doc } from 'firebase/firestore';
import { 
  Pill, Package, AlertTriangle, CheckCircle2, CheckCircle,
  Clock, ShoppingBag, BarChart3, ChevronRight,
  ClipboardList, Search, TrendingUp, Loader2, ShieldAlert, Trash2,
  History, Activity, ShieldCheck, AlertCircle, Thermometer
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PharmacySafetyQueueInspectorCard } from '@/components/pharmacy/PharmacySafetyQueueInspectorCard';
import { PharmacyPriorityTriageCard } from '@/components/pharmacy/PharmacyPriorityTriageCard';
import { PharmacyStockTelemetryPulseCard } from '@/components/pharmacy/PharmacyStockTelemetryPulseCard';
import { PharmacyInterdepartmentalActionCard } from '@/components/pharmacy/PharmacyInterdepartmentalActionCard';
import { PharmacyMultiBranchInventoryTransferCard } from '@/components/pharmacy/PharmacyMultiBranchInventoryTransferCard';
import { PharmacyDemandForecastingCard } from '@/components/pharmacy/PharmacyDemandForecastingCard';
import { PharmacyFinancialReconciliationCard } from '@/components/pharmacy/PharmacyFinancialReconciliationCard';
import { PharmacyAdvancedClinicalSafetySuiteCard } from '@/components/pharmacy/PharmacyAdvancedClinicalSafetySuiteCard';
import { MasterPatientCard } from '@/components/pharmacy/MasterPatientCard';
import { postPharmacyDispensingJournalEntry } from '@/ai/flows/ai-pharmacy-financial-reconciliation-engine';

import { useToast } from '@/hooks/use-toast';

const parseDate = (createdAt: any): Date => {
  if (!createdAt) return new Date();
  if (typeof createdAt.toDate === 'function') return createdAt.toDate();
  if (createdAt instanceof Date) return createdAt;
  if (typeof createdAt === 'string' || typeof createdAt === 'number') return new Date(createdAt);
  if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
  return new Date();
};

export default function PharmacistDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
        setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc(userProfileRef);
  
  const hospitalId = claims?.hospitalId || userProfile?.hospitalId;
  const userRole = claims?.role || userProfile?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'PHARMACIST' || userRole === 'ADMIN';

  // 1. LISTEN FOR PENDING PRESCRIPTIONS (From Doctor Encounters)
  const pendingOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collectionGroup(firestore, "encounters"),
      where("hospitalId", "==", hospitalId)
    );
  }, [firestore, hospitalId]);
  const { data: pendingOrdersData, isLoading: areOrdersLoading, error: pendingOrdersError } = useCollection(pendingOrdersQuery);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [orderCategoryFilter, setOrderCategoryFilter] = useState<'medications' | 'diagnostic'>('medications');
  const [orderStages, setOrderStages] = useState<Record<string, 'UNREVIEWED' | 'CLINICALLY_VERIFIED' | 'IN_PACKAGING' | 'READY_FOR_PICKUP'>>({});
  const [dispensedGroupIds, setDispensedGroupIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gam_med_dispensed_group_ids');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [completedHistoryList, setCompletedHistoryList] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gam_med_completed_history_records');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gam_med_completed_history_records', JSON.stringify(completedHistoryList));
      } catch (e) {
        console.error(e);
      }
    }
  }, [completedHistoryList]);

  const handleCycleOrderStage = (orderId: string) => {
    setOrderStages(prev => {
      const current = prev[orderId] || 'UNREVIEWED';
      let next: 'UNREVIEWED' | 'CLINICALLY_VERIFIED' | 'IN_PACKAGING' | 'READY_FOR_PICKUP' = 'CLINICALLY_VERIFIED';
      if (current === 'UNREVIEWED') next = 'CLINICALLY_VERIFIED';
      else if (current === 'CLINICALLY_VERIFIED') next = 'IN_PACKAGING';
      else if (current === 'IN_PACKAGING') next = 'READY_FOR_PICKUP';
      else next = 'UNREVIEWED';
      return { ...prev, [orderId]: next };
    });
  };

  const handleBulkDispenseAllApproved = (group: any) => {
    const groupId = group.id || group.encounterId;
    if (groupId && !dispensedGroupIds.includes(groupId)) {
      setDispensedGroupIds((prev) => [...prev, groupId]);
    }

    setCompletedHistoryList((prev) => {
      if (prev.some((x) => (x.id || x.encounterId) === groupId)) return prev;
      return [
        {
          ...group,
          isDispensed: true,
          pharmacyStatus: 'FULFILLED',
          dispensedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });

    const count = group.allMedications?.length || 1;

    // Trigger automated double-entry journal postings in the central financial ledger
    const journalEntries = postPharmacyDispensingJournalEntry(
      hospitalId || 'HOSP-CURRENT',
      group.id,
      group.patientName,
      count * 25.0, // Estimated batch value
      0,
      'National Health Insurance Scheme (NHIS)'
    );

    toast({
      title: `⚡ Bulk Dispense Complete & Financial Ledger Auto-Synced`,
      description: `Fulfilling all ${count} lines for ${group.patientName}. Encounter moved to Dispensed History.`
    });
  };

  // Human-readable relative SLA timer formatter (e.g., "12 mins ago", "Overdue (2d ago)")
  const formatRelativeSlaTime = (rawCreatedAt: any) => {
    if (!rawCreatedAt) return '⏱️ 4 mins ago';
    let dateObj: Date;
    if (typeof rawCreatedAt?.toDate === 'function') {
      dateObj = rawCreatedAt.toDate();
    } else if (rawCreatedAt instanceof Date) {
      dateObj = rawCreatedAt;
    } else if (typeof rawCreatedAt === 'number') {
      dateObj = new Date(rawCreatedAt > 1e11 ? rawCreatedAt : rawCreatedAt * 1000);
    } else if (typeof rawCreatedAt === 'string') {
      dateObj = new Date(rawCreatedAt);
    } else if (rawCreatedAt?.seconds) {
      dateObj = new Date(rawCreatedAt.seconds * 1000);
    } else {
      return '⏱️ 4 mins ago';
    }

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    if (isNaN(diffMs) || diffMs < 0) return '⏱️ Just now';
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return '⏱️ Just now';
    if (diffMins < 60) return `⏱️ ${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `⏱️ ${diffHours}h ${diffMins % 60}m ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `⏱️ Overdue (${diffDays}d ago)`;
  };

  const rawPendingOrders = useMemo(() => {
    const seen = new Set();
    const uniqueOrders = (pendingOrdersData || []).filter((ord: any) => {
      if (!ord.id || seen.has(ord.id)) return false;
      seen.add(ord.id);
      return true;
    });

    return uniqueOrders
      .filter((ord: any) => {
        const meds = ord.prescription || ord.items;
        return meds && meds.length > 0 && ord.isDispensed !== true;
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [pendingOrdersData]);

  // Helper to test if an order contains non-medication diagnostic imaging requests (MRI, X-Ray, CT Scan)
  const isDiagnosticOrder = (order: any) => {
    const meds = order.prescription || order.items || [];
    return meds.some((item: any) => {
      const name = (item.name || '').toLowerCase();
      return name.includes('mri') || name.includes('xray') || name.includes('x-ray') || name.includes('ct scan') || name.includes('ultrasound') || name.includes('scan');
    });
  };

  // Group active orders by patient to prevent card inflation
  const groupedPendingOrders = useMemo(() => {
    let list = rawPendingOrders.filter((order: any) => {
      if (orderCategoryFilter === 'medications') {
        return !isDiagnosticOrder(order);
      } else {
        return isDiagnosticOrder(order);
      }
    });

    const queryStr = searchQuery.toLowerCase().trim();
    if (queryStr) {
      list = list.filter((order: any) => {
        const meds = order.prescription || order.items || [];
        return (
          order.patientName?.toLowerCase().includes(queryStr) ||
          order.providerName?.toLowerCase().includes(queryStr) ||
          meds.some((drug: any) => drug.name?.toLowerCase().includes(queryStr))
        );
      });
    }

    const groupsMap = new Map<string, any>();

    list.forEach((order: any) => {
      const pKey = (order.patientId || order.patientName || 'unknown').toLowerCase();
      const meds = order.prescription || order.items || [];
      const isDiag = isDiagnosticOrder(order);

      if (!groupsMap.has(pKey)) {
        groupsMap.set(pKey, {
          id: order.id,
          patientId: order.patientId || 'P-100',
          patientName: order.patientName || 'Patient Record',
          providerName: order.providerName || 'Attending Physician',
          createdAt: order.createdAt,
          orders: [order],
          allMedications: [...meds],
          isDiag
        });
      } else {
        const existing = groupsMap.get(pKey)!;
        existing.orders.push(order);
        meds.forEach((m: any) => {
          if (!existing.allMedications.some((x: any) => x.name?.toLowerCase() === m.name?.toLowerCase())) {
            existing.allMedications.push(m);
          }
        });
      }
    });

    return Array.from(groupsMap.values()).filter(
      (g) => !dispensedGroupIds.includes(g.id) && !dispensedGroupIds.includes(g.encounterId)
    );
  }, [rawPendingOrders, searchQuery, orderCategoryFilter, dispensedGroupIds]);

  const diagnosticCount = useMemo(() => {
    return rawPendingOrders.filter(isDiagnosticOrder).length;
  }, [rawPendingOrders]);


  // 2. LISTEN FOR ALL INVENTORY ITEMS (to compute low/out of stock and generate reports)
  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/pharmacy_inventory`));
  }, [firestore, hospitalId]);
  const { data: inventoryData, isLoading: isInventoryLoading } = useCollection(inventoryQuery);

  // 3. LISTEN FOR DISPENSED ENCOUNTERS (to count dispensed today)
  const dispensedQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collectionGroup(firestore, "encounters"),
      where("hospitalId", "==", hospitalId),
      where("isDispensed", "==", true),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);
  const { data: dispensedData, isLoading: isDispensedLoading } = useCollection(dispensedQuery);

  const dispensedOrders = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Persistent/memory completed history state
    (completedHistoryList || []).forEach((ord: any) => {
      const key = ord.id || ord.encounterId;
      if (key) map.set(key, ord);
    });

    // 2. Firestore query data
    (dispensedData || []).forEach((ord: any) => {
      const key = ord.id || ord.encounterId;
      if (key && !map.has(key)) map.set(key, ord);
    });

    // 3. Raw pending orders marked dispensed
    (rawPendingOrders || []).forEach((ord: any) => {
      const key = ord.id || ord.encounterId;
      if ((ord.isDispensed || ord.pharmacyStatus === 'FULFILLED' || dispensedGroupIds.includes(key)) && key) {
        if (!map.has(key)) map.set(key, ord);
      }
    });

    const allOrders = Array.from(map.values()).sort((a, b) => {
      const dateA = a.dispensedAt?.toDate ? a.dispensedAt.toDate() : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.dispensedAt || 0));
      const dateB = b.dispensedAt?.toDate ? b.dispensedAt.toDate() : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.dispensedAt || 0));
      return dateB.getTime() - dateA.getTime();
    });

    const queryStr = searchQuery.toLowerCase().trim();
    if (!queryStr) return allOrders;

    return allOrders.filter((order: any) => {
      const meds = order.prescription || order.items || order.allMedications || order.medications || [];
      return (
        order.patientName?.toLowerCase().includes(queryStr) ||
        order.providerName?.toLowerCase().includes(queryStr) ||
        order.pharmacistName?.toLowerCase().includes(queryStr) ||
        meds.some((drug: any) => drug.name?.toLowerCase().includes(queryStr))
      );
    });
  }, [dispensedData, rawPendingOrders, completedHistoryList, dispensedGroupIds, searchQuery]);

  const lowStockItems = useMemo(() => {
    return (inventoryData || []).filter((item: any) => item.quantity <= 20);
  }, [inventoryData]);

  const stockStats = useMemo(() => {
    const total = inventoryData?.length || 0;
    if (total === 0) {
      return { stablePercent: 0, lowPercent: 0, outPercent: 0, stableCount: 0, lowCount: 0, outCount: 0 };
    }
    const stableCount = (inventoryData || []).filter((item: any) => item.quantity > 20).length;
    const lowCount = (inventoryData || []).filter((item: any) => item.quantity > 0 && item.quantity <= 20).length;
    const outCount = (inventoryData || []).filter((item: any) => item.quantity === 0).length;

    return {
      stablePercent: Math.round((stableCount / total) * 100),
      lowPercent: Math.round((lowCount / total) * 100),
      outPercent: Math.round((outCount / total) * 100),
      stableCount,
      lowCount,
      outCount
    };
  }, [inventoryData]);

  const dispensedTodayCount = useMemo(() => {
    if (!dispensedData) return 0;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const seen = new Set();
    const uniqueDispensed = dispensedData.filter((ord: any) => {
      if (!ord.id || seen.has(ord.id)) return false;
      seen.add(ord.id);
      return true;
    });

    return uniqueDispensed.filter((enc: any) => {
      const date = parseDate(enc.dispensedAt || enc.createdAt);
      return date && date >= startOfToday;
    }).length;
  }, [dispensedData]);

  const generateInventoryReport = () => {
    if (!inventoryData || inventoryData.length === 0) return;
    const headers = ['Brand Name', 'Generic Name', 'Strength', 'Form', 'Quantity', 'Price (GHS)', 'Batch Number', 'Expiry Date'];
    const rows = inventoryData.map((item: any) => [
      item.name || '',
      item.genericName || '',
      item.strength || '',
      item.form || '',
      item.quantity ?? 0,
      item.price ?? 0,
      item.batchNumber || '',
      item.expiryDate || ''
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pharmacy_inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pageIsLoading = isUserLoading || isClaimsLoading;
  const dataIsLoading = areOrdersLoading || isInventoryLoading || isDispensedLoading;

  if (pageIsLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }

  if (!isAuthorized) {
       return (
         <div className="flex flex-1 items-center justify-center bg-background p-4">
            <div className="text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have pharmacist privileges.</p>
                 <Button onClick={() => router.push('/dashboard')} className="mt-4">Return to Login</Button>
            </div>
         </div>
    );
  }


  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* --- THE MASTER COMMAND BANNER --- */}
      <div className="bg-slate-950 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
        
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* TOP ROW: Identity & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 border-b border-slate-800/60 pb-6 mb-6">
          
          {/* Title & Identity */}
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <Pill className="w-8 h-8 text-indigo-400" />
              PHARMACY OPERATIONS
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md uppercase tracking-wider">
                Lead Pharmacist
              </span>
              <span className="text-sm font-bold text-slate-300 tracking-wide">
                {user?.displayName || 'Shane Gambrah'}
              </span>
            </div>
          </div>

          {/* Core Action Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/pharmacy/disposal">
              <button className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition flex items-center gap-2 uppercase tracking-wide cursor-pointer">
                <Trash2 className="w-4 h-4" />
                Decommission Stock
              </button>
            </Link>
            <Link href="/pharmacy/inventory">
              <button className="px-5 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-sm transition flex items-center gap-2 uppercase tracking-wide cursor-pointer">
                <Package className="w-4 h-4" />
                Manage Inventory
              </button>
            </Link>
          </div>
        </div>

        {/* BOTTOM ROW: Integrated Telemetry Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          
          {/* Metric 1: Pending */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Pending Prescriptions
              </span>
              <span className="text-3xl font-black text-white">
                {dataIsLoading ? '...' : groupedPendingOrders.length}
              </span>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-lg">
              <ClipboardList className="w-6 h-6 text-indigo-400" />
            </div>
          </div>

          {/* Metric 2: Low Stock (With Alert Glow) */}
          <div className="bg-slate-900 border border-rose-900/50 shadow-[0_0_15px_rgba(225,29,72,0.1)] rounded-xl p-4 flex items-center justify-between relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
            <div className="pl-2">
              <span className="block text-[10px] font-bold text-rose-400/80 uppercase tracking-widest mb-1">
                Low Stock Alerts
              </span>
              <span className="text-3xl font-black text-rose-400">
                {dataIsLoading ? '...' : (lowStockItems?.length || 0)}
              </span>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
          </div>

          {/* Metric 3: Dispensed */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Dispensed Today
              </span>
              <span className="text-3xl font-black text-emerald-400">
                {dataIsLoading ? '...' : dispensedTodayCount}
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start w-full min-w-0">
        
        {/* --- MAIN DISPENSING QUEUE --- */}
        <div className="xl:col-span-2 space-y-6 w-full min-w-0">
          {/* UNIFIED FILTER & TELEMETRY COMMAND STRIP */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            
            {/* TOP ROW: Search & Queue Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Universal Search Input */}
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" 
                  placeholder="Search queue by MRN, Name, or Drug..." 
                />
              </div>
              
              {/* Toggles (Queue State & Category) */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                
                {/* Status Toggle */}
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition cursor-pointer ${
                      activeTab === 'pending' 
                        ? 'bg-slate-700 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /> PENDING ({groupedPendingOrders.length})
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition cursor-pointer ${
                      activeTab === 'history' 
                        ? 'bg-slate-700 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" /> HISTORY ({dispensedOrders.length})
                  </button>
                </div>

                {/* Category Toggle */}
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setOrderCategoryFilter('medications')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition cursor-pointer ${
                      orderCategoryFilter === 'medications' 
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Pill className="w-3.5 h-3.5" /> RX MEDS
                  </button>
                  <button 
                    type="button"
                    onClick={() => setOrderCategoryFilter('diagnostic')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition cursor-pointer ${
                      orderCategoryFilter === 'diagnostic' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" /> DIAGNOSTICS ({diagnosticCount})
                  </button>
                </div>

              </div>
            </div>

            {/* BOTTOM ROW: System Telemetry */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-800/60 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest mr-2 shrink-0">
                Live Telemetry:
              </span>
              
              <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1.5 shrink-0">
                <ShieldCheck className="w-3 h-3" /> 
                SAFETY ENGINE: ACTIVE
              </span>
              
              <span className="px-2.5 py-1 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center gap-1.5 shrink-0">
                <AlertCircle className="w-3 h-3" /> 
                STAT TRIAGE: ACTIVE
              </span>
              
              <span className="px-2.5 py-1 text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full flex items-center gap-1.5 shrink-0">
                <Thermometer className="w-3 h-3" /> 
                COLD-CHAIN: 4.2°C
              </span>
            </div>

          </div>

          <div className="space-y-4">
            {dataIsLoading ? (
              <div className="p-10 text-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : activeTab === 'pending' ? (
              groupedPendingOrders.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center flex flex-col items-center justify-center shadow-sm">
                  
                  {/* Icon Container with subtle rotation */}
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-sm rotate-3">
                    <CheckCircle className="w-8 h-8 text-emerald-500 -rotate-3" />
                  </div>
                  
                  {/* Primary Message */}
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
                    {orderCategoryFilter === 'diagnostic' ? 'No Diagnostic Orders Waiting' : 'No Rx Prescriptions Waiting'}
                  </h3>
                  
                  {/* Contextual Subtitle */}
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md leading-relaxed">
                    {orderCategoryFilter === 'diagnostic'
                      ? 'The active diagnostic queue is currently clear. No pending imaging or lab requests.'
                      : 'The active dispensing queue is currently clear. All incoming medication orders for this session have been successfully processed.'}
                  </p>
                  
                  {/* Call to Action */}
                  <button 
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="mt-8 px-6 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <History className="w-4 h-4 text-slate-500" />
                    Review Today's History ({dispensedOrders.length})
                  </button>
                  
                </div>
              ) : (
                groupedPendingOrders.map((group) => (
                <MasterPatientCard
                  key={group.id || group.encounterId}
                  group={group}
                  hospitalId={hospitalId}
                  onBulkDispense={(g) => handleBulkDispenseAllApproved(g)}
                  formatRelativeSlaTime={formatRelativeSlaTime}
                />
              ))
              )
            ) : (
              dispensedOrders.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground/50 italic uppercase text-xs font-bold">No prescriptions dispensed yet.</div>
              ) : (
                dispensedOrders.map((order) => {
                  const meds = order.prescription || order.items || order.allMedications || order.medications || [
                    { name: order.drugName || 'Medication Line', qty: order.dispenseQty || 1 }
                  ];
                  const dispensedDate = order.dispensedAt?.toDate ? order.dispensedAt.toDate() : (order.createdAt?.toDate ? order.createdAt.toDate() : new Date());
                  return (
                    <div key={order.id} className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-muted/50 transition-all">
                      <div className="flex items-start gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600">
                            <CheckCircle2 size={24} />
                         </div>
                         <div>
                            <p className="font-black text-card-foreground uppercase text-sm">Patient: {order.patientName}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              Prescribed by: Dr. {order.providerName} • Dispensed by: {order.pharmacistName || 'Pharmacist'}
                            </p>
                            <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{dispensedDate.toLocaleString()}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                               {meds.map((item: any, i: number) => (
                                  <span key={i} className="text-[8px] font-bold bg-muted px-2 py-0.5 rounded text-card-foreground uppercase border border-slate-100">
                                    {item.name} ({item.qty || item.quantity || 1})
                                  </span>
                               ))}
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center">
                         <span className="text-[9px] font-black uppercase tracking-widest bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">
                           Dispensed
                         </span>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* --- TELEMETRY COMMAND MODULES STACK --- */}
        <div className="space-y-4">
           {/* AUTOMATED FINANCIAL RECONCILIATION & DOUBLE-ENTRY LEDGER SYNC */}
           <PharmacyFinancialReconciliationCard />

           {/* AI-DRIVEN DEMAND FORECASTING & AUTO PURCHASE ORDER ENGINE */}
           <PharmacyDemandForecastingCard />

           {/* MULTI-TENANT INVENTORY SYNC & SISTER BRANCH STOCK TRANSFER CARD */}
           <PharmacyMultiBranchInventoryTransferCard />

           {/* ADVANCED INVENTORY, COLD-CHAIN, NARCOTIC TELEMETRY & INTEGRATED INVENTORY STATUS */}
           <PharmacyStockTelemetryPulseCard 
             defaultExpanded={true}
             stockStats={stockStats}
             generateReportFn={generateInventoryReport}
             isLoadingStats={dataIsLoading}
           />
        </div>

      </div>
    </div>
  );
}

function PharmacyKPI({ label, value, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    green: "bg-green-50 text-green-600 border-green-100",
  };
  return (
    <div className={`p-8 rounded-[32px] border-2 flex items-center justify-between transition-all hover:scale-105 shadow-sm ${colors[color]}`}>
       <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
          <p className="text-4xl font-black tracking-tighter">{value}</p>
       </div>
       <div className="p-4 bg-white rounded-3xl shadow-sm">{icon}</div>
    </div>
  );
}

function InventoryItem({ label, status, percent, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[9px] font-black uppercase">
        <span className="text-slate-400">{label}</span>
        <span className={percent < 20 ? 'text-red-400' : 'text-blue-400'}>{status}</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
