'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { AlertTriangle, MessageSquare, ArrowRight, ShieldAlert, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function CashierQueryWall() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  const queriedTillQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `hospitals/${user.uid}/cash_tills`), // This path needs to be correct for the user's hospital
      where("cashierId", "==", user.uid),
      where("status", "==", "QUERIED")
    );
  }, [firestore, user]);

  const { data: queriedTills, isLoading: areTillsLoading } = useCollection(queriedTillQuery);
  const activeQuery = areTillsLoading ? null : (queriedTills && queriedTills.length > 0 ? queriedTills[0] : null);
  
  const handleSubmitExplanation = async () => {
    if (!activeQuery || !explanation.trim()) {
        toast({ variant: 'destructive', title: 'Please provide a full explanation.'});
        return;
    }
    setLoading(true);
    try {
        const tillRef = doc(firestore, `hospitals/${activeQuery.hospitalId}/cash_tills`, activeQuery.id);
        await updateDocumentNonBlocking(tillRef, {
            status: 'EXPLANATION_SUBMITTED',
            cashierExplanation: explanation,
            cashierExplanationAt: serverTimestamp(),
        });
        toast({ title: "Explanation Submitted", description: "Management has been notified and will review your response."});
    } catch(e:any) {
        toast({variant: 'destructive', title: "Submission Failed", description: e.message });
    }
    setLoading(false);
  };
  
  if (areTillsLoading) return <Loader2 className="animate-spin" />;

  if (!activeQuery) {
      return (
          <div className="p-8 text-center">
              <h2 className="text-xl font-bold">No Active Queries</h2>
              <p>Your till records are all clear.</p>
          </div>
      )
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto text-black font-bold">
      <div className="bg-red-600 p-8 rounded-[40px] text-white shadow-2xl space-y-4">
        <div className="flex items-center gap-4">
           <ShieldAlert size={40} className="animate-pulse" />
           <h1 className="text-3xl font-black uppercase italic">Audit <span className="text-red-200">Notice</span></h1>
        </div>
        <p className="text-sm opacity-80 uppercase leading-relaxed">
          Your till from <strong className="underline">{new Date(activeQuery.closedAt.toDate()).toLocaleDateString()}</strong> has been flagged by the Finance Office for a shortage of <strong>₵ {activeQuery.shortageAmount?.toFixed(2)}</strong>. 
          You are required to provide a written explanation before your next shift.
        </p>
      </div>

      <div className="bg-white p-8 rounded-[40px] border-4 border-slate-900 space-y-6">
         <h3 className="text-xs font-black uppercase text-slate-400">Accountant's Remarks</h3>
         <div className="p-6 bg-slate-50 rounded-3xl italic text-slate-600">
            "{activeQuery.accountantComment || 'No comment provided.'}"
         </div>
         
         <textarea 
           placeholder="Type your explanation here for the Medical Director's review..."
           className="w-full p-6 border-2 border-slate-100 rounded-3xl h-32 outline-none focus:border-blue-600"
           value={explanation}
           onChange={e => setExplanation(e.target.value)}
         />
         
         <button onClick={handleSubmitExplanation} disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
            {loading ? <Loader2 className="animate-spin"/> : 'Submit Explanation & Request Clearance'}
         </button>
      </div>
    </div>
  );
}
