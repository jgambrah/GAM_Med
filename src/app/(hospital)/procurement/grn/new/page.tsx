'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Truck, Save, ArrowLeft, CheckCircle2, 
  ShieldCheck, AlertTriangle, Package, Warehouse,
  Building2, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function ReceiveDeliveryGRNPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedPO, setSelectedPO] = useState('PO-2026-0049');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('INV-TP-4901');
  const [receiverName, setReceiverName] = useState('Kofi Mensah');
  const [deliveryNoteNo, setDeliveryNoteNo] = useState('DN-99042');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState([
    { id: '1', name: 'Ciprofloxacin 500mg Tablets (Pack 100)', qtyOrdered: 200, qtyReceived: 200, batch: 'BTH-2026-CIP-01', expiry: '2028-11-30', unitPrice: 40.00 },
    { id: '2', name: 'Azithromycin 500mg Tablets (Pack 30)', qtyOrdered: 150, qtyReceived: 150, batch: 'BTH-2026-AZI-04', expiry: '2028-08-31', unitPrice: 30.00 },
  ]);

  const totalValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.qtyReceived * item.unitPrice), 0);
  }, [items]);

  const handleSubmitGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate GRN creation and 3-Way Match synchronization
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "🎉 Goods Receipt Note (GRN) Committed!",
        description: `GRN created for ${selectedPO}. Stock balances updated and 3-Way Match pushed to Accounts Payable queue.`
      });
      router.push('/procurement/grn');
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          type="button"
          onClick={() => router.push('/procurement/grn')}
          className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to GRN Registry
        </button>
      </div>

      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-wider text-white">
              Warehouse Goods Intake (GRN)
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              RECEIVE PHYSICAL SUPPLIES, ASSIGN BATCH/EXPIRY DATES, AND GENERATE 3-WAY MATCH BRIDGE FOR ACCOUNTS PAYABLE.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmitGRN} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Purchase Order (Approved)</label>
              <select 
                value={selectedPO} 
                onChange={(e) => setSelectedPO(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-black outline-none"
              >
                <option value="PO-2026-0049">PO-2026-0049 — Tobinco Pharmaceuticals Ltd (₵ 12,500.00)</option>
                <option value="PO-2026-0050">PO-2026-0050 — Multinec Medical Consumables (₵ 28,400.00)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Vendor Tax Invoice Number</label>
              <input 
                type="text" 
                value={vendorInvoiceNo} 
                onChange={(e) => setVendorInvoiceNo(e.target.value)}
                required
                placeholder="e.g. INV-TP-4901"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-black outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Delivery Waybill / Note #</label>
              <input 
                type="text" 
                value={deliveryNoteNo} 
                onChange={(e) => setDeliveryNoteNo(e.target.value)}
                required
                placeholder="e.g. DN-99042"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-black outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400">Store Receiving Officer</label>
              <input 
                type="text" 
                value={receiverName} 
                onChange={(e) => setReceiverName(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black outline-none"
              />
            </div>
          </div>

          {/* Line Items Intake */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-500" />
              <span>Physical Inspection & Batch Assignment</span>
            </h3>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{item.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">Qty Ordered: {item.qtyOrdered}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Qty Received</label>
                      <input 
                        type="number"
                        value={item.qtyReceived}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].qtyReceived = parseInt(e.target.value) || 0;
                          setItems(updated);
                        }}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Assigned Batch #</label>
                      <input 
                        type="text"
                        value={item.batch}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].batch = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Expiry Date</label>
                      <input 
                        type="date"
                        value={item.expiry}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].expiry = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Value Summary */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-400 block">Total Goods Received Value</span>
              <span className="text-xs text-slate-300">Ready to synchronize to Accounts Payable & 3-Way Match</span>
            </div>
            <div className="text-2xl font-mono font-black text-emerald-400">
              ₵ {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>CONFIRM INTAKE & POST GOODS RECEIPT NOTE</span>
          </button>

        </div>
      </form>

    </div>
  );
}
