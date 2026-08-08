'use client';
import { useMemo } from 'react';
import { Sparkles, Calendar, AlertTriangle, ShieldCheck, CheckCircle2, Stethoscope, ChevronRight } from 'lucide-react';
import { generatePreVisitBrief } from '@/ai/flows/ai-pre-visit-agent';
import { Button } from '@/components/ui/button';

interface PreVisitBriefCardProps {
  patient: any;
  onStartConsultation?: () => void;
}

export function PreVisitBriefCard({ patient, onStartConsultation }: PreVisitBriefCardProps) {
  const brief = useMemo(() => {
    return generatePreVisitBrief(patient);
  }, [patient]);

  if (!patient) return null;

  return (
    <div className="bg-slate-900 text-white p-6 rounded-[32px] border border-slate-800 space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-amber-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">Pre-Visit AI Chart Prep Brief</span>
        </div>

        {onStartConsultation && (
          <Button 
            onClick={onStartConsultation}
            className="bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 px-5 py-2 shadow-lg"
          >
            Start Consultation <ChevronRight size={14} />
          </Button>
        )}
      </div>

      <p className="text-xs font-bold text-slate-300 italic">{brief.briefSummary}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* PENDING LABS ALERT */}
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <AlertTriangle size={12} /> Pending Diagnostics:
          </span>
          <ul className="text-[11px] font-bold text-slate-300 space-y-1">
            {brief.pendingLabsAlerts.map((lab, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-amber-400">•</span> {lab}
              </li>
            ))}
          </ul>
        </div>

        {/* IMMUNIZATION MILESTONES */}
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1">
            <Calendar size={12} /> Immunization Due:
          </span>
          <ul className="text-[11px] font-bold text-slate-300 space-y-1">
            {brief.immunizationMilestones.map((m, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-purple-400">•</span> {m}
              </li>
            ))}
          </ul>
        </div>

        {/* SUGGESTED CLINICAL FOCUS */}
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Stethoscope size={12} /> Recommended Focus:
          </span>
          <ul className="text-[11px] font-bold text-slate-300 space-y-1">
            {brief.suggestedFocusAreas.map((f, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-emerald-400">•</span> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
