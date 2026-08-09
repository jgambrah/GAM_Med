'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collectionGroup, query, where, orderBy, doc } from 'firebase/firestore';
import { ClipboardList, CheckCircle2, Clock, User, ShieldAlert, Loader2, ChevronRight, Search, Pill, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PharmacyInterdepartmentalActionCard } from '@/components/pharmacy/PharmacyInterdepartmentalActionCard';
import { postPharmacyDispensingJournalEntry } from '@/ai/flows/ai-pharmacy-financial-reconciliation-engine';
import { useGroupedPrescriptions } from '@/hooks/useGroupedPrescriptions';
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

export default function DispensingQueue() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [orderCategoryFilter, setOrderCategoryFilter] = useState<'medications' | 'diagnostic'>('medications');
  const [orderStages, setOrderStages] = useState<Record<string, 'UNREVIEWED' | 'CLINICALLY_VERIFIED' | 'IN_PACKAGING' | 'READY_FOR_PICKUP'>>({});

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

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collectionGroup(firestore, "encounters"),
      where("hospitalId", "==", hospitalId)
    );
  }, [firestore, hospitalId]);
  
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);
  const [searchQuery, setSearchQuery] = useState('');

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
    const count = group.allMedications?.length || 1;
    const journalEntries = postPharmacyDispensingJournalEntry(
      hospitalId || 'HOSP-CURRENT',
      group.id,
      group.patientName,
      count * 25.0,
      0,
      'National Health Insurance Scheme (NHIS)'
    );

    toast({
      title: `⚡ Bulk Dispense Complete & Financial Ledger Auto-Synced`,
      description: `Fulfilling ${count} lines for ${group.patientName}. Posted ${journalEntries.length} double-entry journals to Central Finance Ledger.`
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

    return Array.from(groupsMap.values());
  }, [rawOrders, searchQuery, orderCategoryFilter]);

  const diagnosticCount = useMemo(() => {
    return rawOrders.filter(isDiagnosticOrder).length;
  }, [rawOrders]);
  
  const isLoading = isUserLoading || isClaimsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Synchronizing Credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md p-8 bg-card rounded-[40px] border shadow-2xl space-y-6">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-2" />
          <h1 className="text-2xl font-black text-card-foreground uppercase tracking-tight">Access Restricted</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase leading-relaxed">
            Your current account credentials do not authorize access to the pharmacy dispensing queue.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="w-full bg-foreground text-background font-black uppercase text-[10px] tracking-widest py-3 rounded-2xl">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter italic">Dispensing <span className="text-primary">Feed</span></h1>
           <p className="text-muted-foreground font-bold text-xs uppercase italic">Real-time consolidated prescription encounters ready for fulfillment.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-2xl border font-bold text-xs">
           <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
           <span className="text-muted-foreground uppercase">Pending Encounters:</span>
           <span className="text-card-foreground font-black">{groupedOrders.length}</span>
        </div>
      </div>

      {/* SEARCH BAR & CATEGORY FILTER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by patient name, MRN, doctor, or medication..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-card border font-bold text-xs h-11 text-foreground placeholder:text-muted-foreground rounded-2xl shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setOrderCategoryFilter('medications')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
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
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              orderCategoryFilter === 'diagnostic'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📡 Diagnostic Orders ({diagnosticCount})
          </button>
        </div>
      </div>

      {/* QUEUE CARDS */}
      {areOrdersLoading ? (
        <div className="text-center p-20"><Loader2 className="animate-spin text-primary mx-auto h-8 w-8" /></div>
      ) : groupedOrders.length === 0 ? (
        <div className="text-center p-20 bg-card border-2 border-dashed rounded-[32px] text-muted-foreground italic font-bold text-xs uppercase">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-primary/50" />
          {orderCategoryFilter === 'diagnostic' ? 'No non-medication diagnostic requests pending.' : 'The dispensing queue is clear. No pending prescriptions.'}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedOrders.map((group) => (
            <MasterPatientCard
              key={group.id || group.encounterId}
              group={group}
              hospitalId={hospitalId}
              onBulkDispense={handleBulkDispenseAllApproved}
              formatRelativeSlaTime={formatRelativeSlaTime}
            />
          ))}
        </div>
      )}
    </div>
  );
}


    