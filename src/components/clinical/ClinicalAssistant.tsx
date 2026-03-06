'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { useParams } from 'next/navigation';
import { doc, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { 
  BrainCircuit, Send, X, Sparkles, 
  Loader2 
} from 'lucide-react';
import { askClinicalAssistant, type ClinicalAssistantInput } from '@/ai/flows/ai-clinical-assistant';

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

export function ClinicalAssistant() {
  const { user } = useUser();
  const { id: patientId } = useParams(); // Automatically detect if we are in a patient folder
  const firestore = useFirestore();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  // Fetch patient context (last 5 encounters)
  const encountersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.hospitalId || !patientId || Array.isArray(patientId)) return null;
    return query(collection(firestore, 'hospitals', userProfile.hospitalId, 'patients', patientId as string, 'encounters'), orderBy('createdAt', 'desc'), limit(5));
  }, [firestore, userProfile?.hospitalId, patientId]);
  const { data: encounters, isLoading: areEncountersLoading } = useCollection(encountersQuery);
  
  // Fetch patient lab results
  const labResultsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.hospitalId || !patientId || Array.isArray(patientId)) return null;
    return query(
        collection(firestore, `hospitals/${userProfile.hospitalId}/lab_orders`), 
        where('patientId', '==', patientId), 
        where('status', '==', 'COMPLETED'), 
        limit(3)
    );
  }, [firestore, userProfile?.hospitalId, patientId]);
  const { data: labResults, isLoading: areLabsLoading } = useCollection(labResultsQuery);


  const patientContext = useMemo(() => {
    if ((areEncountersLoading || areLabsLoading) && patientId) return "Loading patient data...";
    if (!patientId) return "No patient context available. Global mode active.";
    
    const history = encounters?.map(d => ({ 
      date: d.createdAt?.toDate().toDateString(),
      notes: d.chiefComplaint,
      diagnosis: d.diagnosis,
      vitals: d.vitals 
    }));

    const labs = labResults?.map(d => ({ test: d.testName, result: d.resultValue }));

    if ((!history || history.length === 0) && (!labs || labs.length === 0)) {
        return "No recent clinical records for this patient.";
    }

    return `
      PATIENT CLINICAL CONTEXT:
      Recent Encounters: ${JSON.stringify(history || [])}
      Recent Lab Results: ${JSON.stringify(labs || [])}
    `;
  }, [encounters, labResults, areEncountersLoading, areLabsLoading, patientId]);

  const handleSend = async () => {
    if (!input.trim() || !userProfile) return;

    const userMessage: Message = { role: 'user', content: input };

    // Format previous messages for the AI's history
    const history = messages.slice(-4).map(m => ({
        role: m.role === 'user' ? 'user' : 'model' as const,
        parts: [{ text: m.content }]
    }));

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        const assistantInput: ClinicalAssistantInput = {
            prompt: input,
            patientContext,
            userRole: userProfile.role,
            hospitalId: userProfile.hospitalId,
            fullName: userProfile.fullName,
            history: history, // Pass the formatted history
        };
        const response = await askClinicalAssistant(assistantInput);
        const assistantMessage: Message = { role: 'assistant', content: response.text };
        setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
        console.error("AI Assistant Error:", error);
        const errorMessage: Message = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };
  
  if (!user) return null; // Don't show for logged-out users

  return (
    <div className="fixed bottom-8 right-8 z-50 font-bold print:hidden">
      {isOpen ? (
        <div className="bg-white w-[380px] h-[550px] rounded-[32px] border-4 border-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* AI Header */}
          <div className="bg-[#0f172a] p-5 text-white flex justify-between items-center border-b-4 border-blue-600">
             <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl animate-pulse"><BrainCircuit size={20}/></div>
                <p className="text-xs font-black uppercase tracking-widest italic">GamMed <span className="text-blue-400">Intelligence</span></p>
             </div>
             <button onClick={() => setIsOpen(false)}><X size={20} className="text-slate-400 hover:text-white"/></button>
          </div>

          {/* Chat Flow */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
             <div className="bg-blue-100 p-4 rounded-2xl rounded-tl-none text-[11px] text-blue-900 leading-relaxed">
                Hello {user.displayName?.split(' ')[0]}, I am your clinical co-pilot. {patientId ? "I have analyzed the current patient's history." : "How can I help you navigate GamMed today?"}
             </div>
             {messages.map((msg, i) => (
               <div key={i} className={`p-4 rounded-2xl text-[11px] max-w-[85%] ${msg.role === 'user' ? 'bg-white border-2 border-slate-200 ml-auto rounded-tr-none text-black' : 'bg-blue-600 text-white rounded-tl-none shadow-md'}`}>
                 <p dangerouslySetInnerHTML={{ __html: msg.content.replace(/\\n/g, '<br />') }} />
               </div>
             ))}
             {isLoading && <Loader2 className="animate-spin text-blue-600 mx-auto" />}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t">
             <div className="relative">
                <input 
                  className="w-full p-4 pr-12 bg-slate-100 rounded-2xl border-none outline-none text-black text-xs font-bold"
                  placeholder="Ask about treatment or navigation..."
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend} disabled={isLoading || !input} className="absolute right-2 top-2 bg-blue-600 text-white p-2 rounded-xl hover:bg-black transition-all disabled:bg-slate-300">
                  <Send size={18} />
                </button>
             </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-[#0f172a] hover:bg-blue-600 text-white p-5 rounded-full shadow-2xl flex items-center gap-3 group transition-all"
        >
           <Sparkles className="group-hover:rotate-12 transition-transform text-blue-400" />
           <span className="uppercase text-[10px] tracking-widest font-black">AI Clinical Assistant</span>
        </button>
      )}
    </div>
  );
}
