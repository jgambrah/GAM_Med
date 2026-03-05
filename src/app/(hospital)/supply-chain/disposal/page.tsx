'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc, increment, writeBatch } from 'firebase/firestore';
import { 
  Trash2, AlertTriangle, ShieldAlert, 
  FileWarning, CheckCircle2, Loader2, Archive, Skull, XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function StockDisposalPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [loading, setLoading] = useState(false);

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

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'pharmacy_inventory'));
  }, [firestore, hospitalId]);
  const { data: inventory, isLoading: isInventoryLoading } = useCollection(inventoryQuery);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [disposalData, setDisposalData] = useState({
    qty: 0,
    reason: 'EXPIRED',
    method: 'INCINERATION',
    notes: '',
    witnessName: ''
  });

  const handleDecommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || disposalData.qty <= 0) return toast({ variant: 'destructive', title: "Invalid quantity" });
    if (disposalData.qty > selectedItem.quantity) return toast({ variant: 'destructive', title: "Disposal quantity exceeds stock level" });
    if (!firestore || !user || !hospitalId) return;

    setLoading(true);
    const batch = writeBatch(firestore);
    
    // Generate the new document reference ahead of time to get its ID
    const logRef = doc(collection(firestore, `hospitals/${hospitalId}/disposal_logs`));

    try {
      const disposalId = `DS-${Date.now().toString().slice(-6)}`;
      const totalLossValue = (selectedItem.price || 0) * disposalData.qty;

      // 1. CREATE DISPOSAL LOG (The Audit Trail)
      batch.set(logRef, {
        disposalId,
        productName: selectedItem.name,
        sku: selectedItem.sku || 'N/A',
        ...disposalData,
        lossValue: totalLossValue,
        hospitalId: hospitalId,
        authorizedBy: user.uid,
        authorizedByName: user.displayName,
        createdAt: serverTimestamp()
      });

      // 2. DEDUCT FROM PHYSICAL INVENTORY
      const invRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, selectedItem.id);
      batch.update(invRef, {
        quantity: increment(-disposalData.qty)
      });
      
      await batch.commit();
      
      toast({ 
        title: `Product Decommissioned Successfully`,
        description: `Please ensure the accountant creates a Journal Voucher to write-off the GHS ${totalLossValue.toFixed(2)} loss.`
       });
      setSelectedItem(null);
      // Navigate to the printable certificate page
      router.push(`/supply-chain/disposal/certificate/${logRef.id}`);

    } catch (err: any) {
      toast({ variant: 'destructive', title: "Decommissioning Failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const isLoading = isUserLoading || isClaimsLoading;
  
  if (isLoading) {
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
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Wastage <span className="text-destructive">& Disposal</span></h1>
          <p className="text-muted-foreground font-medium">Regulatory Decommissioning of Medical Supplies.</p>
        </div>
        <div className="bg-destructive/10 text-destructive px-6 py-2 rounded-2xl border border-destructive/20 flex items-center gap-3">
           <Skull size={18} />
           <span className="text-[10px] font-black uppercase tracking-widest">Authorized Personnel Only</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Step 1: Select Affected Stock</h3>
           <div className="bg-card rounded-[40px] border shadow-sm h-[600px] overflow-y-auto divide-y">
              {isInventoryLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin" /></div> :
              inventory?.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedItem(item)}
                  className={`p-6 cursor-pointer transition-all ${selectedItem?.id === item.id ? 'bg-destructive/5 border-l-8 border-destructive' : 'hover:bg-muted/50'}`}
                >
                   <p className="uppercase text-sm font-bold text-card-foreground">{item.name}</p>
                   <div className="flex justify-between mt-1">
                      <span className="text-[10px] font-black text-primary uppercase">Qty: {item.quantity}</span>
                      <span className="text-[10px] font-black text-muted-foreground uppercase">Exp: {item.expiryDate || 'N/A'}</span>
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Step 2: Decommissioning Details</h3>
          
          {selectedItem ? (
            <form onSubmit={handleDecommission} className="bg-card p-10 rounded-[40px] border-2 border-foreground shadow-2xl space-y-8 animate-in slide-in-from-right-4 duration-300">
               <div className="flex justify-between items-start border-b pb-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase text-card-foreground">{selectedItem.name}</h2>
                    <p className="text-[10px] font-bold text-destructive uppercase italic">Initiating permanent removal from inventory</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedItem(null)} className="text-muted-foreground"><XCircle/></Button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Quantity to Dispose</label>
                        <input type="number" required className="w-full p-4 border rounded-2xl bg-muted/50 text-card-foreground font-black text-2xl outline-none focus:ring-4 focus:ring-destructive/10 focus:border-destructive transition-all"
                          onChange={e => setDisposalData({...disposalData, qty: Number(e.target.value)})} />
                        <p className="text-[9px] text-muted-foreground mt-1">Available Units: {selectedItem.quantity}</p>
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Reason for Disposal</label>
                        <select className="w-full p-4 border rounded-2xl bg-muted/50 text-card-foreground font-bold outline-none"
                          onChange={e => setDisposalData({...disposalData, reason: e.target.value})}>
                          <option value="EXPIRED">Product Expired</option>
                          <option value="DAMAGED">Physical Damage / Breakage</option>
                          <option value="CONTAMINATED">Cold Chain Failure / Contamination</option>
                          <option value="LOST">Lost / Unaccounted For</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Disposal Method</label>
                        <select className="w-full p-4 border rounded-2xl bg-muted/50 text-card-foreground font-bold outline-none"
                          onChange={e => setDisposalData({...disposalData, method: e.target.value})}>
                          <option value="INCINERATION">Incineration (Safe Disposal)</option>
                          <option value="RETURN_TO_VENDOR">Return to Vendor</option>
                          <option value="QUARANTINE">Move to Quarantine Room</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Witness Full Name</label>
                        <input required placeholder="Staff witness for audit" className="w-full p-4 border rounded-2xl bg-muted/50 text-card-foreground font-bold"
                          onChange={e => setDisposalData({...disposalData, witnessName: e.target.value})} />
                     </div>
                  </div>
               </div>

               <Button 
                 type="submit" disabled={loading}
                 className="w-full bg-destructive text-destructive-foreground py-6 rounded-[28px] font-black uppercase text-xs tracking-widest shadow-xl shadow-red-100 flex items-center justify-center gap-3 hover:bg-foreground transition-all"
               >
                 {loading ? <Loader2 className="animate-spin" /> : <ShieldAlert size={20} />}
                 Authorize Decommissioning & Deduct Stock
               </Button>
            </form>
          ) : (
            <div className="bg-card border-2 border-dashed rounded-[40px] p-20 text-center flex flex-col items-center justify-center space-y-4">
               <Archive size={48} className="text-muted-foreground/20" />
               <p className="text-sm font-bold text-muted-foreground uppercase">Please select a product from the list to begin the disposal process.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
