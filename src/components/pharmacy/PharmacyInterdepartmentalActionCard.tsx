'use client';
import { useState, useMemo } from 'react';
import { ShieldCheck, MessageSquare, AlertCircle, DollarSign, Send, PauseCircle, CheckCircle2, ChevronDown, ChevronUp, Sparkles, UserCheck } from 'lucide-react';
import {
  dispatchDoctorEhrQuery,
  resolveFinancialClearance,
  DoctorEhrQueryPayload,
  FinancialClearanceStatus
} from '@/ai/flows/ai-pharmacy-interdepartmental-engine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface PharmacyInterdepartmentalActionCardProps {
  doctorName?: string;
  patientName?: string;
  patientId?: string;
  onOrderHoldChange?: (isHold: boolean) => void;
}

export function PharmacyInterdepartmentalActionCard({
  doctorName = 'Dr. Kwaku Mensah',
  patientName = 'Benjamin Hedidor',
  patientId = 'P-100',
  onOrderHoldChange
}: PharmacyInterdepartmentalActionCardProps) {
  const { toast } = useToast();
  
  // Financial Status State
  const financialStatus = useMemo(() => resolveFinancialClearance(patientName), [patientName]);

  // Doctor Query Modal State
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [reason, setReason] = useState('Severe Allergy & Dosing Query');
  const [alternative, setAlternative] = useState('Recommend Dose Reduction or Alternative');
  const [sentQuery, setSentQuery] = useState<DoctorEhrQueryPayload | null>(null);

  const handleDispatchQuery = () => {
    const payload = dispatchDoctorEhrQuery(doctorName, patientId, patientName, reason, alternative);
    setSentQuery(payload);
    setIsQueryModalOpen(false);

    if (onOrderHoldChange) onOrderHoldChange(true);

    toast({
      title: '🚩 Order Placed on Hold & EHR Query Dispatched',
      description: `Alert sent to ${doctorName}'s EHR inbox (Query ID: ${payload.queryId}).`
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md my-2">
      {/* FINANCIAL CLEARANCE BADGE */}
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border shadow-sm ${financialStatus.badgeColor}`}>
          {financialStatus.badgeLabel}
        </span>
        {!financialStatus.isClearedForRelease && (
          <span className="text-[9px] text-red-400 font-bold uppercase animate-pulse">
            ⚠️ CASHIER CLEARANCE REQUIRED
          </span>
        )}
      </div>

      {/* HOLD & QUERY DOCTOR BUTTON */}
      <div className="flex items-center gap-2">
        {sentQuery && (
          <span className="text-[9px] font-mono bg-amber-950 text-amber-300 border border-amber-800 px-2.5 py-1 rounded-lg">
            ⏸️ Order Paused ({sentQuery.queryId})
          </span>
        )}

        <Button
          type="button"
          size="sm"
          onClick={() => setIsQueryModalOpen(true)}
          className="w-full text-xs font-bold text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg py-2.5 transition shadow-sm flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
        >
          <MessageSquare size={14} /> Hold & Query Doctor
        </Button>
      </div>

      {/* HOLD & QUERY DOCTOR MODAL */}
      <Dialog open={isQueryModalOpen} onOpenChange={setIsQueryModalOpen}>
        <DialogContent className="bg-slate-950 text-white border-2 border-amber-600 rounded-[32px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-amber-300 flex items-center gap-2">
              <MessageSquare size={18} /> Flag & Query Prescribing Doctor
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">
              Pause dispensing order for {patientName} and dispatch direct structured alert to {doctorName}'s EHR inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Clinical Issue / Query Reason:</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Pharmacist Recommended Alternative:</label>
              <input
                type="text"
                value={alternative}
                onChange={(e) => setAlternative(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-300 outline-none focus:border-amber-500 font-bold"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsQueryModalOpen(false)}
              className="text-slate-400 text-xs font-black uppercase"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleDispatchQuery}
              className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase rounded-xl px-4 flex items-center gap-1.5"
            >
              <Send size={14} /> 🚩 Dispatch EHR Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
