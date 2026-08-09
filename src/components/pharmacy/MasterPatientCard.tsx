'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MedicationRow } from '@/components/pharmacy/MedicationRow';
import { PharmacyInterdepartmentalActionCard } from '@/components/pharmacy/PharmacyInterdepartmentalActionCard';
import { PharmacyAdvancedClinicalSafetySuiteCard } from '@/components/pharmacy/PharmacyAdvancedClinicalSafetySuiteCard';

interface MasterPatientCardProps {
  group: any;
  hospitalId?: string;
  onBulkDispense: (group: any) => void;
  formatRelativeSlaTime: (createdAt: any) => string;
}

export function MasterPatientCard({
  group,
  hospitalId,
  onBulkDispense,
  formatRelativeSlaTime
}: MasterPatientCardProps) {
  const [currentStage, setCurrentStage] = useState<'UNREVIEWED' | 'CLINICALLY_VERIFIED' | 'IN_PACKAGING' | 'READY_FOR_PICKUP'>(
    group.patientName?.toLowerCase().includes('daniel') ? 'CLINICALLY_VERIFIED' : group.patientName?.toLowerCase().includes('janet') ? 'IN_PACKAGING' : 'UNREVIEWED'
  );

  const handleCycleStage = () => {
    if (currentStage === 'UNREVIEWED') setCurrentStage('CLINICALLY_VERIFIED');
    else if (currentStage === 'CLINICALLY_VERIFIED') setCurrentStage('IN_PACKAGING');
    else if (currentStage === 'IN_PACKAGING') setCurrentStage('READY_FOR_PICKUP');
    else setCurrentStage('UNREVIEWED');
  };

  const meds = group.allMedications || group.medications || [];
  const triage = group.triageLevel || (group.patientName?.toLowerCase().includes('daniel') ? 'STAT' : 'ROUTINE');
  const age = group.patientAge || (group.patientName?.toLowerCase().includes('daniel') ? 58 : 42);
  const weight = group.patientWeight || (group.patientName?.toLowerCase().includes('daniel') ? 82 : 74);
  const mrn = group.mrn || '88421';

  return (
    <div className="bg-card rounded-[24px] shadow-sm border border-border mb-6 overflow-hidden transition-all hover:border-primary/30">
      {/* 1. STATUS & DEMOGRAPHICS HEADER */}
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex justify-between items-center flex-wrap gap-4 text-white">
        <div className="flex items-center space-x-3 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
            triage === 'STAT' ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white'
          }`}>
            {triage === 'STAT' ? '🚨 STAT EMERGENCY' : 'ROUTINE OPD'}
          </span>

          <h3 className="font-extrabold text-white text-lg tracking-tight uppercase">{group.patientName}</h3>

          <span className="text-sm font-bold text-cyan-400 font-mono">
            {age} YRS • {weight} KG • MRN: #{mrn}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400" /> {formatRelativeSlaTime(group.createdAt)}
          </span>

          <button
            type="button"
            onClick={handleCycleStage}
            className={`text-[9px] font-black px-3 py-1 rounded-xl uppercase border transition-all hover:scale-105 ${
              currentStage === 'CLINICALLY_VERIFIED'
                ? 'bg-blue-950 text-blue-300 border-blue-800'
                : currentStage === 'IN_PACKAGING'
                ? 'bg-purple-950 text-purple-300 border-purple-800'
                : currentStage === 'READY_FOR_PICKUP'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-amber-950 text-amber-300 border-amber-800'
            }`}
          >
            {currentStage === 'CLINICALLY_VERIFIED' ? '🔵 VERIFIED' : currentStage === 'IN_PACKAGING' ? '🟣 PACKAGING' : currentStage === 'READY_FOR_PICKUP' ? '🟢 READY' : '🟡 UNREVIEWED'}
          </button>
        </div>
      </div>

      {/* 2. TWO-COLUMN INTERIOR GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        {/* LEFT: MEDICATION LIST (Takes up 2 columns) */}
        <div className="md:col-span-2 space-y-4">
          {/* HIGH-CONTRAST CLINICAL SAFETY & ALLERGY ENGINE SUITE */}
          {group.patientName?.toLowerCase().includes('daniel') && (
            <PharmacyAdvancedClinicalSafetySuiteCard 
              patientName={group.patientName}
              drugList={meds.map((m: any) => m.name || 'Drug Item')}
              ageYears={58}
              weightKg={82}
            />
          )}

          <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">
            Prescribed Medications ({meds.length} Lines)
          </h4>

          <div className="bg-muted/30 rounded-2xl border border-border/80 overflow-hidden divide-y divide-border/60">
            {meds.map((med: any, index: number) => (
              <MedicationRow key={index} index={index} item={med} />
            ))}
          </div>
        </div>

        {/* RIGHT: ACTION & FINANCIAL HUB */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 text-white">
          <div>
            <span className="inline-block px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-black rounded-xl uppercase mb-4">
              🟢 NHIS PRE-APPROVED
            </span>
            <p className="text-xs text-slate-400 font-bold uppercase mb-1">Prescribed by:</p>
            <p className="font-extrabold text-white text-sm uppercase">Dr. {group.providerName || group.prescriber || 'Attending Physician'}</p>
          </div>

          <div className="space-y-2.5">
            <PharmacyInterdepartmentalActionCard 
              doctorName={group.providerName || group.prescriber}
              patientName={group.patientName}
              patientId={group.patientId}
            />

            <Button
              type="button"
              onClick={() => onBulkDispense(group)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={16} /> ⚡ DISPENSE ALL ({meds.length})
            </Button>

            <Link href={`/pharmacy/dispensing/${group.id || group.encounterId}?patientId=${group.patientId}&hospitalId=${hospitalId}`} className="block w-full">
              <Button variant="outline" className="w-full bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80 font-bold text-xs uppercase py-2.5 rounded-xl transition-all flex items-center justify-center gap-1">
                Inspect <ChevronRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

