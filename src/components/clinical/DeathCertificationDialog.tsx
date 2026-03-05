'use client';
import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, writeBatch, serverTimestamp, collection } from 'firebase/firestore';
import { Skull, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { differenceInYears } from 'date-fns';

export function DeathCertificationDialog({ patient }: { patient: any }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    dateTimeOfDeath: '',
    immediateCause: '',
    underlyingCause: '',
    icd10Code: '',
    placeOfDeath: 'In-Facility',
  });

  const handleCertify = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'System not ready.' });
      return;
    }
    
    const confirmDeath = window.confirm(`Are you sure you want to certify the death of ${patient.firstName} ${patient.lastName}? This will lock the medical record permanently.`);
    if (!confirmDeath) return;

    setLoading(true);
    const batch = writeBatch(firestore);

    try {
      // 1. Update Patient Status to DECEASED and LOCK record
      const patientRef = doc(firestore, "hospitals", patient.hospitalId, "patients", patient.id);
      batch.update(patientRef, {
        status: 'DECEASED',
        isLocked: true,
        deathInfo: { ...form, certifiedBy: user.uid, certifiedByName: user.displayName }
      });

      // 2. HOSPITAL PRIVATE RECORD (Full Data)
      const hospitalDeathRef = doc(collection(firestore, "hospitals", patient.hospitalId, "mortality_archive"));
      batch.set(hospitalDeathRef, {
        patientName: `${patient.firstName} ${patient.lastName}`,
        ehrNumber: patient.ehrNumber,
        familyContact: patient.emergencyContactPhone,
        ...form, // All causes of death
        certifiedBy: user.uid,
        createdAt: serverTimestamp()
      });
      
      // 3. CEO GLOBAL ANALYTICS (Anonymized Data)
      const globalAnalyticRef = doc(collection(firestore, "platform_global_health_stats"));
      const ageAtDeath = differenceInYears(new Date(), new Date(patient.dateOfBirth));
      
      batch.set(globalAnalyticRef, {
        hospitalId: patient.hospitalId,
        hospitalRegion: patient.region || 'Unknown',
        age: ageAtDeath,
        gender: patient.gender,
        underlyingCause: form.underlyingCause,
        icd10Code: form.icd10Code,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        createdAt: serverTimestamp()
      });


      await batch.commit();
      toast({ title: "Death Certified", description: "Record Locked and statistics logged." });
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Certification Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button variant="destructive"><Skull size={16}/> Certify Death</Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-4">
                    <div className="bg-slate-900 p-3 rounded-2xl text-white"><Skull size={24}/></div>
                    <div>
                        <h2 className="text-2xl font-black uppercase italic">Death <span className="text-destructive">Certification</span></h2>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">Legal Clinical Exit for {patient.firstName} {patient.lastName}</p>
                    </div>
                </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-black uppercase text-muted-foreground">Date & Time of Death</label>
                        <input type="datetime-local" className="w-full p-4 bg-muted border rounded-2xl mt-1 font-black" 
                        onChange={e => setForm({...form, dateTimeOfDeath: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-black uppercase text-muted-foreground">Immediate Cause (Part Ia)</label>
                        <input placeholder="e.g. Septic Shock" className="w-full p-4 bg-muted border rounded-2xl mt-1" 
                        onChange={e => setForm({...form, immediateCause: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-black uppercase text-destructive">Underlying Cause (The Analysis Key)</label>
                        <input placeholder="e.g. Type II Diabetes Mellitus" className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl mt-1" 
                        onChange={e => setForm({...form, underlyingCause: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-black uppercase text-primary">ICD-10 Code</label>
                        <input placeholder="e.g. E11.9" className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl mt-1 font-mono uppercase" 
                        onChange={e => setForm({...form, icd10Code: e.target.value})} />
                    </div>
                </div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleCertify} disabled={loading} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-destructive transition-all flex items-center justify-center gap-3">
                    {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20}/>} 
                    Sign Legal Death Certificate
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}

  
