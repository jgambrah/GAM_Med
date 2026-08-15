'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Activity, X, Loader2, Heart, Thermometer, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VitalsCaptureModalProps {
  encounter?: {
    id: string;
    patientId?: string;
    patientName?: string;
    ehrId?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  hospitalId?: string;
}

export default function VitalsCaptureModal({ encounter, isOpen, onClose, onSuccess, hospitalId }: VitalsCaptureModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [vitals, setVitals] = useState({
    temperature: '',
    bpSystolic: '',
    bpDiastolic: '',
    pulse: '',
    respRate: '',
    spO2: '',
    weight: '',
    height: ''
  });

  // 1. Auto-Calculate BMI
  const bmi = useMemo(() => {
    if (vitals.weight && vitals.height) {
      const w = parseFloat(vitals.weight);
      const h = parseFloat(vitals.height);
      if (h > 0) return (w / (h * h)).toFixed(1);
    }
    return '--';
  }, [vitals.weight, vitals.height]);

  // 2. Clinical Threshold Flags
  const getAlertLevel = (type: string, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val)) return 'NORMAL';

    switch (type) {
      case 'TEMP':
        return val > 38.0 ? 'HIGH' : val < 35.0 ? 'LOW' : 'NORMAL';
      case 'BPSYS':
        return val >= 140 ? 'HIGH' : val <= 90 ? 'LOW' : 'NORMAL';
      case 'SPO2':
        return val < 95 ? 'LOW' : 'NORMAL';
      case 'PULSE':
        return val > 100 ? 'HIGH' : val < 60 ? 'LOW' : 'NORMAL';
      default:
        return 'NORMAL';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVitals({ ...vitals, [e.target.name]: e.target.value });
  };

  if (!isOpen || !encounter) return null;

  const patientName = encounter.patientName || 'PATIENT';
  const patientEhr = encounter.ehrId || 'MMH/EHR/26/0007';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch('/api/nurse/triage/save-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: encounter.patientId || encounter.id,
          encounterId: encounter.id,
          vitals: {
            ...vitals,
            bmi,
          },
          hospitalId: hospitalId || 'GAM-GAR-7578',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save vitals.');
      }

      toast({
        title: data.isCritical ? "🚨 Critical Alert Flagged & Vitals Recorded" : "✅ Vitals Recorded & Routed",
        description: `Vitals recorded. ${patientName} routed to Consultation.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Save Vitals Failed",
        description: error.message || "Failed to record clinical vitals.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="bg-slate-950 text-white p-6 shrink-0 border-b border-slate-800 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-emerald-400">
              <Activity size={22} />
              <h2 className="text-xl font-black italic uppercase tracking-wider text-white">CLINICAL TRIAGE & VITALS</h2>
            </div>
            <p className="text-slate-400 font-mono text-xs font-bold mt-1">{patientEhr} | {patientName}</p>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 flex-1 space-y-6 text-slate-900 dark:text-slate-100">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Blood Pressure Card */}
            <div className="md:col-span-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3">Blood Pressure (mmHg)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="bpSystolic"
                    required
                    placeholder="Sys"
                    value={vitals.bpSystolic}
                    onChange={handleChange}
                    className={`w-full p-3 text-center text-lg font-mono font-black border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none ${
                      getAlertLevel('BPSYS', vitals.bpSystolic) === 'HIGH' 
                        ? 'bg-red-500/10 text-red-400 border-red-500/50' 
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800'
                    }`}
                  />
                  <span className="text-xl text-slate-400 font-light">/</span>
                  <input
                    type="number"
                    name="bpDiastolic"
                    required
                    placeholder="Dia"
                    value={vitals.bpDiastolic}
                    onChange={handleChange}
                    className="w-full p-3 text-center text-lg font-mono font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {getAlertLevel('BPSYS', vitals.bpSystolic) === 'HIGH' && (
                <div className="text-[10px] font-black text-red-400 uppercase flex items-center gap-1 mt-3">
                  <AlertCircle size={12} />
                  <span>Stage 1/2 Hypertension</span>
                </div>
              )}
            </div>

            {/* Core Vitals Grid */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  name="temperature"
                  required
                  placeholder="36.5"
                  value={vitals.temperature}
                  onChange={handleChange}
                  className={`w-full p-3 text-xs font-mono font-black border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none ${
                    getAlertLevel('TEMP', vitals.temperature) !== 'NORMAL' 
                      ? 'bg-red-500/10 text-red-400 border-red-500/50' 
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Pulse (bpm)</label>
                <input
                  type="number"
                  name="pulse"
                  required
                  placeholder="72"
                  value={vitals.pulse}
                  onChange={handleChange}
                  className="w-full p-3 text-xs font-mono font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">SpO2 (%)</label>
                <input
                  type="number"
                  name="spO2"
                  required
                  placeholder="98"
                  value={vitals.spO2}
                  onChange={handleChange}
                  className={`w-full p-3 text-xs font-mono font-black border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none ${
                    getAlertLevel('SPO2', vitals.spO2) === 'LOW' 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/50' 
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Resp. Rate (cpm)</label>
                <input
                  type="number"
                  name="respRate"
                  placeholder="16"
                  value={vitals.respRate}
                  onChange={handleChange}
                  className="w-full p-3 text-xs font-mono font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Anthropometrics Section */}
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              Anthropometrics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  name="weight"
                  placeholder="70.5"
                  value={vitals.weight}
                  onChange={handleChange}
                  className="w-full p-3 text-xs font-mono font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Height (m)</label>
                <input
                  type="number"
                  step="0.01"
                  name="height"
                  placeholder="1.75"
                  value={vitals.height}
                  onChange={handleChange}
                  className="w-full p-3 text-xs font-mono font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3 flex flex-col justify-center items-center">
                <label className="block text-[10px] font-black text-indigo-400 uppercase mb-0.5">Auto BMI</label>
                <span className="text-2xl font-black text-indigo-400 font-mono">{bmi}</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Automated Clinical Threshold Alerting</span>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="px-6 py-3 font-bold text-xs uppercase rounded-xl"
              >
                CANCEL
              </Button>

              <Button 
                type="submit" 
                disabled={isSaving} 
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>SAVING VITALS...</span>
                  </>
                ) : (
                  'SAVE & ROUTE TO DOCTOR'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
