'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { Tool, Send, ClipboardList, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function NewServiceRequisition() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  
  const [form, setForm] = useState({
    serviceTitle: '',
    description: '',
    justification: '',
    estimatedCost: 0,
    priority: 'NORMAL' // NORMAL, URGENT, EMERGENCY
  });

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !firestore) return;
    setLoading(true);

    try {
      const rfsNumber = `RFS-${userProfile.hospitalId.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      await addDocumentNonBlocking(collection(firestore, `hospitals/${userProfile.hospitalId}/service_requisitions`), {
        ...form,
        rfsNumber,
        hospitalId: userProfile.hospitalId,
        requestingDept: userProfile.department || 'GENERAL',
        requestedBy: user.uid,
        requestedByName: userProfile.fullName,
        status: 'PENDING_APPROVAL', // PENDING -> APPROVED -> CONVERTED_TO_PO
        createdAt: serverTimestamp()
      });

      toast({ title: "Service Requisition Transmitted to Director"});
      setForm({ serviceTitle: '', description: '', justification: '', estimatedCost: 0, priority: 'NORMAL' });
    } catch (e: any) { toast({ variant: 'destructive', title: e.message }); }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black font-bold">
      <h1 className="text-3xl font-black uppercase tracking-tighter italic">Requisition <span className="text-blue-600">for Service</span></h1>
      
      <form onSubmit={handleSendRequest} className="bg-white p-10 rounded-[40px] border-4 border-slate-900 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 text-blue-600 border-b pb-4">
           <ClipboardList size={24} />
           <h3 className="text-xs font-black uppercase tracking-widest">Identify Service Obligation</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">Service Title</label>
            <input required placeholder="e.g. Repair of ICU Ventilator #4" className="w-full p-4 border rounded-2xl bg-slate-50 mt-1" 
              value={form.serviceTitle} onChange={e => setForm({...form, serviceTitle: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Priority Level</label>
                <select className="w-full p-4 border rounded-2xl bg-slate-50 mt-1 font-black outline-none" 
                  value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  <option value="NORMAL">Normal / Scheduled</option>
                  <option value="URGENT">Urgent Requirement</option>
                  <option value="EMERGENCY">Life-Threatening Emergency</option>
                </select>
             </div>
             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Estimated Budget (₵)</label>
                <input type="number" required className="w-full p-4 border rounded-2xl bg-blue-50 border-blue-100 mt-1 font-black text-blue-900" 
                  value={form.estimatedCost} onChange={e => setForm({...form, estimatedCost: Number(e.target.value)})} />
             </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">Justification / Reason for Request</label>
            <textarea required className="w-full p-4 border rounded-2xl bg-slate-50 mt-1 h-32" 
              placeholder="Why is this service needed immediately?"
              value={form.justification} onChange={e => setForm({...form, justification: e.target.value})} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-black transition-all">
          {loading ? <Loader2 className="animate-spin"/> : <Send size={18}/>} Commit Requisition
        </button>
      </form>
    </div>
  );
}
