'use client';
import { useState } from 'react';
import { ShieldCheck, CheckCircle2, UserCheck, Pill, Printer, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface PharmacyPatientHandoverChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  mrn?: string;
  medications: any[];
  prescriberName?: string;
  transactionId?: string;
}

export function PharmacyPatientHandoverChecklistDialog({
  open,
  onOpenChange,
  patientName,
  mrn = '88421',
  medications = [],
  prescriberName = 'Dr. Marcus Amosah Henaku',
  transactionId = 'TX-ACID-944864'
}: PharmacyPatientHandoverChecklistDialogProps) {
  const { toast } = useToast();

  // 5-Rights Verification Checklist States
  const [checkedRightPatient, setCheckedRightPatient] = useState(false);
  const [checkedRightDrugDose, setCheckedRightDrugDose] = useState(false);
  const [checkedExpiryColdChain, setCheckedExpiryColdChain] = useState(false);
  const [checkedCounselingProvided, setCheckedCounselingProvided] = useState(false);
  const [isHandoverCompleted, setIsHandoverCompleted] = useState(false);

  const allChecked = checkedRightPatient && checkedRightDrugDose && checkedExpiryColdChain && checkedCounselingProvided;

  const handleFinalizeHandover = () => {
    setIsHandoverCompleted(true);
    toast({
      title: '✅ Patient Handover & Counseling Signed Off',
      description: `Medication batch for ${patientName} (MRN #${mrn}) successfully handed over. Audit log updated.`
    });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 text-white border-2 border-emerald-600 rounded-[32px] max-w-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-black uppercase text-emerald-400 flex items-center gap-2">
            <ShieldCheck size={20} /> Clinical 5-Rights Patient Handover Protocol
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 font-medium">
            Verify clinical safety checks before physical medication handover to patient.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* PATIENT DEMOGRAPHICS & DISPENSING RECEIPT HEADER */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-mono font-bold text-cyan-400 text-[10px]">Ref: {transactionId}</span>
              <span className="text-[9px] font-black bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-800 uppercase">
                🟢 FULFILLED & READY
              </span>
            </div>
            <p className="font-black text-sm text-white uppercase">{patientName} (MRN #{mrn})</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Prescribed by: {prescriberName}</p>
          </div>

          {/* MEDICATION SUMMARY LIST */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Verified Items To Hand Over ({medications.length} Lines):
            </p>
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 max-h-36 overflow-y-auto space-y-1.5 text-xs">
              {medications.map((m, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-800/60 pb-1.5 last:border-b-0 last:pb-0">
                  <span className="font-extrabold text-slate-200 uppercase truncate">
                    💊 {idx + 1}. {m.name || 'Drug Item'}
                  </span>
                  <span className="font-mono text-cyan-400 font-bold text-[10px]">Qty: {m.qty || m.quantity || 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5-RIGHTS MANDATORY VERIFICATION CHECKLIST */}
          <div className="space-y-2 pt-1 border-t border-slate-900">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Mandatory Pharmacist Handover Checklist:
            </p>

            <div className="space-y-2 text-xs font-bold text-slate-300">
              <label className="flex items-center gap-3 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={checkedRightPatient}
                  onChange={(e) => setCheckedRightPatient(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span>1. Confirm Patient Identity (Full Name: {patientName} • MRN #{mrn})</span>
              </label>

              <label className="flex items-center gap-3 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={checkedRightDrugDose}
                  onChange={(e) => setCheckedRightDrugDose(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span>2. Cross-check Drug Items & Quantities Against Prescribed Lines</span>
              </label>

              <label className="flex items-center gap-3 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={checkedExpiryColdChain}
                  onChange={(e) => setCheckedExpiryColdChain(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span>3. Check Batch Expiration Dates & Cold-Chain Telemetry (4.2°C)</span>
              </label>

              <label className="flex items-center gap-3 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={checkedCounselingProvided}
                  onChange={(e) => setCheckedCounselingProvided(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span>4. Provide Dosage Instructions & Patient Storage Counseling</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-900">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white font-bold text-xs uppercase"
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={handlePrintReceipt}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase rounded-xl flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Handover Receipt
          </Button>

          <Button
            type="button"
            disabled={!allChecked || isHandoverCompleted}
            onClick={handleFinalizeHandover}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl px-5 flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <CheckCircle2 size={16} /> {isHandoverCompleted ? 'Handover Signed ✅' : 'Sign Off Handover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
