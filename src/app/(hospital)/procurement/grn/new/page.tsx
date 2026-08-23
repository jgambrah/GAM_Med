'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Truck, Save, ArrowLeft, CheckCircle2, 
  ShieldCheck, AlertTriangle, Package, Warehouse,
  Building2, DollarSign, UploadCloud, FileText,
  MapPin, Check, AlertCircle, Info, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type IntakeItem = {
  id: string;
  name: string;
  sku: string;
  qtyOrdered: number;
  qtyReceived: number;
  batch: string;
  expiry: string;
  binLocation: string;
  unitPrice: number;
  shortageReason?: string;
};

export default function ReceiveDeliveryGRNPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userDocRef);

  const activeUserName = userProfile?.name || user?.displayName || 'Richard Kyei';
  const activeUserRole = userProfile?.role ? userProfile.role.replace(/_/g, ' ') : 'Supply Chain';

  const [selectedPOId, setSelectedPOId] = useState('PO-2026-0049');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('INV-TP-4901');
  const [deliveryNoteNo, setDeliveryNoteNo] = useState('DN-99042');
  const [scannedWaybill, setScannedWaybill] = useState<string | null>('waybill_signed_driver_scan.pdf');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available Purchase Orders for Intake
  const poDatabase: Record<string, { poNumber: string; vendorName: string; totalAmount: number; items: IntakeItem[] }> = {
    'PO-2026-0049': {
      poNumber: 'PO-2026-0049',
      vendorName: 'Tobinco Pharmaceuticals Ltd',
      totalAmount: 12500.00,
      items: [
        { id: '1', name: 'Ciprofloxacin 500mg Tablets (Pack 100)', sku: 'PHA-CIP-01', qtyOrdered: 200, qtyReceived: 200, batch: 'BTH-2026-CIP-01', expiry: '2028-11-30', binLocation: 'SHELF_4B', unitPrice: 40.00 },
        { id: '2', name: 'Azithromycin 500mg Tablets (Pack 30)', sku: 'PHA-AZI-04', qtyOrdered: 150, qtyReceived: 150, batch: 'BTH-2026-AZI-04', expiry: '2028-08-31', binLocation: 'SHELF_4C', unitPrice: 30.00 },
      ]
    },
    'PO-2026-0050': {
      poNumber: 'PO-2026-0050',
      vendorName: 'Multinec Medical Consumables',
      totalAmount: 28400.00,
      items: [
        { id: '3', name: 'Latex Surgical Sterile Gloves Size 7.5 (Box 100)', sku: 'CON-GLV-01', qtyOrdered: 400, qtyReceived: 400, batch: 'BTH-2026-GLV-88', expiry: '2028-12-31', binLocation: 'BULK_RACK_A1', unitPrice: 45.00 },
        { id: '4', name: 'Disposable Syringes 5ml with Needle (Box 100)', sku: 'CON-SYR-02', qtyOrdered: 300, qtyReceived: 300, batch: 'BTH-2026-SYR-12', expiry: '2029-03-31', binLocation: 'THEATRE_BIN_12', unitPrice: 34.66 }
      ]
    }
  };

  const activePO = poDatabase[selectedPOId] || poDatabase['PO-2026-0049'];

  const [items, setItems] = useState<IntakeItem[]>(activePO.items);

  // When PO changes, sync items
  const handlePOChange = (newPOId: string) => {
    setSelectedPOId(newPOId);
    const selected = poDatabase[newPOId];
    if (selected) {
      setItems(selected.items);
    }
  };

  const updateItem = (index: number, field: keyof IntakeItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  // Financial Intake Total
  const totalReceivedValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.qtyReceived * item.unitPrice), 0);
  }, [items]);

  // Check if every row has batch, expiry, and bin location filled
  const isValidationComplete = useMemo(() => {
    return items.every(item => 
      item.batch?.trim().length > 0 && 
      item.expiry?.trim().length > 0 && 
      item.binLocation?.trim().length > 0 &&
      item.qtyReceived > 0
    );
  }, [items]);

  const validatedItemsCount = useMemo(() => {
    return items.filter(item => 
      item.batch?.trim().length > 0 && 
      item.expiry?.trim().length > 0 && 
      item.binLocation?.trim().length > 0 &&
      item.qtyReceived > 0
    ).length;
  }, [items]);

  // Check if there are short shipments
  const hasShortShipments = useMemo(() => {
    return items.some(item => item.qtyReceived < item.qtyOrdered);
  }, [items]);

  const handleSubmitGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidationComplete) {
      toast({
        variant: "destructive",
        title: "Validation Incomplete",
        description: "Every item row must have an assigned Batch #, Expiry Date, and Physical Bin Location."
      });
      return;
    }

    setIsSubmitting(true);
    const grnNumber = `GRN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "🎉 Goods Receipt Note (GRN) Posted Successfully!",
        description: `${grnNumber} committed for ${activePO.vendorName}. Inventory balances updated with Bin tags and 3-Way Match ready in Accounts Payable.`
      });
      router.push('/procurement/grn');
    }, 900);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link 
          href="/procurement/grn"
          className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Goods Receipt Notes Registry
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 1. THE COMMAND BANNER (TOP)                                               */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden space-y-4">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                [INTAKE MODE]
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-sky-500/20 text-sky-300 border border-sky-500/30">
                • 3-WAY MATCH STAGE 2: PHYSICAL INTAKE
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
              Warehouse Goods Intake (GRN)
            </h1>

            <p className="text-xs md:text-sm text-slate-300 font-medium mt-1">
              Receiving <strong className="text-emerald-400 font-mono">{activePO.poNumber}</strong> from <strong className="text-white">{activePO.vendorName}</strong> | Expected: <span className="font-mono font-bold text-white">{activePO.items.length} Items</span> (₵ {activePO.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})
            </p>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-right self-start md:self-auto">
            <span className="text-[9px] font-black uppercase text-slate-400 block font-sans">Receiving Officer</span>
            <span className="text-xs font-bold text-white">
              {activeUserName} <span className="text-emerald-400 font-medium">({activeUserRole})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Intake Form */}
      <form onSubmit={handleSubmitGRN} className="space-y-6">

        {/* ========================================================================= */}
        {/* 2. DIGITAL DOCUMENT ARCHIVING & LOGISTICS PARAMETERS                     */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Warehouse className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
              1. Delivery Waybill, Invoices & Digital Archiving
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Approved PO Selector */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Approved Hospital Purchase Order
              </label>
              <select 
                value={selectedPOId} 
                onChange={(e) => handlePOChange(e.target.value)}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs font-black text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="PO-2026-0049">PO-2026-0049 — Tobinco Pharmaceuticals Ltd (₵ 12,500.00)</option>
                <option value="PO-2026-0050">PO-2026-0050 — Multinec Medical Consumables (₵ 28,400.00)</option>
              </select>
            </div>

            {/* Vendor Tax Invoice */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Vendor Tax Invoice #
              </label>
              <input 
                type="text" 
                value={vendorInvoiceNo} 
                onChange={(e) => setVendorInvoiceNo(e.target.value)}
                required
                placeholder="e.g. INV-TP-4901"
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Delivery Note / Waybill Number */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Delivery Waybill / Note #
              </label>
              <input 
                type="text" 
                value={deliveryNoteNo} 
                onChange={(e) => setDeliveryNoteNo(e.target.value)}
                required
                placeholder="e.g. DN-99042"
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Scanned Waybill Upload Component */}
            <div className="space-y-1.5 sm:col-span-4 pt-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                Upload Scanned Physical Waybill (Signed by Driver & Receiver)
              </label>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      {scannedWaybill ? scannedWaybill : 'No document attached yet'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PDF, PNG, JPEG up to 10MB • Automatically attaches to Chief Accountant 3-Way Match ledger.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {scannedWaybill && (
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Attached
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setScannedWaybill('signed_waybill_scan_' + Date.now().toString().slice(-4) + '.pdf');
                      toast({ title: "Document Attached", description: "Signed Waybill image uploaded to GRN audit archive." });
                    }}
                    className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-black uppercase rounded-xl transition cursor-pointer"
                  >
                    {scannedWaybill ? 'Replace Scan' : 'Upload Scan'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. THE PHYSICAL INSPECTION MATRIX (THE GRID UPGRADE)                      */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
                2. Physical Stock Intake & Spatial Bin Assignment
              </h2>
            </div>
            
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              FEFO Drug Expiry & Cold-Chain Protocol Active
            </span>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => {
              const isMatch = item.qtyReceived === item.qtyOrdered;
              const isShort = item.qtyReceived < item.qtyOrdered;
              const isOver = item.qtyReceived > item.qtyOrdered;

              return (
                <div 
                  key={item.id} 
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    isShort 
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-500/20' 
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  
                  {/* Item Title & Ordered Telemetry */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        SKU: {item.sku} • PO Unit Rate: ₵ {item.unitPrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                        Expected PO Qty: <strong className="text-slate-900 dark:text-white">{item.qtyOrdered}</strong>
                      </span>
                      {isMatch ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Full Delivery
                        </span>
                      ) : isShort ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Shortage (-{item.qtyOrdered - item.qtyReceived})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-700 border border-purple-300">
                          Over-Delivery
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4-Field Input Grid: Qty, Batch, Expiry, Bin Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    
                    {/* Qty Received */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                        Physical Qty Received *
                      </label>
                      <input 
                        type="number"
                        min="0"
                        value={item.qtyReceived}
                        onChange={(e) => updateItem(idx, 'qtyReceived', parseInt(e.target.value) || 0)}
                        className={`w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl font-mono font-bold text-sm outline-none border ${
                          isMatch 
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20' 
                            : isShort 
                            ? 'border-amber-500 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20' 
                            : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                        }`}
                      />
                    </div>

                    {/* Assigned Batch # */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                        Manufacturer Batch # *
                      </label>
                      <input 
                        type="text"
                        value={item.batch}
                        onChange={(e) => updateItem(idx, 'batch', e.target.value)}
                        placeholder="e.g. BTH-2026-CIP-01"
                        required
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                        FEFO Expiry Date *
                      </label>
                      <input 
                        type="date"
                        value={item.expiry}
                        onChange={(e) => updateItem(idx, 'expiry', e.target.value)}
                        required
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Bin Location */}
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-500" /> Storage Bin Location *
                      </label>
                      <select
                        value={item.binLocation}
                        onChange={(e) => updateItem(idx, 'binLocation', e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="COLD_ROOM_A">Cold Room A (2°C - 8°C)</option>
                        <option value="SHELF_4B">Central Pharmacy Shelf 4B</option>
                        <option value="SHELF_4C">Central Pharmacy Shelf 4C</option>
                        <option value="THEATRE_BIN_12">Surgical Theatre Bin 12</option>
                        <option value="BULK_RACK_A1">Bulk Warehouse Rack A1</option>
                        <option value="NARCOTICS_SAFE">Controlled Narcotics Safe</option>
                      </select>
                    </div>

                  </div>

                  {/* Discrepancy Reason Selector (Conditional UI when short) */}
                  {isShort && (
                    <div className="p-3 bg-amber-100/60 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span className="font-bold">Short-Shipment Detected:</span>
                        <span>{item.qtyOrdered - item.qtyReceived} units missing from this delivery note.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[9px] font-black uppercase text-amber-900 dark:text-amber-300 whitespace-nowrap">
                          Shortage Reason:
                        </label>
                        <select
                          value={item.shortageReason || 'BACKORDERED'}
                          onChange={(e) => updateItem(idx, 'shortageReason', e.target.value)}
                          className="p-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 outline-none cursor-pointer"
                        >
                          <option value="BACKORDERED">Supplier Backordered (2nd Delivery Expected)</option>
                          <option value="OUT_OF_STOCK">Supplier Out of Stock (Credit Memo Req.)</option>
                          <option value="DAMAGED">Damaged in Transit / Rejected at Dock</option>
                          <option value="MISSING">Missing from Sealed Outer Crate</option>
                        </select>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 4. DEFENSIVE SUBMISSION FOOTER (INVOICE SUMMARY & GUARD)                  */}
        {/* ========================================================================= */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Total Goods Received Valuation</span>
              <span className="text-xs text-slate-300">Synchronizes instantly to Inventory Ledger #1300 & Accounts Payable #2000</span>
            </div>

            <div className="text-3xl font-mono font-black text-emerald-400">
              <span className="text-sm font-sans text-slate-400 mr-1">GHS</span>
              {totalReceivedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Validation Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              {isValidationComplete ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <span className={isValidationComplete ? 'text-emerald-300 font-bold' : 'text-amber-300 font-medium'}>
                {validatedItemsCount} of {items.length} Items fully certified with Batch #, Expiry Date, and Bin Location.
              </span>
            </div>

            {hasShortShipments && (
              <span className="text-[11px] text-amber-400 font-mono font-bold bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800">
                ⚠️ PO will be flagged as PARTIALLY RECEIVED
              </span>
            )}
          </div>

          {/* Defensive Action Button */}
          <button
            type="submit"
            disabled={!isValidationComplete || isSubmitting}
            className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 ${
              !isValidationComplete || isSubmitting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-900/30'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>POSTING GOODS RECEIPT NOTE & UPDATING STORES...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>CONFIRM INTAKE & POST GOODS RECEIPT NOTE (GRN) &rarr;</span>
              </>
            )}
          </button>

        </div>

      </form>

    </div>
  );
}
