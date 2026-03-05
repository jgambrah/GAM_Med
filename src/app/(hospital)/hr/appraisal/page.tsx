'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Target, Star, TrendingUp, UserCheck, 
  Award, Clock, CheckCircle2, Plus, 
  ChevronRight, Search, FileBarChart, XCircle, Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function AppraisalKPI() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  const [staff, setStaff] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<string>('');
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
        setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);

  const hospitalId = claims?.hospitalId;
  const userRole = claims?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER'].includes(userRole);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'users'), where('hospitalId', '==', hospitalId), where('is_active', '==', true));
  }, [firestore, hospitalId]);
  const { data: staffData, isLoading: areStaffLoading } = useCollection(staffQuery);

  const cyclesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'appraisal_cycles'), where('status', '==', 'OPEN'));
  }, [firestore, hospitalId]);
  const { data: cyclesData, isLoading: areCyclesLoading } = useCollection(cyclesQuery);

  // APPRAISAL FORM STATE
  const [scores, setScores] = useState({
    punctuality: 5,
    clinicalSkill: 5,
    bedsideManner: 5,
    teamwork: 5,
    documentation: 5,
    turnaroundTime: 5,
    comments: ''
  });

  const handleSubmitAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCycle) return toast({ variant: 'destructive', title: "Please select an Appraisal Cycle" });

    const numericScores = Object.values(scores).filter(v => typeof v === 'number');
    const averageScore = numericScores.reduce((a, b) => a + b, 0) / numericScores.length;

    try {
      if (!firestore || !user || !hospitalId) throw new Error("System not ready");

      await addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/appraisals`), {
        staffId: selectedStaff.id,
        staffName: selectedStaff.fullName,
        role: selectedStaff.role,
        cycleId: selectedCycle,
        scores,
        overallScore: parseFloat(averageScore.toFixed(1)),
        ratedBy: user?.uid,
        ratedByName: user?.displayName,
        hospitalId: hospitalId,
        createdAt: serverTimestamp()
      });

      toast({ title: `Appraisal for ${selectedStaff.fullName} submitted.` });
      setShowRateModal(false);
    } catch (e: any) { toast({ variant: 'destructive', title: e.message }); }
  };

  const isLoading = isUserLoading || isClaimsLoading || areStaffLoading || areCyclesLoading;

  if (isLoading) {
      return (
          <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for performance reviews.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Performance <span className="text-primary">Intelligence</span></h1>
          <p className="text-muted-foreground font-medium">Clinical KPI Tracking & Peer-to-Peer Review.</p>
        </div>
        
        <div className="flex items-center gap-4">
           <select 
             className="p-3 border rounded-xl font-bold text-xs uppercase bg-card"
             onChange={(e) => setSelectedCycle(e.target.value)}
           >
              <option value="">Select Cycle...</option>
              {cyclesData?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
           </select>
           <Button className="bg-primary text-primary-foreground shadow-xl hover:bg-foreground transition-all">
              <Plus size={16} /> New Cycle
           </Button>
        </div>
      </div>

      {/* STAFF PERFORMANCE LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffData?.map(member => (
          <div key={member.id} className="bg-card p-6 rounded-[32px] border shadow-sm hover:border-primary transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
               <div className="w-12 h-12 rounded-2xl bg-muted text-foreground flex items-center justify-center font-black">
                  {member.fullName[0]}
               </div>
               <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase italic">{member.role}</span>
            </div>
            
            <h3 className="text-lg font-black uppercase leading-none">{member.fullName}</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">ID: {member.id.slice(0,6)}</p>

            <div className="mt-6 pt-6 border-t border-dashed flex justify-between items-center">
               <div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Last Score</p>
                  <p className="text-xl font-black text-foreground">--<span className="text-xs text-muted-foreground">/10</span></p>
               </div>
               <Button 
                 onClick={() => { setSelectedStaff(member); setShowRateModal(true); }}
                 className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-blue-100 group-hover:bg-foreground transition-all"
               >
                  <Award size={20} />
               </Button>
            </div>
          </div>
        ))}
      </div>

      {/* RATING MODAL */}
      {showRateModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSubmitAppraisal} className="bg-card rounded-[40px] p-10 max-w-2xl w-full space-y-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-6">
               <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter italic">Clinical <span className="text-primary">Review</span></h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Evaluating {selectedStaff.fullName}</p>
               </div>
               <button type="button" onClick={() => setShowRateModal(false)} className="text-muted-foreground/50 hover:text-destructive"><XCircle size={32}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <KPISlider label="Punctuality" value={scores.punctuality} onChange={(v: number) => setScores({...scores, punctuality: v})} />
               <KPISlider label="Clinical Skill" value={scores.clinicalSkill} onChange={(v: number) => setScores({...scores, clinicalSkill: v})} />
               <KPISlider label="Bedside Manner" value={scores.bedsideManner} onChange={(v: number) => setScores({...scores, bedsideManner: v})} />
               <KPISlider label="Teamwork" value={scores.teamwork} onChange={(v: number) => setScores({...scores, teamwork: v})} />
               <KPISlider label="Documentation" value={scores.documentation} onChange={(v: number) => setScores({...scores, documentation: v})} />
               <KPISlider label="Turnaround Time" value={scores.turnaroundTime} onChange={(v: number) => setScores({...scores, turnaroundTime: v})} />
            </div>

            <textarea 
              placeholder="Provide a detailed qualitative summary of clinical performance..."
              className="w-full p-4 bg-muted/50 border-none rounded-3xl text-sm font-medium h-32 outline-none focus:ring-2 focus:ring-primary"
              onChange={e => setScores({...scores, comments: e.target.value})}
            />

            <Button type="submit" className="w-full bg-primary text-primary-foreground py-6 rounded-[30px] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-foreground transition-all">
               Finalize Performance Score
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function KPISlider({ label, value, onChange }: {label: string, value: number, onChange: (value: number) => void}) {
  return (
    <div className="space-y-3">
       <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
          <span className="text-sm font-black text-primary">{value}/10</span>
       </div>
       <input 
         type="range" min="1" max="10" step="1" value={value}
         className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
         onChange={e => onChange(parseInt(e.target.value))}
       />
    </div>
  );
}

    