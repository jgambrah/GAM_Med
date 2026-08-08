'use client';
import { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Activity, Baby, HeartPulse, Brain, Sparkles, PhoneCall } from 'lucide-react';
import { calculatePredictiveRisk } from '@/ai/flows/ai-predictive-risk';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ClinicalRiskOverlayProps {
  vitals?: {
    systolic?: string | number;
    diastolic?: string | number;
    temp?: string | number;
    pulse?: string | number;
    respiration?: string | number;
    spo2?: string | number;
  };
  patientAge?: number;
  isMaternity?: boolean;
  isPediatric?: boolean;
  patientId?: string;
  patientName?: string;
}

export function ClinicalRiskOverlay({ vitals, patientAge = 30, isMaternity, isPediatric, patientId, patientName }: ClinicalRiskOverlayProps) {
  // 1. MEOWS (Maternal Early Obstetric Warning Score)
  const meows = useMemo(() => {
    let score = 0;
    const sys = Number(vitals?.systolic || 0);
    const dia = Number(vitals?.diastolic || 0);
    const temp = Number(vitals?.temp || 0);
    const pulse = Number(vitals?.pulse || 0);

    if (sys >= 160 || (sys > 0 && sys <= 90)) score += 3;
    else if (sys >= 140) score += 2;

    if (dia >= 110) score += 3;
    else if (dia >= 90) score += 2;

    if (temp >= 38.5 || (temp > 0 && temp <= 35.5)) score += 3;

    if (pulse >= 120 || (pulse > 0 && pulse <= 50)) score += 3;

    let flag = 'NORMAL';
    if (score >= 5) flag = 'RED_ALERT';
    else if (score >= 3) flag = 'YELLOW_ALERT';

    return { score, flag };
  }, [vitals]);

  // 2. qSOFA (Quick Sequential Organ Failure Assessment for Sepsis)
  const qsofa = useMemo(() => {
    let score = 0;
    const sys = Number(vitals?.systolic || 0);
    const resp = Number(vitals?.respiration || 0);

    if (resp >= 22) score += 1;
    if (sys > 0 && sys <= 100) score += 1;

    return { score, isSepsisRisk: score >= 2 };
  }, [vitals]);

  // 3. PECARN (Pediatric Triage Rule)
  const pecarn = useMemo(() => {
    const temp = Number(vitals?.temp || 0);
    const pulse = Number(vitals?.pulse || 0);

    let triage = 'ROUTINE';
    if (temp >= 39.0 || pulse >= 160) triage = 'HIGH_PRIORITY';
    return { triage };
  }, [vitals]);

  // 4. Predictive Re-admission AI
  const predictiveRisk = useMemo(() => {
    return calculatePredictiveRisk({
      age: patientAge,
      news2Score: qsofa.score * 3,
      isPregnant: isMaternity,
    });
  }, [patientAge, qsofa.score, isMaternity]);

  return (
    <div className="bg-slate-900 text-white p-6 rounded-[32px] border border-slate-800 space-y-6 shadow-xl">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-amber-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">Clinical Risk Stratification & Predictive AI</span>
        </div>

        {predictiveRisk.readmissionTier === 'HIGH' || predictiveRisk.readmissionTier === 'CRITICAL' ? (
          <Link href="/telehealth">
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2">
              <PhoneCall size={14} /> Schedule Proactive Telehealth Outreach
            </Button>
          </Link>
        ) : null}
      </div>

      {/* RISK TILES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* MEOWS MATERNITY TILE */}
        {isMaternity ? (
          <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 ${
            meows.flag === 'RED_ALERT' ? 'bg-red-950 border-red-500 text-red-200' :
            meows.flag === 'YELLOW_ALERT' ? 'bg-amber-950 border-amber-500 text-amber-200' :
            'bg-slate-800 border-slate-700 text-slate-300'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider">MEOWS Maternal Score</span>
              <HeartPulse size={16} />
            </div>
            <p className="text-2xl font-black">{meows.score}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest">{meows.flag === 'RED_ALERT' ? '⚠️ High Preeclampsia / Hemorrhage Flag' : 'Maternal Status Stable'}</p>
          </div>
        ) : null}

        {/* qSOFA SEPSIS RISK TILE */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 ${
          qsofa.isSepsisRisk ? 'bg-red-950 border-red-500 text-red-200 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-300'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider">qSOFA Sepsis Risk</span>
            <ShieldAlert size={16} />
          </div>
          <p className="text-2xl font-black">{qsofa.score} / 3</p>
          <p className="text-[9px] font-bold uppercase tracking-widest">{qsofa.isSepsisRisk ? '🚨 HIGH SEPSIS DETERIORATION RISK' : 'qSOFA Sepsis Negative'}</p>
        </div>

        {/* PECARN PEDIATRIC TILE */}
        {isPediatric ? (
          <div className="p-4 rounded-2xl border bg-slate-800 border-slate-700 text-slate-300 flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider">PECARN Pediatric Triage</span>
              <Baby size={16} />
            </div>
            <p className="text-xl font-black uppercase">{pecarn.triage}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest">Pediatric Emergency Triage Rule</p>
          </div>
        ) : null}

        {/* PREDICTIVE 30-DAY RE-ADMISSION AI TILE */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 ${
          predictiveRisk.readmissionTier === 'CRITICAL' || predictiveRisk.readmissionTier === 'HIGH' 
            ? 'bg-amber-950 border-amber-500 text-amber-200' 
            : 'bg-slate-800 border-slate-700 text-slate-300'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-wider">Predictive Re-admission AI</span>
            <Brain size={16} />
          </div>
          <p className="text-2xl font-black">{predictiveRisk.readmissionRiskPercent}%</p>
          <p className="text-[9px] font-bold uppercase tracking-widest">{predictiveRisk.readmissionTier} 30-DAY RELAPSE RISK</p>
        </div>
      </div>
    </div>
  );
}
