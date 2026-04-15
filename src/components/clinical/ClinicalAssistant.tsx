'use client';
import { useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { useParams } from 'next/navigation';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import {
  BrainCircuit, Send, X, Sparkles,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { askClinicalAssistant, ClinicalAssistantInput, ClinicalAssistantOutput } from '@/ai/flows/ai-clinical-assistant';
import { Encounter } from '@/types/encounter';

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

export function ClinicalAssistant() {
  const { user } = useUser();
  const { id: patientId } = useParams();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
      { role: 'assistant', content: 'Good day, Doctor. I have reviewed the patient file. How can I assist?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  
  const encountersQuery = useMemoFirebase(() => {
    if (!firestore || !patientId || !userProfile?.hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${userProfile.hospitalId}/patients/${patientId}/encounters`), 
      orderBy('createdAt', 'desc'), 
      where('patientId', '==', patientId)
    );
  }, [firestore, patientId, userProfile?.hospitalId]);
  const { data: allEncounters } = useCollection<Encounter>(encountersQuery);

  const formatResponse = (output: ClinicalAssistantOutput): string => {
    let response = `${output.summary}\n\n`;
    if (output.riskLevel) response += `**Risk Level:** ${output.riskLevel}\n\n`;
    if (output.possibleConditions?.length > 0) response += `**Possible Conditions:**\n- ${output.possibleConditions.join('\n- ')}\n\n`;
    if (output.keyConcerns?.length > 0) response += `**Key Concerns:**\n- ${output.keyConcerns.join('\n- ')}\n\n`;
    if (output.recommendations?.length > 0) response += `**Recommendations:**\n- ${output.recommendations.join('\n- ')}`;
    return response;
  };

  const handleSend = async () => {
    if (!input.trim() || !userProfile || !allEncounters) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const formattedHistory = messages
        .slice(-6)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model' as 'user' | 'model',
          parts: [{ text: m.content }]
        }));

      const aiInput: ClinicalAssistantInput = {
        prompt: input,
        patientContext: JSON.stringify(allEncounters.slice(0, 5)),
        userRole: userProfile.role || 'Clinician',
        fullName: userProfile.fullName || 'Doctor',
        hospitalId: userProfile.hospitalId || '',
        history: formattedHistory
      };

      const structuredResponse = await askClinicalAssistant(aiInput);
      const responseText = formatResponse(structuredResponse);
      
      const assistantMessage: Message = { role: 'assistant', content: responseText };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      toast({
        variant: "destructive",
        title: "Assistant Error",
        description: "The AI assistant could not be reached. Please check your configuration.",
      });
      const errorMessage: Message = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };
  
  if (!user || !patientId) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 font-bold print:hidden">
      {isOpen ? (
        <div className="bg-white w-[380px] h-[550px] rounded-[32px] border-4 border-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="bg-[#0f172a] p-5 text-white flex justify-between items-center border-b-4 border-blue-600">
             <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl animate-pulse"><BrainCircuit size={20}/></div>
                <p className="text-xs font-black uppercase tracking-widest italic">GamMed <span className="text-blue-400">Intelligence</span></p>
             </div>
             <button onClick={() => setIsOpen(false)}><X size={20} className="text-slate-400 hover:text-white"/></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
             {messages.map((msg, i) => (
               <div key={i} className={'p-4 rounded-2xl text-[11px] max-w-[85%] ' + (msg.role === 'user' ? 'bg-white border-2 border-slate-200 ml-auto rounded-tr-none text-black' : 'bg-blue-600 text-white rounded-tl-none shadow-md')}>
                 <p dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
               </div>
             ))}
             {isLoading && <Loader2 className="animate-spin text-blue-600 mx-auto" />}
          </div>

          <div className="p-4 bg-white border-t">
             <div className="relative">
                <input 
                  className="w-full p-4 pr-12 bg-slate-100 rounded-2xl border-none outline-none text-black text-xs font-bold"
                  placeholder="Ask about this patient..."
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
