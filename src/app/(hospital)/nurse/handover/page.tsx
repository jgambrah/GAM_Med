'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { 
  ClipboardList, Users, AlertTriangle, 
  Save, History, Clock, CheckCircle2, 
  ArrowRightLeft, Box, Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function NursingHandover() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'NURSE', 'DOCTOR'].includes(userRole);

  // HANDOVER FORM STATE
  const [form, setForm] = useState({
    shiftType: 'Morning (8am - 2pm)',
    totalAdmissions: '',
    totalDischarges: '',
    criticalPatients: '',
    consumablesNotes: 'Oxygen: OK, Emergency Drugs: OK',
    generalIncident: 'No incidents reported.'
  });
  
  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "nursing_handovers"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
  }, [firestore, hospitalId]);

  const { data: history, isLoading: isHistoryLoading } = useCollection(historyQuery);


  const submitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !hospitalId) {
        toast({ variant: 'destructive', title: "Error", description: "System not ready." });
        return;
    }
    setLoading(true);
    try {
      addDocumentNonBlocking(collection(firestore, "hospitals", hospitalId, "nursing_handovers"), {
        ...form,
        hospitalId: hospitalId,
        nurseId: user.uid,
        nurseName: user.displayName,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Shift Handover Logged Successfully" });
      setShowForm(false);
      setForm({ // reset form
        shiftType: 'Morning (8am - 2pm)',
        totalAdmissions: '',
        totalDischarges: '',
        criticalPatients: '',
        consumablesNotes: 'Oxygen: OK, Emergency Drugs: OK',
        generalIncident: 'No incidents reported.'
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Submission Failed", description: e.message });
    }
    setLoading(false);
  };
  
  const pageIsLoading = isUserLoading || isClaimsLoading;

  if (pageIsLoading) {
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
          <p className="text-muted-foreground">You are not authorized to view this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* --- HEADER --- */}
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter italic">Shift <span className="text-primary">Handover</span></h1>
          <p className="text-muted-foreground font-bold text-xs uppercase italic">Ensuring continuity of clinical care.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-foreground transition-all">
            <ArrowRightLeft size={18} /> New Handover Report
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={submitHandover} className="bg-card p-10 rounded-[40px] border shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* WARD STATS */}
            <div className="space-y-6">
               <h3 className="text-primary font-black text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                  <Users size={16}/> Ward Statistics
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase">Shift Type</label>
                    <select className="w-full p-4 border rounded-2xl mt-1 text-card-foreground font-bold bg-muted/50 outline-none"
                      value={form.shiftType} onChange={e => setForm({...form, shiftType: e.target.value})}>
                      <option>Morning (8am - 2pm)</option>
                      <option>Afternoon (2pm - 8pm)</option>
                      <option>Night (8pm - 8am)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="col-span-2 text-[10px] font-black text-muted-foreground uppercase">Admissions / Discharges</label>
                    <input type="number" placeholder="ADM" required className="w-full p-4 border rounded-2xl mt-1 text-card-foreground font-bold bg-muted/50" 
                      onChange={e => setForm({...form, totalAdmissions: e.target.value})} />
                     <input type="number" placeholder="DIS" required className="w-full p-4 border rounded-2xl mt-1 text-card-foreground font-bold bg-muted/50" 
                      onChange={e => setForm({...form, totalDischarges: e.target.value})} />
                  </div>
               </div>
            </div>

            {/* CONSUMABLES */}
            <div className="space-y-6">
               <h3 className="text-orange-600 font-black text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                  <Box size={16}/> Essential Inventory
               </h3>
               <textarea className="w-full p-4 border rounded-2xl mt-1 text-card-foreground font-medium text-sm h-24 bg-muted/50 outline-none focus:ring-2 focus:ring-primary"
                 placeholder="Status of Oxygen, Emergency Tray, IV Fluids..."
                 value={form.consumablesNotes} onChange={e => setForm({...form, consumablesNotes: e.target.value})} />
            </div>
          </div>

          {/* CRITICAL WATCHLIST */}
          <div className="space-y-4">
             <h3 className="text-destructive font-black text-xs uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                <AlertTriangle size={16}/> Patient Watchlist (Critical Cases)
             </h3>
             <textarea required className="w-full p-4 border rounded-2xl mt-1 text-card-foreground font-medium text-sm h-32 bg-muted/50 outline-none focus:ring-2 focus:ring-destructive"
               placeholder="List patients requiring high-frequency monitoring or urgent reviews..."
               value={form.criticalPatients} onChange={e => setForm({...form, criticalPatients: e.target.value})} />
          </div>

          <div className="flex gap-4 pt-4 border-t">
             <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="flex-1 font-bold uppercase text-xs">Cancel</Button>
             <Button type="submit" disabled={loading} className="flex-[2] bg-primary text-primary-foreground py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all hover:bg-foreground">
                {loading ? 'Signing Report...' : <><Save size={18}/> Sign & Authenticate Handover</>}
             </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
           <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <History size={16} className="text-primary" /> Recent Shift Reports
           </h3>
           
           <div className="grid grid-cols-1 gap-6">
              {isHistoryLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin" /></div> :
              history?.map(report => (
                <div key={report.id} className="bg-card p-8 rounded-[40px] border shadow-sm space-y-6 hover:border-primary/20 transition-all border-l-8 border-l-primary">
                   <div className="flex justify-between items-start">
                      <div>
                         <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{report.shiftType}</p>
                         <h4 className="text-lg font-black text-card-foreground mt-1">Logged by Nurse {report.nurseName}</h4>
                         <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1">
                            <Clock size={12}/> {report.createdAt ? new Date(report.createdAt?.toDate()).toLocaleString() : ''}
                         </p>
                      </div>
                      <div className="flex gap-2">
                         <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-[9px] font-black uppercase italic">{report.totalAdmissions} ADM</span>
                         <span className="bg-green-100/50 text-green-700 px-3 py-1 rounded-full text-[9px] font-black uppercase italic">{report.totalDischarges} DSC</span>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
                      <div className="space-y-2">
                         <p className="text-[9px] font-black text-destructive uppercase tracking-widest">Critical Watchlist</p>
                         <p className="text-sm font-medium text-muted-foreground italic leading-relaxed">"{report.criticalPatients}"</p>
                      </div>
                      <div className="space-y-2">
                         <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Inventory & Supplies</p>
                         <p className="text-sm font-medium text-muted-foreground italic leading-relaxed">"{report.consumablesNotes}"</p>
                      </div>
                   </div>
                </div>
              ))}
              {!isHistoryLoading && history?.length === 0 && <div className="p-10 text-center text-muted-foreground italic">No handover reports found.</div>}
           </div>
        </div>
      )}
    </div>
  );
}
