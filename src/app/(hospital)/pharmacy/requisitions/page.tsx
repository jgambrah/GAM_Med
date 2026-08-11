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
    <div className="p-8 space-y-6 max-w-5xl mx-auto text-foreground">
      {/* DARK HERO BANNER HEADER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
              REQUISITIONS <span className="text-primary">REGISTRY & ARCHIVES</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Track inter-departmental stock refill requests, audit releases, and acknowledge warehouse receipts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
              <ClipboardList size={14} /> Active Registry
            </span>
            <Button 
              onClick={() => router.push('/requisitions/new')} 
              className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition flex items-center gap-2 h-9"
            >
              + Create Requisition
            </Button>
          </div>
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
              <div className="p-20 bg-card border-2 border-dashed rounded-2xl text-center text-slate-400 italic uppercase font-bold text-xs">No active requisitions found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {activeRequisitions.map(req => {
                  const hasStockToAcknowledge = ['ISSUED', 'PARTIALLY_ISSUED', 'ISSUED_PARTIAL'].includes(req.status) || 
                    req.items.some((i: any) => (i.quantityIssued || 0) > (i.quantityReceived || 0));
                  const refId = req.referenceId || `REQ-${req.id.slice(0, 8).toUpperCase()}`;
                  const dept = req.destinationDept || req.requestingDept || 'Outpatient Pharmacy';
                  const officer = req.requestingOfficer || req.requestedByName || 'Staff Lead';

                  return (
                    <div key={req.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                      {/* Card Header: IDs, Badges, and Audit Data */}
                      <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 font-mono text-sm">{refId}</h3>
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold border rounded-full uppercase",
                              req.status === 'PENDING' && "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
                              req.status === 'APPROVED' && "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
                              req.status === 'PARTIALLY_ISSUED' && "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
                              req.status === 'ISSUED' && "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20"
                            )}>
                              {req.status}
                            </span>
                            {req.priorityLevel && (
                              <span className={cn(
                                "px-2 py-0.5 text-[10px] font-bold border rounded-full uppercase",
                                req.priorityLevel.includes('STAT') ? "bg-rose-600 text-white animate-pulse" : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                              )}>
                                {req.priorityLevel}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            Requested by: <strong className="text-slate-700 dark:text-slate-200">{dept}</strong> ({officer}) • {req.createdAt ? format(req.createdAt.toDate(), 'PPp') : ''}
                          </div>
                        </div>
                        
                        {hasStockToAcknowledge ? (
                          <Button 
                            onClick={() => openReceiptModal(req)}
                            disabled={actionLoading}
                            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
                          >
                            <ArrowDownLeft size={14}/> Acknowledge & Receive
                          </Button>
                        ) : (
                          <button className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition border border-indigo-200 dark:border-indigo-500/20">
                            View Request Details
                          </button>
                        )}
                      </div>

                      {/* Card Body: The Line Items */}
                      <div className="p-4 space-y-3">
                        {req.items.map((item: any, idx: number) => {
                          const issued = item.quantityIssued ?? 0;
                          const requested = item.quantityRequested ?? 0;
                          const returned = item.quantityReturned ?? 0;
                          const accepted = item.quantityReceived;
                          const isUnfulfilled = issued === 0 && requested > 0;

                          return (
                            <div key={idx} className={`flex items-center justify-between py-2 ${idx !== req.items.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                              <div className="flex items-center gap-2">
                                <div>
                                  <h4 className={`text-sm font-bold uppercase ${isUnfulfilled ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{item.name}</h4>
                                  <p className={`text-[10px] font-mono mt-0.5 ${isUnfulfilled ? 'text-slate-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{item.sku}</p>
                                </div>
                                {isUnfulfilled && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-md">
                                    OUT OF STOCK
                                  </span>
                                )}
                              </div>

                              <div className={`flex items-center gap-4 text-xs font-medium text-right ${isUnfulfilled ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                <div>Req: <span className={isUnfulfilled ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100 font-bold'}>{requested}</span></div>
                                <div>Issued: <span className={isUnfulfilled ? 'text-rose-500 font-bold' : 'text-slate-800 dark:text-slate-100 font-bold'}>{issued}</span></div>
                                {accepted !== undefined && (
                                  <div>Accepted: <span className="text-emerald-600 font-bold">{accepted}</span></div>
                                )}
                                {returned > 0 && (
                                  <div className="text-rose-600 font-bold">Returned: {returned}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            archivedRequisitions.length === 0 ? (
              <div className="p-20 bg-card border-2 border-dashed rounded-2xl text-center text-slate-400 italic uppercase font-bold text-xs">No archived requisitions found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {archivedRequisitions.map(req => {
                  const refId = req.referenceId || `REQ-${req.id.slice(0, 8).toUpperCase()}`;
                  const dept = req.destinationDept || req.requestingDept || 'Outpatient Pharmacy';
                  const officer = req.requestingOfficer || req.requestedByName || 'Staff Lead';

                  return (
                    <div key={req.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                      {/* Card Header: IDs, Badges, and Audit Data */}
                      <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 font-mono text-sm">{refId}</h3>
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold border rounded-full uppercase",
                              req.status === 'RECEIVED' && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
                              req.status === 'REJECTED' && "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                            )}>
                              {req.status === 'RECEIVED' ? 'COMPLETED & RECEIVED' : req.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            Requested by: <strong className="text-slate-700 dark:text-slate-200">{dept}</strong> ({officer}) • {req.receivedAt ? `Received: ${format(req.receivedAt.toDate(), 'PPp')}` : (req.createdAt ? `Requested: ${format(req.createdAt.toDate(), 'PPp')}` : '')}
                          </div>
                        </div>
                        
                        <button className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition border border-indigo-200 dark:border-indigo-500/20">
                          View Full Invoice
                        </button>
                      </div>

                      {/* Card Body: The Line Items */}
                      <div className="p-4 space-y-3">
                        {req.items.map((item: any, idx: number) => {
                          const issued = item.quantityIssued ?? 0;
                          const requested = item.quantityRequested ?? 0;
                          const returned = item.quantityReturned ?? 0;
                          const accepted = item.quantityReceived;
                          const isUnfulfilled = issued === 0 && requested > 0;

                          return (
                            <div key={idx} className={`flex items-center justify-between py-2 ${idx !== req.items.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                              <div className="flex items-center gap-2">
                                <div>
                                  <h4 className={`text-sm font-bold uppercase ${isUnfulfilled ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{item.name}</h4>
                                  <p className={`text-[10px] font-mono mt-0.5 ${isUnfulfilled ? 'text-slate-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{item.sku}</p>
                                </div>
                                {isUnfulfilled && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-md">
                                    OUT OF STOCK
                                  </span>
                                )}
                              </div>

                              <div className={`flex items-center gap-4 text-xs font-medium text-right ${isUnfulfilled ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                <div>Req: <span className={isUnfulfilled ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100 font-bold'}>{requested}</span></div>
                                <div>Issued: <span className={isUnfulfilled ? 'text-rose-500 font-bold' : 'text-slate-800 dark:text-slate-100 font-bold'}>{issued}</span></div>
                                {accepted !== undefined && (
                                  <div>Accepted: <span className="text-emerald-600 font-bold">{accepted}</span></div>
                                )}
                                {returned > 0 && (
                                  <div className="text-rose-600 font-bold">Returned: {returned}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
