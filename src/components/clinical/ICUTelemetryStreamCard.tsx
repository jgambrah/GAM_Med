'use client';
import { useState, useEffect, useMemo } from 'react';
import { Activity, Radio, ShieldAlert, Play, Pause, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Zap, Heart, Flame } from 'lucide-react';
import { evaluateBedsideTelemetry, generateSimulatedTelemetryFeed, BedsideTelemetryPayload } from '@/ai/flows/ai-telemetry-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';

interface ICUTelemetryStreamCardProps {
  patientId?: string;
  hospitalId?: string;
  patientName?: string;
  bedName?: string;
  initialVitals?: {
    pulse?: number | string;
    spo2?: number | string;
    systolic?: number | string;
    diastolic?: number | string;
    respiration?: number | string;
    temp?: number | string;
  };
  defaultExpanded?: boolean;
}

export function ICUTelemetryStreamCard({
  patientId,
  hospitalId: propHospitalId,
  patientName = 'Patient',
  bedName = 'Bed ICU-04',
  initialVitals,
  defaultExpanded = false
}: ICUTelemetryStreamCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const params = useParams();
  const effectivePatientId = patientId || (params?.id as string);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = propHospitalId || userProfile?.hospitalId;

  // Real-time Firestore IoT Telemetry Stream Document Listener
  const liveTelemetryRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !effectivePatientId) return null;
    return doc(firestore, `hospitals/${hospitalId}/telemetry_streams/${effectivePatientId}`);
  }, [firestore, hospitalId, effectivePatientId]);
  const { data: liveStreamDoc } = useDoc(liveTelemetryRef);

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isStreaming, setIsStreaming] = useState(true);
  const [overrideTelemetry, setOverrideTelemetry] = useState<BedsideTelemetryPayload | null>(null);
  const [simulatedFeed, setSimulatedFeed] = useState<BedsideTelemetryPayload | null>(null);
  const [hrHistory, setHrHistory] = useState<number[]>([72, 75, 74, 78, 80, 76, 73, 75, 77, 79, 74, 76, 78]);

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      const fresh = generateSimulatedTelemetryFeed();
      setSimulatedFeed(fresh);
      setHrHistory((prev: number[]) => [...prev.slice(-20), fresh.heartRate]);
    }, 2500);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Initialize telemetry baseline from real EHR vitals or live stream doc
  const telemetry = useMemo<BedsideTelemetryPayload>(() => {
    if (overrideTelemetry) return overrideTelemetry;
    if (simulatedFeed) return simulatedFeed;
    if (liveStreamDoc && liveStreamDoc.heartRate) {
      return {
        bedId: bedName,
        patientId: effectivePatientId || 'P-1',
        heartRate: Number(liveStreamDoc.heartRate) || 75,
        spo2: Number(liveStreamDoc.spo2) || 98,
        systolicBp: Number(liveStreamDoc.systolicBp) || 120,
        diastolicBp: Number(liveStreamDoc.diastolicBp) || 80,
        respirationRate: Number(liveStreamDoc.respirationRate) || 16,
        temperature: Number(liveStreamDoc.temperature) || 36.8,
        timestamp: liveStreamDoc.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
    }
    return {
      bedId: bedName,
      patientId: effectivePatientId || 'P-1',
      heartRate: Number(initialVitals?.pulse) || 77,
      spo2: Number(initialVitals?.spo2) || 97,
      systolicBp: Number(initialVitals?.systolic) || 127,
      diastolicBp: Number(initialVitals?.diastolic) || 75,
      respirationRate: Number(initialVitals?.respiration) || 14,
      temperature: Number(initialVitals?.temp) || 36.8,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  }, [overrideTelemetry, simulatedFeed, liveStreamDoc, initialVitals, bedName, effectivePatientId]);

  const alert = useMemo(() => {
    return evaluateBedsideTelemetry(telemetry);
  }, [telemetry]);

  const triggerTestAlarm = () => {
    const criticalPayload: BedsideTelemetryPayload = {
      bedId: bedName,
      patientId: 'P-TEST',
      heartRate: 142,
      spo2: 88,
      systolicBp: 172,
      diastolicBp: 104,
      respirationRate: 28,
      temperature: 38.9,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setOverrideTelemetry(criticalPayload);
    setHrHistory((prev: number[]) => [...prev.slice(-20), 142]);
    toast({
      variant: 'destructive',
      title: '🚨 CRITICAL ICU TELEMETRY ALARM',
      description: 'Hypoxemia (SpO2 88%) and Hypertensive Crisis (172/104 mmHg) detected.'
    });
  };

  // Build SVG path for live sparkline
  const sparklineSvgPath = useMemo(() => {
    if (hrHistory.length === 0) return '';
    const width = 240;
    const height = 40;
    const min = 50;
    const max = 160;
    const step = width / (hrHistory.length - 1 || 1);

    return hrHistory.reduce((acc, val, idx) => {
      const x = idx * step;
      const normalizedY = height - ((val - min) / (max - min)) * height;
      const clampedY = Math.max(2, Math.min(height - 2, normalizedY));
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${clampedY.toFixed(1)}`;
    }, '');
  }, [hrHistory]);

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-cyan-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-cyan-950/40 hover:bg-cyan-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-cyan-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-900/80 rounded-2xl border border-cyan-700 text-cyan-300">
            <Radio className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-cyan-300">Continuous ICU/HDU Telemetry Monitor</h3>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                isStreaming ? 'bg-emerald-500 text-black animate-pulse' : 'bg-amber-500 text-black'
              }`}>
                <Activity size={10} /> {isStreaming ? 'LIVE 60FPS STREAMING' : 'STREAM PAUSED'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Location: {bedName} • Patient: {patientName} • Auto-Logging Flowsheet Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border ${
            alert.severity === 'CRITICAL' 
              ? 'bg-red-600 text-white border-red-400 animate-bounce' 
              : alert.severity === 'WARNING'
              ? 'bg-amber-500 text-black border-amber-300'
              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
          }`}>
            NEWS2: {alert.news2Score} • MEOWS: {alert.meowsScore}
          </span>

          <Button size="sm" variant="ghost" className="text-cyan-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Telemetry'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE TELEMETRY DASHBOARD */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* DIGITAL VITALS TILES GRID */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* HEART RATE */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[9px] font-black uppercase flex items-center gap-1"><Heart size={12} className="text-red-500 animate-ping" /> Heart Rate</span>
                <span className="text-[8px] font-black text-red-400 uppercase">bpm</span>
              </div>
              <p className="text-3xl font-black tracking-tighter text-white">{telemetry.heartRate}</p>
              <div className="pt-1">
                <svg width="100%" height="24" className="overflow-visible">
                  <path d={sparklineSvgPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* SPO2 */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[9px] font-black uppercase flex items-center gap-1"><Activity size={12} className="text-cyan-400" /> Pulse SpO2</span>
                <span className="text-[8px] font-black text-cyan-400 uppercase">% O2</span>
              </div>
              <p className={`text-3xl font-black tracking-tighter ${telemetry.spo2 < 92 ? 'text-red-500 animate-pulse' : 'text-cyan-300'}`}>
                {telemetry.spo2}<span className="text-sm font-semibold opacity-60">%</span>
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase pt-2">Target: 95-100%</p>
            </div>

            {/* BLOOD PRESSURE */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[9px] font-black uppercase flex items-center gap-1"><Zap size={12} className="text-amber-400" /> NIBP</span>
                <span className="text-[8px] font-black text-amber-400 uppercase">mmHg</span>
              </div>
              <p className="text-2xl font-black tracking-tighter text-amber-300">{telemetry.systolicBp}/{telemetry.diastolicBp}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase pt-2">MAP: {Math.round((telemetry.systolicBp + 2 * telemetry.diastolicBp) / 3)} mmHg</p>
            </div>

            {/* RESPIRATION */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[9px] font-black uppercase">Resp Rate</span>
                <span className="text-[8px] font-black text-indigo-400 uppercase">rpm</span>
              </div>
              <p className="text-3xl font-black tracking-tighter text-indigo-300">{telemetry.respirationRate}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase pt-2">Target: 12-20 rpm</p>
            </div>

            {/* TEMPERATURE */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[9px] font-black uppercase flex items-center gap-1"><Flame size={12} className="text-orange-400" /> Temp</span>
                <span className="text-[8px] font-black text-orange-400 uppercase">°C</span>
              </div>
              <p className="text-3xl font-black tracking-tighter text-orange-300">{telemetry.temperature}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase pt-2">Last Sync: {telemetry.timestamp}</p>
            </div>
          </div>

          {/* EARLY WARNING SCORE & ALARM BANNER */}
          <div className={`p-5 rounded-2xl border-2 space-y-2 ${
            alert.severity === 'CRITICAL'
              ? 'bg-red-950/90 border-red-500 text-red-100'
              : alert.severity === 'WARNING'
              ? 'bg-amber-950/90 border-amber-500 text-amber-100'
              : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
          }`}>
            <div className="flex items-center gap-2">
              <ShieldAlert className={alert.severity === 'CRITICAL' ? 'text-red-400 animate-pulse' : 'text-emerald-400'} size={20} />
              <h4 className="text-xs font-black uppercase tracking-wider">{alert.title}</h4>
            </div>
            <p className="text-xs font-bold leading-relaxed">{alert.warningMessage}</p>
            <div className="p-3 bg-black/40 rounded-xl">
              <p className="text-[9px] font-black uppercase text-cyan-300">Clinical Protocol Directive:</p>
              <p className="text-xs font-bold text-white mt-0.5">{alert.recommendedAction}</p>
            </div>
          </div>

          {/* TELEMETRY STREAM ACTION TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsStreaming(prev => !prev)}
                className={`font-black text-xs uppercase rounded-xl flex items-center gap-1.5 ${
                  isStreaming ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isStreaming ? <Pause size={14} /> : <Play size={14} />}
                {isStreaming ? 'Pause Stream' : 'Resume Telemetry Stream'}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={triggerTestAlarm}
                className="border-red-600 text-red-400 hover:bg-red-950 rounded-xl font-black text-xs uppercase flex items-center gap-1.5"
              >
                <AlertCircle size={14} /> Simulate Critical Alarm
              </Button>
            </div>

            <p className="text-[10px] font-bold text-slate-500 uppercase">
              ⚡ MQTT Telemetry Protocol • HL7 v2 OBX Stream Active
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
