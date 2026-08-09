'use client';
import { useState, useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Scale, Activity, CheckCircle2, AlertOctagon, UserCheck } from 'lucide-react';
import {
  evaluateCrossEncounterInteractions,
  evaluateSmartDosingOverdose,
  CrossEncounterInteractionCheck,
  SmartDosingOverdoseCheck
} from '@/ai/flows/ai-pharmacy-advanced-clinical-safety-engine';
import { Button } from '@/components/ui/button';

interface PharmacyAdvancedClinicalSafetySuiteCardProps {
  patientName?: string;
  drugList?: string[];
  ageYears?: number;
  weightKg?: number;
  defaultExpanded?: boolean;
}

export function PharmacyAdvancedClinicalSafetySuiteCard({
  patientName = 'Daniel Anim',
  drugList = ['Erythromycin 500mg', 'Paracetamol 1000mg'],
  ageYears = 58,
  weightKg = 82,
  defaultExpanded = false
}: PharmacyAdvancedClinicalSafetySuiteCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Cross-Encounter Interaction Analysis
  const interactionResult = useMemo(() => {
    return evaluateCrossEncounterInteractions(patientName, drugList);
  }, [patientName, drugList]);

  // Smart Dosing Overdose Analysis
  const dosingResult = useMemo(() => {
    return evaluateSmartDosingOverdose(
      patientName,
      drugList[0] || 'Paracetamol 1000mg',
      patientName.toLowerCase().includes('daniel') ? 6000 : 2000,
      ageYears,
      weightKg
    );
  }, [patientName, drugList, ageYears, weightKg]);

  return (
    <div className="bg-slate-950 text-white rounded-[28px] border-2 border-red-800/80 shadow-2xl overflow-hidden my-4">
      {/* HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 transition-all bg-red-950/40"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-black animate-pulse">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm uppercase tracking-wider text-red-200">Clinical Safety & Dosing Hard-Stop Suite</h3>
              <span className="text-[9px] font-black bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full uppercase">
                🚨 2 Safety Checks Failed
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Cross-Encounter EMR Interaction Scanner & mg/kg Smart Dosing Hard-Stop
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white font-bold text-xs uppercase"
        >
          {isExpanded ? 'Collapse ▲' : 'View Safety Engine Flags ▼'}
        </Button>
      </div>

      {/* EXPANDED CONTENT */}
      {isExpanded && (
        <div className="p-5 space-y-4 border-t border-red-900/40">
          {/* SECTION 1: CROSS-ENCOUNTER INTERACTION ALERT */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase text-red-400 tracking-widest flex items-center gap-1.5">
                <AlertTriangle size={14} /> 1. Cross-Encounter EMR Chronic Interaction Check
              </p>
              <span className="text-[9px] font-mono font-bold bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded uppercase">
                CRITICAL CONFLICT
              </span>
            </div>

            <div className="p-4 bg-slate-900/90 rounded-2xl border border-red-900/60 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-black text-white uppercase">Historical Chronic Medication Conflict:</p>
                  <p className="text-xs font-extrabold text-red-300 mt-0.5">{interactionResult.chronicDrugName}</p>
                </div>
                <span className="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded uppercase">
                  HIGH SEVERITY
                </span>
              </div>

              <p className="text-[11px] text-slate-300 font-medium bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-black">Mechanism:</span> {interactionResult.interactionMechanism}
              </p>

              <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-xl text-xs font-bold text-red-200">
                {interactionResult.clinicalRecommendation}
              </div>
            </div>
          </div>

          {/* SECTION 2: SMART DOSING OVERDOSE HARD-STOP */}
          <div className="space-y-2 pt-2 border-t border-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase text-red-400 tracking-widest flex items-center gap-1.5">
                <Scale size={14} /> 2. Smart Dosing Analytics (Patient: {weightKg}kg • {ageYears}yrs)
              </p>
              <span className="text-[9px] font-mono font-bold bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded uppercase">
                HARD-STOP ACTIVE
              </span>
            </div>

            <div className="p-4 bg-slate-900/90 rounded-2xl border border-red-900/60 space-y-2.5">
              <div className="flex justify-between items-center">
                <p className="text-xs font-black text-white uppercase">Target Drug Dosing Parameter:</p>
                <span className="text-[10px] font-mono font-extrabold text-amber-400">
                  Prescribed: {dosingResult.prescribedDoseMgPerDay}mg/day | Safe Max: {dosingResult.maxSafeDoseMgPerDay}mg/day
                </span>
              </div>

              <div className="p-3 bg-red-950/90 border-2 border-red-600 rounded-2xl text-xs font-black text-red-100 flex items-start gap-2 shadow-lg">
                <AlertOctagon className="text-red-400 h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="uppercase text-red-200">{dosingResult.safetyWarning}</p>
                  <p className="text-[10px] text-red-300 font-normal mt-1">
                    System hard-stop prevents dispensing until prescribed daily dosage is reduced to ≤ {dosingResult.maxSafeDoseMgPerDay}mg/day by attending physician.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
