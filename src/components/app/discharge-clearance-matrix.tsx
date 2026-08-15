'use client';

import { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, X, Loader2, Bed, DollarSign, Pill, FileText, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClearanceNode {
  status: 'CLEARED' | 'PENDING';
  clearedBy?: string | null;
  time?: string | null;
}

interface AdmissionRecord {
  id: string;
  patientName: string;
  patientId?: string;
  ward: string;
  bedId?: string;
  runningBalance: number;
  clearanceStatus: {
    clinical: ClearanceNode;
    pharmacy: ClearanceNode;
    finance: ClearanceNode;
  };
}

interface DischargeClearanceMatrixProps {
  admissionRecord?: AdmissionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  hospitalId?: string;
  onSuccess?: () => void;
}

export default function DischargeClearanceMatrix({
  admissionRecord,
  isOpen,
  onClose,
  hospitalId,
  onSuccess,
}: DischargeClearanceMatrixProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Managed Clearance State (Allows simulate clearing nodes)
  const [clearance, setClearance] = useState({
    clinical: admissionRecord?.clearanceStatus?.clinical || { status: 'CLEARED', clearedBy: 'Dr. James Gambrah', time: '09:15 AM' },
    pharmacy: admissionRecord?.clearanceStatus?.pharmacy || { status: 'CLEARED', clearedBy: 'Pharm. Chief', time: '09:30 AM' },
    finance: admissionRecord?.clearanceStatus?.finance || { status: 'PENDING', clearedBy: null, time: null },
  });

  const record: AdmissionRecord = admissionRecord || {
    id: 'ADM-2026-08-412',
    patientName: 'JANET BONAH',
    patientId: 'p_janet',
    ward: 'FEMALE WARD A - Bed 04',
    bedId: 'BED-04A',
    runningBalance: 4250.00,
    clearanceStatus: clearance,
  };

  const isFullyCleared = 
    clearance.clinical.status === 'CLEARED' &&
    clearance.pharmacy.status === 'CLEARED' &&
    clearance.finance.status === 'CLEARED';

  const handleClearNode = (nodeKey: 'pharmacy' | 'finance') => {
    setClearance(prev => ({
      ...prev,
      [nodeKey]: {
        status: 'CLEARED',
        clearedBy: nodeKey === 'pharmacy' ? 'Pharm. Chief' : 'Cashier Till 01',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    }));
    toast({
      title: `✅ ${nodeKey.toUpperCase()} Clearance Signed Off`,
      description: `${nodeKey === 'pharmacy' ? 'Ward stock return verified.' : 'Zero-balance billing settled.'}`,
    });
  };

  const handleGenerateGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFullyCleared) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/inpatient/discharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: hospitalId || 'GAM-GAR-7578',
          admissionId: record.id,
          patientId: record.patientId,
          patientName: record.patientName,
          bedId: record.bedId,
          wardName: record.ward,
          clearedBy: 'Dr. James Gambrah & Finance',
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Discharge execution failed.');
      }

      toast({
        title: '🎉 Discharge Finalized & Gate Pass Issued',
        description: `Discharge finalized. Gate Pass (${resData.gatePassId}) generated for ${record.patientName}. Bed marked vacant.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Discharge Error',
        description: error.message || 'Discharge execution failed.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-800">
        
        {/* Header */}
        <div className="bg-slate-950 text-white p-6 shrink-0 border-b border-slate-800 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black italic uppercase tracking-wider text-white">
                  TRIPARTITE DISCHARGE CLEARANCE
                </h2>
                <p className="text-slate-400 font-mono text-xs mt-0.5">
                  {record.id} • {record.ward}
                </p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Final Bill Balance</p>
            <p className="text-2xl font-mono text-emerald-400 font-black">
              GHS {record.runningBalance.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 flex-1 flex flex-col gap-6">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg uppercase tracking-wide">
                {record.patientName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                Initiated for Ward Discharge
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
              PENDING CLEARANCE
            </span>
          </div>

          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">
            Departmental Reconciliation Matrix (3 Cryptographic Locks)
          </h3>

          <div className="grid grid-cols-1 gap-4">
            
            {/* Node 1: Clinical Sign-off */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
              clearance.clinical.status === 'CLEARED' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  clearance.clinical.status === 'CLEARED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-100 text-slate-400'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase">Clinical & Medical Sign-off</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Discharge Summary & Home Rx</p>
                </div>
              </div>

              <div className="text-right">
                {clearance.clinical.status === 'CLEARED' ? (
                  <>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      CLEARED
                    </span>
                    <p className="text-[10px] font-mono text-slate-400 mt-1 font-bold">
                      {clearance.clinical.clearedBy} @ {clearance.clinical.time}
                    </p>
                  </>
                ) : (
                  <span className="text-[10px] font-black text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse">
                    PENDING REVIEW
                  </span>
                )}
              </div>
            </div>

            {/* Node 2: Pharmacy Audit */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
              clearance.pharmacy.status === 'CLEARED' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  clearance.pharmacy.status === 'CLEARED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase">Inpatient Pharmacy Audit</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Ward stock returns & medication reconciliation</p>
                </div>
              </div>

              <div className="text-right">
                {clearance.pharmacy.status === 'CLEARED' ? (
                  <>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      CLEARED
                    </span>
                    <p className="text-[10px] font-mono text-slate-400 mt-1 font-bold">
                      {clearance.pharmacy.clearedBy} @ {clearance.pharmacy.time}
                    </p>
                  </>
                ) : (
                  <button 
                    type="button"
                    onClick={() => handleClearNode('pharmacy')}
                    className="text-[10px] font-black text-indigo-400 bg-indigo-500/20 border border-indigo-500/30 hover:bg-indigo-500/30 px-3 py-1.5 rounded-xl uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    REQUEST PHARMACY AUDIT
                  </button>
                )}
              </div>
            </div>

            {/* Node 3: Finance Node */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
              clearance.finance.status === 'CLEARED' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  clearance.finance.status === 'CLEARED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-100 text-slate-400'
                }`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase">Financial Zero-Balance</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Final bill settlement & corporate clearance</p>
                </div>
              </div>

              <div className="text-right">
                {clearance.finance.status === 'CLEARED' ? (
                  <>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      CLEARED
                    </span>
                    <p className="text-[10px] font-mono text-slate-400 mt-1 font-bold">
                      {clearance.finance.clearedBy} @ {clearance.finance.time}
                    </p>
                  </>
                ) : (
                  <button 
                    type="button"
                    onClick={() => handleClearNode('finance')}
                    className="text-[10px] font-black text-amber-400 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 px-3 py-1.5 rounded-xl uppercase tracking-widest transition-colors cursor-pointer animate-pulse"
                  >
                    AWAITING FINAL PAYMENT (SETTLE)
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Action Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-3 font-bold text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer uppercase tracking-wider"
          >
            CLOSE VIEW
          </button>
          
          <button 
            onClick={handleGenerateGatePass}
            disabled={isProcessing || !isFullyCleared} 
            className={`px-8 py-3 font-black text-xs rounded-xl shadow-xl transition-all uppercase tracking-wider disabled:opacity-50 flex items-center gap-2 cursor-pointer ${
              !isFullyCleared 
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                : 'bg-indigo-950 hover:bg-indigo-900 text-white border border-indigo-700'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                GENERATING GATE PASS...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                AUTHORIZE FINAL DISCHARGE
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
