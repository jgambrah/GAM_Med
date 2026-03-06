
'use client';
import { useState, useRef, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { 
  BrainCircuit, Send, X, Sparkles, 
  Loader2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


type Message = {
    role: 'user' | 'assistant';
    content: string;
};

export function ClinicalAssistant() {
  const { user } = useUser();
  const { id: patientId } = useParams(); // Automatically detect if we are in a patient folder
  const firestore = useFirestore();
  const { toast } = useToast();

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

  const handleSend = async () => {
    if (!input.trim() || !userProfile) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // THE FIX: 
      // 1. Filter the chat to remove the initial "Greeting" if it's the first item.
      // 2. Map roles to 'user' and 'model' (Gemini requirement).
      const formattedHistory = messages
        .filter((msg, index) => !(index === 0 && msg.role === 'assistant')) // Skip first greeting
        .slice(-6) // Take last 6 for efficiency
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));
      
      const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: input, 
            history: formattedHistory,
            patientId: Array.isArray(patientId) ? patientId[0] : patientId || null,
            userRole: userProfile?.role,
            fullName: userProfile?.fullName
          }),
      });

      if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'API request failed');
      }

      const data = await res.json();
      const assistantMessage: Message = { role: 'assistant', content: data.text };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      toast({
        variant: "destructive",
        title: "Assistant Error",
        description: "Assistant disconnected. Check internet or API key.",
      });
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
                Hello Dr. {userProfile?.fullName?.split(' ')[0]}, I am your clinical co-pilot. I have analyzed this patient's data. How should we proceed with management?
             </div>
             {messages.map((msg, i) => (
               <div key={i} className={'p-4 rounded-2xl text-[11px] max-w-[85%] ' + (msg.role === 'user' ? 'bg-white border-2 border-slate-200 ml-auto rounded-tr-none text-black' : 'bg-blue-600 text-white rounded-tl-none shadow-md')}>
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
