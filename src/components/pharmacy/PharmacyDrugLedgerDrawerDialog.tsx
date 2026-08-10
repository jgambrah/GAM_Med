'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, ArrowDownRight, ArrowUpRight, ShieldCheck, Clock, User, Package } from 'lucide-react';

interface PharmacyDrugLedgerDrawerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  drugItem: {
    id: string;
    name: string;
    genericName?: string;
    strength?: string;
    batchNumber?: string;
    quantity: number;
    price: number;
    expiryDate?: string;
  } | null;
}

export function PharmacyDrugLedgerDrawerDialog({ isOpen, onClose, drugItem }: PharmacyDrugLedgerDrawerDialogProps) {
  if (!drugItem) return null;

  const mockLedgerEvents = [
    {
      id: 'EV-8801',
      date: new Date(Date.now() - 3600 * 1000 * 2).toLocaleString(),
      type: 'DISPENSE',
      qtyChange: -1,
      runningBalance: drugItem.quantity,
      actor: 'Senior Pharmacist (ID: PHARM-8801)',
      refNo: 'ENC-8812 (Benjamin Hedidor)',
      notes: 'ACID Atomic Transaction Dispense Signed & Posted',
    },
    {
      id: 'EV-8794',
      date: new Date(Date.now() - 3600 * 1000 * 24).toLocaleString(),
      type: 'DISPENSE',
      qtyChange: -5,
      runningBalance: drugItem.quantity + 1,
      actor: 'Senior Pharmacist (ID: PHARM-8801)',
      refNo: 'ENC-8794 (Daniel Mensah)',
      notes: 'Routine OPD Fulfillment',
    },
    {
      id: 'EV-8500',
      date: new Date(Date.now() - 3600 * 1000 * 72).toLocaleString(),
      type: 'PROCUREMENT_GRN',
      qtyChange: +500,
      runningBalance: drugItem.quantity + 6,
      actor: 'Supply Chain Officer (ID: SC-402)',
      refNo: 'PO-2026-X99 (Novartis AG)',
      notes: 'Initial Goods Receipt Note (GRN) Initialized',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
              <FileText size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                Drug Inventory Ledger & Audit Trail
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground uppercase">
                Single Source of Truth transaction log for {drugItem.name} {drugItem.strength ? `• ${drugItem.strength}` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* METADATA SUMMARY BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900 text-white rounded-2xl">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Brand / Item</p>
            <p className="text-xs font-black uppercase text-white mt-0.5">{drugItem.name}</p>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Batch Number</p>
            <p className="text-xs font-mono font-bold text-cyan-400 mt-0.5">{drugItem.batchNumber || 'BT-2026-X99'}</p>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Stock</p>
            <p className="text-xs font-black text-emerald-400 mt-0.5">{drugItem.quantity} Units</p>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Price</p>
            <p className="text-xs font-mono font-bold text-white mt-0.5">GHS {drugItem.price.toFixed(2)}</p>
          </div>
        </div>

        {/* TRANSACTION HISTORY TABLE */}
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
            <Clock size={14} className="text-primary" /> Immutable Stock Movement Log
          </h4>

          <div className="bg-card rounded-2xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b">
                  <TableHead className="p-3 text-[9px] font-black uppercase">Timestamp</TableHead>
                  <TableHead className="p-3 text-[9px] font-black uppercase">Event Type</TableHead>
                  <TableHead className="p-3 text-[9px] font-black uppercase text-right">Qty Change</TableHead>
                  <TableHead className="p-3 text-[9px] font-black uppercase text-right">Running Stock</TableHead>
                  <TableHead className="p-3 text-[9px] font-black uppercase">Reference / Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLedgerEvents.map((evt) => (
                  <TableRow key={evt.id} className="hover:bg-muted/40">
                    <TableCell className="p-3 text-[10px] font-mono text-muted-foreground">{evt.date}</TableCell>
                    <TableCell className="p-3">
                      <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        evt.qtyChange < 0
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      }`}>
                        {evt.qtyChange < 0 ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                        {evt.type}
                      </span>
                    </TableCell>
                    <TableCell className={`p-3 text-right font-mono font-black text-xs ${evt.qtyChange < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {evt.qtyChange > 0 ? `+${evt.qtyChange}` : evt.qtyChange}
                    </TableCell>
                    <TableCell className="p-3 text-right font-mono font-bold text-card-foreground text-xs">
                      {evt.runningBalance}
                    </TableCell>
                    <TableCell className="p-3 space-y-0.5">
                      <p className="text-[10px] font-bold uppercase text-card-foreground">{evt.refNo}</p>
                      <p className="text-[9px] text-muted-foreground font-mono">{evt.actor}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" onClick={onClose} className="bg-foreground text-background font-black text-xs uppercase px-6 py-2 rounded-xl">
            Close Ledger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
