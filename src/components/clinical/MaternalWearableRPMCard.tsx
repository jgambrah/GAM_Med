'use client';
import { useState, useMemo } from 'react';
import { Watch, Activity, ShieldAlert, Sparkles, RefreshCw, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, Zap, Heart, CheckCircle2 } from 'lucide-react';
import { evaluateWearableCGMPayload, generateSimulatedWearablePayload, WearableCGMPayload } from '@/ai/flows/ai-telemetry-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface MaternalWearableRPMCardProps {
  patientName?: string;
  defaultExpanded?: boolean;
}

export function MaternalWearableRPMCard({ patientName = 'Patient', defaultExpanded = false }: MaternalWearableRPMCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isSyncing, setIsSyncing] = useState(false);
  const [payload, setPayload] = useState<WearableCGMPayload>(generateSimulatedWearablePayload());

  const cgmHistory = useMemo(() => [
    { time: '02:00 AM', value: 4.8, status: 'NORMAL' },
    { time: '04:00 AM', value: 4.2, status: 'NORMAL' },
    { time: '06:00 AM', value: 5.1, status: 'NORMAL' },
    { time: '08:00 AM (Breakfast)', value: 8.4, status: 'HIGH' },
    { time: '10:00 AM', value: 6.8, status: 'NORMAL' },
    { time: '12:00 PM (Lunch)', value: 7.4, status: 'NORMAL' },
    { time: '02:00 PM', value: payload.glucoseMmol, status: payload.glucoseMmol > 7.8 ? 'HIGH' : payload.glucoseMmol < 3.9 ? 'LOW' : 'NORMAL' },
  ], [payload.glucoseMmol]);

  const rpmAlert = useMemo(() => {
    return evaluateWearableCGMPayload(payload);
  }, [payload]);

  const handleSyncWearable = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const fresh = generateSimulatedWearablePayload();
      setPayload(fresh);
      setIsSyncing(false);
      toast({
        title: '⌚ Wearable & CGM Synced',
        description: `Updated ${patientName}'s Continuous Glucose (${fresh.glucoseMmol} mmol/L) & Heart Rate (${fresh.maternalPulse} bpm).`
      });
    }, 800);
  };

  const handleTriggerTriageCall = () => {
    toast({
      title: '🚨 Urgent Maternal Triage Callback Queued',
      description: `Notified Duty Midwife to initiate telehealth outreach for ${patientName}.`
    });
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-pink-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-pink-950/40 hover:bg-pink-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-pink-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-900/80 rounded-2xl border border-pink-700 text-pink-300">
            <Watch className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-pink-300">Patient Wearable & Home Sensor Monitoring (RPM)</h3>
              <span className="bg-pink-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                <Sparkles size={10} /> CGM & SMARTWATCH SYNC
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Device: {payload.deviceId} • Patient: {patientName} • Remote Maternal Safety Net
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border ${
            rpmAlert.status === 'NOCTURNAL_HYPO' || rpmAlert.status === 'MATERNAL_HYPERTENSION'
              ? 'bg-red-600 text-white border-red-400 animate-bounce'
              : rpmAlert.status === 'POSTPRANDIAL_SPIKE'
              ? 'bg-amber-500 text-black border-amber-300'
              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
          }`}>
            Glucose: {payload.glucoseMmol} mmol/L ({payload.glucoseTrend})
          </span>

          <Button size="sm" variant="ghost" className="text-pink-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Wearable RPM'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE RPM DASHBOARD */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* TOP METRICS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CONTINUOUS GLUCOSE METRIC */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[9px] font-black uppercase flex items-center gap-1"><Sparkles size={12} className="text-pink-400" /> Dexcom CGM Glucose</span>
                <span className="text-[8px] font-black text-pink-400 uppercase">mmol/L</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-4xl font-black tracking-tighter ${
                  payload.glucoseMmol > 7.8 ? 'text-amber-400' : payload.glucoseMmol < 3.9 ? 'text-red-500 animate-pulse' : 'text-pink-300'
                }`}>
                  {payload.glucoseMmol}
                </p>
                <span className="text-xs font-black uppercase text-pink-400 italic">Trend: {payload.glucoseTrend}</span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase pt-1">Pregnancy Target Zone: 3.9 - 7.8 mmol/L</p>
            </div>

            {/* MATERNAL HEART RATE */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[9px] font-black uppercase flex items-center gap-1"><Heart size={12} className="text-red-400 animate-pulse" /> Smartwatch PPG Pulse</span>
                <span className="text-[8px] font-black text-red-400 uppercase">bpm</span>
              </div>
              <p className="text-4xl font-black tracking-tighter text-red-300">{payload.maternalPulse}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase pt-1">Target Resting HR: 60 - 100 bpm</p>
            </div>

            {/* AMBULATORY BLOOD PRESSURE */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[9px] font-black uppercase flex items-center gap-1"><Zap size={12} className="text-amber-400" /> Ambulatory BP</span>
                <span className="text-[8px] font-black text-amber-400 uppercase">mmHg</span>
              </div>
              <p className="text-3xl font-black tracking-tighter text-amber-300">
                {payload.ambulatorySystolicBp || 124}/{payload.ambulatoryDiastolicBp || 80}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase pt-1">Pre-Eclampsia Risk Threshold: 140/90</p>
            </div>
          </div>

          {/* 24-HOUR CGM GLUCOSE CURVE FLOW */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase text-pink-400 tracking-wider flex items-center gap-2">
              <Activity size={14} /> 24-Hour Continuous Glucose Trend Curve (CGM)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {cgmHistory.map((point, idx) => (
                <div key={idx} className={`p-3 rounded-xl border text-center ${
                  point.status === 'HIGH' 
                    ? 'bg-amber-950/60 border-amber-700 text-amber-200'
                    : point.status === 'LOW'
                    ? 'bg-red-950/60 border-red-700 text-red-200'
                    : 'bg-slate-950 border-slate-800 text-slate-200'
                }`}>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{point.time}</p>
                  <p className="text-lg font-black mt-1 tracking-tighter">{point.value} <span className="text-[9px] font-semibold">mmol/L</span></p>
                </div>
              ))}
            </div>
          </div>

          {/* ALERT GUIDANCE BANNER */}
          <div className={`p-5 rounded-2xl border-2 space-y-2 ${
            rpmAlert.status === 'NOCTURNAL_HYPO' || rpmAlert.status === 'MATERNAL_HYPERTENSION'
              ? 'bg-red-950/90 border-red-500 text-red-100'
              : rpmAlert.status === 'POSTPRANDIAL_SPIKE'
              ? 'bg-amber-950/90 border-amber-500 text-amber-100'
              : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
          }`}>
            <div className="flex items-center gap-2">
              <ShieldAlert className={rpmAlert.status === 'NOCTURNAL_HYPO' ? 'text-red-400 animate-pulse' : 'text-emerald-400'} size={20} />
              <h4 className="text-xs font-black uppercase tracking-wider">{rpmAlert.title}</h4>
            </div>
            <p className="text-xs font-bold leading-relaxed">{rpmAlert.clinicalGuidance}</p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleSyncWearable}
                disabled={isSyncing}
                className="bg-pink-600 hover:bg-pink-500 text-white font-black text-xs uppercase rounded-xl flex items-center gap-1.5 shadow-lg"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing Wearable...' : '⌚ Sync Patient Wearable & CGM Data'}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleTriggerTriageCall}
                className="border-pink-500 text-pink-300 hover:bg-pink-950 rounded-xl font-black text-xs uppercase flex items-center gap-1.5"
              >
                <ShieldAlert size={14} /> Trigger Maternal Triage Call
              </Button>
            </div>

            <p className="text-[10px] font-bold text-slate-500 uppercase">
              Apple HealthKit • Google Health Connect • Dexcom API Synced ({payload.lastSyncTime})
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
