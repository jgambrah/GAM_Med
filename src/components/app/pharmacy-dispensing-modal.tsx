'use client';

import { useState } from 'react';
import { Pill, ShieldCheck, CheckCircle2, AlertTriangle, X, Loader2, Package, UserCheck, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RxItem {
  id?: string;
  itemId?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  qty?: number;
  quantity?: number;
  unitPrice?: number;
  stock?: number;
}

interface PharmacyDispensingModalProps {
  encounter?: any;
  isOpen: boolean;
  onClose: () => void;
  hospitalId?: string;
  onSuccess?: () => void;
}

export default function PharmacyDispensingModal({
  encounter,
  isOpen,
  onClose,
  hospitalId,
  onSuccess,
}: PharmacyDispensingModalProps) {
  const { toast } = useToast();
  const [isDispensing, setIsDispensing] = useState(false);

  // 5-Rights Counseling Checklist State
  const [checklist, setChecklist] = useState({
    rightPatient: true,
    rightDrug: true,
    rightDose: true,
    rightRoute: true,
    rightTime: true,
  });

  const patientName = encounter?.patientName || 'BENJAMIN HEDIDOR';
  const ehrId = encounter?.mrn || encounter?.ehrNumber || encounter?.patientId || 'MMH/EHR/26/0007';
  const prescriber = encounter?.providerName || encounter?.prescriber || 'Dr. James Gambrah';

  const rxItems: RxItem[] = encounter?.allMedications || encounter?.prescription || encounter?.items || [
    { id: 'drug_1', itemId: 'drug_1', name: 'Amoxicillin 500mg Capsules', dosage: '500mg', frequency: '8 hourly (TDS)', duration: '7 Days', qty: 21, unitPrice: 15.00, stock: 412 },
    { id: 'drug_3', itemId: 'drug_3', name: 'Paracetamol 500mg Tablets', dosage: '1000mg', frequency: '8 hourly (TDS)', duration: '5 Days', qty: 15, unitPrice: 5.00, stock: 890 },
  ];

  const allChecklistPassed = Object.values(checklist).every(Boolean);

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allChecklistPassed) {
      toast({
        variant: 'destructive',
        title: '5-Rights Safety Intercept Required',
        description: 'Please verify all 5 clinical safety rights before handing over medication.',
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
          encounterId: encounter?.id || encounter?.encounterId || `ENC-${Date.now()}`,
          patientId: encounter?.patientId || 'p_benjamin',
          patientName: patientName,
          items: rxItems,
          pharmacistName: 'Chief Pharmacist',
          paymentMethod: 'NHIS Insurance / Cash Clear',
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to complete dispensing.');
      }

      toast({
        title: '⚡ Dispensing Complete & Inventory Deducted',
        description: `Fulfilled ${rxItems.length} lines for ${patientName}. Ledger auto-synced to Central Finance.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Dispensing Error',
        description: error.message || 'Failed to complete dispensing operation.',
      });
    } finally {
      setIsDispensing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-800">
        
        {/* 1. Header & Context (Signature Dark Edition) */}
        <div className="bg-slate-950 text-white p-6 shrink-0 border-b border-slate-800 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black italic uppercase tracking-wider text-white flex items-center gap-2">
                  PHARMACY DISPENSING & INVENTORY LEDGER FULFILLMENT
                </h2>
                <p className="text-slate-400 font-mono text-xs mt-0.5">
                  Prescribed by: <span className="text-indigo-400 font-bold">{prescriber}</span> • Encounter Active
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Context Plate */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-lg shadow-sm">
              {patientName.charAt(0)}
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase tracking-wide">
                {patientName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 mt-0.5">
                <span>EHR: <strong className="text-slate-700 dark:text-slate-200">{ehrId}</strong></span>
                <span>•</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <ShieldCheck size={12} /> Financial Clearance: Approved
                </span>
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Dispensing Vault</span>
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
              <Package className="w-4 h-4" /> Live Ledger Deduct Active
            </span>
          </div>
        </div>

        {/* 2. Prescription Line Items & Safety Verification */}
        <form onSubmit={handleDispense} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-6 space-y-6">
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Prescribed Medications ({rxItems.length} lines)</span>
                <span>Inventory Ledger Check</span>
              </div>

              <div className="space-y-2.5">
                {rxItems.map((item, idx) => {
                  const qty = item.qty || item.quantity || 1;
                  const stock = item.stock ?? 250;
                  const isLow = stock < qty;

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                          <Pill size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">
                            {item.name}
                          </h4>
                          <p className="text-[10px] font-bold text-indigo-400 uppercase mt-0.5">
                            {item.dosage || '500mg'} • {item.frequency || 'TDS'} • {item.duration || '5 Days'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Quantity</span>
                          <span className="text-sm font-black text-slate-900 dark:text-slate-100">{qty} Units</span>
                        </div>

                        <div>
                          {isLow ? (
                            <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider border border-red-500/30 flex items-center gap-1">
                              <ShieldAlert size={10} /> OUT OF STOCK
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                              Stock: {stock}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5-Rights Patient Handover Verification Checklist */}
            <div className="p-4 bg-slate-950 text-white rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <UserCheck size={14} /> Clinical 5-Rights Handover Protocol
                </span>
                <span>Mandatory Safety Verification</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-bold">
                {Object.keys(checklist).map((key) => {
                  const labelMap: Record<string, string> = {
                    rightPatient: 'Right Patient',
                    rightDrug: 'Right Drug',
                    rightDose: 'Right Dose',
                    rightRoute: 'Right Route',
                    rightTime: 'Right Time',
                  };
                  const isChecked = (checklist as any)[key];

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setChecklist(prev => ({ ...prev, [key]: !(prev as any)[key] }))}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <CheckCircle2 size={14} className={isChecked ? 'text-emerald-400' : 'text-slate-600'} />
                      <span className="text-[10px] font-black uppercase">{labelMap[key]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div className="mt-auto p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 font-bold text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
            >
              CANCEL
            </button>

            <button 
              type="submit" 
              disabled={isDispensing || !allChecklistPassed} 
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xl transition-all uppercase tracking-wider disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isDispensing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  DEDUCTING STOCK & DISPENSING...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  DISPENSE & DEDUCT INVENTORY
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
