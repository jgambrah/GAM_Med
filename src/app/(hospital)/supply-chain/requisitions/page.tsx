
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, runTransaction, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, orderBy, writeBatch, increment } from 'firebase/firestore';
import { Truck, CheckCircle2, Loader2, ShieldAlert, PackageCheck, AlertCircle, XCircle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function IssueRequisitionsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [issuingQuantities, setIssuingQuantities] = useState<Record<string, number>>({});

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
  
  const approvedQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, 'hospitals', hospitalId, 'requisitions'),
      where('status', 'in', ['APPROVED', 'PARTIALLY_ISSUED']),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId]);
  const { data: requisitions, isLoading: areReqsLoading } = useCollection(approvedQuery);

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'pharmacy_inventory'));
  }, [firestore, hospitalId]);
  const { data: inventory, isLoading: isInventoryLoading } = useCollection(inventoryQuery);
  
  useEffect(() => {
    if (selectedReq) {
      const initialQtys = Object.fromEntries(selectedReq.items.map((i: any) => [i.itemId, 0]));
      setIssuingQuantities(initialQtys);
    }
  }, [selectedReq]);

  const handleIssueSupplies = async () => {
    if (!selectedReq || !firestore || !user) return;
    setLoading(true);

    try {
        await runTransaction(firestore, async (transaction) => {
            const reqRef = doc(firestore, `hospitals/${hospitalId}/requisitions`, selectedReq.id);
            const currentReqDoc = await transaction.get(reqRef);
            if (!currentReqDoc.exists()) throw new Error("Requisition not found.");

            const currentReqData = currentReqDoc.data();
            let allItemsFulfilled = true;

            const updatedItems = currentReqData.items.map((item: any) => {
                const issuingNow = issuingQuantities[item.itemId] || 0;
                if (issuingNow <= 0) return item;

                const newIssuedQty = (item.quantityIssued || 0) + issuingNow;
                if (newIssuedQty > item.quantityRequested) {
                    throw new Error(`Cannot issue more than requested for ${item.name}.`);
                }
                
                if (newIssuedQty < item.quantityRequested) {
                    allItemsFulfilled = false;
                }
                
                // Deduct from inventory
                const inventoryItemRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, item.itemId);
                transaction.update(inventoryItemRef, { quantity: increment(-issuingNow) });

                // Log movement
                const movementRef = doc(collection(firestore, `hospitals/${hospitalId}/inventory_movements`));
                transaction.set(movementRef, {
                    hospitalId,
                    sku: item.sku,
                    productName: item.name,
                    qty: -issuingNow,
                    type: 'INTERNAL_ISSUE',
                    source: 'CENTRAL_STORE',
                    destination: currentReqData.requestingDept,
                    authorizedBy: user.uid,
                    createdAt: serverTimestamp()
                });

                return { ...item, quantityIssued: newIssuedQty };
            });

            const newStatus = allItemsFulfilled ? 'ISSUED' : 'PARTIALLY_ISSUED';
            transaction.update(reqRef, {
                items: updatedItems,
                status: newStatus,
                lastIssuedAt: serverTimestamp(),
                lastIssuedBy: user.displayName
            });
        });

        toast({ title: "Stock Issued Successfully", description: `Supplies issued to ${selectedReq.requestingDept}` });
        setSelectedReq(null);

    } catch (e: any) {
        console.error("Issuance Transaction Error:", e);
        toast({ variant: 'destructive', title: 'Issuance Failed', description: e.message });
    } finally {
        setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isClaimsLoading;
  if (pageIsLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>;

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
  
  const dataIsLoading = areReqsLoading || isInventoryLoading;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Issuance <span className="text-primary">Console</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Fulfill internal department supply requests.</p>
        </div>
        <div className="bg-primary text-white px-6 py-2 rounded-2xl flex items-center gap-3">
           <Truck size={18} />
           <span className="text-[10px] font-black uppercase tracking-widest">{dataIsLoading ? '...' : requisitions?.length} Pending Handovers</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Approved Requisitions</h3>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {dataIsLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin" /></div> : 
            requisitions?.length === 0 ? (
                <div className="p-10 bg-slate-50 rounded-[40px] border border-dashed border-slate-200 text-center text-slate-300 italic uppercase text-xs">No pending requests.</div>
            ) : requisitions?.map(req => (
              <div 
                key={req.id} 
                onClick={() => setSelectedReq(req)}
                className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all shadow-sm ${selectedReq?.id === req.id ? 'border-primary bg-primary/5' : 'bg-white border-slate-50 hover:border-primary/20'}`}
              >
                <div className="flex justify-between items-start mb-2">
                   <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full text-primary uppercase border border-primary/10">{req.requestingDept}</span>
                   <span className="text-[9px] text-slate-400 uppercase font-bold">{req.approvedAt ? format(req.approvedAt.toDate(), 'p') : ''}</span>
                </div>
                <p className="uppercase text-black text-sm leading-tight">Requested by: {req.requestedByName}</p>
                <p className="text-[10px] text-slate-400 mt-2 italic font-medium">{req.items.length} unique items in list.</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedReq ? (
            <div className="bg-white rounded-[40px] border-4 border-slate-900 shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-300">
               <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic">Review <span className="text-blue-400">Handover</span></h2>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Target: {selectedReq.requestingDept}</p>
                  </div>
                  <PackageCheck size={40} className="text-blue-500 opacity-50" />
               </div>

               <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                     <tr>
                        <th className="p-5 text-[10px] uppercase tracking-widest">Item / Stock</th>
                        <th className="p-5 text-[10px] uppercase tracking-widest text-center">Req.</th>
                        <th className="p-5 text-[10px] uppercase tracking-widest text-center">Issued</th>
                        <th className="p-5 text-[10px] uppercase tracking-widest text-center">Issuing Now</th>
                        <th className="p-5 text-[10px] uppercase tracking-widest text-right">Balance</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {selectedReq.items.map((item: any) => {
                        const stockItem = inventory?.find(p => p.id === item.itemId);
                        const stock = stockItem?.quantity || 0;
                        const balance = item.quantityRequested - (item.quantityIssued || 0);
                        const issuingNow = issuingQuantities[item.itemId] || 0;
                        return (
                          <tr key={item.itemId}>
                             <td className="p-5">
                                <p className="uppercase text-sm font-black">{item.name}</p>
                                <p className={`text-[9px] font-bold ${stock < item.quantityRequested ? 'text-red-500' : 'text-green-600'}`}>In Stock: {stock}</p>
                             </td>
                             <td className="p-5 text-center text-lg font-black">{item.quantityRequested}</td>
                             <td className="p-5 text-center text-lg font-bold text-blue-600">{item.quantityIssued || 0}</td>
                             <td className="p-5 text-center">
                                <Input 
                                    type="number"
                                    max={Math.min(balance, stock)}
                                    className="w-20 mx-auto text-center"
                                    value={issuingQuantities[item.itemId] || ''}
                                    onChange={(e) => setIssuingQuantities({...issuingQuantities, [item.itemId]: Number(e.target.value)})}
                                />
                             </td>
                             <td className="p-5 text-right font-black text-lg text-red-600">{balance - issuingNow}</td>
                          </tr>
                        );
                     })}
                  </tbody>
               </table>

               <div className="p-8 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                  <Button 
                    disabled={loading}
                    onClick={handleIssueSupplies}
                    className="flex-1 bg-primary text-primary-foreground px-12 py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin"/> : <ArrowUpRight size={18} />}
                    Approve & Issue
                  </Button>
               </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] h-full p-20 text-center flex flex-col items-center justify-center space-y-6">
               <div className="p-6 bg-white rounded-[32px] shadow-sm"><PackageCheck size={48} className="text-slate-200" /></div>
               <div>
                  <h3 className="text-xl font-black uppercase text-slate-400">Ready for Handover</h3>
                  <p className="text-[10px] font-bold text-slate-300 uppercase mt-2">Select a requisition to authorize supply issuance.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


  