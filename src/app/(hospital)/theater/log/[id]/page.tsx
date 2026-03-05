'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, writeBatch, serverTimestamp, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scissors, ShieldCheck, Clipboard, Save, Loader2, User, BedDouble, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SurgeryLogPage() {
  const { id: surgeryId } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    findings: '',
    procedureDone: '',
    anesthesiaType: 'General',
    bloodLoss: '',
    postOpInstructions: ''
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const surgeryRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !surgeryId) return null;
    return doc(firestore, `hospitals/${hospitalId}/surgeries`, surgeryId as string);
  }, [firestore, hospitalId, surgeryId]);

  const { data: surgery, isLoading: isSurgeryLoading } = useDoc(surgeryRef);

  const handleCommitSurgery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surgeryRef || !surgery || !user) return;
    setLoading(true);
    const batch = writeBatch(firestore);

    try {
      // 1. Finalize the Surgery Document
      batch.update(surgeryRef, {
        ...form,
        status: 'COMPLETED',
        completedAt: serverTimestamp()
      });

      // 2. FINANCIAL TRIGGER: Add Theater Fee
      const billRef = doc(collection(firestore, `hospitals/${hospitalId}/billing_items`));
      batch.set(billRef, {
        patientId: surgery.patientId,
        patientName: surgery.patientName,
        hospitalId: hospitalId,
        description: `Surgical Theater Fee (${surgery.procedureName})`,
        category: 'PROCEDURE',
        total: 1500, // Pre-set Theater base cost
        unitPrice: 1500,
        qty: 1,
        status: 'UNPAID',
        billedBy: user.uid,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Surgical Report Signed & Billed", description: "The theater fee has been added to the patient's folio." });
      router.push('/theater/schedule');
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Log Failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };
  
  if (isSurgeryLoading) {
      return <div className="p-10"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black font-bold">
       <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold text-xs uppercase transition-all">
          <ArrowLeft size={16} /> Back to OT Schedule
        </Button>
      
      <form onSubmit={handleCommitSurgery} className="bg-white p-10 rounded-[50px] space-y-6 border-4 border-slate-900 shadow-2xl font-bold">
        <h2 className="text-3xl font-black uppercase italic border-b-4 border-slate-900 pb-4">Surgical <span className="text-primary">Note</span></h2>
        
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
            <div>
                <p className="text-xs uppercase text-slate-400">Patient</p>
                <p className="uppercase">{surgery?.patientName}</p>
            </div>
             <div>
                <p className="text-xs uppercase text-slate-400">Procedure</p>
                <p className="uppercase">{surgery?.procedureName}</p>
            </div>
             <div>
                <p className="text-xs uppercase text-slate-400">Surgeon</p>
                <p className="uppercase">Dr. {surgery?.surgeonName}</p>
            </div>
        </div>

        <div className="space-y-4 pt-4">
           <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Intra-Operative Findings</label>
              <Textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-32 mt-1" 
                onChange={e => setForm({...form, findings: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Anesthesia</label>
                  <Select onValueChange={(value) => setForm({...form, anesthesiaType: value})} defaultValue={form.anesthesiaType}>
                    <SelectTrigger className="w-full p-4 bg-slate-50 border rounded-2xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Spinal">Spinal</SelectItem>
                      <SelectItem value="Sedation">Sedation</SelectItem>
                      <SelectItem value="Local">Local</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Estimated Blood Loss</label>
                  <Input className="w-full p-4 bg-slate-50 border rounded-2xl mt-1" placeholder="e.g. 200ml"
                    onChange={e => setForm({...form, bloodLoss: e.target.value})} />
               </div>
            </div>
             <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Post-Op Ward Instructions</label>
                <Input className="w-full p-4 bg-slate-50 border rounded-2xl mt-1" placeholder="e.g. IV Fluids for 24h, monitor vitals hourly..."
                  onChange={e => setForm({...form, postOpInstructions: e.target.value})} />
             </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20}/>} Sign & Authenticate Report
        </button>
      </form>
    </div>
  );
}

    