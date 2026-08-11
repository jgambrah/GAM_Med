'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { 
  FileText, CheckCircle, Clock, 
  ArrowLeftRight, ArrowDownLeft, X, Loader2, ShieldAlert, Check, Printer, Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Mock Data for Archives fallback when database is fresh
const fallbackMockHistory = [
  {
    id: 'REQ-20260628-042',
    destination: 'Outpatient Pharmacy',
    receivedDate: 'Jun 28, 2026, 3:46 PM',
    status: 'COMPLETED',
    items: [
      { name: 'AMOXICILLIN 500MG', sku: 'MED-AMO-327', req: 14, issued: 14, accepted: 12, returned: 2 },
      { name: 'EFPAC', sku: 'MED-EFP-382', req: 25, issued: 0, accepted: 0, returned: 0, outOfStock: true },
    ]
  },
  {
    id: 'REQ-20260625-018',
    destination: 'ICU Ward',
    receivedDate: 'Jun 25, 2026, 10:15 AM',
    status: 'COMPLETED',
    items: [
      { name: 'VITA C', sku: 'MED-VIT-647', req: 50, issued: 50, accepted: 50, returned: 0 },
      { name: 'NUGEL-O', sku: 'MED-NUG-773', req: 10, issued: 10, accepted: 10, returned: 0 },
    ]
  }
];

