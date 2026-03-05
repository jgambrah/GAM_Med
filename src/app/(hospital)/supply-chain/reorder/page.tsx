'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { 
  AlertTriangle, ShoppingCart, Loader2, ShieldAlert,
  PackageCheck, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


interface CatalogProduct {
    id: string;
    name: string;
    sku: string;
    minLevel: number;
    unit: string;
    basePrice: number;
}

interface InventoryItem {
    id: string;
    name: string; // This should match a name in the catalog
    quantity: number;
}


export default function AutomaticReorderList() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PHARMACIST'].includes(userRole);

  const catalogQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/product_catalog`)) : null, [firestore, hospitalId]);
  const { data: catalog, isLoading: catalogLoading } = useCollection<CatalogProduct>(catalogQuery);

  const inventoryQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/pharmacy_inventory`)) : null, [firestore, hospitalId]);
  const { data: inventory, isLoading: inventoryLoading } = useCollection<InventoryItem>(inventoryQuery);

  const reorderList = useMemo(() => {
    if (!catalog || !inventory) return [];

    const aggregatedInventory = inventory.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
        return acc;
    }, {} as Record<string, number>);

    const allItems = catalog.map(product => {
        const currentQty = aggregatedInventory[product.name] || 0;
        return {
            ...product,
            currentQty,
            status: currentQty === 0 ? 'STOCK_OUT' : (currentQty <= product.minLevel ? 'LOW_STOCK' : 'ADEQUATE')
        };
    });

    return allItems.filter(item => item.status === 'LOW_STOCK' || item.status === 'STOCK_OUT');
  }, [catalog, inventory]);

  const pageIsLoading = isUserLoading || isProfileLoading;
  const dataIsLoading = catalogLoading || inventoryLoading;

  if (pageIsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
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
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Re-Order <span className="text-destructive">Intelligence</span></h1>
          <p className="text-muted-foreground font-medium">Automated alerts for items reaching critical re-order levels.</p>
        </div>
        <div className="bg-destructive/10 text-destructive px-6 py-2 rounded-2xl border border-destructive/20 flex items-center gap-3">
           <AlertTriangle size={18} />
           <span className="text-[10px] font-black uppercase tracking-widest">{dataIsLoading ? '...' : reorderList.length} Items Need Attention</span>
        </div>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest">Product / SKU</TableHead>
              <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest">Min. Level</TableHead>
              <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest">Current Stock</TableHead>
              <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest">Status</TableHead>
              <TableHead className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataIsLoading ? (
                 <TableRow><TableCell colSpan={5} className="text-center h-48"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
            ) : reorderList.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="p-20 text-center text-muted-foreground italic">
                        <CheckCircle2 className="mx-auto mb-2 text-green-500" size={32}/>
                        Inventory levels are healthy. No items require re-ordering.
                    </TableCell>
                </TableRow>
            ) : reorderList.map(item => (
              <TableRow key={item.id} className="hover:bg-destructive/5 transition-all">
                <TableCell className="p-6">
                   <p className="uppercase text-sm font-bold text-card-foreground">{item.name}</p>
                   <p className="text-[10px] text-primary font-black">{item.sku}</p>
                </TableCell>
                <TableCell className="p-6 text-muted-foreground font-bold">{item.minLevel} {item.unit}</TableCell>
                <TableCell className="p-6">
                    <span className={`text-xl font-black ${item.status === 'STOCK_OUT' ? 'text-destructive' : 'text-orange-600'}`}>
                        {item.currentQty}
                    </span>
                </TableCell>
                <TableCell className="p-6">
                   <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase italic ${item.status === 'STOCK_OUT' ? 'bg-destructive text-white' : 'bg-orange-100 text-orange-700'}`}>
                      {item.status === 'STOCK_OUT' ? 'Critical Stock Out' : 'Below Min Level'}
                   </span>
                </TableCell>
                <TableCell className="p-6 text-right">
                   <Button asChild>
                     <Link href={`/supply-chain/orders?prefill_itemId=${item.id}&prefill_sku=${item.sku}&prefill_name=${encodeURIComponent(item.name)}&suggested_qty=${item.minLevel * 2}&prefill_price=${item.basePrice}`}>
                         Initiate PO <ShoppingCart size={14}/>
                     </Link>
                   </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
