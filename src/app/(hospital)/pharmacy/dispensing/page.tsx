'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collectionGroup, query, where, doc } from 'firebase/firestore';
import { 
  ClipboardList, CheckCircle, Clock, User, ShieldAlert, Loader2, 
  ChevronRight, Search, Pill, ShieldCheck, AlertTriangle, UserCheck, Trash2, BedDouble, RefreshCw, Activity, History, Inbox
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { PharmacyPatientHandoverChecklistDialog } from '@/components/pharmacy/PharmacyPatientHandoverChecklistDialog';
import PharmacyDispensingModal from '@/components/app/pharmacy-dispensing-modal';
import SmartDispensingFefoModal from '@/components/app/smart-dispensing-fefo-modal';
import { postPharmacyDispensingJournalEntry } from '@/ai/flows/ai-pharmacy-financial-reconciliation-engine';
import { MasterPatientCard } from '@/components/pharmacy/MasterPatientCard';

type Order = {
  id: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  providerName: string;
  createdAt: { toDate: () => Date };
  prescription: any[];
  items?: any[];
};

const parseDate = (createdAt: any): Date => {
  if (!createdAt) return new Date();
  if (typeof createdAt.toDate === 'function') return createdAt.toDate();
  if (createdAt instanceof Date) return createdAt;
  if (typeof createdAt === 'string' || typeof createdAt === 'number') return new Date(createdAt);
  if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
  return new Date();
};

const defaultCompletedMockHistory = [
  {
    id: 'ENC-20260628-901',
    encounterId: 'ENC-20260628-901',
    patientId: 'P-10492',
    patientName: 'Kofi Mensah (MRN #88421)',
    providerName: 'Dr. Shane Gambrah',
    isDispensed: true,
    pharmacyStatus: 'FULFILLED',
    allMedications: [
      { name: 'AMOXICILLIN 500MG', dosage: '500mg', frequency: 'TID', duration: '7 days', qty: 21 },
      { name: 'PARACETAMOL 500MG', dosage: '500mg', frequency: 'PRN', duration: '5 days', qty: 15 }
    ]
  },
  {
    id: 'ENC-20260628-902',
    encounterId: 'ENC-20260628-902',
    patientId: 'P-10493',
    patientName: 'Abena Osei (MRN #88422)',
    providerName: 'Dr. Akosua Mensah',
    isDispensed: true,
    pharmacyStatus: 'FULFILLED',
    allMedications: [
      { name: 'NUGEL-O SUSPENSION', dosage: '10ml', frequency: 'TID', duration: '5 days', qty: 1 }
    ]
  }
];

export default function DispensingQueue() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [queueTab, setQueueTab] = useState<'pending' | 'completed'>('pending');
  const [selectedHandoverGroup, setSelectedHandoverGroup] = useState<any | null>(null);
  const [selectedDispenseEncounter, setSelectedDispenseEncounter] = useState<any | null>(null);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [isFefoModalOpen, setIsFefoModalOpen] = useState(false);
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [orderCategoryFilter, setOrderCategoryFilter] = useState<'medications' | 'diagnostic'>('medications');
  const [searchQuery, setSearchQuery] = useState('');

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
        return saved ? JSON.parse(saved) : defaultCompletedMockHistory;
      } catch (e) {
        return defaultCompletedMockHistory;
      }
    }
    return defaultCompletedMockHistory;
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('gam_med_completed_history_records', JSON.stringify(completedHistoryList));
      } catch (e) {
        console.error(e);
      }
    }
  }, [completedHistoryList]);

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
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'PHARMACIST' || userRole === 'ADMIN' || userRole === 'STORE_MANAGER';

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collectionGroup(firestore, "encounters"),
      where("hospitalId", "==", hospitalId)
    );
  }, [firestore, hospitalId]);
  
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

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
    postPharmacyDispensingJournalEntry(
      hospitalId || 'HOSP-CURRENT',
      group.id,
      group.patientName,
      count * 25.0,
      0,
      'National Health Insurance Scheme (NHIS)'
    );

    toast({
      title: `⚡ Bulk Dispense Complete & Ledger Auto-Synced`,
      description: `Fulfilling ${count} lines for ${group.patientName}. Posted double-entry journals to Central Finance Ledger.`
    });
  };

  const formatRelativeSlaTime = (rawCreatedAt: any) => {
    if (!rawCreatedAt) return '⏱️ 4 mins ago';
    let dateObj = parseDate(rawCreatedAt);
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

  const isDiagnosticOrder = (order: any) => {
    const meds = order.prescription || order.items || [];
    return meds.some((item: any) => {
      const name = (item.name || '').toLowerCase();
      return name.includes('mri') || name.includes('xray') || name.includes('x-ray') || name.includes('ct scan') || name.includes('ultrasound') || name.includes('scan');
    });
  };

  const rawOrders = useMemo(() => {
    const seen = new Set();
    const uniqueOrders = (orders || []).filter((ord: any) => {
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
        const dateA = parseDate(a.createdAt);
        const dateB = parseDate(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
  }, [orders]);

  const groupedOrders = useMemo(() => {
    let list = rawOrders.filter((order: any) => {
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

    const allGroups = Array.from(groupsMap.values());
    if (queueTab === 'completed') {
      const dbCompleted = allGroups.filter(
        (g) => g.isDispensed || g.pharmacyStatus === 'FULFILLED' || dispensedGroupIds.includes(g.id) || dispensedGroupIds.includes(g.encounterId)
      );

      const map = new Map<string, any>();
      [...completedHistoryList, ...dbCompleted].forEach((g) => {
        const k = g.id || g.encounterId;
        if (k && !map.has(k)) map.set(k, g);
      });
      return Array.from(map.values());
    }

    return allGroups.filter(
      (g) => !g.isDispensed && g.pharmacyStatus !== 'FULFILLED' && !dispensedGroupIds.includes(g.id) && !dispensedGroupIds.includes(g.encounterId)
    );
  }, [rawOrders, searchQuery, orderCategoryFilter, dispensedGroupIds, completedHistoryList, queueTab]);

  const diagnosticCount = useMemo(() => {
    return rawOrders.filter(isDiagnosticOrder).length;
  }, [rawOrders]);

  const completedCount = useMemo(() => {
    return Math.max(completedHistoryList.length, dispensedGroupIds.length);
  }, [completedHistoryList, dispensedGroupIds]);

  const isLoading = isUserLoading || isClaimsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mx-auto" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Synchronizing Credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-md p-8 bg-card rounded-2xl border shadow-xl space-y-5">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-black text-card-foreground uppercase tracking-tight">Access Restricted</h1>
          <p className="text-xs text-muted-foreground font-medium">
            Your current account credentials do not authorize access to the dispensing feed.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-0 pb-12">
      
      {/* 1. DARK HERO COMMAND CENTER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-md space-y-6 relative overflow-hidden">
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

        {/* Header & Metrics */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-2">
              <Pill className="w-6 h-6 text-indigo-400" />
              DISPENSING FEED
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">
              Real-time consolidated prescription encounters
            </p>
          </div>

          {/* Metric Dashboard */}
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-right min-w-[150px]">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Pending Encounters
              </span>
              <span className="text-2xl font-black text-emerald-400">
                {queueTab === 'pending' ? groupedOrders.length : rawOrders.length}
              </span>
            </div>
          </div>
        </div>

        {/* Global Full-Width Search Input */}
        <div className="relative z-10">
          <Search className="absolute left-4 top-3 text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by patient name, MRN, doctor, or medication..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition placeholder:text-slate-600"
          />
        </div>

        {/* Integrated Navigation Tabs & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-800 relative z-10">
          
          {/* Primary Queue Toggle */}
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button 
              type="button"
              onClick={() => setQueueTab('pending')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center gap-2 cursor-pointer ${
                queueTab === 'pending' 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" /> PENDING ({rawOrders.length})
            </button>
            <button 
              type="button"
              onClick={() => setQueueTab('completed')}
              className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center gap-2 cursor-pointer ${
                queueTab === 'completed' 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle className="w-4 h-4" /> COMPLETED ({completedCount})
            </button>
          </div>

          {/* Context Filter Toggle (Rx vs Diagnostics) */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:block">
              Category View:
            </span>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
              <button 
                type="button"
                onClick={() => setOrderCategoryFilter('medications')}
                className={`px-3 py-2 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                  orderCategoryFilter === 'medications' 
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Pill className="w-4 h-4" /> RX MEDS
              </button>
              <button 
                type="button"
                onClick={() => setOrderCategoryFilter('diagnostic')}
                className={`px-3 py-2 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                  orderCategoryFilter === 'diagnostic' 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-4 h-4" /> DIAGNOSTICS ({diagnosticCount})
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 2. QUEUE CARDS OR UPGRADED EMPTY STATE */}
      {areOrdersLoading ? (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center shadow-sm">
          <Loader2 className="animate-spin text-indigo-500 mx-auto h-8 w-8 mb-2" />
          <p className="text-xs text-slate-500 font-medium">Fetching real-time prescription queue...</p>
        </div>
      ) : groupedOrders.length === 0 ? (
        /* UPGRADED EMPTY STATE FROM BLUEPRINT */
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-sm rotate-3">
            <Inbox className="w-8 h-8 text-slate-400 -rotate-3" />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
            {queueTab === 'completed' ? 'No Recent History Found' : 'No Pending Orders Found'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md leading-relaxed">
            There are currently no {queueTab === 'completed' ? 'completed' : 'pending'} {orderCategoryFilter === 'medications' ? 'prescriptions' : 'diagnostic orders'} in the active session log.
          </p>
          
          {queueTab === 'pending' ? (
            <button 
              type="button"
              onClick={() => setQueueTab('completed')}
              className="mt-8 px-6 py-2.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4" />
              Load Previous Session Records ({completedCount})
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => setQueueTab('pending')}
              className="mt-8 px-6 py-2.5 text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              Switch to Active Queue
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedOrders.map((group) => (
            <div key={group.id || group.encounterId} className="relative">
              <MasterPatientCard
                group={group}
                hospitalId={hospitalId}
                onBulkDispense={(g) => {
                  handleBulkDispenseAllApproved(g);
                  setSelectedHandoverGroup(g);
                }}
                formatRelativeSlaTime={formatRelativeSlaTime}
              />
              
              {queueTab === 'completed' && (
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setSelectedHandoverGroup(group)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-xl py-2 px-4 flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <UserCheck size={14} /> Open Handover & Counseling Protocol 📋
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 5-RIGHTS PATIENT HANDOVER CHECKLIST MODAL */}
      {selectedHandoverGroup && (
        <PharmacyPatientHandoverChecklistDialog
          open={!!selectedHandoverGroup}
          onOpenChange={(open) => !open && setSelectedHandoverGroup(null)}
          patientName={selectedHandoverGroup.patientName}
          mrn={selectedHandoverGroup.mrn || '88421'}
          encounterId={selectedHandoverGroup.id || selectedHandoverGroup.encounterId}
          medications={selectedHandoverGroup.allMedications || selectedHandoverGroup.medications || []}
          prescriberName={selectedHandoverGroup.providerName || selectedHandoverGroup.prescriber}
          onComplete={(encId) => {
            if (encId && !dispensedGroupIds.includes(encId)) {
              setDispensedGroupIds((prev) => [...prev, encId]);
            }
            setSelectedHandoverGroup(null);
          }}
        />
      )}

      <PharmacyDispensingModal
        encounter={selectedDispenseEncounter}
        isOpen={isDispenseModalOpen}
        onClose={() => {
          setIsDispenseModalOpen(false);
          setSelectedDispenseEncounter(null);
        }}
        hospitalId={hospitalId}
        onSuccess={() => {
          if (selectedDispenseEncounter) {
            const k = selectedDispenseEncounter.id || selectedDispenseEncounter.encounterId;
            if (k && !dispensedGroupIds.includes(k)) {
              setDispensedGroupIds((prev) => [...prev, k]);
            }
          }
        }}
      />

      <SmartDispensingFefoModal
        prescription={null}
        isOpen={isFefoModalOpen}
        onClose={() => setIsFefoModalOpen(false)}
        hospitalId={hospitalId}
      />
    </div>
  );
}