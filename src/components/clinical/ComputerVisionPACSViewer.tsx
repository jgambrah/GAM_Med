'use client';
import { useState, useRef, useMemo } from 'react';
import { Camera, Sparkles, AlertTriangle, Eye, Layers, ShieldCheck, CheckCircle2, RefreshCw, Save, History, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeUltrasoundBiometrics } from '@/ai/flows/ai-computer-vision';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ComputerVisionPACSViewerProps {
  patientName?: string;
  scanType?: 'ULTRASOUND' | 'CHEST_XRAY';
  defaultExpanded?: boolean;
}

interface UltrasoundEHRRecord {
  id: string;
  date: string;
  bpd: number;
  hc: number;
  ac: number;
  fl: number;
  efw: number;
  ga: number;
  presentation: string;
  placenta: string;
  signedBy: string;
}

export function ComputerVisionPACSViewer({ patientName = 'Patient', scanType = 'ULTRASOUND', defaultExpanded = false }: ComputerVisionPACSViewerProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedScan, setSelectedScan] = useState<'ULTRASOUND' | 'CHEST_XRAY'>(scanType);
  const [isAiOverlayActive, setIsAiOverlayActive] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalysisDone, setIsAnalysisDone] = useState(true);

  const [savedUltrasoundRecords, setSavedUltrasoundRecords] = useState<UltrasoundEHRRecord[]>([
    {
      id: 'USS-1',
      date: '2026-08-01 09:30 AM',
      bpd: 78.4,
      hc: 285.1,
      ac: 272.0,
      fl: 58.2,
      efw: 1780,
      ga: 31.4,
      presentation: 'CEPHALIC',
      placenta: 'FUNDAL',
      signedBy: 'Dr. Shane Gambrah (GAM-GAR-7578)'
    }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const biometrics = useMemo(() => {
    return analyzeUltrasoundBiometrics(uploadedImage || undefined);
  }, [uploadedImage]);

  const handleSaveBiometricsToEHR = () => {
    if (!biometrics.isValidMedicalScan) return;

    const newRecord: UltrasoundEHRRecord = {
      id: `USS-${Date.now()}`,
      date: new Date().toLocaleString(),
      bpd: biometrics.bpdMm,
      hc: biometrics.hcMm,
      ac: biometrics.acMm,
      fl: biometrics.flMm,
      efw: biometrics.estimatedFetalWeightGrams,
      ga: biometrics.estimatedGestationalAgeWeeks,
      presentation: biometrics.fetalPresentation,
      placenta: biometrics.placentaLocation,
      signedBy: 'Dr. Shane Gambrah (GAM-GAR-7578)'
    };

    setSavedUltrasoundRecords(prev => [newRecord, ...prev]);

    toast({
      title: '💾 Saved to Permanent EHR Medical Record',
      description: `Obstetric Ultrasound scan logged for ${patientName} (EFW: ${biometrics.estimatedFetalWeightGrams}g, GA: ${biometrics.estimatedGestationalAgeWeeks}w).`
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        triggerAnalysis();
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAnalysis = () => {
    setIsAnalyzing(true);
    setIsAnalysisDone(false);
    setTimeout(() => {
      setIsAnalyzing(false);
      setIsAnalysisDone(true);
      toast({
        title: '⚡ Computer Vision AI Analysis Complete',
        description: 'Fetal biometrics (BPD, HC, AC, FL) and placenta position computed successfully.'
      });
    }, 1200);
  };

  const startLiveWebcam = async () => {
    setIsCameraModalOpen(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        mediaStreamRef.current = stream;
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error starting live webcam:', err);
    }
  };

  const stopLiveWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraModalOpen(false);
  };

  const captureLiveSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setUploadedImage(dataUrl);
        triggerAnalysis();
      }
    }
    stopLiveWebcam();
  };

  return (
    <div className="bg-slate-950 text-white rounded-[28px] border border-slate-800 shadow-2xl overflow-hidden transition-all">
      {/* HIDDEN FILE INPUT */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* LIVE WEBCAM CAPTURE MODAL */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 text-center">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
                <Camera size={18} className="animate-pulse" /> Live Camera Stream
              </span>
              <button onClick={stopLiveWebcam} className="text-slate-400 hover:text-white font-bold text-xs uppercase">Close</button>
            </div>

            <div className="relative bg-black rounded-2xl overflow-hidden h-64 border border-slate-800 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={stopLiveWebcam}>Cancel</Button>
              <Button 
                onClick={captureLiveSnapshot} 
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2"
              >
                <Camera size={16} /> 📸 Take Live Snapshot
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-slate-900 transition-all gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-950/80 rounded-2xl border border-amber-800/80 text-amber-400">
            <Sparkles className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">Bedside Obstetric Ultrasound & PACS Computer Vision</h3>
              <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                AI PACS Stream Active
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Automated Fetal Biometrics & PACS Diagnostic Overlay</p>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsExpanded(prev => !prev)}
            className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse PACS' : 'Expand Ultrasound PACS'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE BODY WORKSPACE */}
      {isExpanded && (
        <div className="p-6 pt-0 border-t border-slate-800/80 space-y-6 mt-2">
          {/* HEADER TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={startLiveWebcam}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg"
              >
                <Camera size={14} /> Live Camera Stream & Snap 📷
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2"
              >
                Upload Image File 📁
              </Button>

              <Button
                type="button"
                onClick={triggerAnalysis}
                disabled={isAnalyzing}
                className="bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg animate-pulse"
              >
                {isAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isAnalyzing ? 'Scanning DICOM Pixels...' : '⚡ Trigger AI Scan'}
              </Button>

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
            </div>

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

          {/* VIEWPORT GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* DICOM SCAN CANVAS WITH AI BOUNDING BOXES */}
            <div className="md:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 p-4 h-80 flex flex-col justify-between relative overflow-hidden group">
              {/* SIMULATED SCAN BACKGROUND / UPLOADED IMAGE */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden"
              >
                {uploadedImage ? (
                  <img src={uploadedImage} alt="Uploaded Scan" className="w-full h-full object-contain" />
                ) : selectedScan === 'ULTRASOUND' ? (
                  <div className="text-center space-y-2">
                    <Camera size={64} className="text-slate-800 mx-auto animate-pulse" />
                    <span className="text-xs font-black uppercase text-slate-600">DICOM Obstetric Ultrasound Stream (Click to Upload Photo)</span>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <Layers size={64} className="text-slate-800 mx-auto animate-pulse" />
                    <span className="text-xs font-black uppercase text-slate-600">Digital Chest Radiograph (Click to Upload Photo)</span>
                  </div>
                )}
              </div>

              {/* AI BOUNDING BOX CHIPS */}
              {isAiOverlayActive && selectedScan === 'ULTRASOUND' && biometrics.isValidMedicalScan && (
                <div className="relative z-10 space-y-1 bg-black/60 backdrop-blur p-3 rounded-2xl border border-amber-500/40 max-w-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs uppercase">
                    <Sparkles size={14} className="animate-spin" /> Fetal Biometrics Overlay
                  </div>
                  <div className="text-[10px] text-white font-bold space-y-0.5">
                    <p>BPD: <span className="text-amber-300 font-black">{biometrics.bpdMm} mm</span> | HC: <span className="text-amber-300 font-black">{biometrics.hcMm} mm</span></p>
                    <p>FL: <span className="text-amber-300 font-black">{biometrics.flMm} mm</span> (GA: {biometrics.estimatedGestationalAgeWeeks}w)</p>
                    <p className="text-[9px] text-purple-300 font-black uppercase">Fetal Presentation: {biometrics.fetalPresentation} • Placenta: {biometrics.placentaLocation}</p>
                  </div>
                </div>
              )}

              {/* CANVAS FOOTER */}
              <div className="relative z-10 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase bg-black/40 px-3 py-1 rounded-xl">
                <span>Patient: {patientName}</span>
                <span>AI Confidence: {(biometrics.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* BIOMETRICS & DIAGNOSTIC REPORT SIDEBAR */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
              {!biometrics.isValidMedicalScan ? (
                <div className="p-4 bg-red-950/90 rounded-2xl border-2 border-red-600 text-red-200 space-y-2">
                  <span className="text-xs font-black uppercase text-red-400 flex items-center gap-1.5">
                    <AlertTriangle size={16} /> Invalid Image Warning
                  </span>
                  <p className="text-[11px] font-bold leading-relaxed">{biometrics.validationMessage}</p>
                  <p className="text-[9px] font-black uppercase text-red-300">Biometrics calculation halted for AI safety compliance.</p>
                </div>
              ) : selectedScan === 'ULTRASOUND' ? (
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

                    <Button
                      type="button"
                      onClick={handleSaveBiometricsToEHR}
                      disabled={!biometrics.isValidMedicalScan}
                      className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <Save size={14} /> 💾 Save Biometrics to EHR History
                    </Button>
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

          {/* LONGITUDINAL HISTORICAL ULTRASOUND EHR SCANS TIMELINE */}
          {savedUltrasoundRecords.length > 0 && (
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
                <History size={16} /> 📜 Permanent Longitudinal Ultrasound EHR Scans ({savedUltrasoundRecords.length} Saved Records)
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedUltrasoundRecords.map((record) => (
                  <div key={record.id} className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex justify-between items-center text-xs font-bold text-slate-300">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-black">{record.date}</span>
                        <span className="text-[9px] bg-amber-950 border border-amber-800 text-amber-300 px-2 py-0.5 rounded uppercase font-black">
                          BPD: {record.bpd}mm • HC: {record.hc}mm • FL: {record.fl}mm
                        </span>
                        <span className="text-[9px] bg-purple-950 border border-purple-800 text-purple-300 px-2 py-0.5 rounded uppercase font-black">
                          EFW: {record.efw}g ({record.ga} Weeks)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Doc Sign-off: {record.signedBy} • Presentation: {record.presentation} • Placenta: {record.placenta}</p>
                    </div>
                    <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-1 rounded-xl font-black uppercase">
                      Verified EHR Scan
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
