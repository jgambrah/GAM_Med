'use client';
import { useMemo } from 'react';
import { Camera, Sparkles, Activity, ShieldCheck, CheckCircle2, TrendingUp, Scissors } from 'lucide-react';
import { analyzeSurgicalWound } from '@/ai/flows/ai-computer-vision';
import { Progress } from '@/components/ui/progress';

interface SmartWoundTrackerProps {
  patientName?: string;
}

export function SmartWoundTracker({ patientName = 'Patient' }: SmartWoundTrackerProps) {
  const woundData = useMemo(() => {
    return analyzeSurgicalWound();
  }, []);

  return (
    <div className="bg-slate-900 text-white p-6 rounded-[32px] border border-slate-800 space-y-6 shadow-xl">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Scissors className="text-emerald-400" size={20} />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">Computer Vision Surgical Wound & Lesion Tracker</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Post-Caesarean / Surgical Healing Surface Area & Tissue Health Metrics</p>
          </div>
        </div>

        <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1">
          <ShieldCheck size={14} /> Infection Risk: {woundData.infectionRiskTier}
        </span>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Surface Area</span>
          <p className="text-2xl font-black text-white">{woundData.surfaceAreaCm2} cm²</p>
          <p className="text-[9px] text-emerald-400 font-bold uppercase flex items-center gap-1">
            <TrendingUp size={10} /> 32% reduction vs Day 1
          </p>
        </div>

        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-400">Granulation (Healthy)</span>
          <p className="text-2xl font-black text-emerald-400">{woundData.granulationTissuePercent}%</p>
          <Progress value={woundData.granulationTissuePercent} className="h-1.5 bg-slate-800" />
        </div>

        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-black uppercase text-amber-400">Slough Tissue</span>
          <p className="text-2xl font-black text-amber-400">{woundData.sloughTissuePercent}%</p>
          <Progress value={woundData.sloughTissuePercent} className="h-1.5 bg-slate-800" />
        </div>

        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Healing Score</span>
          <p className="text-2xl font-black text-sky-400">{woundData.healingProgressionScore} / 100</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase">Optimal Recovery Protocol</p>
        </div>
      </div>

      {/* RECOMMENDATIONS */}
      <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
        <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
          <CheckCircle2 size={12} /> Computer Vision Clinical Guidance:
        </h4>
        <ul className="text-xs font-bold text-slate-300 space-y-1">
          {woundData.clinicalRecommendations.map((rec, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
