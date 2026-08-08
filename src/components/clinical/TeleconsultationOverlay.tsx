'use client';
import { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Minimize2, Maximize2, Monitor, Link as LinkIcon, Check, Copy, Share2, MessageSquare, Smartphone, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface TeleconsultationOverlayProps {
  patientId: string;
  patientName: string;
  patientPhone?: string;
  sessionId?: string;
  onClose?: () => void;
}

export function TeleconsultationOverlay({ 
  patientId, 
  patientName, 
  patientPhone = '+233240000000',
  sessionId = 'TELE-88392', 
  onClose 
}: TeleconsultationOverlayProps) {
  const { toast } = useToast();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100% audio signal meter

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 1. Live Camera & Microphone Media Stream + Audio Signal Meter
  useEffect(() => {
    async function startMedia() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          mediaStreamRef.current = stream;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          // Web Audio API Microphone Level Signal Monitor
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioContext;
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioMeter = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const levelPercent = Math.min(100, Math.round((average / 128) * 100));
            setAudioLevel(levelPercent);
            animFrameRef.current = requestAnimationFrame(updateAudioMeter);
          };
          updateAudioMeter();
        }
      } catch (err) {
        console.warn('Media devices permission notice:', err);
      }
    }

    if (isVideoOn || isAudioOn) {
      startMedia();
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 2. Call Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getPatientUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/patient/telehealth/${sessionId}`;
  };

  const copyPatientLink = () => {
    const url = getPatientUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast({ 
      title: "🔗 Telehealth Link Copied!", 
      description: `Link copied: ${url}` 
    });
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const shareViaWhatsApp = () => {
    const url = getPatientUrl();
    const message = encodeURIComponent(`Hello ${patientName}, your Dr. Shane Gambrah teleconsultation is starting. Please join via this secure video link: ${url}`);
    window.open(`https://wa.me/${patientPhone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
    toast({ title: "WhatsApp Share Launched 💬", description: "Opening WhatsApp with pre-filled consultation invitation." });
  };

  const shareViaSMS = () => {
    const url = getPatientUrl();
    const message = encodeURIComponent(`GAM_Med Telehealth: Please click to join your live video consultation with Dr. Shane Gambrah: ${url}`);
    window.open(`sms:${patientPhone}?body=${message}`, '_blank');
    toast({ title: "SMS Dispatch Triggered 📱", description: `Sending SMS invitation to ${patientPhone}` });
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach(track => (track.enabled = !isVideoOn));
    }
    setIsVideoOn(prev => !prev);
    toast({ title: !isVideoOn ? "Camera Enabled" : "Camera Muted" });
  };

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => (track.enabled = !isAudioOn));
    }
    setIsAudioOn(prev => !prev);
    toast({ title: !isAudioOn ? "Microphone Unmuted" : "Microphone Muted" });
  };

  const handleEndCall = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    toast({ title: "Teleconsultation Ended", description: "Call duration logged: " + formatTime(callDuration) });
    onClose?.();
  };

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 shadow-2xl rounded-3xl border border-slate-700 bg-slate-950 text-white overflow-hidden ${
        isMinimized 
          ? 'bottom-6 right-6 w-80 h-48' 
          : 'bottom-6 right-6 w-96 md:w-[480px] h-[420px]'
      }`}
    >
      {/* OVERLAY HEADER */}
      <div className="bg-slate-900/90 backdrop-blur px-4 py-3 border-b border-slate-800 flex justify-between items-center cursor-move">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Live Video Call</span>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg">{formatTime(callDuration)}</span>
        </div>

        {/* MICROPHONE SIGNAL METER */}
        <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
          <Volume2 size={12} className={isAudioOn && audioLevel > 5 ? "text-emerald-400 animate-pulse" : "text-slate-500"} />
          <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-75 ${
                audioLevel > 60 ? 'bg-red-500' : audioLevel > 30 ? 'bg-amber-400' : 'bg-emerald-400'
              }`} 
              style={{ width: `${isAudioOn ? audioLevel : 0}%` }}
            />
          </div>
          <span className="text-[9px] font-black text-slate-300">{isAudioOn ? `${audioLevel}%` : 'MUTED'}</span>
        </div>

        <button 
          onClick={() => setIsMinimized(prev => !prev)} 
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          title={isMinimized ? "Expand View" : "Minimize Window"}
        >
          {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
      </div>

      {/* SHARE INVITATION LINK BAR */}
      <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
          <Share2 size={12} className="text-sky-400" /> Share Patient Link:
        </span>
        
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyPatientLink}
            className="text-[9px] font-black uppercase bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all shadow-sm"
          >
            {copiedLink ? <Check size={11} /> : <Copy size={11} />}
            {copiedLink ? "Copied" : "Copy Link"}
          </button>

          <button
            onClick={shareViaWhatsApp}
            className="text-[9px] font-black uppercase bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all shadow-sm"
          >
            <MessageSquare size={11} /> WhatsApp
          </button>

          <button
            onClick={shareViaSMS}
            className="text-[9px] font-black uppercase bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all shadow-sm"
          >
            <Smartphone size={11} /> SMS
          </button>
        </div>
      </div>

      {/* VIDEO STREAMS CONTAINER */}
      <div className="relative w-full h-[calc(100%-150px)] bg-slate-900 flex items-center justify-center">
        {/* REMOTE PATIENT FEED (MAIN) */}
        <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-20 h-20 rounded-full bg-sky-950 border-2 border-sky-500/50 flex items-center justify-center text-sky-300 text-2xl font-black mb-2 shadow-lg">
            {patientName ? patientName.split(' ').map(n => n[0]).join('') : 'PT'}
          </div>
          <p className="text-sm font-black uppercase">{patientName}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Patient Feed • Waiting for Remote Camera</p>
        </div>

        {/* LOCAL DOCTOR LIVE WEBCAM FEED (PICTURE-IN-PICTURE THUMBNAIL) */}
        <div className="absolute top-3 right-3 w-32 h-24 bg-slate-950 border-2 border-sky-500/80 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
          {isVideoOn ? (
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <VideoOff size={20} className="text-slate-500" />
          )}
        </div>
      </div>

      {/* OVERLAY CONTROL BAR */}
      <div className="bg-slate-900 px-4 py-3 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleAudio}
            className={`p-2.5 rounded-2xl font-bold transition-all ${
              isAudioOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-600 text-white'
            }`}
            title={isAudioOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isAudioOn ? <Mic size={16} /> : <MicOff size={16} />}
          </button>

          <button 
            onClick={toggleVideo}
            className={`p-2.5 rounded-2xl font-bold transition-all ${
              isVideoOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-600 text-white'
            }`}
            title={isVideoOn ? "Turn Off Camera" : "Turn On Camera"}
          >
            {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
          </button>
        </div>

        <Button 
          onClick={handleEndCall}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2"
        >
          <PhoneOff size={14} /> End Call
        </Button>
      </div>
    </div>
  );
}
