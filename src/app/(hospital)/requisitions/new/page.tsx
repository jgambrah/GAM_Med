'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import { Search, Plus, Trash2, Send, AlertCircle, ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface DraftedItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  unit: string;
  soh: number;
  reqQty: number;
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
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'NURSE', 'DOCTOR', 'PHARMACIST', 'STORE_MANAGER'].includes(userRole || '');

  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [draftedItems, setDraftedItems] = useState<DraftedItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [destinationUnit, setDestinationUnit] = useState('Outpatient Pharmacy');
  const [priorityLevel, setPriorityLevel] = useState('Routine Restock');

  // Query Catalog from Firestore
  const catalogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "product_catalog"));
  }, [firestore, hospitalId]);
  const { data: catalog, isLoading: isCatalogLoading } = useCollection(catalogQuery);

  const catalogItems = useMemo(() => {
    if (!catalog || catalog.length === 0) {
      return [
        { id: '1', name: 'VITA C', sku: 'MED-VIT-647', price: 5.00, unit: 'SACHET', soh: 1250 },
        { id: '2', name: 'NUGEL-O', sku: 'MED-NUG-773', price: 25.00, unit: 'BOTTLE', soh: 495 },
        { id: '3', name: 'AMOXICILLIN 500MG', sku: 'MED-AMO-327', price: 8.00, unit: 'BOX', soh: 604 },
        { id: '4', name: 'EFPAC', sku: 'MED-EFP-382', price: 5.00, unit: 'BOX', soh: 320 },
      ];
    }
    return catalog.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku || `SKU-${p.id.slice(0, 6)}`,
      price: p.purchasePrice || p.price || 15.00,
      unit: p.unit || 'BOX',
      soh: p.stockOnHand ?? p.quantityInStock ?? p.quantity ?? p.currentStock ?? 100,
    }));
  }, [catalog]);

  // Filter catalog based on search
  const filteredCatalog = catalogItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cart Functions
  const handleAddItem = (item: any) => {
    if (!draftedItems.find(draft => draft.id === item.id)) {
      setDraftedItems([...draftedItems, { 
        id: item.id,
        name: item.name,
        sku: item.sku,
        price: item.price,
        unit: item.unit,
        soh: item.soh,
        reqQty: 1 
      }]);
      toast({ title: `Added ${item.name} to draft` });
    } else {
      toast({ variant: 'destructive', title: "Item already in draft" });
    }
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleUpdateQuantity = (id: string, newQty: any) => {
    setDraftedItems(draftedItems.map(item => 
      item.id === id ? { ...item, reqQty: Math.max(1, Number(newQty)) } : item
    ));
  };

  const handleRemoveItem = (id: string) => {
    setDraftedItems(draftedItems.filter(item => item.id !== id));
  };

  const handleClearDraft = () => {
    setDraftedItems([]);
  };

  // Calculate Total Requisition Value
  const totalValue = draftedItems.reduce((sum, item) => sum + (item.price * item.reqQty), 0);

  const handleSendRequest = async () => {
    if (draftedItems.length === 0) {
      toast({ variant: 'destructive', title: "Cannot submit an empty draft." });
      return;
    }
    if (!user || !hospitalId || !firestore) return;
    setLoading(true);

    try {
      await addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/requisitions`), {
        items: draftedItems.map(i => ({
          itemId: i.id,
          name: i.name,
          sku: i.sku,
          unit: i.unit,
          price: i.price,
          soh: i.soh,
          quantityRequested: i.reqQty,
          lineTotal: i.price * i.reqQty
        })),
        requestingDept: destinationUnit,
        destinationDept: destinationUnit,
        priorityLevel: priorityLevel,
        totalValue: totalValue,
        requestedBy: user.uid,
        requestedByName: user.displayName || 'Pharmacist Staff',
        hospitalId: hospitalId,
        status: 'PENDING',
        createdAt: serverTimestamp()
      });

      toast({ 
        title: "✅ Requisition Submitted Successfully!", 
        description: `Submitted ${draftedItems.length} items valued at ₵ ${totalValue.toFixed(2)} for ${destinationUnit}.` 
      });
      setDraftedItems([]);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Submission Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  if (pageIsLoading) {
    return <div className="flex h-full w-full items-center justify-center p-20"><Loader2 className="h-16 w-16 animate-spin text-primary"/></div>;
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
    <div className="max-w-6xl mx-auto space-y-6 p-8 text-foreground">
      
      {/* 1. DARK HERO BANNER & CONTEXT */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-md space-y-5">
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
            <span className="px-3 py-1 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
              Destination / Requesting Unit
            </label>
            <select 
              value={destinationUnit}
              onChange={(e) => setDestinationUnit(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
            >
              <option>Outpatient Pharmacy</option>
              <option>Main Pharmacy</option>
              <option>ICU Ward</option>
              <option>Maternity Ward</option>
              <option>Emergency Department</option>
              <option>Operating Theatre</option>
              <option>Pediatrics Ward</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
              Priority Level
            </label>
            <select 
              value={priorityLevel}
              onChange={(e) => setPriorityLevel(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-slate-900 border rounded-lg outline-none font-bold focus:ring-2 ${
                priorityLevel === 'STAT / Urgent' ? 'border-rose-500/50 text-rose-400 focus:ring-rose-500' : 'border-slate-700 text-slate-200 focus:ring-indigo-500'
              }`}
            >
              <option>Routine Restock</option>
              <option>STAT / Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & ADD SECTION */}
      <div className="relative z-20">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search Catalog (Name or SKU)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-foreground focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-sm font-bold placeholder:font-normal"
          />
        </div>

        {/* Search Dropdown Results */}
        {isDropdownOpen && searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-80 overflow-y-auto z-50">
            {filteredCatalog.length > 0 ? (
              filteredCatalog.map(item => (
                <div 
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground uppercase">{item.name}</h4>
                      <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">{item.sku}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="block text-xs font-bold text-foreground">SOH: {item.soh}</span>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Available</span>
                    </div>
                    <div className="text-right w-24">
                      <span className="block text-sm font-bold text-foreground">₵ {item.price.toFixed(2)}</span>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">PER {item.unit}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm font-bold">
                No catalog items found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. DRAFTED ITEMS TABLE (CART) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden z-10 relative">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
          <h3 className="text-sm font-bold text-foreground">Drafted Supplies ({draftedItems.length})</h3>
          <span className="text-xs font-semibold text-slate-500">
            Total Est. Value: <strong className="text-foreground text-sm ml-1">₵ {totalValue.toFixed(2)}</strong>
          </span>
        </div>

        {draftedItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center">
            <AlertCircle className="w-8 h-8 mb-3 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold">Your requisition draft is empty.</p>
            <p className="text-xs mt-1">Search the catalog above to add supplies.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100/50 dark:bg-slate-900/50 text-[10px] uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Item / SKU</th>
                  <th className="px-4 py-3">Available SOH</th>
                  <th className="px-4 py-3">Req. Qty</th>
                  <th className="px-4 py-3 text-right">Unit Value</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {draftedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-foreground uppercase">{item.name}</div>
                      <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-[10px] font-bold border rounded-md uppercase ${
                        item.soh > 50 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                      }`}>
                        {item.soh} {item.unit} IN STOCK
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number" 
                        min="1"
                        max={item.soh}
                        value={item.reqQty}
                        onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                        className="w-20 px-2 py-1 text-sm border border-slate-300 dark:border-slate-700 rounded-lg text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-950" 
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-medium">₵ {item.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground text-xs">
                      ₵ {(item.price * item.reqQty).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Footer */}
        {draftedItems.length > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button 
              onClick={handleClearDraft}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Clear Draft
            </button>
            <button 
              onClick={handleSendRequest}
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Requisition
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
