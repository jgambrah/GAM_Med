'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp } from 'firebase/firestore';
import ProductSearchDropdown from '@/components/inventory/ProductSearchDropdown';
import { Send, Plus, Trash2, Loader2, ClipboardList, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

interface RequisitionItem {
    itemId: string;
    name: string;
    sku: string;
    requestedQty: number;
}

export default function NewRequisitionPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

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
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'NURSE', 'DOCTOR', 'PHARMACIST', 'STORE_MANAGER'].includes(userRole);

  const [items, setItems] = useState<RequisitionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const catalogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "product_catalog"));
  }, [firestore, hospitalId]);
  const { data: catalog, isLoading: isCatalogLoading } = useCollection(catalogQuery);

  const handleProductSelect = (product: any) => {
    if (!items.some(i => i.itemId === product.id)) {
        setItems([...items, { 
            itemId: product.id, 
            name: product.name,
            sku: product.sku,
            requestedQty: 1 
        }]);
    } else {
        toast({ variant: 'destructive', title: "Item already in list."})
    }
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItems(items.map(item => item.itemId === itemId ? { ...item, requestedQty: quantity } : item));
  };
  
  const removeItem = (itemId: string) => {
      setItems(items.filter(item => item.itemId !== itemId));
  }

  const handleSendRequest = async () => {
    if (items.length === 0) {
        toast({ variant: 'destructive', title: "Cannot send an empty request." });
        return;
    }
    if (!user || !hospitalId || !firestore) return;
    setLoading(true);

    try {
      await addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/requisitions`), {
        items: items.map(i => ({...i, quantityRequested: i.requestedQty})), // Match schema
        requestingDept: 'Clinical Ward', // This could be dynamic based on user profile
        requestedBy: user.uid,
        requestedByName: user.displayName,
        hospitalId: hospitalId,
        status: 'PENDING',
        createdAt: serverTimestamp()
      });
      toast({ title: "Internal Requisition Sent to Store" });
      setItems([]);
    } catch (e: any) { 
        toast({ variant: 'destructive', title: "Request Failed", description: e.message });
    } finally {
        setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isClaimsLoading;
  if (pageIsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to create requisitions.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Internal <span className="text-primary">Requisition</span></h1>
      
      <div className="bg-card p-8 rounded-[40px] border shadow-sm space-y-6">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Add Supplies to Request</label>
        <ProductSearchDropdown catalog={catalog || []} onSelect={handleProductSelect} />
        
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between bg-muted/50 p-4 rounded-2xl border">
               <div>
                  <p className="font-black uppercase text-xs text-card-foreground">{item.name}</p>
                  <p className="text-[9px] text-primary font-bold">{item.sku}</p>
               </div>
               <div className="flex items-center gap-4">
                  <Input type="number" className="w-20 p-2 rounded-xl border text-center font-black" value={item.requestedQty} 
                    onChange={e => updateItemQuantity(item.itemId, Number(e.target.value))}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.itemId)}><Trash2 size={16} className="text-muted-foreground hover:text-destructive"/></Button>
               </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <Button onClick={handleSendRequest} disabled={loading} className="w-full bg-primary text-primary-foreground py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin"/> : <Send size={18}/>}
            Transmit Request to Central Store
          </Button>
        )}
      </div>
    </div>
  );
}
