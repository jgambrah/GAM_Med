'use client';

import { useState } from 'react';
import { Pill, ShieldCheck, CheckCircle2, AlertTriangle, X, Loader2, Package, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InventoryBatch {
  id: string;
  qty: number;
  expiry: string;
  status: 'EXPIRING_SOON' | 'SAFE' | 'CRITICAL';
}

interface PrescriptionItem {
  id: string;
  patient: string;
  payer: string;
  drugName: string;
  genericEquivalent: string;
  qty: number;
  requiresSubstitution: boolean;
  batches: InventoryBatch[];
}

interface SmartDispensingFefoModalProps {
  prescription?: PrescriptionItem | null;
  isOpen: boolean;
  onClose: () => void;
  hospitalId?: string;
  onSuccess?: () => void;
}

export default function SmartDispensingFefoModal({
  prescription,
  isOpen,
  onClose,
  hospitalId,
  onSuccess,
}: SmartDispensingFefoModalProps) {
  const { toast } = useToast();
  const [isDispensing, setIsDispensing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string>('B-882');
  const [substituted, setSubstituted] = useState<boolean>(false);

  // Mock / Fallback Data matching specification
  const rx: PrescriptionItem = prescription || {
    id: 'RX-2026-08-992',
    patient: 'BENJAMIN HEDIDOR',
    payer: 'NHIS',
    drugName: 'Zinnat (Cefuroxime) 250mg Tabs',
    genericEquivalent: 'Cefuroxime 250mg Tabs',
    qty: 14,
    requiresSubstitution: true, // Flagged because NHIS doesn't cover Zinnat
    batches: [
      { id: 'B-882', qty: 50, expiry: '2026-10-01', status: 'EXPIRING_SOON' },
      { id: 'B-901', qty: 200, expiry: '2027-05-15', status: 'SAFE' },
    ],
  };

  if (!isOpen) return null;

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) {
      toast({
        variant: 'destructive',
        title: 'Batch Selection Required',
        description: 'You must select a specific batch number (FEFO rule) to dispense.',
      });
      return;
    }

    setIsDispensing(true);

    try {
      const response = await fetch('/api/pharmacy/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: hospitalId || 'GAM-GAR-7578',
          encounterId: rx.id,
          patientName: rx.patient,
          items: [
            {
              itemId: selectedBatch,
              name: substituted ? rx.genericEquivalent : rx.drugName,
              qty: rx.qty,
              unitPrice: substituted ? 18.00 : 45.00,
            },
          ],
          pharmacistName: 'Chief Pharmacist',
          paymentMethod: rx.payer,
          batchId: selectedBatch,
          wasSubstituted: substituted,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Dispensing transaction failed.');
      }

      toast({
        title: '⚡ Dispense Successful (FEFO Enforced)',
        description: `Dispensed ${rx.qty} units from Batch ${selectedBatch}. Invoice routed to Cashier.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Dispensing Error',
        description: error.message || 'Dispensing transaction failed.',
      });
    } finally {
      setIsDispensing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-800">
        
        {/* Header */}
        <div className="bg-slate-950 text-white p-6 shrink-0 border-b border-slate-800 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black italic uppercase tracking-wider text-white">
                  DISPENSARY CLEARANCE & FEFO ROUTING
                </h2>
                <p className="text-slate-400 font-mono text-xs mt-0.5">
                  {rx.id} • Patient: <span className="text-indigo-400 font-bold">{rx.patient}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
              PAYER: {rx.payer}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleDispense} className="p-6 flex-1 flex flex-col gap-6">
          
          {/* Feature 2: Smart Formulary Alert & Generic Substitution */}
          {rx.requiresSubstitution && !substituted && (
            <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex gap-4 items-start animate-in zoom-in-95">
              <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-amber-900 dark:text-amber-200 text-xs uppercase tracking-wide">
                  Formulary Mismatch Detected
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium leading-relaxed">
                  The doctor prescribed <strong className="text-amber-950 dark:text-amber-100">{rx.drugName}</strong>, but the patient's payer ({rx.payer}) only reimburses the generic equivalent.
                </p>
                <button 
                  type="button"
                  onClick={() => setSubstituted(true)}
                  className="mt-3 bg-amber-200 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 border border-amber-400 dark:border-amber-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <RefreshCw size={14} /> Substitute with {rx.genericEquivalent}
                </button>
              </div>
            </div>
          )}

          {/* Rx Details */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Drug to Dispense
            </label>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase">
              {substituted ? rx.genericEquivalent : rx.drugName}
            </p>
            <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-1">
              Prescribed Qty: <span className="font-black text-indigo-600 dark:text-indigo-400">{rx.qty} units</span>
            </p>
          </div>

          {/* Feature 1: FEFO Batch Selection */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Select Source Batch (FEFO Enforcement) *
            </label>
            <div className="space-y-2">
              {rx.batches.map((batch) => {
                const isSelected = selectedBatch === batch.id;
                const isExpiringSoon = batch.status === 'EXPIRING_SOON';

                return (
                  <label 
                    key={batch.id} 
                    className={`flex items-center justify-between p-3.5 border rounded-2xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500/30' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="batch" 
                        value={batch.id}
                        checked={isSelected}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <p className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase">
                          Batch: {batch.id}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono font-bold">
                          Available: {batch.qty} units
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                        Expires: {batch.expiry}
                      </p>
                      {isExpiringSoon && (
                        <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest mt-1 inline-block">
                          USE FIRST (FEFO)
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 font-bold text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
            >
              CANCEL
            </button>

            <button 
              type="submit" 
              disabled={isDispensing || !selectedBatch || (rx.requiresSubstitution && !substituted)} 
              className="px-8 py-3 bg-indigo-900 hover:bg-indigo-800 text-white font-black text-xs rounded-xl shadow-xl transition-all uppercase tracking-wider disabled:opacity-50 flex items-center gap-2 cursor-pointer border border-indigo-700"
            >
              {isDispensing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  PROCESSING...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  CONFIRM & DISPENSE
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
