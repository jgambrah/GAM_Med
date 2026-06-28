'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc, increment, writeBatch } from 'firebase/firestore';
import { 
  Trash2, AlertTriangle, ShieldAlert, 
  FileWarning, CheckCircle2, Loader2, Archive, Skull, XCircle, Search, ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PharmacyStockDisposalPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'PHARMACIST'].includes(userRole);

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'pharmacy_inventory'));
  }, [firestore, hospitalId]);
  const { data: inventory, isLoading: isInventoryLoading } = useCollection(inventoryQuery);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    const queryStr = searchQuery.toLowerCase().trim();
    if (!queryStr) return inventory;
    return inventory.filter(item => 
      item.name?.toLowerCase().includes(queryStr) ||
      item.genericName?.toLowerCase().includes(queryStr) ||
      item.batchNumber?.toLowerCase().includes(queryStr)
    );
  }, [inventory, searchQuery]);

  const [disposalData, setDisposalData] = useState({
    qty: 0,
    reason: 'EXPIRED',
    method: 'INCINERATION',
    notes: '',
    witnessName: ''
  });

  const handleDecommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      toast({ variant: 'destructive', title: "Unauthorized Action", description: "Only Pharmacists, Admins, or Directors can authorize stock decommissioning." });
      return;
    }
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
        productId: selectedItem.id,
        productName: selectedItem.name || 'Unknown Product',
        sku: selectedItem.sku || 'N/A',
        ...disposalData,
        location: "PHARMACY_SHELVES",
        lossValue: totalLossValue,
        status: "PENDING",
        hospitalId: hospitalId,
        authorizedBy: user.uid,
        authorizedByName: user.displayName || user.email || 'Authorized User',
        createdAt: serverTimestamp()
      });
      
      await batch.commit();
      
      toast({ 
        title: `Decommissioning Initiated`,
        description: `Your request has been submitted for administrative review and approval.`
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

  const isLoading = isUserLoading || isProfileLoading;
  
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
          <Button onClick={() => router.push('/pharmacy')} className="mt-4">Return to Pharmacy</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black">
      <Button variant="ghost" onClick={() => router.push('/pharmacy')} className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-black transition-all pl-0">
        <ArrowLeft size={14}/> Back to Operations
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Pharmacy Shelf <span className="text-destructive">Wastage & Disposal</span></h1>
          <p className="text-muted-foreground font-medium">Localized Decommissioning of Pharmacy Shelf Stocks.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/supply-chain/disposal/logs">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg h-9">
              <Archive size={14} /> Disposal Archive
            </Button>
          </Link>
          <div className="bg-destructive/10 text-destructive px-6 py-2 rounded-2xl border border-destructive/20 flex items-center gap-3 h-9">
             <Skull size={18} />
             <span className="text-[10px] font-black uppercase tracking-widest">Pharmacy Personnel</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
           <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Step 1: Select Affected Stock</h3>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
              <Input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search stock by name, generic, or batch..."
                className="pl-9 bg-slate-50 border rounded-xl font-bold h-10 text-xs text-black placeholder:text-slate-400"
              />
           </div>

           <div className="bg-card rounded-[40px] border shadow-sm h-[540px] overflow-y-auto divide-y bg-white">
              {isInventoryLoading ? (
                <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
              ) : filteredInventory.length === 0 ? (
                <div className="p-10 text-center text-slate-400 italic text-xs uppercase font-bold">No matching stock found.</div>
              ) : (
                filteredInventory.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className={`p-6 cursor-pointer transition-all ${selectedItem?.id === item.id ? 'bg-destructive/5 border-l-8 border-destructive' : 'hover:bg-slate-50'}`}
                  >
                     <p className="uppercase text-sm font-bold text-card-foreground">{item.name}</p>
                     <div className="flex justify-between mt-1">
                        <span className="text-[10px] font-black text-primary uppercase">Qty: {item.quantity}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">Exp: {item.expiryDate || 'N/A'}</span>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Step 2: Decommissioning Details</h3>
          
          {selectedItem ? (
            <form onSubmit={handleDecommission} className="bg-card p-10 rounded-[40px] border-2 border-foreground shadow-2xl space-y-8 bg-white animate-in slide-in-from-right-4 duration-300">
               <div className="flex justify-between items-start border-b pb-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase text-card-foreground">{selectedItem.name}</h2>
                    <p className="text-[10px] font-bold text-destructive uppercase italic">Initiating permanent removal from shelves</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedItem(null)} className="text-slate-400"><XCircle/></Button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity to Dispose</label>
                        <input type="number" required className="w-full p-4 border rounded-2xl bg-slate-50 text-card-foreground font-black text-2xl outline-none focus:ring-4 focus:ring-destructive/10 focus:border-destructive transition-all"
                          onChange={e => setDisposalData({...disposalData, qty: Number(e.target.value)})} />
                        <p className="text-[9px] text-slate-400 mt-1">Available Units: {selectedItem.quantity}</p>
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Disposal</label>
                        <select className="w-full p-4 border rounded-2xl bg-slate-50 text-card-foreground font-bold outline-none"
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disposal Method</label>
                        <select className="w-full p-4 border rounded-2xl bg-slate-50 text-card-foreground font-bold outline-none"
                          onChange={e => setDisposalData({...disposalData, method: e.target.value})}>
                          <option value="INCINERATION">Incineration (Safe Disposal)</option>
                          <option value="RETURN_TO_VENDOR">Return to Vendor</option>
                          <option value="QUARANTINE">Move to Quarantine Room</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Witness Full Name</label>
                        <input required placeholder="Staff witness for audit" className="w-full p-4 border rounded-2xl bg-slate-50 text-card-foreground font-bold"
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
            <div className="bg-white border-2 border-dashed rounded-[40px] p-20 text-center flex flex-col items-center justify-center space-y-4">
               <Archive size={48} className="text-slate-200" />
               <p className="text-sm font-bold text-slate-400 uppercase">Please select a product from the list to begin the shelf disposal process.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
