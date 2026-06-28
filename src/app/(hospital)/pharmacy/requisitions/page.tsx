'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { 
  ClipboardList, CheckCircle2, Clock, 
  Loader2, ShieldAlert, ArrowDownLeft, X, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PharmacyRequisitionsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null); // Requisition selected for receipt modal
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, number>>({});

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'PHARMACIST'].includes(userRole || '');

  // Query only requisitions created by the Pharmacy department
  const requisitionsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, 'hospitals', hospitalId, 'requisitions'),
      where('requestingDept', '==', 'Pharmacy'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId]);
  const { data: requisitions, isLoading: areReqsLoading } = useCollection(requisitionsQuery);

  // Fetch local inventory to check for existence before receipt
  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'pharmacy_inventory'));
  }, [firestore, hospitalId]);
  const { data: inventorySnapshot, isLoading: isInventoryLoading } = useCollection(inventoryQuery);

  const activeRequisitions = useMemo(() => {
    if (!requisitions) return [];
    return requisitions.filter(r => ['PENDING', 'APPROVED', 'PARTIALLY_ISSUED', 'ISSUED'].includes(r.status));
  }, [requisitions]);

  const archivedRequisitions = useMemo(() => {
    if (!requisitions) return [];
    return requisitions.filter(r => ['RECEIVED', 'REJECTED'].includes(r.status));
  }, [requisitions]);

  // Open the receiving modal and initialize in-transit quantities
  const openReceiptModal = (req: any) => {
    setSelectedReq(req);
    const initialQuantities: Record<string, number> = {};
    req.items.forEach((item: any) => {
      const issued = item.quantityIssued || 0;
      const received = item.quantityReceived || 0;
      initialQuantities[item.itemId] = Math.max(0, issued - received);
    });
    setReceiptQuantities(initialQuantities);
  };

  const handleProcessReceipt = async (req: any, useEnteredQuantities: boolean) => {
    if (!firestore || !hospitalId || !user || !inventorySnapshot) {
      toast({ variant: 'destructive', title: "System Error", description: "Database is not ready." });
      return;
    }

    setActionLoading(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const reqRef = doc(firestore, `hospitals/${hospitalId}/requisitions`, req.id);
        const reqDoc = await transaction.get(reqRef);
        if (!reqDoc.exists()) throw new Error("Requisition not found.");

        const reqData = reqDoc.data();
        if (reqData.status === 'RECEIVED') throw new Error("This requisition has already been processed.");

        const updatedItems = [];
        let allItemsReceived = true;

        // Loop through requisition items and update local inventory / central returns
        for (const item of reqData.items) {
          const issued = item.quantityIssued || 0;
          const received = item.quantityReceived || 0;
          const inTransit = Math.max(0, issued - received);

          if (inTransit <= 0) {
            updatedItems.push(item);
            if (received < item.quantityRequested) {
              allItemsReceived = false;
            }
            continue;
          }

          // Compute accepted and returned quantities for this batch
          const acceptedQty = useEnteredQuantities 
            ? Math.max(0, Math.min(inTransit, receiptQuantities[item.itemId] ?? inTransit))
            : inTransit;
          const returnedQty = Math.max(0, inTransit - acceptedQty);

          const newReceivedQty = received + acceptedQty;
          const newIssuedQty = issued - returnedQty;

          if (newReceivedQty < item.quantityRequested) {
            allItemsReceived = false;
          }

          updatedItems.push({
            ...item,
            quantityIssued: newIssuedQty,
            quantityReceived: newReceivedQty,
            quantityReturned: (item.quantityReturned || 0) + returnedQty
          });

          // 1. Add accepted quantity to pharmacy local inventory
          if (acceptedQty > 0) {
            const existingItem = inventorySnapshot.find(inv => 
              (inv.sku && item.sku && inv.sku.toLowerCase() === item.sku.toLowerCase()) || 
              (inv.name && item.name && inv.name.toLowerCase() === item.name.toLowerCase())
            );

            if (existingItem) {
              const itemRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, existingItem.id);
              transaction.update(itemRef, {
                quantity: increment(acceptedQty),
                lastUpdated: serverTimestamp()
              });
            } else {
              const newDocRef = doc(collection(firestore, `hospitals/${hospitalId}/pharmacy_inventory`));
              transaction.set(newDocRef, {
                name: item.name,
                genericName: item.name,
                strength: '',
                form: 'Tablet',
                quantity: acceptedQty,
                price: 0,
                sku: item.sku || '',
                hospitalId: hospitalId,
                lastUpdated: serverTimestamp()
              });
            }

            // Log pharmacy receipt movement
            const movementRef = doc(collection(firestore, `hospitals/${hospitalId}/inventory_movements`));
            transaction.set(movementRef, {
              hospitalId,
              sku: item.sku || '',
              productName: item.name,
              qty: acceptedQty,
              type: 'PHARMACY_RECEIPT',
              source: 'CENTRAL_STORE',
              destination: 'Pharmacy Store',
              authorizedBy: user.uid,
              createdAt: serverTimestamp()
            });
          }

          // 2. Return rejected/unaccepted quantities back to Central Store
          if (returnedQty > 0) {
            const centralItem = inventorySnapshot.find(inv => 
              (inv.sku && item.sku && inv.sku.toLowerCase() === item.sku.toLowerCase()) || 
              (inv.id === item.itemId)
            );

            if (centralItem) {
              const centralRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, centralItem.id);
              transaction.update(centralRef, {
                quantity: increment(returnedQty),
                lastUpdated: serverTimestamp()
              });

              // Log positive return to central store
              const returnMovementRef = doc(collection(firestore, `hospitals/${hospitalId}/inventory_movements`));
              transaction.set(returnMovementRef, {
                hospitalId,
                sku: item.sku || '',
                productName: item.name,
                qty: returnedQty,
                type: 'STORE_RETURN',
                source: 'Pharmacy Store',
                destination: 'CENTRAL_STORE',
                authorizedBy: user.uid,
                createdAt: serverTimestamp()
              });
            } else {
              // Failsafe: create document in central store inventory if not exists
              const newCentralRef = doc(collection(firestore, `hospitals/${hospitalId}/pharmacy_inventory`));
              transaction.set(newCentralRef, {
                name: item.name,
                genericName: item.name,
                strength: '',
                form: 'Tablet',
                quantity: returnedQty,
                price: 0,
                sku: item.sku || '',
                hospitalId: hospitalId,
                lastUpdated: serverTimestamp()
              });
            }
          }
        }

        // Set status to RECEIVED if all items received, otherwise keep as PARTIALLY_ISSUED
        const finalStatus = allItemsReceived ? 'RECEIVED' : 'PARTIALLY_ISSUED';

        transaction.update(reqRef, {
          items: updatedItems,
          status: finalStatus,
          receivedBy: user.uid,
          receivedByName: user.displayName,
          receivedAt: serverTimestamp()
        });
      });

      toast({ 
        title: "Receipt Confirmed", 
        description: useEnteredQuantities 
          ? "Accepted quantities added to shelf stock. Returns sent back to Central Store." 
          : "All released quantities have been accepted and added to shelf stock." 
      });
      setSelectedReq(null);
    } catch (err: any) {
      console.error("Receipt Processing Error:", err);
      toast({ variant: 'destructive', title: "Receipt Processing Failed", description: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  if (pageIsLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-16 w-16 animate-spin text-primary"/></div>;

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4 text-black font-bold">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have authorization to access this dashboard.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  const dataIsLoading = areReqsLoading || isInventoryLoading;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto text-black font-bold bg-white rounded-[40px] border shadow-sm relative">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Requisitions <span className="text-primary">Registry</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic mt-1">Track internal stock refill requests and acknowledge warehouse releases.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-slate-100 pb-1 gap-8">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={cn(
            "pb-3 text-sm font-black uppercase tracking-wider relative transition-all flex items-center gap-2",
            activeTab === 'ACTIVE' ? "text-primary" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Clock size={16} />
          Active Requests ({activeRequisitions.length})
          {activeTab === 'ACTIVE' && <span className="absolute bottom-[-2px] left-0 right-0 h-[3px] bg-primary rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('ARCHIVE')}
          className={cn(
            "pb-3 text-sm font-black uppercase tracking-wider relative transition-all flex items-center gap-2",
            activeTab === 'ARCHIVE' ? "text-primary" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <CheckCircle2 size={16} />
          History & Archives ({archivedRequisitions.length})
          {activeTab === 'ARCHIVE' && <span className="absolute bottom-[-2px] left-0 right-0 h-[3px] bg-primary rounded-full" />}
        </button>
      </div>

      {dataIsLoading ? (
        <div className="text-center p-12"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" /></div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'ACTIVE' ? (
            activeRequisitions.length === 0 ? (
              <div className="p-20 bg-slate-50 border-2 border-dashed rounded-[32px] text-center text-slate-300 italic uppercase">No active requisitions found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {activeRequisitions.map(req => {
                  const hasStockToAcknowledge = ['ISSUED', 'PARTIALLY_ISSUED', 'ISSUED_PARTIAL'].includes(req.status) || 
                    req.items.some((i: any) => (i.quantityIssued || 0) > (i.quantityReceived || 0));
                  return (
                    <div key={req.id} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4 hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={cn(
                            "text-[9px] font-black px-3 py-1 rounded-full uppercase italic border",
                            req.status === 'PENDING' && "bg-amber-50 text-amber-800 border-amber-200",
                            req.status === 'APPROVED' && "bg-blue-50 text-blue-800 border-blue-200",
                            req.status === 'PARTIALLY_ISSUED' && "bg-purple-50 text-purple-800 border-purple-200",
                            req.status === 'ISSUED' && "bg-sky-50 text-sky-800 border-sky-200"
                          )}>
                            {req.status}
                          </span>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                            Requested: {req.createdAt ? format(req.createdAt.toDate(), 'PPp') : ''}
                          </p>
                        </div>
                        {hasStockToAcknowledge && (
                          <Button 
                            onClick={() => openReceiptModal(req)}
                            disabled={actionLoading}
                            className="bg-primary text-primary-foreground hover:bg-black font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5 shadow-md transition-all rounded-xl py-4"
                          >
                            <ArrowDownLeft size={14}/> Acknowledge / Verify Receipt
                          </Button>
                        )}
                      </div>

                      <div className="bg-muted/50 p-4 rounded-2xl border space-y-2">
                        {req.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold uppercase text-slate-800">{item.name}</p>
                              <p className="text-[9px] text-slate-400">SKU: {item.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-600 font-bold">Requested: {item.quantityRequested}</p>
                              {(item.quantityIssued || 0) > 0 && <p className="text-primary font-black">Issued: {item.quantityIssued}</p>}
                              {(item.quantityReceived || 0) > 0 && <p className="text-green-600 font-bold">Received so far: {item.quantityReceived}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            archivedRequisitions.length === 0 ? (
              <div className="p-20 bg-card border-2 border-dashed rounded-[32px] text-center text-slate-300 italic uppercase">No archived requisitions found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {archivedRequisitions.map(req => (
                  <div key={req.id} className="bg-card p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={cn(
                          "text-[9px] font-black px-3 py-1 rounded-full uppercase italic border",
                          req.status === 'RECEIVED' && "bg-green-50 text-green-800 border-green-200",
                          req.status === 'REJECTED' && "bg-red-50 text-red-800 border-red-200"
                        )}>
                          {req.status}
                        </span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                          Received: {req.receivedAt ? format(req.receivedAt.toDate(), 'PPp') : (req.createdAt ? format(req.createdAt.toDate(), 'PPp') : '')}
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/30 p-4 rounded-2xl border space-y-2 text-slate-500">
                      {req.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold uppercase">{item.name}</p>
                            <p className="text-[9px]">SKU: {item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p>Requested: {item.quantityRequested}</p>
                            <p className="text-slate-600 font-bold">Issued: {item.quantityIssued}</p>
                            {item.quantityReceived !== undefined && <p className="text-green-600 font-black">Accepted: {item.quantityReceived}</p>}
                            {(item.quantityReturned || 0) > 0 && <p className="text-red-600 font-black">Returned: {item.quantityReturned}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Verification Receipt Modal Overlay */}
      {selectedReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] border-4 border-slate-900 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-black">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tighter italic">Verify Released <span className="text-blue-400">Stock</span></h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Requisition: {selectedReq.id.slice(-6).toUpperCase()}</p>
              </div>
              <button 
                onClick={() => setSelectedReq(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Confirm how many units you are accepting onto the pharmacy shelf. Any unaccepted items will be automatically returned to the Central Store stock.
              </p>

              <div className="space-y-3">
                {selectedReq.items.map((item: any, idx: number) => {
                  const issued = item.quantityIssued || 0;
                  const received = item.quantityReceived || 0;
                  const inTransit = Math.max(0, issued - received); // This is what is new to acknowledge!
                  const accepted = receiptQuantities[item.itemId] ?? inTransit;
                  const returned = Math.max(0, inTransit - accepted);

                  return (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase">{item.name}</p>
                        <p className="text-[9px] text-slate-400">SKU: {item.sku}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Store Released (New batch): <span className="font-bold">{inTransit} units</span></p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <label className="text-[9px] text-slate-400 uppercase block mb-1">Accept Qty</label>
                          <input 
                            type="number"
                            min="0"
                            max={inTransit}
                            className="w-20 p-2 border-2 border-slate-200 rounded-xl text-center font-black text-xs text-blue-900 bg-white"
                            value={accepted}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(inTransit, Number(e.target.value)));
                              setReceiptQuantities(prev => ({ ...prev, [item.itemId]: val }));
                            }}
                          />
                        </div>
                        <div className="text-center shrink-0 min-w-[70px]">
                          <label className="text-[9px] text-slate-400 uppercase block mb-1">Return Qty</label>
                          <span className={cn("text-xs font-black block py-2 px-3 rounded-xl border border-dashed", returned > 0 ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-100 text-slate-400 border-slate-200")}>
                            {returned}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row gap-3">
              <Button
                variant="ghost"
                onClick={() => setSelectedReq(null)}
                className="w-full py-4 font-bold border-2"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleProcessReceipt(selectedReq, false)}
                disabled={actionLoading}
                className="w-full py-4 bg-slate-800 text-white font-black uppercase text-[10px] tracking-wider rounded-2xl flex items-center justify-center gap-1.5 hover:bg-black transition-colors"
              >
                <Check size={14} /> Accept All
              </Button>
              <Button
                onClick={() => handleProcessReceipt(selectedReq, true)}
                disabled={actionLoading}
                className="w-full py-4 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-wider rounded-2xl flex items-center justify-center gap-1.5 hover:bg-primary/95 transition-colors shadow-lg shadow-primary/20"
              >
                <ArrowDownLeft size={14} /> Confirm & Return
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
