'use client';
import { useState, useMemo } from 'react';
import { ShieldCheck, Activity, DollarSign, PauseCircle, RefreshCw, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Stethoscope, HeartPulse, Sparkles } from 'lucide-react';
import {
  evaluateRtpbFormulary,
  checkOrganDosingGuardrails,
  pauseOrderAndSendEhrIntervention,
  RtpbBenefitCheck,
  OrganDosingGuard,
  EhrInterventionQuery
} from '@/ai/flows/ai-pharmacy-cdss-rtpb-engine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface IntegratedPharmacyCdssCardProps {
  drugName?: string;
  patientName?: string;
  patientId?: string;
  prescribingDoctorName?: string;
  onOrderPausedChange?: (isPaused: boolean) => void;
  defaultExpanded?: boolean;
}

export function IntegratedPharmacyCdssCard({
  drugName = 'Amoxil Brand 500mg',
  patientName = 'Benjamin Hedidor',
  patientId = 'P-100',
  prescribingDoctorName = 'Dr. Kwaku Mensah',
  onOrderPausedChange,
  defaultExpanded = true
}: IntegratedPharmacyCdssCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Current Active Drug Name State (allows 1-click generic substitution)
  const [activeDrugName, setActiveDrugName] = useState(drugName);

  // RTPB State
  const rtpbResult = useMemo(
    () => evaluateRtpbFormulary(activeDrugName, 'National Health Insurance Scheme (NHIS)'),
    [activeDrugName]
  );

  // Organ Dosing Guardrails State
  const [egfr, setEgfr] = useState<number>(25); // Trigger renal alert for demo
  const [weightKg, setWeightKg] = useState<number>(65);
  const [ageYears, setAgeYears] = useState<number>(45);

  const organResult = useMemo(
    () => checkOrganDosingGuardrails(activeDrugName, weightKg, ageYears, egfr),
    [activeDrugName, weightKg, ageYears, egfr]
  );

  // Order Pause & EHR Intervention Modal State
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('Severe Penicillin Allergy Conflict');
  const [suggestedAlternative, setSuggestedAlternative] = useState('Switch to Erythromycin 500mg PO BID');
  const [pausedQuery, setPausedQuery] = useState<EhrInterventionQuery | null>(null);

  const handleSwitchToGeneric = () => {
    setActiveDrugName(rtpbResult.genericAlternativeName);
    toast({
      title: '🔄 Switched to Generic Formulary Alternative',
      description: `Patient copay reduced to GHS 0.00 (Saved GHS ${rtpbResult.genericSavingsGhc.toFixed(2)}).`
    });
  };

  const handlePauseOrderAndSendAlert = () => {
    const queryPayload = pauseOrderAndSendEhrIntervention(
      'DOC-99',
      patientId,
      patientName,
      pauseReason,
      suggestedAlternative
    );

    setPausedQuery(queryPayload);
    setIsPauseModalOpen(false);

    if (onOrderPausedChange) onOrderPausedChange(true);

    toast({
      title: '⏸️ Order Paused & Sent to Doctor EHR Inbox',
      description: `Dispatched query ${queryPayload.queryId} to ${prescribingDoctorName}'s EHR inbox.`
    });
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-cyan-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-cyan-950/40 hover:bg-cyan-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-cyan-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-900/80 rounded-2xl border border-cyan-700 text-cyan-300">
            <Stethoscope className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-cyan-300">Integrated Clinical Decision Support Systems (CDSS) & RTPB</h3>
              <span className="text-[9px] font-black bg-cyan-600 text-white px-2 py-0.5 rounded-full uppercase">
                REAL-TIME BENEFIT SYNCED
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              RTPB Insurance Copay & Generic Savings • Organ Clearance Guardrails (eGFR/Hepatic) • 1-Click Order Pause to EHR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-cyan-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand CDSS'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: RTPB REAL-TIME PRESCRIPTION BENEFIT DECK */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <DollarSign size={16} /> Real-Time Prescription Benefit (RTPB) & Insurance Formulary:
              </h4>

              <span className="text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full uppercase">
                NHIS COVERAGE: {rtpbResult.copayAmountGhc === 0 ? '100% COVERED' : `COPAY GHS ${rtpbResult.copayAmountGhc.toFixed(2)}`}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h5 className="text-xs font-black text-white">{activeDrugName}</h5>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{rtpbResult.coverageDetails}</p>
              </div>

              {rtpbResult.genericSavingsGhc > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSwitchToGeneric}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl h-8 px-3 flex items-center gap-1.5 shrink-0 shadow-md"
                >
                  <RefreshCw size={12} /> Switch to Generic (Save GHS {rtpbResult.genericSavingsGhc.toFixed(2)})
                </Button>
              )}
            </div>
          </div>

          {/* SECTION 2: ORGAN DOSING GUARDRAILS (RENAL eGFR / HEPATIC / PEDIATRIC) */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                <HeartPulse size={16} /> Organ Clearance & Weight Dosing Guardrails:
              </h4>

              <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                organResult.dosingStatus === 'OPTIMAL' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
              }`}>
                {organResult.dosingStatus.replace(/_/g, ' ')}
              </span>
            </div>

            {/* INPUT SLIDERS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">eGFR (mL/min):</label>
                <input
                  type="number"
                  value={egfr}
                  onChange={(e) => setEgfr(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-bold outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Patient Weight (kg):</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-bold outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Patient Age (Years):</label>
                <input
                  type="number"
                  value={ageYears}
                  onChange={(e) => setAgeYears(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-bold outline-none text-center"
                />
              </div>
            </div>

            {/* RESULT ALERT */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <p className="text-xs font-bold text-slate-200">
                <span className="text-cyan-400 font-black uppercase">Recommendation: </span>
                {organResult.correctedDoseRecommendation}
              </p>

              {organResult.safetyWarning && (
                <div className="p-3 bg-red-950/90 border border-red-600 rounded-xl text-red-200 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  {organResult.safetyWarning}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: INTERACTIVE PHARMACIST EHR INTERVENTION LAUNCHER */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <PauseCircle size={16} /> Order Pause & Pharmacist EHR Intervention Channel:
              </h4>

              <Button
                type="button"
                size="sm"
                onClick={() => setIsPauseModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase rounded-xl h-7 px-3 flex items-center gap-1 shadow-md"
              >
                <PauseCircle size={12} /> Pause Order & Send EHR Alert
              </Button>
            </div>

            {pausedQuery ? (
              <div className="p-3.5 bg-amber-950/80 border border-amber-600 rounded-2xl text-xs space-y-1">
                <div className="flex justify-between items-center text-[10px] font-black text-amber-300 uppercase">
                  <span>⏸️ DISPENSING ORDER PAUSED</span>
                  <span className="bg-amber-900 text-white px-2 py-0.5 rounded-md">{pausedQuery.queryId}</span>
                </div>
                <p className="text-slate-200 font-bold">Reason: {pausedQuery.pauseReason}</p>
                <p className="text-[10px] text-slate-300 font-mono">Suggested: {pausedQuery.suggestedAlternative}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">
                Pharmacists can pause the order with 1 click and send structured query alerts directly to {prescribingDoctorName}'s EHR inbox without phone calls.
              </p>
            )}
          </div>
        </div>
      )}

      {/* PAUSE ORDER MODAL */}
      <Dialog open={isPauseModalOpen} onOpenChange={setIsPauseModalOpen}>
        <DialogContent className="bg-slate-950 text-white border-2 border-amber-600 rounded-[32px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-amber-300 flex items-center gap-2">
              <PauseCircle size={18} /> Pause Dispensing & Dispatch EHR Query
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">
              Sends an urgent clinical alert to {prescribingDoctorName}'s EHR inbox and pauses dispensing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Pause Reason:</label>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-amber-500 font-medium h-20"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Suggested Clinical Alternative:</label>
              <input
                type="text"
                value={suggestedAlternative}
                onChange={(e) => setSuggestedAlternative(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-300 outline-none focus:border-amber-500 font-bold"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPauseModalOpen(false)}
              className="text-slate-400 text-xs font-black uppercase"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handlePauseOrderAndSendAlert}
              className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase rounded-xl px-4"
            >
              ⏸️ Confirm Pause & Dispatch Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
