'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, collectionGroup } from 'firebase/firestore';
import { 
  Pill, Package, AlertTriangle, CheckCircle2, 
  Clock, ShoppingBag, BarChart3, ChevronRight,
  ClipboardList, Search, TrendingUp, Loader2, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function PharmacistDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

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
  
  const hospitalId = claims?.hospitalId;
  const userRole = claims?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'PHARMACIST' || userRole === 'ADMIN';

  // 1. LISTEN FOR PENDING PRESCRIPTIONS (From Doctor Encounters)
  const pendingOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collectionGroup(firestore, "encounters"),
      where("hospitalId", "==", hospitalId),
      where("isDispensed", "==", false),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);
  const { data: pendingOrdersData, isLoading: areOrdersLoading } = useCollection(pendingOrdersQuery);
  
  const pendingOrders = useMemo(() => 
    (pendingOrdersData || []).filter((ord: any) => ord.prescription && ord.prescription.length > 0)
  , [pendingOrdersData]);


  // 2. LISTEN FOR LOW STOCK (Inventory items <= 20 units to be safer)
  const lowStockQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/pharmacy_inventory`),
      where("quantity", "<=", 20)
    );
  }, [firestore, hospitalId]);
  const { data: lowStockItems, isLoading: areStockLoading } = useCollection(lowStockQuery);

  const pageIsLoading = isUserLoading || isClaimsLoading;
  const dataIsLoading = areOrdersLoading || areStockLoading;

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
                 <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
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
        <PharmacyKPI label="Dispensed Today" value="0" icon={<CheckCircle2 size={20}/>} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- MAIN DISPENSING QUEUE --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <Clock size={16} className="text-primary" /> Live Dispensing Queue
            </h3>
          </div>

          <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden divide-y">
            {dataIsLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin text-primary" /></div> :
            pendingOrders.length === 0 ? (
               <div className="p-20 text-center text-muted-foreground/50 italic uppercase text-xs font-bold">No prescriptions waiting.</div>
            ) : pendingOrders.map((order) => (
              <div key={order.id} className="p-6 flex items-center justify-between group hover:bg-muted/50 transition-all">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Pill size={24} />
                   </div>
                   <div>
                      <p className="font-black text-card-foreground uppercase text-sm">Patient: {order.patientName}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ordered By: Dr. {order.providerName}</p>
                      <div className="flex gap-2 mt-1">
                         {order.prescription.slice(0, 2).map((item: any, i: number) => (
                            <span key={i} className="text-[8px] font-black bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase">{item.name}</span>
                         ))}
                         {order.prescription.length > 2 && <span className="text-[8px] font-black text-primary">+{order.prescription.length - 2} more</span>}
                      </div>
                   </div>
                </div>
                <Link href={`/pharmacy/dispensing/${order.id}`}>
                   <Button className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-primary/30 shadow-xl hover:bg-foreground transition-all">
                      Dispense Now <ChevronRight size={14} />
                   </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* --- SIDEBAR: INVENTORY HEALTH --- */}
        <div className="space-y-6">
           <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <TrendingUp size={16} className="text-orange-500" /> Stock Pulse
           </h3>
           
           <div className="bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl space-y-6">
              <div>
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Inventory Status</p>
                 <h4 className="text-xl font-black mt-1">Pharmacy Store A</h4>
              </div>
              
              <div className="space-y-4">
                 <InventoryItem label="Essential Medicines" status="Stable" percent={85} color="bg-green-500" />
                 <InventoryItem label="Narcotics Control" status="Critical" percent={15} color="bg-red-500" />
                 <InventoryItem label="IV Fluids" status="Low" percent={40} color="bg-orange-500" />
              </div>

              <Button className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
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
