'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video, VideoOff, Mic, MicOff, PhoneOff, ShieldCheck, HeartPulse, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function PatientTelehealthRoomPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [callConnected, setCallConnected] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCallConnected(true);
      toast({ title: "Doctor Joined the Teleconsultation", description: "Your virtual consultation has commenced." });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleLeaveCall = () => {
    toast({ title: "Consultation Ended", description: "Thank you for using GAM_Med Remote Care." });
    router.push('/patient/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6">
      {/* TOP HEADER */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-600 flex items-center justify-center text-white">
            <HeartPulse size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">GAM_Med <span className="text-sky-400">Virtual Care</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session ID: {sessionId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl">
          <div className={`w-2.5 h-2.5 rounded-full ${callConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
          <span className="text-xs font-bold uppercase tracking-wider">{callConnected ? 'Connected with Doctor' : 'Waiting for Doctor...'}</span>
        </div>
      </div>

      {/* MAIN VIDEO CONTAINER */}
      <div className="my-auto w-full max-w-4xl mx-auto h-[500px] bg-slate-900 rounded-[40px] border border-slate-800 overflow-hidden relative shadow-2xl flex items-center justify-center">
        {/* DOCTOR MAIN VIDEO FEED */}
        <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center text-center p-6">
          <div className="w-24 h-24 rounded-full bg-sky-950 border-4 border-sky-500/50 flex items-center justify-center text-sky-300 text-3xl font-black mb-4 shadow-xl">
            DR
          </div>
          <h2 className="text-2xl font-black uppercase">Dr. Shane Gambrah</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Consultant Physician • HD Video Stream</p>
        </div>

        {/* PATIENT LOCAL THUMBNAIL FEED */}
        <div className="absolute top-4 right-4 w-40 h-28 bg-slate-950 border-2 border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
          {isVideoOn ? (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase text-center p-2">
              Your Video (Patient)
            </div>
          ) : (
            <VideoOff size={24} className="text-slate-500" />
          )}
        </div>
      </div>

      {/* BOTTOM CONTROL BAR */}
      <div className="max-w-md mx-auto w-full bg-slate-900 border border-slate-800 p-4 rounded-3xl flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setIsAudioOn(prev => !prev)}
          className={`p-4 rounded-2xl transition-all ${
            isAudioOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          onClick={() => setIsVideoOn(prev => !prev)}
          className={`p-4 rounded-2xl transition-all ${
            isVideoOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <Button
          onClick={handleLeaveCall}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2"
        >
          <PhoneOff size={18} /> End Consultation
        </Button>
      </div>
    </div>
  );
}
