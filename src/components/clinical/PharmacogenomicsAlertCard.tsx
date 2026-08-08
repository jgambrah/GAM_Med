'use client';
import { useState, useMemo } from 'react';
import { Dna, ShieldAlert, AlertTriangle, CheckCircle2, Pill, Activity, RefreshCw } from 'lucide-react';
import { evaluatePharmacogenomics, PGxAlert } from '@/ai/flows/ai-genomic-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { GenomicProfileCaptureDialog } from '@/components/clinical/GenomicProfileCaptureDialog';

interface PharmacogenomicsAlertCardProps {
  patientName?: string;
}

export function PharmacogenomicsAlertCard({ patientName = 'Patient' }: PharmacogenomicsAlertCardProps) {
  const { toast } = useToast();
  const [prescribedList, setPrescribedList] = useState<string[]>(['Abacavir 300mg', 'Warfarin 5mg', 'Sevoflurane']);
  const [newMedInput, setNewMedInput] = useState('');

  const pgxAlerts = useMemo(() => {
    return evaluatePharmacogenomics(prescribedList);
  }, [prescribedList]);

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedInput.trim()) return;
    setPrescribedList(prev => [...prev, newMedInput.trim()]);
    setNewMedInput('');
    toast({
      title: '🧬 PGx Genomic Safety Scan Completed',
      description: `Checked ${newMedInput} against ${patientName}'s genetic metabolizer profile.`
    });
  };

  const handleRemoveMedication = (medName: string) => {
    setPrescribedList(prev => prev.filter(m => m !== medName));
  };

  return (
    <div className="bg-slate-900 text-white p-6 rounded-[32px] border border-slate-800 space-y-6 shadow-2xl">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <Dna className="text-purple-400 animate-pulse" size={22} />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-purple-400">Pharmacogenomics (PGx) Precision Safety Engine</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Patient Genetic Variant & Drug-Gene Metabolizer Risk Screening</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GenomicProfileCaptureDialog patientName={patientName} />

          <span className="bg-purple-950 text-purple-300 border border-purple-800 px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5">
            <Activity size={14} /> PGx Profile Active
          </span>
        </div>
      </div>

      {/* PATIENT GENETIC PROFILE SUMMARY */}
      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
        <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Sequenced Genetic Markers on EHR File:</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-bold">
          <div className="p-2 bg-slate-900 rounded-xl border border-purple-900/50">
            <p className="text-purple-300 text-[10px]">HLA-B*5701</p>
            <p className="text-white font-black text-xs">POSITIVE 🚨</p>
          </div>
          <div className="p-2 bg-slate-900 rounded-xl border border-amber-900/50">
            <p className="text-amber-300 text-[10px]">CYP2C9 (*2/*3)</p>
            <p className="text-amber-400 font-black text-xs">POOR METABOLIZER</p>
          </div>
          <div className="p-2 bg-slate-900 rounded-xl border border-red-900/50">
            <p className="text-red-300 text-[10px]">RYR1 Mutation</p>
            <p className="text-red-400 font-black text-xs">MALIGNANT HYPERTHERMIA</p>
          </div>
          <div className="p-2 bg-slate-900 rounded-xl border border-rose-900/50">
            <p className="text-rose-300 text-[10px]">TPMT (*3A/*3C)</p>
            <p className="text-rose-400 font-black text-xs">POOR METABOLIZER</p>
          </div>
        </div>
      </div>

      {/* MEDICATION PRESCRIPTION FORM */}
      <form onSubmit={handleAddMedication} className="flex gap-2">
        <Input
          value={newMedInput}
          onChange={(e) => setNewMedInput(e.target.value)}
          placeholder="Test e-Prescribe drug (e.g. Abacavir, Warfarin, Sevoflurane, Azathioprine)..."
          className="bg-slate-950 border-slate-800 text-white rounded-2xl text-xs font-bold placeholder:text-slate-500"
        />
        <Button 
          type="submit" 
          className="bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider whitespace-nowrap shadow-lg"
        >
          <Pill size={14} className="mr-1" /> Test PGx Safety
        </Button>
      </form>

      {/* ACTIVE PRESCRIBED DRUGS CHIPS */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black text-slate-400 uppercase">Active Orders:</span>
        {prescribedList.map((med) => (
          <span key={med} className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-xs font-bold text-slate-200 flex items-center gap-2">
            {med}
            <button type="button" onClick={() => handleRemoveMedication(med)} className="text-slate-500 hover:text-red-400 text-xs">✕</button>
          </span>
        ))}
      </div>

      {/* PGX SAFETY ALERTS CARDS */}
      <div className="space-y-3">
        {pgxAlerts.length === 0 ? (
          <div className="p-4 bg-emerald-950/40 rounded-2xl border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} /> No Pharmacogenomic drug-gene contraindications detected for active order list.
          </div>
        ) : (
          pgxAlerts.map((alert, index) => (
            <div 
              key={index}
              className={`p-5 rounded-2xl border-2 space-y-3 ${
                alert.riskSeverity === 'CRITICAL_CONTRAINDICATION' 
                  ? 'bg-red-950/90 border-red-500 text-red-100' 
                  : 'bg-amber-950/90 border-amber-500 text-amber-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <ShieldAlert className={alert.riskSeverity === 'CRITICAL_CONTRAINDICATION' ? 'text-red-400 animate-pulse' : 'text-amber-400'} size={20} />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {alert.riskSeverity.replace(/_/g, ' ')} — {alert.medicationName}
                  </span>
                </div>
                <span className="text-[10px] bg-black/40 px-2 py-1 rounded-lg font-black uppercase">
                  Gene: {alert.gene}
                </span>
              </div>

              <p className="text-xs font-black leading-relaxed">{alert.clinicalWarning}</p>

              <div className="p-3 bg-black/50 rounded-xl space-y-1">
                <p className="text-[10px] font-black uppercase text-amber-300">Recommended Clinical Action:</p>
                <p className="text-xs font-bold text-white">{alert.recommendedAction}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-purple-300">PGx Suggested Safe Alternatives:</span>
                <div className="flex flex-wrap gap-2">
                  {alert.alternativeMedications.map((alt, i) => (
                    <span key={i} className="bg-purple-950 border border-purple-800 px-2.5 py-1 rounded-xl text-[10px] font-black text-purple-200">
                      ✅ {alt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
