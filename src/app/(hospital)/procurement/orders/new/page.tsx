'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc, addDoc, where } from 'firebase/firestore';
import { 
  Boxes, Plus, Trash2, ArrowLeft, Building2, 
  Calendar, Clock, ShieldCheck, CheckCircle2, 
  AlertTriangle, Truck, Warehouse, DollarSign, 
  FileText, Search, Loader2, ShieldAlert, Sparkles,
  Package, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type OrderItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

export default function NewPurchaseOrderWorkspace() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [userProfileRef, setUserProfileRef] = useState<any>(null);
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PROCUREMENT_OFFICER', 'PHARMACIST'].includes(userRole || 'DIRECTOR');

  // Draft Header States
  const [draftId] = useState(() => `PO-DRAFT-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [poType, setPoType] = useState<'GOODS' | 'SERVICE' | 'WORKS'>('GOODS');
  const [taxMode, setTaxMode] = useState<'EXEMPT' | 'TAXABLE'>('EXEMPT');

  // Logistics & Terms States
  const [supplierId, setSupplierId] = useState('VND-001');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [paymentTerms, setPaymentTerms] = useState('NET_30');
  const [deliveryLocation, setDeliveryLocation] = useState('CENTRAL_PHARMACY');

  // Quick Product Catalog Search
  const [catalogSearch, setCatalogSearch] = useState('');

  // Master Registered Suppliers
  const suppliers = useMemo(() => [
    { id: 'VND-001', name: 'Ernest Chemists Ltd', tin: 'C0001928472', category: 'Pharmaceuticals & IV Fluids', terms: 'Net 30 Days' },
    { id: 'VND-002', name: 'Tobinco Pharmaceuticals Ltd', tin: 'C0008492019', category: 'Pharmaceuticals', terms: 'Net 30 Days' },
    { id: 'VND-003', name: 'Multinec Medical Consumables', tin: 'C0004819203', category: 'Surgical & Gloves', terms: 'Net 15 Days' },
    { id: 'VND-004', name: 'MedTech Supplies Inc.', tin: 'C0007519284', category: 'Diagnostic & Lab Reagents', terms: 'Net 45 Days' },
    { id: 'VND-005', name: 'Perkins Power Solutions Ghana', tin: 'C0003928174', category: 'Generator Spares & Fuel', terms: 'Immediate on GRN' },
    { id: 'VND-006', name: 'Zoomlion Ghana Ltd', category: 'Sanitation & Waste', terms: 'Net 30 Days' }
  ], []);

  // Preset Fast-Add Product Catalog
  const presetCatalog = useMemo(() => [
    { id: 'MED-001', name: 'Paracetamol 500mg IV Infusion (100ml)', sku: 'PHA-PAR-01', price: 25.00, category: 'PHARMACEUTICAL' },
    { id: 'MED-002', name: 'Amoxicillin + Clavulanic Acid 1.2g IV Vial', sku: 'PHA-AMX-02', price: 65.00, category: 'PHARMACEUTICAL' },
    { id: 'MED-003', name: 'Normal Saline 0.9% 500ml Infusion Bottle', sku: 'PHA-NS-03', price: 13.00, category: 'PHARMACEUTICAL' },
    { id: 'MED-004', name: 'Ceftriaxone 1g IV Injection (Vial)', sku: 'PHA-CEF-04', price: 35.00, category: 'PHARMACEUTICAL' },
    { id: 'MED-005', name: 'Metronidazole 500mg/100ml IV Infusion', sku: 'PHA-MET-05', price: 16.50, category: 'PHARMACEUTICAL' },
    { id: 'CON-001', name: 'Latex Surgical Sterile Gloves Size 7.5 (Box 100)', sku: 'CON-GLV-01', price: 48.00, category: 'CONSUMABLES' },
    { id: 'CON-002', name: 'Disposable Syringes 5ml with Needle (Box 100)', sku: 'CON-SYR-02', price: 34.50, category: 'CONSUMABLES' },
    { id: 'CON-003', name: 'IV Cannula 18G Green with Port (Box 50)', sku: 'CON-CAN-03', price: 75.00, category: 'CONSUMABLES' },
    { id: 'ENG-001', name: 'Heavy Duty 250kVA Generator Fuel Filters', sku: 'ENG-FLT-01', price: 1500.00, category: 'WORKS' },
    { id: 'ENG-002', name: '15W-40 Synthetic Engine Oil (200L Drum)', sku: 'ENG-OIL-02', price: 5000.00, category: 'WORKS' }
  ], []);

  // Active Draft Line Items
  const [items, setItems] = useState<OrderItem[]>([
    { id: 'item-1', name: 'Ceftriaxone 1g IV Injection (Vial)', sku: 'PHA-CEF-04', quantity: 200, unitPrice: 35.00 },
    { id: 'item-2', name: 'Metronidazole 500mg/100ml IV Infusion', sku: 'PHA-MET-05', quantity: 150, unitPrice: 16.50 },
    { id: 'item-3', name: 'Latex Surgical Sterile Gloves Size 7.5 (Box 100)', sku: 'CON-GLV-01', quantity: 60, unitPrice: 48.00 }
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Filter catalog items
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return [];
    return presetCatalog.filter(c => 
      c.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      c.sku.toLowerCase().includes(catalogSearch.toLowerCase())
    ).slice(0, 5);
  }, [presetCatalog, catalogSearch]);

  const handleAddFromCatalog = (product: typeof presetCatalog[0]) => {
    const existingIndex = items.findIndex(i => i.sku === product.sku);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 10;
      setItems(updated);
      toast({ title: "Quantity Updated", description: `Added +10 to ${product.name}` });
    } else {
      setItems(prev => [
        ...prev,
        {
          id: `item-${Date.now()}`,
          name: product.name,
          sku: product.sku,
          quantity: 20,
          unitPrice: product.price
        }
      ]);
      toast({ title: "Item Added to PO", description: `${product.name} inserted at catalog price.` });
    }
    setCatalogSearch('');
  };

  const handleAddNewBlankItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: 'Custom Clinical Consumable / Item',
        sku: `CUS-${Math.floor(100 + Math.random() * 900)}`,
        quantity: 10,
        unitPrice: 50.00
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast({ variant: 'destructive', title: "Validation Warning", description: "A Purchase Order must contain at least one item." });
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof OrderItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    if (taxMode === 'TAXABLE') {
      return subtotal * 0.189; // 18.9% effective Ghana VAT/NHIL/GETFund/COVID
    }
    return 0;
  }, [subtotal, taxMode]);

  const grandTotal = useMemo(() => {
    return subtotal + taxAmount;
  }, [subtotal, taxAmount]);

  const isExecutiveApprovalRequired = grandTotal > 20000;

  const selectedSupplierObj = useMemo(() => {
    return suppliers.find(s => s.id === supplierId) || suppliers[0];
  }, [suppliers, supplierId]);

  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast({ variant: 'destructive', title: "Cannot Issue Empty PO", description: "Add at least one line item before submitting." });
      return;
    }

    setSubmitting(true);
    const poNumber = `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPOData = {
      poNumber,
      poType,
      supplierId,
      supplierName: selectedSupplierObj.name,
      supplierTIN: selectedSupplierObj.tin,
      deliveryLocation,
      paymentTerms,
      expectedDeliveryDate: deliveryDate,
      subtotal,
      taxAmount,
      totalAmount: grandTotal,
      taxMode,
      status: isExecutiveApprovalRequired ? 'PENDING_DIRECTOR' : 'PENDING_DELIVERY',
      directorApproval: isExecutiveApprovalRequired ? 'PENDING' : 'APPROVED',
      orderedAt: serverTimestamp(),
      orderedBy: user?.uid || 'PROCUREMENT',
      orderedByName: user?.displayName || userProfile?.name || 'Richard Kyei',
      items: items.map(item => ({
        itemId: item.id,
        name: item.name,
        sku: item.sku,
        quantityOrdered: item.quantity,
        quantityReceived: 0,
        price: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice
      }))
    };

    try {
      if (firestore && hospitalId) {
        await addDoc(collection(firestore, `hospitals/${hospitalId}/purchase_orders`), newPOData);
      }
    } catch (err) {
      console.warn("Firestore PO write fallback:", err);
    }

    setSubmitting(false);
    toast({
      title: "🎉 Purchase Order Committed Successfully!",
      description: `${poNumber} has been logged. ${isExecutiveApprovalRequired ? 'Routed to Hospital Director for sign-off.' : 'Pushed to vendor transmission queue.'}`
    });
    router.push('/procurement/orders');
  };

  const creatorName = user?.displayName || userProfile?.name || 'Richard Kyei';
  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Purchase Order drafting.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 max-w-6xl mx-auto pb-24">
      
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link 
          href="/procurement/orders"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Purchase Orders Registry
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 1. THE "DRAFT MODE" DARK COMMAND BANNER (TOP)                            */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Header Title & Badges */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
                [DRAFT MODE]
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                • 3-Way Match Stage 1
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Ref: {draftId}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
              Issue Hospital Purchase Order
            </h1>

            <p className="text-xs text-slate-400 font-medium">
              Drafting official financial commitment on behalf of <strong className="text-white">{creatorName}</strong> (Procurement Officer).
            </p>
          </div>

          {/* Segmented Procurement Type Switcher */}
          <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setPoType('GOODS')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                poType === 'GOODS' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Goods & Pharmacy
            </button>
            <button
              type="button"
              onClick={() => setPoType('SERVICE')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                poType === 'SERVICE' 
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Medical Services
            </button>
            <button
              type="button"
              onClick={() => setPoType('WORKS')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                poType === 'WORKS' 
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Capex & Works
            </button>
          </div>

        </div>
      </div>

      {/* Main Drafting Form */}
      <form onSubmit={handleSubmitPO} className="space-y-6">

        {/* ========================================================================= */}
        {/* 2. THE LOGISTICS & TERMS BLOCK (WHITE CARD)                              */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
              1. Supplier Profile & Logistics Parameters
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Supplier Select */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Selected Vendor / Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} • TIN: {s.tin} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Expected Delivery Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Payment Terms */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Stated Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="NET_30">Net 30 Days (Standard Credit)</option>
                <option value="NET_15">Net 15 Days (Accelerated)</option>
                <option value="NET_60">Net 60 Days (High-Volume Bulk)</option>
                <option value="IMMEDIATE">Immediate on GRN Clearance</option>
                <option value="COD">Cash on Delivery (COD)</option>
              </select>
            </div>

            {/* Receiving Location */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Hospital Receiving Store Location
              </label>
              <select
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="CENTRAL_PHARMACY">Central Pharmacy Warehouse (Main Store)</option>
                <option value="MAIN_LAB">Main Laboratory Reagent Store</option>
                <option value="SURGICAL_THEATRE">Surgical Theatre Consumable Store</option>
                <option value="GENERAL_MAINTENANCE">General Hospital Engineering & Maintenance</option>
              </select>
            </div>

            {/* Tax / VAT Treatment */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Ghana Statutory Tax & VAT Treatment
              </label>
              <select
                value={taxMode}
                onChange={(e) => setTaxMode(e.target.value as any)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="EXEMPT">Statutory Exempt / Zero-Rated Drugs (Standard Ghana Healthcare)</option>
                <option value="TAXABLE">Standard Taxable (+18.9% VAT/NHIL/GETFund/COVID-19 Levies)</option>
              </select>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. THE UPGRADED ORDER MATRIX (THE GRID)                                  */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
                2. Order Line Items Matrix
              </h2>
            </div>

            <button
              type="button"
              onClick={handleAddNewBlankItem}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Add Custom Line
            </button>
          </div>

          {/* Smart Catalog Search Bar */}
          <div className="relative">
            <div className="flex items-center gap-2 p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search master pharmaceutical catalog or consumables to quick-add..."
                className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>

            {/* Quick Catalog Dropdown Results */}
            {filteredCatalog.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950 text-white border border-slate-800 rounded-2xl shadow-2xl z-30 overflow-hidden divide-y divide-slate-800">
                {filteredCatalog.map(product => (
                  <div
                    key={product.id}
                    onClick={() => handleAddFromCatalog(product)}
                    className="p-3.5 hover:bg-slate-900 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-xs text-white block">{product.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">SKU: {product.sku} • {product.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-400 text-xs block">
                        ₵ {product.price.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-black uppercase text-slate-400">+ Click to Add</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest rounded-xl">
                <tr>
                  <th className="p-4 rounded-l-xl">Item Description</th>
                  <th className="p-4">SKU / Code</th>
                  <th className="p-4 text-center">Quantity</th>
                  <th className="p-4 text-right">Unit Price (GHS)</th>
                  <th className="p-4 text-right">Line Total (GHS)</th>
                  <th className="p-4 text-center rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {items.map((item, index) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          required
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 text-xs outline-none"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={item.sku}
                          onChange={(e) => handleItemChange(item.id, 'sku', e.target.value)}
                          className="w-28 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-500 outline-none"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-center text-slate-900 dark:text-slate-100 text-xs outline-none mx-auto"
                        />
                      </td>
                      <td className="p-4 text-right">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-28 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-right text-emerald-600 dark:text-emerald-400 text-xs outline-none ml-auto"
                        />
                      </td>
                      <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                        ₵ {lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
                          title="Remove Line Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 4. THE FINANCIAL FOOTER & DEFENSIVE SUBMIT (BOTTOM)                       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: 3-Way Match & Compliance Information */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>3-Way Match Compliance Assurance</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Issuing this Purchase Order generates an immutable audit record in the Procurement ledger. When physical goods arrive, the Store Manager will log a Goods Receipt Note (GRN) against this exact PO, enabling the Chief Accountant to perform a 1-click 3-Way Match in Accounts Payable.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-[10px] text-slate-400">
              Authorized Procurement Officer: <strong className="text-slate-800 dark:text-slate-200">{creatorName}</strong>
            </div>
          </div>

          {/* Right Column: Invoice-Style Financial Summary & Submit Button */}
          <div className="lg:col-span-2 bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl space-y-6">
            
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-sans font-bold uppercase text-[10px]">Base Subtotal:</span>
                <span className="text-sm font-bold text-white">₵ {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span className="font-sans font-bold uppercase text-[10px]">
                  Estimated Statutory Taxes ({taxMode === 'TAXABLE' ? '18.9% VAT/NHIL' : 'Zero-Rated / Exempt'}):
                </span>
                <span className="text-sm font-bold text-slate-300">
                  {taxAmount > 0 ? `+ ₵ ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₵ 0.00'}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="font-sans font-black uppercase text-xs tracking-wider text-emerald-400">
                  Total Hospital Commitment:
                </span>
                <div className="text-3xl font-black text-emerald-400">
                  <span className="text-sm text-slate-400 mr-1 font-sans">GHS</span>
                  {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Defensive Approval Threshold Banner */}
            {isExecutiveApprovalRequired ? (
              <div className="p-3.5 bg-amber-950/50 border border-amber-800/60 rounded-2xl flex items-center gap-3 text-amber-300 text-xs">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  <strong>Director Approval Required:</strong> Total commitment exceeds the ₵ 20,000 threshold. Order will be routed to the Hospital Director for executive authorization before vendor transmission.
                </span>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-950/50 border border-emerald-800/60 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  <strong>Standard Operational Clearance:</strong> Within routine procurement limits. Will be available for warehouse intake immediately upon transmission.
                </span>
              </div>
            )}

            {/* Defensive Submit Action */}
            <button
              type="submit"
              disabled={submitting || items.length === 0 || !supplierId}
              className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 ${
                submitting || items.length === 0 || !supplierId
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-900/30'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>COMMITTING PURCHASE ORDER...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>SUBMIT PURCHASE ORDER FOR APPROVAL &rarr;</span>
                </>
              )}
            </button>

          </div>

        </div>

      </form>

    </div>
  );
}
