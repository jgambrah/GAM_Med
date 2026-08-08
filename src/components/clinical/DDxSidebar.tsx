'use client';
import { useMemo } from 'react';
import { Sparkles, Brain, Plus, CheckCircle2 } from 'lucide-react';
import { generateDifferentialDiagnosis } from '@/ai/flows/ai-ddx-engine';

interface DDxSidebarProps {
  inputText: string;
  onSelectCondition?: (conditionName: string, icdCode: string) => void;
  onOrderLab?: (labName: string) => void;
}

export function DDxSidebar({ inputText, onSelectCondition, onOrderLab }: DDxSidebarProps) {
  const ddx = useMemo(() => {
    return generateDifferentialDiagnosis(inputText);
  }, [inputText]);

  return (
    <div className="bg-slate-900 text-white p-4 rounded-3xl space-y-4 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-amber-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">Real-Time Differential Diagnosis (DDx) Engine</span>
        </div>
        <span className="text-[9px] text-slate-400 font-bold uppercase">AI Ranked</span>
      </div>

      <div className="space-y-3">
        {ddx.rankedDiagnoses.map((item, idx) => (
          <div key={idx} className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <button
                  type="button"
                  onClick={() => onSelectCondition?.(item.conditionName, item.icdCode)}
                  className="text-xs font-black text-white hover:text-amber-300 text-left uppercase transition-all flex items-center gap-1"
                >
                  {item.conditionName} <span className="text-[9px] text-slate-400 font-bold">({item.icdCode})</span>
                </button>
                <p className="text-[10px] text-slate-400 font-bold italic mt-0.5">{item.clinicalRationale}</p>
              </div>

              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                item.probabilityPercent >= 70 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                'bg-slate-800 text-slate-300'
              }`}>
                {item.probabilityPercent}% Match
              </span>
            </div>

            {/* RECOMMENDED LABS */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-900">
              <span className="text-[9px] font-black uppercase text-slate-400">Order:</span>
              {item.recommendedLabs.map((lab, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onOrderLab?.(lab)}
                  className="text-[9px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded-lg border border-slate-700 transition-all flex items-center gap-1"
                >
                  <Plus size={10} className="text-amber-400" /> {lab}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