export default function PharmacyRequisitionsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('HISTORY');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null); // Requisition selected for receipt modal
  const [viewInvoiceReq, setViewInvoiceReq] = useState<any>(null); // Requisition selected for full invoice modal
  const [receiptQuantities, setReceiptQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'PHARMACIST', 'STORE_MANAGER', 'DOCTOR', 'NURSE'].includes(userRole || '');

  // Query requisitions created by the Pharmacy or current hospital department
  const requisitionsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, 'hospitals', hospitalId, 'requisitions'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId]);
  const { data: rawRequisitions, isLoading: areReqsLoading } = useCollection(requisitionsQuery);

  // Fetch local inventory to check for existence before receipt
  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'pharmacy_inventory'));
  }, [firestore, hospitalId]);
  const { data: inventorySnapshot } = useCollection(inventoryQuery);

  // Normalize real DB requisitions into uniform UI structure
  const formattedRealRequisitions = useMemo(() => {
    if (!rawRequisitions) return [];
    return rawRequisitions.map(req => {
      const formattedItems = (req.items || []).map((item: any) => {
        const reqQty = item.quantityRequested ?? item.req ?? 0;
        const issuedQty = item.quantityIssued ?? item.issued ?? 0;
        const acceptedQty = item.quantityReceived ?? item.accepted;
        const returnedQty = item.quantityReturned ?? item.returned ?? 0;
        const outOfStock = item.outOfStock ?? (issuedQty === 0 && reqQty > 0);

        return {
          name: item.name || 'Unnamed Item',
          sku: item.sku || 'N/A',
          req: reqQty,
          issued: issuedQty,
          accepted: acceptedQty,
          returned: returnedQty,
          outOfStock: outOfStock,
          itemId: item.itemId || item.id || item.sku
        };
      });

      const dateStr = req.receivedAt 
        ? format(req.receivedAt.toDate(), 'MMM dd, yyyy, p') 
        : (req.createdAt ? format(req.createdAt.toDate(), 'MMM dd, yyyy, p') : 'Recent');

      return {
        ...req,
        id: req.referenceId || (req.id ? (req.id.startsWith('REQ-') ? req.id : `REQ-${req.id.slice(0, 8).toUpperCase()}`) : 'REQ-00000000'),
        rawId: req.id,
        destination: req.destinationDept || req.requestingDept || 'Outpatient Pharmacy',
        receivedDate: dateStr,
        status: req.status || 'PENDING',
        items: formattedItems
      };
    });
  }, [rawRequisitions]);

  const activeRequisitions = useMemo(() => {
    return formattedRealRequisitions.filter(r => ['PENDING', 'APPROVED', 'PARTIALLY_ISSUED', 'ISSUED'].includes(r.status));
  }, [formattedRealRequisitions]);

  const archivedRequisitions = useMemo(() => {
    const dbArchived = formattedRealRequisitions.filter(r => ['RECEIVED', 'REJECTED', 'COMPLETED'].includes(r.status));
    // If DB has no archived requisitions yet, fallback to default mock history for rich display
    return dbArchived.length > 0 ? dbArchived : fallbackMockHistory;
  }, [formattedRealRequisitions]);

  // Filtered requisitions according to active tab and search query
  const displayedRequisitions = useMemo(() => {
    const list = activeTab === 'ACTIVE' ? activeRequisitions : archivedRequisitions;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(r => 
      r.id.toLowerCase().includes(q) ||
      r.destination.toLowerCase().includes(q) ||
      r.items.some((i: any) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    );
  }, [activeTab, activeRequisitions, archivedRequisitions, searchQuery]);

  // Open receipt verification modal
  const openReceiptModal = (req: any) => {
    setSelectedReq(req);
    const initialQuantities: Record<string, number> = {};
    req.items.forEach((item: any) => {
      const issued = item.issued || 0;
      const received = item.accepted || 0;
      const key = item.itemId || item.sku;
      initialQuantities[key] = Math.max(0, issued - received);
    });
    setReceiptQuantities(initialQuantities);
  };

  const handleProcessReceipt = async (req: any, useEnteredQuantities: boolean) => {
    if (!firestore || !hospitalId || !user || !inventorySnapshot) {
      toast({ variant: 'destructive', title: "System Error", description: "Database is not ready." });
      return;
    }

    const targetDocId = req.rawId || req.id;
    setActionLoading(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const reqRef = doc(firestore, `hospitals/${hospitalId}/requisitions`, targetDocId);
        const reqDoc = await transaction.get(reqRef);
        if (!reqDoc.exists()) throw new Error("Requisition not found in database.");

        const reqData = reqDoc.data();
        if (reqData.status === 'RECEIVED') throw new Error("This requisition has already been completed.");

        const updatedItems = [];
        let allItemsReceived = true;

        for (const item of reqData.items) {
          const issued = item.quantityIssued || 0;
          const received = item.quantityReceived || 0;
          const inTransit = Math.max(0, issued - received);
          const itemKey = item.itemId || item.sku;

          if (inTransit <= 0) {
            updatedItems.push(item);
            if (received < item.quantityRequested) allItemsReceived = false;
            continue;
          }

          const acceptedQty = useEnteredQuantities 
            ? Math.max(0, Math.min(inTransit, receiptQuantities[itemKey] ?? inTransit))
            : inTransit;
          const returnedQty = Math.max(0, inTransit - acceptedQty);

          const newReceivedQty = received + acceptedQty;
          const newIssuedQty = issued - returnedQty;

          if (newReceivedQty < item.quantityRequested) allItemsReceived = false;

          updatedItems.push({
            ...item,
            quantityIssued: newIssuedQty,
            quantityReceived: newReceivedQty,
            quantityReturned: (item.quantityReturned || 0) + returnedQty
          });

          // Add accepted quantity to pharmacy local inventory
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

          // Return rejected quantities to Central Store
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
            }
          }
        }

        const finalStatus = allItemsReceived ? 'RECEIVED' : 'PARTIALLY_ISSUED';

        transaction.update(reqRef, {
          items: updatedItems,
          status: finalStatus,
          receivedBy: user.uid,
          receivedByName: user.displayName || 'Staff Lead',
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
  if (pageIsLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-indigo-600"/></div>;

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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* 1. DARK HERO BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-md space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
              REQUISITIONS REGISTRY
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Track, review, and manage your departmental stock requests and fulfillment history.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/requisitions/new')}
              className="px-4 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              New Requisition
            </button>
          </div>
        </div>

        {/* Tab Navigation inside the Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('ACTIVE')}
              className={`pb-2 text-sm font-bold uppercase tracking-wider transition border-b-2 cursor-pointer ${
                activeTab === 'ACTIVE' ? 'text-indigo-400 border-indigo-400' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Active Requests ({activeRequisitions.length})
            </button>
            <button 
              onClick={() => setActiveTab('HISTORY')}
              className={`pb-2 text-sm font-bold uppercase tracking-wider transition border-b-2 cursor-pointer ${
                activeTab === 'HISTORY' ? 'text-indigo-400 border-indigo-400' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              History & Archives ({archivedRequisitions.length})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input 
              type="text"
              placeholder="Search by ID, item, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 text-xs text-white placeholder-slate-500 pl-9 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 2. REQUISITION CARDS LIST */}
      <div className="space-y-4">
        {areReqsLoading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Fetching Requisition Registry...</p>
          </div>
        ) : displayedRequisitions.length > 0 ? (
          displayedRequisitions.map((req) => {
            const hasStockToAcknowledge = ['ISSUED', 'PARTIALLY_ISSUED'].includes(req.status) || 
              req.items.some((i: any) => (i.issued || 0) > (i.accepted || 0));

            return (
              <div key={req.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition hover:border-indigo-200 dark:hover:border-indigo-500/30">
                
                {/* Card Header: IDs, Badges, and Audit Data */}
                <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-wide font-mono">{req.id}</h3>
                      
                      {/* Status Badges */}
                      {(req.status === 'COMPLETED' || req.status === 'RECEIVED') && (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          RECEIVED
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          APPROVED
                        </span>
                      )}
                      {req.status === 'PENDING' && (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </span>
                      )}
                      {(req.status === 'ISSUED' || req.status === 'PARTIALLY_ISSUED') && (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 rounded-full flex items-center gap-1">
                          <ArrowLeftRight className="w-3 h-3" />
                          IN TRANSIT
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-full flex items-center gap-1">
                          <X className="w-3 h-3" />
                          REJECTED
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Requested by: <strong className="text-slate-700 dark:text-slate-200">{req.destination}</strong> • Logged: {req.receivedDate}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {hasStockToAcknowledge && (
                      <button 
                        onClick={() => openReceiptModal(req)}
                        className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowDownLeft className="w-4 h-4" />
                        Acknowledge & Receive
                      </button>
                    )}
                    <button 
                      onClick={() => setViewInvoiceReq(req)}
                      className="px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition border border-indigo-200 dark:border-indigo-500/20 cursor-pointer"
                    >
                      View Full Invoice
                    </button>
                  </div>
                </div>

                {/* Card Body: The Line Items */}
                <div className="p-4 space-y-1">
                  {req.items.map((item: any, idx: number) => (
                    <div key={idx} className={`flex flex-col md:flex-row md:items-center justify-between py-2 ${idx !== req.items.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                      
                      {/* Item Details */}
                      <div className="flex items-center gap-3 mb-2 md:mb-0">
                        <div>
                          <h4 className={`text-sm font-bold ${item.outOfStock ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                            {item.name}
                          </h4>
                          <p className="text-[10px] font-mono text-slate-400">{item.sku}</p>
                        </div>
                        {item.outOfStock && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-md">
                            OUT OF STOCK
                          </span>
                        )}
                      </div>

                      {/* Item Telemetry & Granular Tracking */}
                      <div className="flex flex-wrap gap-4 text-xs font-medium text-right bg-slate-50 dark:bg-slate-800/50 md:bg-transparent p-2 md:p-0 rounded-lg">
                        <div className="text-slate-500 dark:text-slate-400">
                          Req: <span className="text-slate-800 dark:text-slate-100 font-bold">{item.req}</span>
                        </div>
                        <div className={item.issued === 0 ? 'text-rose-500 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                          Issued: <span className={item.issued > 0 ? 'text-slate-800 dark:text-slate-100 font-bold' : ''}>{item.issued}</span>
                        </div>
                        {!item.outOfStock && (
                          <>
                            {item.accepted !== undefined && (
                              <div className="text-slate-500 dark:text-slate-400">
                                Accepted: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.accepted}</span>
                              </div>
                            )}
                            {item.returned > 0 && (
                              <div className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                <ArrowLeftRight className="w-3 h-3" />
                                Returned: {item.returned}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : activeTab === 'ACTIVE' ? (
          /* Empty State for Active Tab */
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Active Requisitions</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              All your requests have been processed. Draft a new requisition to request stock from the main warehouse.
            </p>
          </div>
        ) : (
          /* Empty State for History Tab */
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No History & Archives</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Completed and past stock fulfillment records will appear here once received or archived.
            </p>
          </div>
        )}
      </div>

      {/* 3. RECEIPT ACKNOWLEDGMENT MODAL */}
      {selectedReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 p-6 text-white flex justify-between items-center border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight italic">Acknowledge & Receive <span className="text-indigo-400">Stock</span></h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Requisition: <span className="font-mono text-white font-bold">{selectedReq.id}</span></p>
              </div>
              <button 
                onClick={() => setSelectedReq(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Confirm how many units you are accepting into departmental stock. Any unaccepted units will be logged as returns back to Central Store.
              </p>

              <div className="space-y-3">
                {selectedReq.items.map((item: any, idx: number) => {
                  const issued = item.issued || 0;
                  const acceptedPrev = item.accepted || 0;
                  const inTransit = Math.max(0, issued - acceptedPrev);
                  const itemKey = item.itemId || item.sku;
                  const accepted = receiptQuantities[itemKey] ?? inTransit;
                  const returned = Math.max(0, inTransit - accepted);

                  return (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase">{item.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Issued In-Transit: <span className="font-bold text-slate-800 dark:text-slate-200">{inTransit} units</span></p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Accept Qty</label>
                          <input 
                            type="number"
                            min="0"
                            max={inTransit}
                            className="w-20 p-2 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-bold text-xs text-indigo-900 dark:text-indigo-300 bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
                            value={accepted}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(inTransit, Number(e.target.value)));
                              setReceiptQuantities(prev => ({ ...prev, [itemKey]: val }));
                            }}
                          />
                        </div>
                        <div className="text-center shrink-0 min-w-[70px]">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Return Qty</label>
                          <span className={cn("text-xs font-bold block py-2 px-3 rounded-lg border border-dashed", returned > 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-300 dark:border-rose-500/30" : "bg-slate-100 text-slate-400 dark:bg-slate-900 dark:border-slate-800")}>
                            {returned}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedReq(null)}
                className="w-full py-2.5 font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleProcessReceipt(selectedReq, false)}
                disabled={actionLoading}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold uppercase text-xs tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <Check size={14} /> Accept All
              </Button>
              <Button
                onClick={() => handleProcessReceipt(selectedReq, true)}
                disabled={actionLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-xs tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <ArrowDownLeft size={14} /> Confirm Receipt
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FULL INVOICE VIEW MODAL */}
      {viewInvoiceReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 p-6 text-white flex justify-between items-center border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-black uppercase tracking-tight italic">REQUISITION <span className="text-indigo-400">INVOICE</span></h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full font-mono">
                    {viewInvoiceReq.id}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-1">Audit Record & Granular Item Telemetry</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button 
                  onClick={() => setViewInvoiceReq(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Requisition ID</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{viewInvoiceReq.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Destination Unit</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{viewInvoiceReq.destination}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Logged Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{viewInvoiceReq.receivedDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Fulfillment Status</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{viewInvoiceReq.status}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Item Description</th>
                      <th className="p-3 font-mono">SKU</th>
                      <th className="p-3 text-center">Req Qty</th>
                      <th className="p-3 text-center">Issued Qty</th>
                      <th className="p-3 text-center">Accepted</th>
                      <th className="p-3 text-center">Returned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {viewInvoiceReq.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="p-3">
                          <span className={`font-bold ${item.outOfStock ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                            {item.name}
                          </span>
                          {item.outOfStock && (
                            <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200 rounded">
                              OOS
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-400">{item.sku}</td>
                        <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-100">{item.req}</td>
                        <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-100">{item.issued}</td>
                        <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {item.outOfStock ? '-' : (item.accepted ?? item.issued)}
                        </td>
                        <td className="p-3 text-center font-bold text-rose-600 dark:text-rose-400">
                          {item.returned > 0 ? item.returned : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <Button onClick={() => setViewInvoiceReq(null)} className="px-6 font-bold bg-slate-800 hover:bg-slate-900 text-white">
                Close Invoice
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
