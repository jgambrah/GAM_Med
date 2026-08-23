'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Truck, FileCheck2, ShieldCheck, CheckCircle2, 
  Clock, Plus, Search, Filter, Warehouse, 
  ArrowUpRight, AlertTriangle, Building2, Package, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';

export default function GoodsReceiptNotesListPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGRN, setSelectedGRN] = useState<any | null>(null);

  const demoGRNs = useMemo(() => [
    {
      id: 'GRN-EC-9912',
      grnNumber: 'GRN-2026-9912',
      poNumber: 'PO-2026-0048',
      vendorName: 'Ernest Chemists Ltd',
      deliveryDate: '2026-08-22',
      receivedBy: 'Kofi Mensah (Store Manager)',
      invoiceNumber: 'INV-EC-9912',
      totalValue: 45000.00,
      matchStatus: '3_WAY_MATCH_READY',
      qcStatus: 'PASSED',
      items: [
        { name: 'Paracetamol 500mg IV Infusion (100ml)', qtyOrdered: 500, qtyReceived: 500, batch: 'BTH-2026-08', expiry: '2028-06-30', unitPrice: 25.00 },
        { name: 'Amoxicillin + Clavulanic Acid 1.2g IV', qtyOrdered: 300, qtyReceived: 300, batch: 'BTH-2026-09', expiry: '2027-12-31', unitPrice: 65.00 },
        { name: 'Normal Saline 0.9% 500ml', qtyOrdered: 1000, qtyReceived: 1000, batch: 'BTH-2026-10', expiry: '2028-09-30', unitPrice: 13.00 }
      ]
    },
    {
      id: 'GRN-PP-9913',
      grnNumber: 'GRN-2026-9913',
      poNumber: 'PO-2026-0051',
      vendorName: 'Perkins Power Solutions Ghana',
      deliveryDate: '2026-08-21',
      receivedBy: 'Kofi Mensah (Store Manager)',
      invoiceNumber: 'INV-PP-0814',
      totalValue: 14000.00,
      matchStatus: '3_WAY_MATCH_READY',
      qcStatus: 'PASSED',
      items: [
        { name: 'Heavy Duty 250kVA Generator Fuel Filters', qtyOrdered: 6, qtyReceived: 6, batch: 'ENG-2026-11', expiry: '2030-01-01', unitPrice: 1500.00 },
        { name: '15W-40 Synthetic Engine Oil (200L Drum)', qtyOrdered: 1, qtyReceived: 1, batch: 'OIL-2026-01', expiry: '2029-05-31', unitPrice: 5000.00 }
      ]
    },
    {
      id: 'GRN-TP-9914',
      grnNumber: 'GRN-2026-9914',
      poNumber: 'PO-2026-0049',
      vendorName: 'Tobinco Pharmaceuticals Ltd',
      deliveryDate: '2026-08-23',
      receivedBy: 'Awaiting Truck Arrival',
      invoiceNumber: 'INV-TP-PENDING',
      totalValue: 12500.00,
      matchStatus: 'AWAITING_PHYSICAL_INTAKE',
      qcStatus: 'PENDING_INSPECTION',
      items: [
        { name: 'Ciprofloxacin 500mg Tablets (Pack 100)', qtyOrdered: 200, qtyReceived: 0, batch: 'TBD', expiry: 'TBD', unitPrice: 40.00 },
        { name: 'Azithromycin 500mg Tablets (Pack 30)', qtyOrdered: 150, qtyReceived: 0, batch: 'TBD', expiry: 'TBD', unitPrice: 30.00 }
      ]
    }
  ], []);

  const filteredGRNs = useMemo(() => {
    return demoGRNs.filter(g => 
      g.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.poNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [demoGRNs, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <FileCheck2 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black italic uppercase tracking-wider text-white">
                Goods Receipt Notes (GRN) Registry
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              PHYSICAL WAREHOUSE INTAKE RECORDS, QUALITY ASSURANCE SIGN-OFF, AND 3-WAY MATCH BRIDGE FOR ACCOUNTS PAYABLE.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/procurement/grn/new')}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer whitespace-nowrap self-start md:self-auto"
          >
            <Truck className="w-4 h-4" /> RECEIVE NEW DELIVERY
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Search className="w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by GRN #, PO #, or Supplier Name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
            <tr>
              <th className="p-4">GRN Number & PO Ref</th>
              <th className="p-4">Supplier / Vendor</th>
              <th className="p-4">Delivery Date</th>
              <th className="p-4">Store Receiver</th>
              <th className="p-4 text-right">Intake Value (GHS)</th>
              <th className="p-4 text-center">3-Way Match Status</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {filteredGRNs.map(grn => (
              <tr key={grn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-4">
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 block">{grn.grnNumber}</span>
                  <span className="text-[10px] text-slate-400 font-mono">PO: {grn.poNumber}</span>
                </td>
                <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                  {grn.vendorName}
                </td>
                <td className="p-4 text-slate-500 font-mono">
                  {grn.deliveryDate}
                </td>
                <td className="p-4 text-slate-600 dark:text-slate-400">
                  {grn.receivedBy}
                </td>
                <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                  ₵ {grn.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                    grn.matchStatus === '3_WAY_MATCH_READY'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {grn.matchStatus === '3_WAY_MATCH_READY' ? <ShieldCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {grn.matchStatus.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    type="button"
                    onClick={() => setSelectedGRN(grn)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-[10px] uppercase rounded-lg transition-all border border-slate-700 cursor-pointer flex items-center gap-1 mx-auto"
                  >
                    <Eye className="w-3 h-3" /> INSPECT
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* GRN Inspection Modal */}
      {selectedGRN && (
        <Dialog open={!!selectedGRN} onOpenChange={() => setSelectedGRN(null)}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <span>Goods Receipt Note Inspection ({selectedGRN.grnNumber})</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Verified delivery against Purchase Order {selectedGRN.poNumber}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Supplier:</span><span className="font-bold">{selectedGRN.vendorName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Delivery Date:</span><span className="font-mono">{selectedGRN.deliveryDate}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Receiver:</span><span>{selectedGRN.receivedBy}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Quality Inspection (QC):</span><span className="text-emerald-400 font-bold">{selectedGRN.qcStatus}</span></div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[8px]">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-center">Batch / Exp</th>
                      <th className="p-2.5 text-right">Qty Received</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {selectedGRN.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-sans font-medium text-slate-200">{item.name}</td>
                        <td className="p-2.5 text-center text-[10px] text-slate-400">{item.batch} ({item.expiry})</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">{item.qtyReceived}</td>
                        <td className="p-2.5 text-right font-bold">₵ {(item.qtyReceived * item.unitPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Total Intaken Value:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  ₵ {selectedGRN.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setSelectedGRN(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
                Close Inspection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
