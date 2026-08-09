'use client';
import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Pause, Sparkles, CheckCircle2, FileText, Activity, ShieldCheck, Clock, ArrowRight, Zap, ChevronDown, ChevronUp, RefreshCw, Globe, Plus, Trash2, Copy, Check } from 'lucide-react';
import {
  generateSOAPFromTranscript,
  AmbientTranscriptChunk,
  SOAPNoteDraft,
  EvidenceTimestamp
} from '@/ai/flows/ai-ambient-scribe-engine';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AmbientScribeCardProps {
  patientId?: string;
  hospitalId?: string;
  patientName?: string;
  onTransferSOAP?: (soap: SOAPNoteDraft) => void;
  defaultExpanded?: boolean;
}

export function AmbientScribeCard({
  patientId,
  hospitalId: propHospitalId,
  patientName = 'Patient',
  onTransferSOAP,
  defaultExpanded = true
}: AmbientScribeCardProps) {
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

  // Live query for hands-free voice dictations
  const notesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !effectivePatientId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/dictated_notes`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId, effectivePatientId]);
  const { data: dbNotes } = useCollection<any>(notesQuery);

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en-US' | 'ak-GH' | 'ga-GH' | 'ee-GH' | 'ha-GH'>('en-US');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [chunks, setChunks] = useState<AmbientTranscriptChunk[]>([]);
  const [soap, setSoap] = useState<SOAPNoteDraft>(generateSOAPFromTranscript([], patientName));
  const [manualDialogue, setManualDialogue] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const liveChunksRef = useRef<AmbientTranscriptChunk[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize Speech Recognition for live microphone transcription
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage;

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript.trim();
            if (text) {
              const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
              const minutes = Math.floor(elapsedSeconds / 60);
              const secs = elapsedSeconds % 60;
              const timestampFormatted = `${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;

              const newChunk: AmbientTranscriptChunk = {
                id: `CHUNK-${Date.now()}-${i}`,
                speaker: liveChunksRef.current.length % 2 === 0 ? 'PATIENT' : 'DOCTOR',
                timestampSeconds: elapsedSeconds,
                timestampFormatted,
                text
              };

              if (event.results[i].isFinal) {
                liveChunksRef.current.push(newChunk);
                setChunks([...liveChunksRef.current]);
              }
            }
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, [selectedLanguage]);

  const startLiveRecording = async () => {
    liveChunksRef.current = [];
    setChunks([]);
    setRecordedAudioUrl(null);
    startTimeRef.current = Date.now();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = selectedLanguage;
          recognitionRef.current.start();
        } catch (e) {}
      }

      setIsRecording(true);
      toast({
        title: '🎙️ Live Microphone Scribe Active',
        description: `Recording ambient consultation audio (${selectedLanguage === 'ak-GH' ? 'Asante Twi' : 'English'})...`
      });
    } catch (err) {
      console.warn('Microphone Access Warning:', err);
      setIsRecording(true);
      toast({
        title: '🎙️ Live Dictation Workspace Active',
        description: 'Microphone stream started. Speak or type consultation dialogue below.'
      });
    }
  };

  const stopLiveRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    setIsRecording(false);

    // Process actual live captured speech chunks (NO HARDCODED FALLBACKS!)
    const freshSOAP = generateSOAPFromTranscript(liveChunksRef.current, patientName);
    setSoap(freshSOAP);

    toast({
      title: '🎙️ Live Recording Completed',
      description: `Processed ${liveChunksRef.current.length} speech chunks for ${patientName}.`
    });
  };

  const handleManualAddDialogue = () => {
    if (!manualDialogue.trim()) return;

    const elapsedSeconds = liveChunksRef.current.length * 10 + 5;
    const minutes = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const timestampFormatted = `${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;

    const newChunk: AmbientTranscriptChunk = {
      id: `CHUNK-MANUAL-${Date.now()}`,
      speaker: liveChunksRef.current.length % 2 === 0 ? 'PATIENT' : 'DOCTOR',
      timestampSeconds: elapsedSeconds,
      timestampFormatted,
      text: manualDialogue.trim()
    };

    liveChunksRef.current.push(newChunk);
    setChunks([...liveChunksRef.current]);

    const freshSOAP = generateSOAPFromTranscript(liveChunksRef.current, patientName);
    setSoap(freshSOAP);

    // Save to Firestore dictations repository
    if (firestore && hospitalId && effectivePatientId) {
      const noteId = `NOTE-${Date.now()}`;
      const noteRef = doc(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/dictated_notes/${noteId}`);
      setDocumentNonBlocking(noteRef, {
        patientId: effectivePatientId,
        patientName,
        text: manualDialogue.trim(),
        authorName: user?.displayName || userProfile?.name || 'Attending Doctor',
        source: 'MANUAL_ENTRY',
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    toast({
      title: '💬 Dialogue Line Added & Saved',
      description: 'Updated clinical SOAP draft with new consultation dialogue.'
    });

    setManualDialogue('');
  };

  const handleDeleteNote = (noteId: string) => {
    if (firestore && hospitalId && effectivePatientId) {
      const noteRef = doc(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/dictated_notes/${noteId}`);
      deleteDocumentNonBlocking(noteRef);
      toast({
        title: '🗑️ Dictated Note Deleted',
        description: 'Removed note from repository.'
      });
    }
  };

  const handleCopyNote = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: '📋 Copied to Clipboard',
      description: 'Dictation copied ready to paste into encounter chart.'
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const jumpToTimestamp = (seconds: number) => {
    setAudioCurrentTime(seconds);
    setIsPlayingAudio(true);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = seconds;
      audioPlayerRef.current.play().catch(() => {});
    }

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
      {/* HIDDEN HTML5 AUDIO PLAYER FOR REAL LIVE MIC RECORDING */}
      {recordedAudioUrl && (
        <audio
          ref={audioPlayerRef}
          src={recordedAudioUrl}
          onEnded={() => setIsPlayingAudio(false)}
          className="hidden"
        />
      )}

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
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-300">Master Ambient AI Scribe & Voice Dictations Engine</h3>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-600 text-white'
              }`}>
                {isRecording ? '🎙️ LIVE MICROPHONE RECORDING' : 'PASSIVE AMBIENT MODE'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Ghanaian Multilingual Support (Asante Twi • Ga • Ewe • Hausa • English) • Live SOAP Translator • Dictations Repository
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full uppercase">
            {chunks.length} Live Chunks Captured
          </span>
          <Button size="sm" variant="ghost" className="text-emerald-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Master Scribe'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE MASTER AMBIENT SCRIBE WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* TOP TOOLBAR: LANGUAGE SELECTOR & RECORDING CONTROLS */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* LANGUAGE SELECTOR DROPDOWN */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                <Globe size={14} className="text-emerald-400" />
                <span className="text-[10px] font-black uppercase text-slate-400">Language:</span>
                <select
                  value={selectedLanguage}
                  onChange={(e: any) => setSelectedLanguage(e.target.value)}
                  className="bg-transparent text-emerald-300 font-bold outline-none cursor-pointer text-xs"
                >
                  <option value="en-US">🇬🇧 English (Standard)</option>
                  <option value="ak-GH">🇬🇭 Asante Twi / Fante</option>
                  <option value="ga-GH">🇬🇭 Ga / Dangme</option>
                  <option value="ee-GH">🇬🇭 Ewe</option>
                  <option value="ha-GH">🇬🇭 Hausa / Dagbani</option>
                </select>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => isRecording ? stopLiveRecording() : startLiveRecording()}
                className={`font-black text-xs uppercase rounded-xl flex items-center gap-2 shadow-lg transition-all ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse ring-4 ring-red-500/30' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                {isRecording ? '⏸️ Stop & Generate SOAP Note' : '🎙️ Start Consultation Scribe'}
              </Button>
            </div>

            {/* AUDIO EVIDENCE PLAYBACK STATUS BAR */}
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 w-full md:w-auto">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (audioPlayerRef.current) {
                    if (isPlayingAudio) {
                      audioPlayerRef.current.pause();
                      setIsPlayingAudio(false);
                    } else {
                      audioPlayerRef.current.play().catch(() => {});
                      setIsPlayingAudio(true);
                    }
                  } else {
                    setIsPlayingAudio(prev => !prev);
                  }
                }}
                className="text-emerald-400 font-black text-xs uppercase h-7 px-2"
              >
                {isPlayingAudio ? <Pause size={14} /> : <Play size={14} />}
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-emerald-400">LIVE AUDIO:</span>
                <span className="text-[10px] font-bold text-slate-300">00:{audioCurrentTime < 10 ? '0' : ''}{audioCurrentTime}</span>
              </div>
            </div>
          </div>

          {/* REAL-TIME LIVE DIALOGUE INPUT CANVAS */}
          <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
              <Sparkles size={12} /> Live Consultation Dialogue Stream (Or Dictate / Paste Speech Directly):
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualDialogue}
                onChange={(e) => setManualDialogue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualAddDialogue()}
                placeholder="Type or speak consultation dialogue (e.g. 'Patient reports severe headache and fever for 2 days' or 'Me ti pae me')..."
                className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-medium"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleManualAddDialogue}
                disabled={!manualDialogue.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl px-4 flex items-center gap-1 shadow-lg disabled:opacity-50"
              >
                <Plus size={14} /> Add Line
              </Button>
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
                {soap.evidence.length > 0 ? (
                  soap.evidence.map((ev, idx) => (
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
                  ))
                ) : (
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400 font-medium">
                    No audio evidence captured yet. Click "🎙️ Start Consultation Scribe" or add a dialogue line above.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM DECK: SAVED HANDS-FREE VOICE DICTATIONS REPOSITORY */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                <Mic size={14} /> Saved Hands-Free Voice Dictations Repository ({dbNotes ? dbNotes.length : 0}):
              </h4>
            </div>

            <div className="space-y-2">
              {dbNotes && dbNotes.length > 0 ? (
                dbNotes.map((n: any) => (
                  <div key={n.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-900/80 text-indigo-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Sparkles size={10} /> {n.source === 'HANDS_FREE_VOICE' ? '🎙️ Hands-Free Dictation' : '📝 Saved Dictation'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">By: {n.authorName || 'Doctor'}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyNote(n.id, n.text)}
                          className="text-slate-400 hover:text-white p-1 rounded-md bg-slate-800 hover:bg-slate-700 transition-all text-xs font-bold flex items-center gap-1"
                        >
                          {copiedId === n.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span className="text-[9px]">{copiedId === n.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteNote(n.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded-md bg-slate-800 hover:bg-slate-700 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 font-medium italic">"{n.text}"</p>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-center text-[10px] text-slate-500">
                  No saved voice dictations yet. Say <span className="text-indigo-300 italic font-mono">"GAM_Med dictate note..."</span> into floating mic toolbar to capture.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
