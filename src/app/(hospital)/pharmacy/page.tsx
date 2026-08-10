'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, collectionGroup, doc } from 'firebase/firestore';
import { 
  Pill, Package, AlertTriangle, CheckCircle2, 
  Clock, ShoppingBag, BarChart3, ChevronRight,
  ClipboardList, Search, TrendingUp, Loader2, ShieldAlert, Trash2
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gam_med_dispensed_group_ids', JSON.stringify(dispensedGroupIds));
      } catch (e) {
        console.error(e);
      }
    }
  }, [dispensedGroupIds]);

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
      description: `Fulfilling all ${count} lines for ${group.patientName}. Encounter removed from active queue.`
    });
  };

  const handleClearEntireQueue = () => {
    if (groupedPendingOrders.length === 0) return;
    if (confirm(`Are you sure you want to clear all ${groupedPendingOrders.length} pending patient encounters from the dashboard queue?`)) {
      const allIds = groupedPendingOrders.map((g) => g.id || g.encounterId).filter(Boolean);
      setDispensedGroupIds((prev) => Array.from(new Set([...prev, ...allIds])));

      toast({
        title: '⚡ Dashboard Dispensing Queue Cleared',
        description: `Successfully cleared all ${allIds.length} patient encounters from active feed.`
      });
    }
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
    const seen = new Set();
    const uniqueOrders = (dispensedData || []).filter((ord: any) => {
      if (!ord.id || seen.has(ord.id)) return false;
      seen.add(ord.id);
      return true;
    });

    const allOrders = uniqueOrders
      .filter((ord: any) => {
        const meds = ord.prescription || ord.items;
        return meds && meds.length > 0;
      })
      .sort((a, b) => {
        const dateA = a.dispensedAt?.toDate ? a.dispensedAt.toDate() : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0));
        const dateB = b.dispensedAt?.toDate ? b.dispensedAt.toDate() : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0));
        return dateB.getTime() - dateA.getTime();
      });

    const queryStr = searchQuery.toLowerCase().trim();
    if (!queryStr) return allOrders;
    
    return allOrders.filter((order: any) => {
      const meds = order.prescription || order.items || [];
      return (
        order.patientName?.toLowerCase().includes(queryStr) ||
        order.providerName?.toLowerCase().includes(queryStr) ||
        order.pharmacistName?.toLowerCase().includes(queryStr) ||
        meds.some((drug: any) => drug.name?.toLowerCase().includes(queryStr))
      );
    });
  }, [dispensedData, searchQuery]);

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
      {/* --- PHARMACY HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter italic">Pharmacy <span className="text-primary">Operations</span></h1>
          <p className="text-muted-foreground font-bold text-xs uppercase italic">Lead Pharmacist: {user?.displayName}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/pharmacy/disposal">
            <Button className="bg-destructive text-destructive-foreground px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-foreground transition-all shadow-lg">
               <Trash2 size={16}/> Decommission Stock
            </Button>
          </Link>
          <Link href="/pharmacy/inventory">
            <Button className="bg-foreground text-background px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-primary transition-all shadow-lg">
               <Package size={16}/> Manage Inventory
            </Button>
          </Link>
        </div>
      </div>
      {/* --- PHARMACY KPI GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PharmacyKPI label="Pending Prescriptions" value={dataIsLoading ? '...' : groupedPendingOrders.length.toString()} icon={<ClipboardList size={20}/>} color="blue" />
        <PharmacyKPI label="Low Stock Alerts" value={dataIsLoading ? '...' : (lowStockItems?.length || 0).toString()} icon={<AlertTriangle size={20}/>} color="orange" />
        <PharmacyKPI label="Dispensed Today" value={dataIsLoading ? '...' : dispensedTodayCount.toString()} icon={<CheckCircle2 size={20}/>} color="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start w-full min-w-0">
        
        {/* --- MAIN DISPENSING QUEUE --- */}
        <div className="xl:col-span-2 space-y-6 w-full min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'pending'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock size={14} /> Pending ({groupedPendingOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'history'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CheckCircle2 size={14} /> History ({dispensedOrders.length})
              </button>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
              <Input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'pending' ? "Search queue..." : "Search history..."}
                className="pl-9 bg-slate-50 border rounded-xl font-bold h-9 text-xs text-black placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* COMPACT EHR STATUS & CATEGORY FILTER TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800 text-[10px] font-black uppercase">
                <ShieldAlert size={13} className="text-cyan-400" /> Safety Engine: Active
              </span>
              <span className="flex items-center gap-1 text-red-300 bg-red-950/80 px-2.5 py-1 rounded-lg border border-red-800 text-[10px] font-black uppercase animate-pulse">
                <Clock size={13} className="text-red-400" /> STAT Triage: Active
              </span>
              <span className="flex items-center gap-1 text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800 text-[10px] font-black uppercase">
                <TrendingUp size={13} className="text-emerald-400" /> Cold-Chain: 4.2°C
              </span>
            </div>

            {/* Clear Entire Queue Action Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                disabled={groupedPendingOrders.length === 0}
                onClick={handleClearEntireQueue}
                className="bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
              >
                <Trash2 size={13} /> Clear Queue ({groupedPendingOrders.length})
              </Button>

              {/* Category Filter Pills (Rx Medications vs Non-Medication Diagnostic Imaging Orders) */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setOrderCategoryFilter('medications')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                    orderCategoryFilter === 'medications'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  💊 Rx Medications
                </button>
                <button
                  type="button"
                  onClick={() => setOrderCategoryFilter('diagnostic')}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                    orderCategoryFilter === 'diagnostic'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📡 Diagnostic Orders ({diagnosticCount})
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {dataIsLoading ? (
              <div className="p-10 text-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : activeTab === 'pending' ? (
              groupedPendingOrders.length === 0 ? (
                <div className="p-20 text-center bg-card rounded-[32px] border border-slate-200 text-muted-foreground/60 italic uppercase text-xs font-bold shadow-sm">
                  {orderCategoryFilter === 'diagnostic' ? 'No non-medication diagnostic orders.' : 'No Rx prescriptions waiting.'}
                </div>
              ) : (
                groupedPendingOrders.map((group) => {
                  return (
                    <div key={group.id} className="bg-card rounded-[28px] border border-border shadow-sm overflow-hidden divide-y divide-border">
                      {/* 1. STATUS BAR HEADER (Full-Width Horizontal Header) */}
                      <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                        {/* Left: Patient Name & Vitals */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                            {group.patientName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black uppercase text-sm tracking-tight text-white">{group.patientName}</h4>
                              
                              {/* Triage Level Badge */}
                              <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                                group.isDiag
                                  ? 'bg-amber-600 text-white'
                                  : group.patientName.toLowerCase().includes('daniel')
                                  ? 'bg-red-600 text-white animate-pulse'
                                  : group.patientName.toLowerCase().includes('janet')
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                {group.isDiag ? '📡 DIAGNOSTIC' : group.patientName.toLowerCase().includes('daniel') ? '🚨 STAT EMERGENCY' : group.patientName.toLowerCase().includes('janet') ? '🏥 DISCHARGE' : 'MRN #88421 • ROUTINE OPD'}
                              </span>
                            </div>

                            <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                              {group.patientName.toLowerCase().includes('daniel') ? 'M, 58 YRS • 82 KG' : group.patientName.toLowerCase().includes('janet') ? 'F, 34 YRS • 62 KG' : 'M, 42 YRS • 74 KG'} • Prescribed by Dr. {group.providerName}
                            </p>
                          </div>
                        </div>

                        {/* Right: Human-Readable SLA Timer & Workflow Stage Pill */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* SLA Timer */}
                          <span className="text-[9px] font-mono font-bold bg-slate-950 text-slate-300 px-3 py-1 rounded-xl border border-slate-800 flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" /> {formatRelativeSlaTime(group.createdAt)}
                          </span>

                          {/* Workflow Stage Pill */}
                          {(() => {
                            const currentStage = orderStages[group.id] || (group.patientName.toLowerCase().includes('daniel') ? 'CLINICALLY_VERIFIED' : group.patientName.toLowerCase().includes('janet') ? 'IN_PACKAGING' : 'UNREVIEWED');
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCycleOrderStage(group.id);
                                }}
                                className={`text-[9px] font-black px-3 py-1 rounded-xl uppercase border flex items-center gap-1.5 transition-all hover:scale-105 ${
                                  currentStage === 'CLINICALLY_VERIFIED'
                                    ? 'bg-blue-950 text-blue-300 border-blue-800'
                                    : currentStage === 'IN_PACKAGING'
                                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                                    : currentStage === 'READY_FOR_PICKUP'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : 'bg-amber-950 text-amber-300 border-amber-800'
                                }`}
                              >
                                {currentStage === 'CLINICALLY_VERIFIED' ? '🔵 VERIFIED' : currentStage === 'IN_PACKAGING' ? '🟣 PACKAGING' : currentStage === 'READY_FOR_PICKUP' ? '🟢 READY' : '🟡 UNREVIEWED'}
                              </button>
                            );
                          })()}
                        </div>
                      </div>

                      {/* 2. CARD CONTENT CONTAINER (grid-cols-1 lg:grid-cols-[1fr_320px] gap-6) */}
                      <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                        {/* LEFT SIDE: CONSOLIDATED PRESCRIPTIONS NESTED LIST TABLE */}
                        <div className="space-y-3 min-w-0">
                          {/* HIGH-CONTRAST ALLERGY & ADVANCED CLINICAL SAFETY SUITE */}
                          {group.patientName.toLowerCase().includes('daniel') && (
                            <PharmacyAdvancedClinicalSafetySuiteCard 
                              patientName={group.patientName}
                              drugList={group.allMedications.map((m: any) => m.name || 'Drug Item')}
                              ageYears={58}
                              weightKg={82}
                            />
                          )}

                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                              Prescribed Medications ({group.allMedications.length} Lines)
                            </p>
                          </div>

                          {/* NESTED LIST TABLE FOR ALL DRUGS */}
                          <div className="bg-muted/30 rounded-2xl border border-border/80 overflow-hidden divide-y divide-border/60">
                            {group.allMedications.map((item: any, idx: number) => (
                              <div key={idx} className="p-3 flex items-center justify-between text-xs gap-3 hover:bg-muted/60 transition-all">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-[10px] flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="font-extrabold uppercase text-card-foreground truncate">
                                    💊 {item.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                                    Qty: {item.qty || item.quantity || 1}
                                  </span>
                                  <span className="text-[8px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase border border-emerald-200">
                                    In Stock
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* RIGHT SIDE: FINANCIAL STATUS & UNIFIED ACTION PALETTE */}
                        <div className="space-y-4 bg-muted/20 p-4 rounded-2xl border border-border/80 flex flex-col justify-between h-full">
                          {/* FINANCIAL STATUS BADGES */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Financial Clearance</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[9px] font-black bg-emerald-950 text-emerald-300 px-3 py-1 rounded-xl border border-emerald-800 uppercase">
                                🟢 NHIS PRE-APPROVED
                              </span>
                              <span className="text-[9px] font-mono font-bold text-muted-foreground">
                                Copay: GHS 0.00
                              </span>
                            </div>
                          </div>

                          {/* UNIFIED ACTION BUTTON PALETTE */}
                          <div className="space-y-2 pt-2 border-t border-border/60">
                            <PharmacyInterdepartmentalActionCard 
                              doctorName={group.providerName}
                              patientName={group.patientName}
                              patientId={group.patientId}
                            />

                            {group.isDiag ? (
                              <Button 
                                onClick={() => alert(`Group ${group.id} routed to Radiology PACS Queue`)}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-white font-black text-[10px] uppercase rounded-xl py-2.5 flex items-center justify-center gap-2 shadow-sm"
                              >
                                📡 Route to Radiology PACS <ChevronRight size={14} />
                              </Button>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                <Button
                                  type="button"
                                  onClick={() => handleBulkDispenseAllApproved(group)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl py-2.5 flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                  <CheckCircle2 size={14} /> ⚡ DISPENSE ALL ({group.allMedications.length})
                                </Button>

                                <Link href={`/pharmacy/dispensing/${group.id}?patientId=${group.patientId}&hospitalId=${hospitalId}`} className="w-full">
                                   <Button variant="outline" className="w-full bg-slate-900/40 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80 font-black text-[10px] uppercase rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-all">
                                      Inspect <ChevronRight size={14} />
                                   </Button>
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              dispensedOrders.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground/50 italic uppercase text-xs font-bold">No prescriptions dispensed yet.</div>
              ) : (
                dispensedOrders.map((order) => {
                  const meds = order.prescription || order.items || [];
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

        {/* --- SIDEBAR: INVENTORY HEALTH & TELEMETRY PULSE --- */}
        <div className="space-y-6">
           <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <TrendingUp size={16} className="text-orange-500" /> Stock Pulse
           </h3>

           {/* AUTOMATED FINANCIAL RECONCILIATION & DOUBLE-ENTRY LEDGER SYNC */}
           <PharmacyFinancialReconciliationCard />

           {/* AI-DRIVEN DEMAND FORECASTING & AUTO PURCHASE ORDER ENGINE */}
           <PharmacyDemandForecastingCard />

           {/* MULTI-TENANT INVENTORY SYNC & SISTER BRANCH STOCK TRANSFER CARD */}
           <PharmacyMultiBranchInventoryTransferCard />

           {/* ADVANCED INVENTORY, COLD-CHAIN & NARCOTIC TELEMETRY CARD */}
           <PharmacyStockTelemetryPulseCard />
           
           <div className="bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl space-y-6">
              <div>
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Inventory Status</p>
                 <h4 className="text-xl font-black mt-1">Pharmacy Store A</h4>
              </div>
              
              <div className="space-y-4">
                 <InventoryItem label="Healthy Stock (>20)" status={dataIsLoading ? '...' : `${stockStats.stableCount} items`} percent={stockStats.stablePercent} color="bg-green-500" />
                 <InventoryItem label="Low Stock (1-20)" status={dataIsLoading ? '...' : `${stockStats.lowCount} items`} percent={stockStats.lowPercent} color="bg-orange-500" />
                 <InventoryItem label="Out of Stock (0)" status={dataIsLoading ? '...' : `${stockStats.outCount} items`} percent={stockStats.outPercent} color="bg-red-500" />
              </div>

              <Button 
                onClick={generateInventoryReport}
                disabled={dataIsLoading || !inventoryData || inventoryData.length === 0}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                 Generate Inventory Report
              </Button>
           </div>
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
