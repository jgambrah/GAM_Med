'use client';

import React, { useState, useMemo } from 'react';
import { 
  PackagePlus, Package, CheckCircle2, Clock, AlertTriangle, 
  Search, Plus, Minus, Trash2, ArrowRight, ShieldAlert, 
  Truck, Check, Loader2, Sparkles, Building2, Syringe,
  Droplet, Flame, Filter, RefreshCw
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface CatalogItem {
  id: string;
  name: string;
  category: 'IV_FLUIDS' | 'CONSUMABLES' | 'CRASH_CART' | 'DIAGNOSTICS';
  unit: string;
  currentWardStock: number;
  parLevel: number;
  isEmergency?: boolean;
}

interface RequisitionCartItem extends CatalogItem {
  requestedQty: number;
}

interface WardRequisition {
  id: string;
  requisitionNumber: string;
  wardName: string;
  requestedBy: string;
  staffNumber: string;
  priority: 'ROUTINE' | 'URGENT_RESTOCK' | 'STAT_CRASH_CART';
  status: 'SUBMITTED' | 'PHARMACY_APPROVED' | 'DISPATCHED_TO_WARD' | 'RECEIVED_BY_NURSE';
  itemCount: number;
  items: {
    name: string;
    category: string;
    requestedQty: number;
    unit: string;
  }[];
  createdAt: string;
  urgencyReason?: string;
}

const WARD_CATALOG: CatalogItem[] = [
  // IV Fluids
  { id: 'IV-001', name: 'Normal Saline 0.9% (500ml IV Bag)', category: 'IV_FLUIDS', unit: 'Bags', currentWardStock: 4, parLevel: 20 },
  { id: 'IV-002', name: "Ringer's Lactate (500ml IV Bag)", category: 'IV_FLUIDS', unit: 'Bags', currentWardStock: 2, parLevel: 15 },
  { id: 'IV-003', name: 'Dextrose 5% in Water (500ml IV Bag)', category: 'IV_FLUIDS', unit: 'Bags', currentWardStock: 6, parLevel: 10 },
  { id: 'IV-004', name: 'Dextrose 50% (50ml Vial)', category: 'IV_FLUIDS', unit: 'Vials', currentWardStock: 1, parLevel: 5, isEmergency: true },
  
  // Consumables & Line Access
  { id: 'CON-001', name: 'IV Cannula 18G (Green)', category: 'CONSUMABLES', unit: 'Pcs', currentWardStock: 5, parLevel: 25 },
  { id: 'CON-002', name: 'IV Cannula 20G (Pink)', category: 'CONSUMABLES', unit: 'Pcs', currentWardStock: 8, parLevel: 30 },
  { id: 'CON-003', name: 'IV Cannula 22G (Blue)', category: 'CONSUMABLES', unit: 'Pcs', currentWardStock: 3, parLevel: 20 },
  { id: 'CON-004', name: 'IV Infusion Giving Set (Standard 20 drops/ml)', category: 'CONSUMABLES', unit: 'Pcs', currentWardStock: 7, parLevel: 25 },
  { id: 'CON-005', name: 'Luer Lock Syringes 10ml with Needles', category: 'CONSUMABLES', unit: 'Pcs', currentWardStock: 12, parLevel: 50 },
  { id: 'CON-006', name: 'Sterile Gauze Swabs 10x10cm (Pouch of 5)', category: 'CONSUMABLES', unit: 'Pouches', currentWardStock: 10, parLevel: 40 },

  // Crash Cart Emergency Ampoules
  { id: 'EMERG-001', name: 'IV Adrenaline (Epinephrine) 1:1000 1mg/ml', category: 'CRASH_CART', unit: 'Ampoules', currentWardStock: 2, parLevel: 10, isEmergency: true },
  { id: 'EMERG-002', name: 'IV Atropine Sulfate 0.6mg/ml', category: 'CRASH_CART', unit: 'Ampoules', currentWardStock: 1, parLevel: 6, isEmergency: true },
  { id: 'EMERG-003', name: 'IV Hydrocortisone 100mg Powder + Water', category: 'CRASH_CART', unit: 'Vials', currentWardStock: 3, parLevel: 8, isEmergency: true },
  { id: 'EMERG-004', name: 'IV Furosemide 20mg/2ml', category: 'CRASH_CART', unit: 'Ampoules', currentWardStock: 4, parLevel: 10 },

  // Diagnostics & Bedside Strips
  { id: 'DIAG-001', name: 'Blood Glucose Test Strips (Accu-Chek Box of 50)', category: 'DIAGNOSTICS', unit: 'Boxes', currentWardStock: 1, parLevel: 3 },
  { id: 'DIAG-002', name: 'Urine Multistix 10SG Dipsticks (Bottle of 100)', category: 'DIAGNOSTICS', unit: 'Bottles', currentWardStock: 1, parLevel: 2 },
  { id: 'DIAG-003', name: 'EDTA Vacutainer Purple Top Blood Tubes', category: 'DIAGNOSTICS', unit: 'Tubes', currentWardStock: 15, parLevel: 50 },
];

export default function WardRequisitionsDeskPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedWard, setSelectedWard] = useState('Male Medical Ward');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'IV_FLUIDS' | 'CONSUMABLES' | 'CRASH_CART' | 'DIAGNOSTICS'>('ALL');
  const [searchCatalog, setSearchCatalog] = useState('');
  
  // Requisition Basket State
  const [cart, setCart] = useState<RequisitionCartItem[]>([]);
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT_RESTOCK' | 'STAT_CRASH_CART'>('ROUTINE');
  const [urgencyNote, setUrgencyNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // Real-Time Query for Ward Requisitions
  const reqsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/ward_requisitions`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId]);
  const { data: rawReqs, isLoading: areReqsLoading } = useCollection<WardRequisition>(reqsQuery);

  // Mock / Initial Requisitions if empty
  const defaultReqs: WardRequisition[] = useMemo(() => [
    {
      id: 'REQ-2026-0881',
      requisitionNumber: 'REQ/MMW/26/0881',
      wardName: 'Male Medical Ward',
      requestedBy: 'Nurse Ama Takyi',
      staffNumber: 'GAM/STF/26/0003',
      priority: 'URGENT_RESTOCK',
      status: 'DISPATCHED_TO_WARD',
      itemCount: 4,
      items: [
        { name: 'Normal Saline 0.9% (500ml IV Bag)', category: 'IV_FLUIDS', requestedQty: 15, unit: 'Bags' },
        { name: 'IV Cannula 20G (Pink)', category: 'CONSUMABLES', requestedQty: 20, unit: 'Pcs' },
        { name: 'IV Infusion Giving Set', category: 'CONSUMABLES', requestedQty: 15, unit: 'Pcs' },
        { name: 'IV Furosemide 20mg/2ml', category: 'CRASH_CART', requestedQty: 6, unit: 'Ampoules' },
      ],
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      urgencyReason: 'Post-admission surge; only 2 Normal Saline bags remaining in ward stock.'
    },
    {
      id: 'REQ-2026-0879',
      requisitionNumber: 'REQ/ICU/26/0879',
      wardName: 'Intensive Care Unit (ICU)',
      requestedBy: 'Nurse Emmanuel Darko',
      staffNumber: 'GAM/STF/26/0014',
      priority: 'STAT_CRASH_CART',
      status: 'RECEIVED_BY_NURSE',
      itemCount: 2,
      items: [
        { name: 'IV Adrenaline 1:1000 1mg/ml', category: 'CRASH_CART', requestedQty: 8, unit: 'Ampoules' },
        { name: 'IV Atropine 0.6mg/ml', category: 'CRASH_CART', requestedQty: 5, unit: 'Ampoules' },
      ],
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      urgencyReason: 'Crash cart replenishment post-cardiac arrest in Bed 2.'
    }
  ], []);

  const allReqs = useMemo(() => {
    if (rawReqs && rawReqs.length > 0) return rawReqs;
    return defaultReqs;
  }, [rawReqs, defaultReqs]);

  // Catalog Filter
  const filteredCatalog = useMemo(() => {
    return WARD_CATALOG.filter(item => {
      const matchesCat = activeCategory === 'ALL' || item.category === activeCategory;
      const matchesSearch = !searchCatalog || item.name.toLowerCase().includes(searchCatalog.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchCatalog]);

  // Cart Handlers
  const handleAddToCart = (item: CatalogItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, requestedQty: i.requestedQty + 1 } : i);
      }
      return [...prev, { ...item, requestedQty: Math.max(1, item.parLevel - item.currentWardStock) }];
    });
  };

  const handleUpdateQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(i => i.id !== itemId));
    } else {
      setCart(prev => prev.map(i => i.id === itemId ? { ...i, requestedQty: newQty } : i));
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const handleSubmitRequisition = async () => {
    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Requisition Basket Empty",
        description: "Please add at least one item to submit a floor stock requisition.",
      });
      return;
    }

    if (priority !== 'ROUTINE' && !urgencyNote.trim()) {
      toast({
        variant: "destructive",
        title: "Urgency Reason Required",
        description: "Please provide a clinical justification note for Urgent or Stat requests.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const hospitalClean = hospitalId || 'GAM-GAR-7578';
      const reqId = `REQ-${Date.now()}`;
      const reqNumber = `REQ/${selectedWard.slice(0, 3).toUpperCase()}/26/${Math.floor(1000 + Math.random() * 9000)}`;

      const newReqDoc = {
        id: reqId,
        requisitionNumber: reqNumber,
        wardName: selectedWard,
        requestedBy: userProfile?.fullName || 'Staff Nurse',
        staffNumber: userProfile?.staffNumber || user?.uid || 'GAM-STF',
        priority: priority,
        status: 'SUBMITTED',
        itemCount: cart.length,
        items: cart.map(i => ({
          name: i.name,
          category: i.category,
          requestedQty: i.requestedQty,
          unit: i.unit,
        })),
        createdAt: nowIso,
        urgencyReason: urgencyNote.trim() || null,
        timestamp: serverTimestamp(),
      };

      // 1. Write to ward_requisitions collection
      const reqRef = doc(firestore, `hospitals/${hospitalClean}/ward_requisitions`, reqId);
      setDocumentNonBlocking(reqRef, newReqDoc);

      // 2. Also notify Central Pharmacy Queue
      const centralReqRef = collection(firestore, `hospitals/${hospitalClean}/requisitions`);
      addDocumentNonBlocking(centralReqRef, {
        ...newReqDoc,
        type: 'WARD_FLOOR_STOCK_RESTOCK',
        department: 'NURSING_WARD',
      });

      toast({
        title: "Floor Stock Requisition Submitted",
        description: `${reqNumber} sent to Main Pharmacy & Central Stores.`,
      });

      // Clear cart
      setCart([]);
      setUrgencyNote('');
      setPriority('ROUTINE');
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Requisition Submission Failed",
        description: err.message || "Failed to submit ward requisition.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkReceived = async (req: WardRequisition) => {
    try {
      const hospitalClean = hospitalId || 'GAM-GAR-7578';
      const reqRef = doc(firestore, `hospitals/${hospitalClean}/ward_requisitions`, req.id);
      setDocumentNonBlocking(reqRef, {
        status: 'RECEIVED_BY_NURSE',
        receivedBy: userProfile?.fullName || 'Staff Nurse',
        receivedAt: new Date().toISOString(),
      }, { merge: true });

      toast({
        title: "Stock Received & Ward Par Updated",
        description: `Items for ${req.requisitionNumber} transferred into active floor stock.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err.message,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. HERO HEADER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Ward Floor Logistics
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Central Pharmacy & Store Procurement
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
              <PackagePlus className="w-7 h-7 text-indigo-400" />
              Ward Floor Stock & Requisitions Desk
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
              Order IV fluids, line access consumables, and emergency crash cart ampoules directly to your ward
            </p>
          </div>

          {/* Active Ward Selector */}
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-xs font-bold text-slate-400 uppercase font-mono">Ward:</span>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="Male Medical Ward">Male Medical Ward (MMW)</option>
              <option value="Female Surgical Ward">Female Surgical Ward (FSW)</option>
              <option value="Intensive Care Unit">Intensive Care Unit (ICU)</option>
              <option value="Pediatrics Ward">Pediatrics Ward</option>
              <option value="Emergency Department">Emergency & Resus (ER)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE GRID: CATALOG & BASKET */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT 2 COLUMNS: CATALOG PICKER */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Category Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold overflow-x-auto">
              {(['ALL', 'IV_FLUIDS', 'CONSUMABLES', 'CRASH_CART', 'DIAGNOSTICS'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition cursor-pointer text-[11px] ${
                    activeCategory === cat
                      ? 'bg-indigo-600 text-white font-black shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search stock catalog..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Catalog Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredCatalog.map((item) => {
              const inCart = cart.find(c => c.id === item.id);
              const isBelowPar = item.currentWardStock < item.parLevel / 2;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    item.isEmergency
                      ? 'bg-rose-950/10 border-rose-500/30'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                        {item.category.replace('_', ' ')}
                      </span>
                      {item.isEmergency && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Emergency
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-black text-white leading-snug pt-1">{item.name}</h3>
                    
                    {/* Stock Meter */}
                    <div className="flex items-center gap-3 text-[11px] pt-2">
                      <span className="text-slate-400 font-mono">
                        Floor Stock: <strong className={isBelowPar ? 'text-rose-400' : 'text-slate-200'}>{item.currentWardStock} {item.unit}</strong>
                      </span>
                      <span className="text-slate-500 font-mono">
                        Par: <strong>{item.parLevel}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                    {inCart ? (
                      <div className="flex items-center gap-2 bg-slate-950 border border-indigo-500/40 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, inCart.requestedQty - 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold text-indigo-300 px-2">
                          {inCart.requestedQty} {item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, inCart.requestedQty + 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ml-auto cursor-pointer shadow-md shadow-indigo-600/20"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add to Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: REQUISITION CART & DISPATCH */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-tight">Requisition Basket</h2>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                {cart.length} Item(s)
              </span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-1">
                  <PackagePlus className="w-7 h-7 mx-auto text-slate-600 opacity-60" />
                  <p className="text-xs font-bold uppercase">Basket is empty</p>
                  <p className="text-[10px] text-slate-500">Add items from the catalog on the left to create an order.</p>
                </div>
              ) : (
                cart.map((c) => (
                  <div key={c.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-white leading-tight">{c.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{c.requestedQty} {c.unit}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(c.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Priority Selector */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <label className="block text-[10px] font-black text-slate-400 uppercase font-mono">Order Priority</label>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPriority('ROUTINE')}
                  className={`p-2 rounded-lg uppercase tracking-wider transition cursor-pointer border ${
                    priority === 'ROUTINE' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Routine
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('URGENT_RESTOCK')}
                  className={`p-2 rounded-lg uppercase tracking-wider transition cursor-pointer border ${
                    priority === 'URGENT_RESTOCK' ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Urgent
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('STAT_CRASH_CART')}
                  className={`p-2 rounded-lg uppercase tracking-wider transition cursor-pointer border ${
                    priority === 'STAT_CRASH_CART' ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  STAT Crash
                </button>
              </div>

              {priority !== 'ROUTINE' && (
                <div className="space-y-1 pt-1">
                  <label className="block text-[10px] font-bold text-amber-400 uppercase font-mono">Urgency Justification *</label>
                  <input
                    type="text"
                    placeholder="e.g. 0 Normal Saline remaining in ward stock..."
                    value={urgencyNote}
                    onChange={(e) => setUrgencyNote(e.target.value)}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-lg p-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Submit Order Button */}
            <Button
              onClick={handleSubmitRequisition}
              disabled={isSubmitting || cart.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              Submit to Main Pharmacy
            </Button>
          </div>
        </div>
      </div>

      {/* 3. RECENT WARD REQUISITIONS TRACKER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-black text-white uppercase tracking-tight">Active Floor Requisitions Tracker</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-Time Dispatch Feed</span>
        </div>

        <div className="space-y-3">
          {allReqs.map((req) => {
            const isDispatched = req.status === 'DISPATCHED_TO_WARD';
            const isReceived = req.status === 'RECEIVED_BY_NURSE';

            return (
              <div key={req.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-white text-xs">{req.requisitionNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-slate-800 text-indigo-300 border border-slate-700">
                      {req.wardName}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase border ${
                      req.priority === 'STAT_CRASH_CART' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                      req.priority === 'URGENT_RESTOCK' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {req.priority.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Requested by <strong className="text-slate-200">{req.requestedBy}</strong> • {req.itemCount} line items ({req.items.map(i => `${i.name} (x${i.requestedQty})`).join(', ')})
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {isReceived ? (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Stock Received & Verified
                    </span>
                  ) : isDispatched ? (
                    <button
                      type="button"
                      onClick={() => handleMarkReceived(req)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Delivery Received
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 uppercase flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400 animate-spin" /> Processing at Pharmacy
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
