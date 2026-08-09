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

  const pendingOrders = useMemo(() => {
    const seen = new Set();
    const uniqueOrders = (pendingOrdersData || []).filter((ord: any) => {
      if (!ord.id || seen.has(ord.id)) return false;
      seen.add(ord.id);
      return true;
    });

    const allOrders = uniqueOrders
      .filter((ord: any) => {
        const meds = ord.prescription || ord.items;
        return meds && meds.length > 0 && ord.isDispensed !== true;
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    const queryStr = searchQuery.toLowerCase().trim();
    if (!queryStr) return allOrders;
    return allOrders.filter((order: any) => {
      const meds = order.prescription || order.items || [];
      return (
        order.patientName?.toLowerCase().includes(queryStr) ||
        order.providerName?.toLowerCase().includes(queryStr) ||
        meds.some((drug: any) => drug.name?.toLowerCase().includes(queryStr))
      );
    });
  }, [pendingOrdersData, searchQuery]);


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
        <PharmacyKPI label="Pending Prescriptions" value={dataIsLoading ? '...' : pendingOrders.length.toString()} icon={<ClipboardList size={20}/>} color="blue" />
        <PharmacyKPI label="Low Stock Alerts" value={dataIsLoading ? '...' : (lowStockItems?.length || 0).toString()} icon={<AlertTriangle size={20}/>} color="orange" />
        <PharmacyKPI label="Dispensed Today" value={dataIsLoading ? '...' : dispensedTodayCount.toString()} icon={<CheckCircle2 size={20}/>} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- MAIN DISPENSING QUEUE --- */}
        <div className="lg:col-span-2 space-y-6">
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
                <Clock size={14} /> Pending ({pendingOrders.length})
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

          {/* PHARMACY SAFETY & QUEUE INSPECTOR BANNER */}
          <PharmacySafetyQueueInspectorCard 
            patientName={pendingOrders[0]?.patientName || 'Benjamin Hedidor'}
            orderItems={pendingOrders[0]?.prescription || pendingOrders[0]?.items || [{ name: 'Vita C Syrup' }, { name: 'Nugel-O Suspension' }]}
            doctorName={pendingOrders[0]?.providerName || 'Dr. Tracy Gambrah'}
            defaultExpanded={false}
          />

          {/* PRIORITY TRIAGE & WORKFLOW SLA HUB */}
          <PharmacyPriorityTriageCard 
            patientName={pendingOrders[0]?.patientName || 'Benjamin Hedidor'}
            defaultExpanded={false}
          />

          <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden divide-y">
            {dataIsLoading ? (
              <div className="p-10 text-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : activeTab === 'pending' ? (
              pendingOrders.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground/50 italic uppercase text-xs font-bold">No prescriptions waiting.</div>
              ) : (
                pendingOrders.map((order) => {
                  const meds = order.prescription || order.items || [];
                  return (
                    <div key={order.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between group hover:bg-muted/50 transition-all gap-4">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Pill size={24} />
                         </div>
                         <div>
                            <p className="font-black text-card-foreground uppercase text-sm">Patient: {order.patientName}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ordered By: Dr. {order.providerName}</p>
                            <div className="flex gap-2 mt-1">
                               {meds.slice(0, 2).map((item: any, i: number) => (
                                  <span key={i} className="text-[8px] font-black bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase">{item.name}</span>
                               ))}
                               {meds.length > 2 && <span className="text-[8px] font-black text-primary">+{meds.length - 2} more</span>}
                            </div>
                         </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <PharmacyInterdepartmentalActionCard 
                          doctorName={order.providerName || 'Kwaku Mensah'}
                          patientName={order.patientName || 'Benjamin Hedidor'}
                          patientId={order.patientId || 'P-100'}
                        />

                        <Link href={`/pharmacy/dispensing/${order.id}?patientId=${order.patientId}&hospitalId=${order.hospitalId}`}>
                           <Button className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-primary/30 shadow-xl hover:bg-foreground transition-all shrink-0">
                              Dispense Now <ChevronRight size={14} />
                           </Button>
                        </Link>
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
