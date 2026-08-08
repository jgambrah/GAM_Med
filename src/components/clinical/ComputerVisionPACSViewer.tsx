'use client';
import { useState, useMemo } from 'react';
import { Camera, Sparkles, AlertTriangle, Eye, Layers, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { analyzeUltrasoundBiometrics } from '@/ai/flows/ai-computer-vision';
import { Button } from '@/components/ui/button';

interface ComputerVisionPACSViewerProps {
  patientName?: string;
  scanType?: 'ULTRASOUND' | 'CHEST_XRAY';
}

export function ComputerVisionPACSViewer({ patientName = 'Patient', scanType = 'ULTRASOUND' }: ComputerVisionPACSViewerProps) {
  const [selectedScan, setSelectedScan] = useState<'ULTRASOUND' | 'CHEST_XRAY'>(scanType);
  const [isAiOverlayActive, setIsAiOverlayActive] = useState(true);

  const biometrics = useMemo(() => {
    return analyzeUltrasoundBiometrics();
  }, []);

  return (
    <div className="bg-slate-950 text-white p-6 rounded-[32px] border border-slate-800 space-y-6 shadow-2xl">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber-400 animate-pulse" size={20} />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">Bedside Obstetric Ultrasound & PACS Computer Vision</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Automated Fetal Biometrics &PACS Diagnostic Overlay</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAiOverlayActive(prev => !prev)}
            className={`rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 ${
              isAiOverlayActive ? 'bg-sky-950 text-sky-300 border-sky-700' : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <Eye size={14} /> {isAiOverlayActive ? 'AI Overlay Active 👁️' : 'Show Raw DICOM'}
          </Button>

          <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setSelectedScan('ULTRASOUND')}
              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                selectedScan === 'ULTRASOUND' ? 'bg-purple-600 text-white' : 'text-slate-400'
              }`}
            >
              Obstetric USS
            </button>
            <button
              onClick={() => setSelectedScan('CHEST_XRAY')}
              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                selectedScan === 'CHEST_XRAY' ? 'bg-sky-600 text-white' : 'text-slate-400'
              }`}
            >
              Chest X-Ray
            </button>
          </div>
        </div>
      </div>

      {/* VIEWPORT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* DICOM SCAN CANVAS WITH AI BOUNDING BOXES */}
        <div className="md:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 p-4 h-80 flex flex-col justify-between relative overflow-hidden group">
          {/* SIMULATED SCAN BACKGROUND */}
          <div className="absolute inset-0 bg-slate-950 opacity-90 flex items-center justify-center">
            {selectedScan === 'ULTRASOUND' ? (
              <div className="text-center space-y-2">
                <Camera size={64} className="text-slate-800 mx-auto animate-pulse" />
                <span className="text-xs font-black uppercase text-slate-600">DICOM Obstetric Ultrasound Stream</span>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <Layers size={64} className="text-slate-800 mx-auto animate-pulse" />
                <span className="text-xs font-black uppercase text-slate-600">Digital Chest Radiograph (PA View)</span>
              </div>
            )}
          </div>

          {/* AI BOUNDING BOX OVERLAYS */}
          {isAiOverlayActive && selectedScan === 'ULTRASOUND' && (
            <div className="absolute inset-8 border-2 border-dashed border-amber-400/80 rounded-3xl pointer-events-none p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                  BPD: {biometrics.bpdMm} mm | HC: {biometrics.hcMm} mm
                </span>
                <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                  FL: {biometrics.flMm} mm (GA: 31w4d)
                </span>
              </div>

              <div className="text-center">
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg">
                  Fetal Presentation: {biometrics.fetalPresentation} • Placenta: {biometrics.placentaLocation}
                </span>
              </div>
            </div>
          )}

          {isAiOverlayActive && selectedScan === 'CHEST_XRAY' && (
            <div className="absolute top-12 right-12 w-36 h-36 border-2 border-red-500/80 rounded-2xl pointer-events-none p-2 animate-pulse">
              <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase">
                Right Lower Lobe Consolidation (92%)
              </span>
            </div>
          )}

          {/* CANVAS FOOTER */}
          <div className="relative z-10 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
            <span>Patient: {patientName}</span>
            <span>AI Confidence: {(biometrics.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* BIOMETRICS & DIAGNOSTIC REPORT SIDEBAR */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
          {selectedScan === 'ULTRASOUND' ? (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1 border-b border-slate-800 pb-2">
                <Sparkles size={14} /> Fetal Biometrics Auto-Report
              </h4>

              <div className="space-y-2 text-xs font-bold">
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Biparietal Diameter (BPD):</span>
                  <span className="text-white font-black">{biometrics.bpdMm} mm</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Head Circumference (HC):</span>
                  <span className="text-white font-black">{biometrics.hcMm} mm</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Abdominal Circumference (AC):</span>
                  <span className="text-white font-black">{biometrics.acMm} mm</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-400">Femur Length (FL):</span>
                  <span className="text-white font-black">{biometrics.flMm} mm</span>
                </div>

                <div className="p-3 bg-purple-950/80 rounded-2xl border border-purple-800 space-y-1 mt-2">
                  <p className="text-[10px] text-purple-300 uppercase font-black">Estimated Fetal Weight (EFW):</p>
                  <p className="text-xl font-black text-white">{biometrics.estimatedFetalWeightGrams} grams</p>
                  <p className="text-[9px] text-purple-200 uppercase">Gestational Age: {biometrics.estimatedGestationalAgeWeeks} Weeks</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-sky-400 tracking-wider flex items-center gap-1 border-b border-slate-800 pb-2">
                <Sparkles size={14} /> PACS Radiographic AI Analysis
              </h4>

              <div className="p-3 bg-red-950/80 rounded-2xl border border-red-800 space-y-1">
                <span className="text-[10px] font-black text-red-300 uppercase flex items-center gap-1">
                  <AlertTriangle size={12} /> Pulmonary Radiologic Finding:
                </span>
                <p className="text-xs font-black text-white uppercase">Right Lower Lobe Consolidation</p>
                <p className="text-[9px] text-red-200 italic">Matches localized lobar pneumonia protocol.</p>
              </div>
            </div>
          )}

          <Button className="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2">
            <CheckCircle2 size={14} /> Auto-Pre-Fill Gestational Report
          </Button>
        </div>
      </div>
    </div>
  );
}
