'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import ProductSearchDropdown from '@/components/inventory/ProductSearchDropdown';
import { Send, Plus, Trash2, Loader2, ClipboardList, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

interface RequisitionItem {
    itemId: string;
    name: string;
    sku: string;
    unit: string;
    unitPrice: number;
    soh: number;
    requestedQty: number;
    itemNotes?: string;
}

export default function NewRequisitionPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'NURSE', 'DOCTOR', 'PHARMACIST', 'STORE_MANAGER'].includes(userRole);

  const [items, setItems] = useState<RequisitionItem[]>([]);
  const [destinationDept, setDestinationDept] = useState('Pharmacy');
  const [priorityLevel, setPriorityLevel] = useState<'ROUTINE' | 'URGENT' | 'STAT'>('ROUTINE');
  const [requestingOfficer, setRequestingOfficer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.displayName && !requestingOfficer) {
      setRequestingOfficer(user.displayName);
    }
  }, [user, requestingOfficer]);

  const catalogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "product_catalog"));
  }, [firestore, hospitalId]);
  const { data: catalog, isLoading: isCatalogLoading } = useCollection(catalogQuery);

  const handleProductSelect = (product: any) => {
    if (!items.some(i => i.itemId === product.id)) {
        const soh = product.stockOnHand ?? product.quantityInStock ?? product.quantity ?? product.currentStock ?? 100;
        const unitPrice = product.purchasePrice || product.price || 15.0;

        setItems([...items, { 
            itemId: product.id, 
            name: product.name,
            sku: product.sku,
            unit: product.unit || 'units',
            unitPrice: unitPrice,
            soh: soh,
            requestedQty: 1,
            itemNotes: ''
        }]);
        toast({ title: `Added ${product.name} to drafting cart.` });
    } else {
        toast({ variant: 'destructive', title: "Item already in drafting cart."});
    }
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItems(items.map(item => item.itemId === itemId ? { ...item, requestedQty: Math.max(1, quantity) } : item));
  };

  const updateItemNote = (itemId: string, noteText: string) => {
    setItems(items.map(item => item.itemId === itemId ? { ...item, itemNotes: noteText } : item));
  };
  
  const removeItem = (itemId: string) => {
      setItems(items.filter(item => item.itemId !== itemId));
  }

  const grandTotalValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.requestedQty * item.unitPrice), 0);
  }, [items]);

  const totalUnitsRequested = useMemo(() => {
    return items.reduce((acc, item) => acc + item.requestedQty, 0);
  }, [items]);

  const handleSendRequest = async () => {
    if (items.length === 0) {
        toast({ variant: 'destructive', title: "Cannot send an empty request." });
        return;
    }
    if (!destinationDept) {
        toast({ variant: 'destructive', title: "Destination Unit Required", description: "Select target department." });
        return;
    }
    if (!user || !hospitalId || !firestore) return;
    setLoading(true);

    try {
      await addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/requisitions`), {
        items: items.map(i => ({
          itemId: i.itemId,
          name: i.name,
          sku: i.sku,
          unit: i.unit,
          unitPrice: i.unitPrice,
          soh: i.soh,
          quantityRequested: i.requestedQty,
          itemNotes: i.itemNotes || ''
        })),
        requestingDept: destinationDept,
        destinationDept: destinationDept,
        priorityLevel: priorityLevel,
        requestingOfficer: requestingOfficer || user.displayName || 'Shane Gambrah (Staff)',
        notes: notes,
        totalValue: grandTotalValue,
        requestedBy: user.uid,
        requestedByName: user.displayName || requestingOfficer,
        hospitalId: hospitalId,
        status: 'PENDING',
        createdAt: serverTimestamp()
      });
      toast({ title: "✅ Requisition Transmitted to Central Store", description: `Staged ${items.length} items valued at ₵ ${grandTotalValue.toFixed(2)}.` });
      setItems([]);
      setNotes('');
    } catch (e: any) { 
        toast({ variant: 'destructive', title: "Request Failed", description: e.message });
    } finally {
        setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
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
    <div className="p-8 max-w-5xl mx-auto space-y-6 text-foreground">
      {/* DARK HERO BANNER & CONTEXT HEADER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-md mb-6 space-y-5">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
              INTERNAL REQUISITION
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Draft, review, and submit departmental stock requests.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
              Drafting Mode
            </span>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/pharmacy/requisitions')} 
              className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition flex items-center gap-2 h-9"
            >
              <ArrowLeft size={14} /> Active Requisitions
            </Button>
          </div>
        </div>

        {/* Requisition Context Variables */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
              Destination / Requesting Unit
            </label>
            <select
              value={destinationDept}
              onChange={e => setDestinationDept(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
            >
              <option value="Outpatient Pharmacy">Outpatient Pharmacy</option>
              <option value="Main Pharmacy">Main Pharmacy</option>
              <option value="ICU Ward">ICU Ward</option>
              <option value="Maternity Ward">Maternity Ward</option>
              <option value="Emergency Department">Emergency Department</option>
              <option value="Operating Theatre">Operating Theatre</option>
              <option value="Pediatrics Ward">Pediatrics Ward</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
              Priority Level
            </label>
            <select
              value={priorityLevel}
              onChange={e => setPriorityLevel(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-rose-500 outline-none font-bold"
            >
              <option value="ROUTINE">Routine Restock</option>
              <option value="STAT">STAT / Urgent (Emergency)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
              Requesting Officer / Lead
            </label>
            <Input
              type="text"
              required
              value={requestingOfficer}
              onChange={e => setRequestingOfficer(e.target.value)}
              placeholder="e.g. Dr. Shane Gambrah (Shift Lead)"
              className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-bold outline-none h-10"
            />
          </div>
        </div>
      </div>
      
      {/* DRAFTING CART & SUPPLIES SELECTION CARD */}
      <div className="bg-card p-6 rounded-[32px] border-2 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
              2
            </span>
            <div>
              <h3 className="text-xs font-black uppercase text-foreground">Drafting Cart & Supplies Selection</h3>
              <p className="text-[10px] text-muted-foreground">Search catalog by Name or SKU to add items into the staging cart</p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
            🛒 {items.length} {items.length === 1 ? 'Item' : 'Items'} Staged
          </span>
        </div>

        <ProductSearchDropdown catalog={catalog || []} onSelect={handleProductSelect} />
        
        {/* STAGED DRAFTING CART TABLE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mt-4">
          {/* Table Header / Summary */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Drafted Supplies</h3>
            <span className="text-xs font-semibold text-slate-500">
              Total Est. Value: <strong className="text-slate-800 dark:text-slate-100 text-sm font-bold">₵ {grandTotalValue.toFixed(2)}</strong>
            </span>
          </div>

          {items.length > 0 ? (
            <>
              {/* Responsive Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-100/50 dark:bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Item / SKU</th>
                      <th className="px-4 py-3">Available SOH</th>
                      <th className="px-4 py-3">Req. Qty</th>
                      <th className="px-4 py-3">Item Justification</th>
                      <th className="px-4 py-3 text-right">Unit Value</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item, idx) => {
                      const lineTotal = item.requestedQty * item.unitPrice;
                      const isExceedingSoh = item.requestedQty > item.soh;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 dark:text-slate-100 uppercase">{item.name}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{item.sku}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-[10px] font-bold border rounded-md ${
                              item.soh === 0
                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                : item.soh <= 15
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {item.soh} IN STOCK
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" 
                              min="1" 
                              value={item.requestedQty}
                              onChange={e => updateItemQuantity(item.itemId, Number(e.target.value))}
                              className={`w-20 px-2 py-1 text-sm border rounded-lg text-center focus:ring-2 focus:ring-indigo-500 outline-none font-bold bg-white dark:bg-slate-950 ${
                                isExceedingSoh ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-slate-300'
                              }`} 
                            />
                            {isExceedingSoh && (
                              <p className="text-[9px] font-bold text-rose-500 mt-0.5">Exceeds SOH!</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text"
                              placeholder="Optional note..."
                              value={item.itemNotes || ''}
                              onChange={e => updateItemNote(item.itemId, e.target.value)}
                              className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-800 rounded-lg w-full bg-white dark:bg-slate-950 text-foreground"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-medium">₵ {item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100 text-xs">₵ {lineTotal.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              type="button"
                              onClick={() => removeItem(item.itemId)} 
                              className="text-slate-400 hover:text-rose-500 transition inline-flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                              <span className="text-xs font-semibold">Remove</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setItems([])}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Clear Draft
                </button>
                <Button 
                  onClick={handleSendRequest}
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Send size={14} />}
                  Submit Requisition
                </Button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase">Your drafting cart is currently empty.</p>
              <p className="text-[10px] text-slate-400">Search for supplies in the search bar above to stage items for this requisition.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
