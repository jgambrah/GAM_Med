'use client';
import { useState, useMemo } from 'react';
import { Mic, FileText, Trash2, Copy, Sparkles, ChevronDown, ChevronUp, Clock, Plus, Check } from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface DictatedNotesCardProps {
  patientId?: string;
  hospitalId?: string;
  patientName?: string;
  defaultExpanded?: boolean;
}

export function DictatedNotesCard({
  patientId,
  hospitalId: propHospitalId,
  patientName = 'Patient',
  defaultExpanded = true
}: DictatedNotesCardProps) {
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

  // Query live dictated notes from Firestore
  const notesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !effectivePatientId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/dictated_notes`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId, effectivePatientId]);
  const { data: dbNotes } = useCollection<any>(notesQuery);

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [manualText, setManualText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddManualNote = () => {
    if (!manualText.trim()) return;

    const noteId = `NOTE-${Date.now()}`;
    if (firestore && hospitalId && effectivePatientId) {
      const noteRef = doc(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/dictated_notes/${noteId}`);
      setDocumentNonBlocking(noteRef, {
        patientId: effectivePatientId,
        patientName,
        text: manualText.trim(),
        authorName: user?.displayName || userProfile?.name || 'Attending Physician',
        source: 'MANUAL_ENTRY',
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    toast({
      title: '🎙️ Dictated Note Added',
      description: `Dictation saved into patient folder for ${patientName}.`
    });
    setManualText('');
  };

  const handleDeleteNote = (noteId: string) => {
    if (firestore && hospitalId && effectivePatientId) {
      const noteRef = doc(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/dictated_notes/${noteId}`);
      deleteDocumentNonBlocking(noteRef);
      toast({
        title: '🗑️ Dictated Note Deleted',
        description: 'Removed note from patient record.'
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

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-indigo-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-indigo-950/40 hover:bg-indigo-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-indigo-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-900/80 rounded-2xl border border-indigo-700 text-indigo-300">
            <Mic className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-300">Hands-Free Voice Dictations Vault</h3>
              <span className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase">
                {dbNotes ? dbNotes.length : 0} NOTES CAPTURED
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Live Voice Dictation Repository • Clinical Audit Trail • Saved Speech-to-Text Transcripts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-indigo-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Dictations Vault'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE DICTATION VAULT */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* QUICK DICTATION ADD BAR */}
          <div className="flex gap-2">
            <input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddManualNote()}
              placeholder="Or type/paste dictation note manually..."
              className="flex-1 p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 font-medium"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddManualNote}
              disabled={!manualText.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase rounded-2xl px-4 flex items-center gap-1.5 shadow-lg disabled:opacity-50"
            >
              <Plus size={14} /> Add Dictation
            </Button>
          </div>

          {/* LIST OF CAPTURED DICTATED NOTES */}
          <div className="space-y-3">
            {dbNotes && dbNotes.length > 0 ? (
              dbNotes.map((n: any) => (
                <div key={n.id} className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2 relative group hover:border-indigo-500/50 transition-all">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-900/80 text-indigo-300 px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-indigo-700">
                        <Sparkles size={10} /> {n.source === 'HANDS_FREE_VOICE' ? '🎙️ Voice Dictation' : '📝 Manual Note'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">By: {n.authorName || 'Attending Doctor'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyNote(n.id, n.text)}
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-all text-xs font-bold flex items-center gap-1"
                        title="Copy to Clipboard"
                      >
                        {copiedId === n.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span className="text-[9px]">{copiedId === n.id ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-all"
                        title="Delete Note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 font-medium leading-relaxed whitespace-pre-line">
                    "{n.text}"
                  </p>

                  <div className="flex justify-between items-center pt-1 text-[9px] font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> Recorded at {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just Now'}
                    </span>
                    <span className="uppercase text-indigo-400">Patient: {patientName}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 text-center space-y-2">
                <Mic size={24} className="mx-auto text-indigo-400 animate-pulse" />
                <p className="text-xs font-bold text-slate-400">No hands-free dictations recorded yet for {patientName}.</p>
                <p className="text-[10px] text-slate-500">
                  Activate the floating mic toolbar and say: <span className="text-indigo-300 italic font-mono">"GAM_Med dictate note patient presented with severe headache"</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
