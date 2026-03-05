'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Box, ClipboardList, Archive, Truck, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function StoreKeeperDashboard() {
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

  // Data Fetching
  const catalogQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/product_catalog`)) : null, [firestore, hospitalId]);
  const { data: catalog, isLoading: catalogLoading } = useCollection(catalogQuery);

  const inventoryQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/pharmacy_inventory`)) : null, [firestore, hospitalId]);
  const { data: inventory, isLoading: inventoryLoading } = useCollection(inventoryQuery);

  const pendingPOsQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/purchase_orders`), where('status', '==', 'PENDING_DELIVERY')) : null, [firestore, hospitalId]);
  const { data: pendingPOs, isLoading: posLoading } = useCollection(pendingPOsQuery);

  const wardRequestsQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/requisitions`), where('status', '==', 'APPROVED')) : null, [firestore, hospitalId]);
  const { data: wardRequests, isLoading: requestsLoading } = useCollection(wardRequestsQuery);

  const expiringItemsCount = useMemo(() => {
    if (!inventory) return 0;
    const now = new Date();
    const in90Days = new Date();
    in90Days.setDate(now.getDate() + 90);
    return inventory.filter(item => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      return expiry <= in90Days && expiry > now;
    }).length;
  }, [inventory]);

  const pageIsLoading = isUserLoading || isClaimsLoading;
  const dataIsLoading = catalogLoading || inventoryLoading || posLoading || requestsLoading;

  if (pageIsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Warehouse <span className="text-primary">Operations</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Store Keeper: {user?.displayName}</p>
        </div>
        <Link href="/supply-chain/orders">
          <Button className="bg-foreground text-background font-black text-xs uppercase tracking-widest hover:bg-primary transition-all">Certify Delivery (GRN)</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StoreKPI label="Total SKUs" value={dataIsLoading ? <Loader2 className="animate-spin"/> : catalog?.length ?? 0} icon={<Box/>} color="blue" />
        <StoreKPI label="Items Expiring" value={dataIsLoading ? <Loader2 className="animate-spin"/> : expiringItemsCount} icon={<Archive/>} color="red" />
        <StoreKPI label="Incoming Shipments" value={dataIsLoading ? <Loader2 className="animate-spin"/> : pendingPOs?.length ?? 0} icon={<Truck/>} color="orange" />
        <StoreKPI label="Ward Requests" value={dataIsLoading ? <Loader2 className="animate-spin"/> : wardRequests?.length ?? 0} icon={<ClipboardList/>} color="purple" />
      </div>

      <div className="bg-[#0f172a] p-10 rounded-[50px] text-white shadow-2xl flex justify-between items-center">
         <div className="space-y-2">
            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Departmental <span className="text-blue-400">Requisitions</span></h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wards and Clinics are waiting for supplies.</p>
         </div>
         <Link href="/supply-chain/requisitions">
            <Button variant="secondary" className="bg-primary hover:bg-white hover:text-black text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Open Fulfillment Queue</Button>
         </Link>
      </div>
    </div>
  );
}

function StoreKPI({ label, value, icon, color }: any) {
    const colors: any = { blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600", orange: "bg-orange-50 text-orange-600", purple: "bg-purple-50 text-purple-600" };
    return (
        <div className={`p-6 rounded-[32px] border-2 border-transparent ${colors[color]} flex flex-col gap-4 shadow-sm`}>
            <div className="p-3 bg-white w-fit rounded-xl shadow-sm">{icon}</div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
              <p className="text-2xl font-black">{value}</p>
            </div>
        </div>
    );
}
