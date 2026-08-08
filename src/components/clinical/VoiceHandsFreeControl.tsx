'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, X, Check, Zap, FileText, Image as ImageIcon, Activity } from 'lucide-react';
import { parseVoiceCommand, speakVoiceResponse, VoiceCommandResult } from '@/ai/flows/ai-voice-assistant';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface VoiceHandsFreeControlProps {
  patientName?: string;
  onExecuteIntent?: (result: VoiceCommandResult) => void;
}

export function VoiceHandsFreeControl({ patientName = 'Patient', onExecuteIntent }: VoiceHandsFreeControlProps) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);

          const finalResult = event.results[event.results.length - 1];
          if (finalResult.isFinal) {
            const parsed = parseVoiceCommand(currentTranscript, patientName);
            setLastResult(parsed);
            speakVoiceResponse(parsed.feedbackText);
            
            toast({
              title: `🎙️ Voice Command: ${parsed.intent}`,
              description: parsed.feedbackText
            });

            if (onExecuteIntent) {
              onExecuteIntent(parsed);
            }
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech Recognition Warning:', err);
        };

        recognition.onend = () => {
          if (isListening) {
            try {
              recognition.start();
            } catch (e) {
              // Ignore restart error
            }
          }
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
      }
    }
  }, [patientName, onExecuteIntent, isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      // Demo voice command trigger if native browser recognition is absent
      const sampleText = 'show latest blood test results';
      setTranscript(sampleText);
      const parsed = parseVoiceCommand(sampleText, patientName);
      setLastResult(parsed);
      speakVoiceResponse(parsed.feedbackText);
      if (onExecuteIntent) onExecuteIntent(parsed);
      toast({
        title: '🎙️ Hands-Free Voice Command Executed',
        description: parsed.feedbackText
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast({
        title: '🎙️ Hands-Free Voice Control Paused',
        description: 'Mic muted in operating theatre.'
      });
    } else {
      setTranscript('');
      setLastResult(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
        speakVoiceResponse(`Hands free voice control active for ${patientName}`);
        toast({
          title: '🎙️ Hands-Free Voice Control Active',
          description: 'Listening for voice commands in sterile environment...'
        });
      } catch (e) {
        setIsListening(true);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-auto">
      {/* TRANSCRIPT & INTENT FEEDBACK POPUP */}
      {(transcript || lastResult) && (
        <div className="bg-slate-950/90 text-white p-4 rounded-2xl border border-indigo-500/50 shadow-2xl backdrop-blur-md max-w-sm w-full space-y-2 animate-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-[10px] font-black uppercase text-indigo-400 flex items-center gap-1.5">
              <Sparkles size={12} className="animate-pulse" /> Hands-Free Voice Command
            </span>
            <button onClick={() => { setTranscript(''); setLastResult(null); }} className="text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>

          {transcript && (
            <p className="text-xs italic text-slate-300 font-medium">"{transcript}"</p>
          )}

          {lastResult && (
            <div className="p-2.5 bg-indigo-950/80 rounded-xl border border-indigo-800 space-y-1">
              <span className="text-[9px] font-black uppercase text-indigo-300 bg-indigo-900/80 px-2 py-0.5 rounded-md">
                Intent: {lastResult.intent}
              </span>
              <p className="text-xs font-bold text-white">{lastResult.feedbackText}</p>
            </div>
          )}
        </div>
      )}

      {/* FLOATING VOICE MIC BUTTON */}
      <Button
        type="button"
        onClick={toggleListening}
        className={`h-14 px-5 rounded-full font-black text-xs uppercase flex items-center gap-3 shadow-2xl transition-all border-2 ${
          isListening 
            ? 'bg-red-600 hover:bg-red-500 text-white border-red-400 animate-pulse ring-4 ring-red-500/30' 
            : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400'
        }`}
      >
        {isListening ? <Mic size={20} className="animate-bounce" /> : <MicOff size={20} />}
        <span>{isListening ? '🎙️ Voice Control Active' : '🎙️ Enable Hands-Free Voice'}</span>
        <span className="bg-slate-900/60 text-[9px] px-2 py-0.5 rounded-full border border-white/20">
          {isListening ? 'LISTENING' : 'STERILE MODE'}
        </span>
      </Button>
    </div>
  );
}
