'use client';
import { useState, useMemo } from 'react';
import { MessageSquare, Flag, Activity, Calculator, AlertTriangle, Send, CheckCircle2, ChevronDown, ChevronUp, Clock, Syringe, ShieldAlert, Sparkles } from 'lucide-react';
import {
  getSampleERxFeed,
  calculateIVAdmixture,
  createDoctorInterventionRequest,
  ERxFeedItem,
  DoctorInterventionRequest,
  IVCompoundingResult
} from '@/ai/flows/ai-pharmacy-communication-engine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface PharmacyInterventionAndCompoundingCardProps {
  patientName?: string;
  patientId?: string;
  prescribingDoctorName?: string;
  defaultExpanded?: boolean;
}

export function PharmacyInterventionAndCompoundingCard({
  patientName = 'Patient',
  patientId = 'P-100',
  prescribingDoctorName = 'Dr. Kwaku Mensah',
  defaultExpanded = true
}: PharmacyInterventionAndCompoundingCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // e-Rx Feed State
  const [erxFeed, setErxFeed] = useState<ERxFeedItem[]>(() => getSampleERxFeed(patientName));
  const [selectedUrgencyFilter, setSelectedUrgencyFilter] = useState<'ALL' | 'STAT_EMERGENCY' | 'INPATIENT_DISCHARGE' | 'OUTPATIENT_OPD'>('ALL');

  // IV Compounding Calculator State
  const [volumeMl, setVolumeMl] = useState<number>(500);
  const [soluteGrams, setSoluteGrams] = useState<number>(25);
  const [molarMass, setMolarMass] = useState<number>(180); // Dextrose
  const [infusionHours, setInfusionHours] = useState<number>(4);
  const [dripFactor, setDripFactor] = useState<number>(15);

  const compoundingResult = useMemo(
    () => calculateIVAdmixture(volumeMl, soluteGrams, molarMass, infusionHours, dripFactor),
    [volumeMl, soluteGrams, molarMass, infusionHours, dripFactor]
  );

  // Intervention Flag Modal State
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState<DoctorInterventionRequest['flagReason']>('DOSE_CHECK');
  const [pharmacistNote, setPharmacistNote] = useState('');
  const [proposedModification, setProposedModification] = useState('');
  const [sentInterventions, setSentInterventions] = useState<DoctorInterventionRequest[]>([]);

  const filteredFeed = useMemo(() => {
    if (selectedUrgencyFilter === 'ALL') return erxFeed;
    return erxFeed.filter(item => item.urgency === selectedUrgencyFilter);
  }, [erxFeed, selectedUrgencyFilter]);

  const handleSendIntervention = () => {
    if (!pharmacistNote.trim()) {
      toast({
        variant: 'destructive',
        title: 'Note Required',
        description: 'Please describe the prescription issue for the doctor.'
      });
      return;
    }

    const req = createDoctorInterventionRequest(
      'DOC-99',
      patientId,
      patientName,
      flagReason,
      pharmacistNote,
      proposedModification
    );

    setSentInterventions(prev => [req, ...prev]);
    setIsInterventionModalOpen(false);

    toast({
      title: '🚩 Prescription Modification Request Dispatched',
      description: `Sent directly to ${prescribingDoctorName}'s clinical inbox in Firestore.`
    });
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-indigo-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-indigo-950/40 hover:bg-indigo-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-indigo-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-900/80 rounded-2xl border border-indigo-700 text-indigo-300">
            <MessageSquare className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-300">Doctor-Pharmacy Communication & IV Compounding Hub</h3>
              <span className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase">
                INTERVENTION FEED SYNCED
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Urgent e-Rx Feed (STAT/Discharge/OPD) • 1-Click Doctor Modifications • IV Admixture & Osmolarity Calculator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-indigo-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Hub'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: REAL-TIME e-RX URGENCY FEED DECK */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                <Clock size={16} /> Incoming Real-Time e-Prescription Feed:
              </h4>

              {/* URGENCY FILTER BUTTONS */}
              <div className="flex flex-wrap gap-1.5">
                {(['ALL', 'STAT_EMERGENCY', 'INPATIENT_DISCHARGE', 'OUTPATIENT_OPD'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSelectedUrgencyFilter(filter)}
                    className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-xl transition-all ${
                      selectedUrgencyFilter === filter 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {filter.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* FEED ITEMS */}
            <div className="space-y-2.5">
              {filteredFeed.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-indigo-500/50 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md shrink-0 ${
                      item.urgency === 'STAT_EMERGENCY' ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse' :
                      item.urgency === 'INPATIENT_DISCHARGE' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                      'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {item.urgency.replace(/_/g, ' ')}
                    </span>

                    <div>
                      <h5 className="text-xs font-black text-white">{item.drugSummary}</h5>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        Patient: {item.patientName} • Prescribed by: {item.providerName} ({item.createdAt})
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsInterventionModalOpen(true)}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase rounded-xl h-7 px-3 flex items-center gap-1 shrink-0 shadow-md"
                  >
                    <Flag size={12} /> Flag Intervention
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: SENT DOCTOR INTERVENTIONS HUB */}
          {sentInterventions.length > 0 && (
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                <Flag size={14} /> Active Doctor Intervention Requests Dispatched:
              </h4>

              <div className="space-y-2">
                {sentInterventions.map((req) => (
                  <div key={req.id} className="p-3 bg-amber-950/40 border border-amber-800 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-black text-amber-300 uppercase">
                      <span>Reason: {req.flagReason.replace(/_/g, ' ')}</span>
                      <span className="bg-amber-900 text-white px-2 py-0.5 rounded-sm">{req.status}</span>
                    </div>
                    <p className="text-slate-200 font-medium">Pharmacist Note: {req.pharmacistMessage}</p>
                    {req.proposedModification && (
                      <p className="text-slate-400 text-[10px]">Proposed Modification: {req.proposedModification}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: IV ADMIXTURE & COMPOUNDING CALCULATOR */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                <Syringe size={16} /> IV Admixture & Compounding Clinical Calculator:
              </h4>

              <span className="text-[10px] font-black bg-cyan-950 text-cyan-300 border border-cyan-800 px-3 py-1 rounded-full uppercase">
                BUD Stability: 24 Hours
              </span>
            </div>

            {/* CALCULATOR INPUT FORM */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">IV Volume (mL):</label>
                <input
                  type="number"
                  value={volumeMl}
                  onChange={(e) => setVolumeMl(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-bold outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Solute (Grams):</label>
                <input
                  type="number"
                  value={soluteGrams}
                  onChange={(e) => setSoluteGrams(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-bold outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Molar Mass (g/mol):</label>
                <input
                  type="number"
                  value={molarMass}
                  onChange={(e) => setMolarMass(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-bold outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Infusion Hours:</label>
                <input
                  type="number"
                  value={infusionHours}
                  onChange={(e) => setInfusionHours(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-bold outline-none text-center"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Drip Factor (gtt/mL):</label>
                <input
                  type="number"
                  value={dripFactor}
                  onChange={(e) => setDripFactor(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-bold outline-none text-center"
                />
              </div>
            </div>

            {/* COMPOUNDING RESULTS DISPLAY */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-black">
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[8px] text-slate-400 block uppercase">OSMOLARITY</span>
                  <span className="text-cyan-300 text-sm font-extrabold">{compoundingResult.osmolarityMOsmL} mOsm/L</span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[8px] text-slate-400 block uppercase">INFUSION RATE</span>
                  <span className="text-emerald-300 text-sm font-extrabold">{compoundingResult.infusionRateMLHr} mL/hr</span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[8px] text-slate-400 block uppercase">DRIP RATE</span>
                  <span className="text-amber-300 text-sm font-extrabold">{compoundingResult.dropsPerMin} gtt/min</span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[8px] text-slate-400 block uppercase">RECOMMENDED ROUTE</span>
                  <span className={compoundingResult.routeRecommendation === 'CENTRAL_LINE_ONLY' ? 'text-red-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>
                    {compoundingResult.routeRecommendation.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {compoundingResult.safetyWarning && (
                <div className="p-3 bg-red-950/90 border border-red-600 rounded-xl text-red-200 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  {compoundingResult.safetyWarning}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOCTOR INTERVENTION MODAL */}
      <Dialog open={isInterventionModalOpen} onOpenChange={setIsInterventionModalOpen}>
        <DialogContent className="bg-slate-950 text-white border-2 border-indigo-600 rounded-[32px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-indigo-300 flex items-center gap-2">
              <Flag size={18} /> Direct Prescription Modification Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">
              Flag issue and send direct clinical alert to {prescribingDoctorName}'s inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Flag Reason:</label>
              <select
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value as any)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500 font-bold"
              >
                <option value="DOSE_CHECK">High Dosage / Overdose Risk</option>
                <option value="ALLERGY_CONFLICT">Patient Allergy Conflict</option>
                <option value="DRUG_INTERACTION">Severe Drug-Drug Interaction</option>
                <option value="RENAL_HAZARD">Renal Impairment Contraindication</option>
                <option value="STOCK_OUTAGE">Medication Stock Outage</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Pharmacist Clinical Note:</label>
              <textarea
                value={pharmacistNote}
                onChange={(e) => setPharmacistNote(e.target.value)}
                placeholder="Explain the clinical issue identified..."
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-medium h-24"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Proposed Clinical Modification:</label>
              <input
                type="text"
                value={proposedModification}
                onChange={(e) => setProposedModification(e.target.value)}
                placeholder="e.g. Reduce dose by 50% or switch to alternative formulation"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-indigo-300 outline-none focus:border-indigo-500 font-bold"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsInterventionModalOpen(false)}
              className="text-slate-400 text-xs font-black uppercase"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSendIntervention}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase rounded-xl px-4 flex items-center gap-1"
            >
              <Send size={14} /> Send to Doctor Inbox
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
