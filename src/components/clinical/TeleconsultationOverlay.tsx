'use client';
import { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Minimize2, Maximize2, Monitor, ShieldCheck, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface TeleconsultationOverlayProps {
  patientId: string;
  patientName: string;
  sessionId?: string;
  onClose?: () => void;
}

export function TeleconsultationOverlay({ patientId, patientName, sessionId = 'TELE-88392', onClose }: TeleconsultationOverlayProps) {
  const { toast } = useToast();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

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

  const toggleVideo = () => {
    setIsVideoOn(prev => !prev);
    toast({ title: isVideoOn ? "Camera Muted" : "Camera Enabled" });
  };

  const toggleAudio = () => {
    setIsAudioOn(prev => !prev);
    toast({ title: isAudioOn ? "Microphone Muted" : "Microphone Enabled" });
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(prev => !prev);
    toast({ title: isScreenSharing ? "Screen Share Ended" : "Screen Sharing Active" });
  };

  const handleEndCall = () => {
    toast({ title: "Teleconsultation Ended", description: "Call duration logged: " + formatTime(callDuration) });
    onClose?.();
  };

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 shadow-2xl rounded-3xl border border-slate-700 bg-slate-950 text-white overflow-hidden ${
        isMinimized 
          ? 'bottom-6 right-6 w-80 h-48' 
          : 'bottom-6 right-6 w-96 md:w-[450px] h-[360px]'
      }`}
    >
      {/* OVERLAY HEADER */}
      <div className="bg-slate-900/90 backdrop-blur px-4 py-3 border-b border-slate-800 flex justify-between items-center cursor-move">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Live Teleconsultation</span>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg">{formatTime(callDuration)}</span>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(prev => !prev)} 
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            title={isMinimized ? "Expand View" : "Minimize to Floating Window"}
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
        </div>
      </div>

      {/* VIDEO STREAMS CONTAINER */}
      <div className="relative w-full h-[calc(100%-110px)] bg-slate-900 flex items-center justify-center">
        {/* REMOTE PATIENT FEED (MAIN) */}
        <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-20 h-20 rounded-full bg-sky-950 border-2 border-sky-500/50 flex items-center justify-center text-sky-300 text-2xl font-black mb-2 shadow-lg">
            {patientName ? patientName.split(' ').map(n => n[0]).join('') : 'PT'}
          </div>
          <p className="text-sm font-black uppercase">{patientName}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Patient Remote Feed • HD Video Stream</p>
        </div>

        {/* LOCAL DOCTOR FEED (THUMBNAIL) */}
        <div className="absolute top-3 right-3 w-28 h-20 bg-slate-950 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-xl flex items-center justify-center">
          {isVideoOn ? (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase text-center p-1">
              Doctor Feed
            </div>
          ) : (
            <VideoOff size={18} className="text-slate-500" />
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
          >
            {isAudioOn ? <Mic size={16} /> : <MicOff size={16} />}
          </button>

          <button 
            onClick={toggleVideo}
            className={`p-2.5 rounded-2xl font-bold transition-all ${
              isVideoOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
          </button>

          <button 
            onClick={toggleScreenShare}
            className={`p-2.5 rounded-2xl font-bold transition-all ${
              isScreenSharing ? 'bg-sky-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Share Screen with Patient"
          >
            <Monitor size={16} />
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
