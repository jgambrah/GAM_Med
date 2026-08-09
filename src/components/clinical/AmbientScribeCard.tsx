'use client';
import { useState, useRef, useMemo } from 'react';
import { Mic, MicOff, Play, Pause, Sparkles, CheckCircle2, FileText, Activity, ShieldCheck, Clock, ArrowRight, Zap, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import {
  generateSOAPFromTranscript,
  getDefaultAmbientTranscript,
  AmbientTranscriptChunk,
  SOAPNoteDraft,
  EvidenceTimestamp
} from '@/ai/flows/ai-ambient-scribe-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AmbientScribeCardProps {
  patientName?: string;
  onTransferSOAP?: (soap: SOAPNoteDraft) => void;
  defaultExpanded?: boolean;
}

export function AmbientScribeCard({
  patientName = 'Patient',
  onTransferSOAP,
  defaultExpanded = false
}: AmbientScribeCardProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  const [chunks, setChunks] = useState<AmbientTranscriptChunk[]>(getDefaultAmbientTranscript());
  const [soap, setSoap] = useState<SOAPNoteDraft>(generateSOAPFromTranscript(getDefaultAmbientTranscript(), patientName));

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      const freshSOAP = generateSOAPFromTranscript(chunks, patientName);
      setSoap(freshSOAP);
      toast({
        title: '🎙️ Ambient Scribe Session Completed',
        description: `Generated clinical SOAP draft for ${patientName} with audio evidence timestamps.`
      });
    } else {
      setIsRecording(true);
      toast({
        title: '🎙️ Ambient Consultation Scribe Active',
        description: 'Passively listening to doctor-patient dialogue in background...'
      });
    }
  };

  const jumpToTimestamp = (seconds: number) => {
    setAudioCurrentTime(seconds);
    setIsPlayingAudio(true);
    toast({
      title: `🔊 Audio Evidence Verified: [00:${seconds < 10 ? '0' : ''}${seconds}]`,
      description: `Jumping playback to exact audio timestamp.`
    });
  };

  const handleTransfer = () => {
    if (onTransferSOAP) {
      onTransferSOAP(soap);
    }
    toast({
      title: '⚡ SOAP Note Transferred to Encounter Chart',
      description: `Subjective, Objective, Assessment, and Plan fields auto-filled.`
    });
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-emerald-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-emerald-950/40 hover:bg-emerald-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-emerald-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-900/80 rounded-2xl border border-emerald-700 text-emerald-300">
            <Mic className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-300">Ambient Clinical Intelligence (ACI) AI Scribe</h3>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-600 text-white'
              }`}>
                {isRecording ? '🎙️ PASSIVE LISTENING ACTIVE' : 'PASSIVE AMBIENT MODE'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Hands-Free Consultation Dictation • Auto-Generated SOAP Notes • Click-to-Verify Timestamps
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full uppercase">
            {chunks.length} Dialogue Chunks Captured
          </span>
          <Button size="sm" variant="ghost" className="text-emerald-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand ACI Scribe'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE AMBIENT SCRIBE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* TOP TOOLBAR: RECORDING CONTROL & AUDIO PLAYER */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                onClick={toggleRecording}
                className={`font-black text-xs uppercase rounded-xl flex items-center gap-2 shadow-lg transition-all ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse ring-4 ring-red-500/30' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                {isRecording ? '⏸️ Stop & Generate SOAP Note' : '🎙️ Start Consultation Scribe'}
              </Button>

              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {isRecording ? '🔊 Listening to doctor-patient dialogue...' : 'Ready for ambient consult'}
              </span>
            </div>

            {/* AUDIO EVIDENCE VERIFICATION BAR */}
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 w-full md:w-auto">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsPlayingAudio(prev => !prev)}
                className="text-emerald-400 font-black text-xs uppercase h-7 px-2"
              >
                {isPlayingAudio ? <Pause size={14} /> : <Play size={14} />}
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-emerald-400">AUDIO VERIFIER:</span>
                <span className="text-[10px] font-bold text-slate-300">00:{audioCurrentTime < 10 ? '0' : ''}{audioCurrentTime} / 02:40</span>
              </div>
            </div>
          </div>

          {/* MAIN DECK: DRAFT SOAP NOTE & EVIDENCE TIMESTAMPS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT 2 COLS: GENERATED SOAP NOTE */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <FileText size={14} /> AI-Generated Draft SOAP Note ({patientName}):
                </h4>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleTransfer}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl h-7 px-3 flex items-center gap-1.5 shadow-lg"
                >
                  <Zap size={12} /> Auto-Fill Encounter Chart
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold">
                {/* SUBJECTIVE */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-indigo-400">Subjective (S)</span>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line text-[11px]">{soap.subjective}</p>
                </div>

                {/* OBJECTIVE */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-cyan-400">Objective (O)</span>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line text-[11px]">{soap.objective}</p>
                </div>

                {/* ASSESSMENT */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-400">Assessment (A)</span>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line text-[11px]">{soap.assessment}</p>
                </div>

                {/* PLAN */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Plan (P)</span>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line text-[11px]">{soap.plan}</p>
                </div>
              </div>
            </div>

            {/* RIGHT COL: CLICK-TO-VERIFY EVIDENCE TIMESTAMPS */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <ShieldCheck size={14} /> Click-to-Verify Audio Evidence
              </h4>

              <div className="space-y-2">
                {soap.evidence.map((ev, idx) => (
                  <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-purple-300 uppercase">{ev.claim}</span>
                      <button
                        onClick={() => jumpToTimestamp(ev.timestampSeconds)}
                        className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 transition-all"
                      >
                        <Clock size={10} /> [{ev.timestampFormatted}] Play
                      </button>
                    </div>
                    <p className="text-[10px] italic text-slate-400 font-medium">"{ev.verbatimQuote}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
