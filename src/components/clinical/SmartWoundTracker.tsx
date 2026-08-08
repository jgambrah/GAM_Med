'use client';
import { useState, useRef, useMemo } from 'react';
import { Camera, Sparkles, Activity, ShieldCheck, CheckCircle2, TrendingUp, Scissors } from 'lucide-react';
import { analyzeSurgicalWound } from '@/ai/flows/ai-computer-vision';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface SmartWoundTrackerProps {
  patientName?: string;
}

export function SmartWoundTracker({ patientName = 'Patient' }: SmartWoundTrackerProps) {
  const [uploadedWoundImage, setUploadedWoundImage] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedWoundImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
        setUploadedWoundImage(dataUrl);
      }
    }
    stopLiveWebcam();
  };

  const woundData = useMemo(() => {
    return analyzeSurgicalWound(uploadedWoundImage || undefined);
  }, [uploadedWoundImage]);

  return (
    <div className="bg-slate-900 text-white p-6 rounded-[32px] border border-slate-800 space-y-6 shadow-xl">
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
              <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-2">
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
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2"
              >
                <Camera size={16} /> 📸 Snap Wound Photo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <Scissors className="text-emerald-400" size={20} />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">Computer Vision Surgical Wound & Lesion Tracker</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Post-Caesarean / Surgical Healing Surface Area & Tissue Health Metrics</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={startLiveWebcam}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg"
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

          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1">
            <ShieldCheck size={14} /> Infection Risk: {woundData.infectionRiskTier}
          </span>
        </div>
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
