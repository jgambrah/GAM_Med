'use client';
import { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Minimize2, Maximize2, Monitor, Link as LinkIcon, Check, Copy } from 'lucide-react';
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
  patientPhone,
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
  const [streamActive, setStreamActive] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // 1. Live Camera Feed Acquisition
  useEffect(() => {
    async function startWebcam() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          setStreamActive(true);
        }
      } catch (err) {
        console.warn('Webcam permission not granted or unavailable:', err);
        setStreamActive(false);
      }
    }

    if (isVideoOn) {
      startWebcam();
    }

    return () => {
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

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => (track.enabled = !isVideoOn));
    }
    setIsVideoOn(prev => !prev);
    toast({ title: !isVideoOn ? "Camera Enabled" : "Camera Muted" });
  };

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => (track.enabled = !isAudioOn));
    }
    setIsAudioOn(prev => !prev);
    toast({ title: !isAudioOn ? "Microphone Unmuted" : "Microphone Muted" });
  };

  const copyPatientLink = () => {
    const patientUrl = `${window.location.origin}/patient/telehealth/${sessionId}`;
    navigator.clipboard.writeText(patientUrl);
    setCopiedLink(true);
    toast({ 
      title: "Patient Video Link Copied! 🔗", 
      description: `Send this link to the patient: ${patientUrl}` 
    });
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleEndCall = () => {
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
          : 'bottom-6 right-6 w-96 md:w-[460px] h-[380px]'
      }`}
    >
      {/* OVERLAY HEADER */}
      <div className="bg-slate-900/90 backdrop-blur px-4 py-3 border-b border-slate-800 flex justify-between items-center cursor-move">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Live Video Call</span>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg">{formatTime(callDuration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyPatientLink}
            className="text-[10px] font-black uppercase bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all"
            title="Copy Video Link for Patient"
          >
            {copiedLink ? <Check size={12} /> : <Copy size={12} />}
            {copiedLink ? "Copied!" : "Patient Link"}
          </button>

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
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Patient Feed • Waiting for Remote Cam</p>
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

          <button 
            onClick={copyPatientLink}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Copy Patient Join Link"
          >
            <LinkIcon size={16} />
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
