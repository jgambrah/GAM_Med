'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { ShoppingCart, Users, Plus, BarChart3, TrendingUp, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface CatalogProduct {
    id: string;
    name: string;
    minLevel: number;
}

interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
}

export default function ProcurementDashboard() {
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
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PHARMACIST'].includes(userRole);

  // Fetching data
  const suppliersQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/suppliers`)) : null, [firestore, hospitalId]);
  const { data: suppliers, isLoading: suppliersLoading } = useCollection(suppliersQuery);

  const activePOsQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/purchase_orders`), where("status", "==", "PENDING_DELIVERY")) : null, [firestore, hospitalId]);
  const { data: activePOs, isLoading: posLoading } = useCollection(activePOsQuery);
  
  const catalogQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/product_catalog`)) : null, [firestore, hospitalId]);
  const { data: catalog, isLoading: catalogLoading } = useCollection<CatalogProduct>(catalogQuery);

  const inventoryQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/pharmacy_inventory`)) : null, [firestore, hospitalId]);
  const { data: inventory, isLoading: inventoryLoading } = useCollection<InventoryItem>(inventoryQuery);
  
  const lowStockCount = useMemo(() => {
    if (!catalog || !inventory) return 0;
    const inventoryMap = inventory.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
        return acc;
    }, {} as Record<string, number>);
    
    let count = 0;
    catalog.forEach(product => {
      const currentQty = inventoryMap[product.name] || 0;
      if (currentQty <= product.minLevel) {
        count++;
      }
    });
    return count;
  }, [catalog, inventory]);

  const isLoading = suppliersLoading || posLoading || catalogLoading || inventoryLoading || isUserLoading || isClaimsLoading;
  
  if (isUserLoading || isClaimsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Procurement <span className="text-primary">Command</span></h1>
          <p className="text-muted-foreground font-medium">Supply Chain Management & Vendor Relations.</p>
        </div>
        <Link href="/supply-chain/orders">
          <Button>
             <Plus size={18}/> New Purchase Order
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ProcKPI label="Active Purchase Orders" value={isLoading ? <Loader2 className="animate-spin" /> : activePOs?.length ?? 0} icon={<ShoppingCart/>} color="blue" />
        <ProcKPI label="Registered Suppliers" value={isLoading ? <Loader2 className="animate-spin" /> : suppliers?.length ?? 0} icon={<Users/>} color="orange" />
        <ProcKPI label="Pending Re-orders" value={isLoading ? <Loader2 className="animate-spin" /> : lowStockCount} icon={<TrendingUp/>} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card p-8 rounded-[40px] border shadow-sm">
           <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 border-b pb-2">Supply Pipeline</h3>
           <div className="space-y-4">
              <Link href="/supply-chain/reorder" className="flex items-center justify-between p-6 bg-red-50 rounded-[32px] border-2 border-red-100 hover:scale-105 transition-all">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-600 text-white rounded-2xl"><BarChart3 size={20}/></div>
                    <div>
                       <p className="text-sm font-black uppercase">Low Stock Alerts</p>
                       <p className="text-[10px] text-red-400 font-bold uppercase">Items below critical minimum</p>
                    </div>
                 </div>
                 <Plus size={20} className="text-red-600" />
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
}

function ProcKPI({ label, value, icon, color }: {label: string, value: string | number | React.ReactNode, icon: React.ReactNode, color: 'blue' | 'orange' | 'red'}) {
  const colors: any = { blue: "bg-blue-50 text-blue-600", orange: "bg-orange-50 text-orange-600", red: "bg-red-50 text-red-600" };
  return (
    <div className={`${colors[color]} p-8 rounded-[40px] border-2 border-transparent flex items-center justify-between shadow-sm hover:scale-105 transition-all`}>
       <div><p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p><p className="text-4xl font-black mt-2">{value}</p></div>
       <div className="p-4 bg-white/50 rounded-3xl">{icon}</div>
    </div>
  );
}