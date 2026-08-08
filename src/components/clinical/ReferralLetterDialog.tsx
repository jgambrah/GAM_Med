'use client';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useFirebaseApp } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { FileSignature, Loader2, Printer, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ReferralLetterDialog({ patient, latestEncounter }: any) {
  const { user } = useUser();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    receivingFacility: '',
    clinicalSummary: '',
    provisionalDiagnosis: '',
    urgency: 'ROUTINE',
  });

  const GH_TERTIARY_HOSPITALS = [
    "Korle-Bu Teaching Hospital (KBTH)",
    "Komfo Anokye Teaching Hospital (KATH)",
    "Tamale Teaching Hospital (TTH)",
    "Cape Coast Teaching Hospital (CCTH)",
    "Ho Teaching Hospital",
    "37 Military Hospital",
    "Greater Accra Regional Hospital (Ridge)",
    "Other"
  ];

  const handleGenerateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseApp) {
        toast({ variant: 'destructive', title: 'System Error', description: 'Firebase App not available.' });
        return;
    }
    setLoading(true);

    try {
      const functions = getFunctions(firebaseApp);
      const createReferral = httpsCallable(functions, 'createReferral');
      
      const result: any = await createReferral({
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        ehrNumber: patient.ehrNumber,
        latestEncounter: latestEncounter,
        ...form
      });

      if (result.data.success) {
        toast({title: "Referral Letter Generated"});
        window.open(`/patients/referral/print/${result.data.referralId}`, '_blank');
        setOpen(false);
      } else {
        throw new Error(result.data.message || "Failed to create referral.");
      }

    } catch (e: any) { 
        toast({variant: 'destructive', title: "Error", description: e.message});
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button variant="outline" className="bg-white text-slate-900 hover:text-slate-950 border-2 border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/80 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm">
              <FileSignature size={14} className="text-indigo-600" /> New Referral
            </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
             <DialogHeader className="p-6">
                <DialogTitle className="flex items-center gap-3 font-black tracking-tighter uppercase text-xl">
                    <FileText /> Clinical Referral Letter
                </DialogTitle>
                <DialogDescription className="text-xs uppercase font-bold">Patient: {patient?.firstName} {patient?.lastName}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleGenerateReferral} className="px-6 pb-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Receiving Facility</label>
                    <select required className="w-full p-3 border rounded-xl mt-1 text-card-foreground font-bold bg-muted/50" 
                        onChange={e => setForm({...form, receivingFacility: e.target.value})}>
                        <option value="">Select Destination...</option>
                        {GH_TERTIARY_HOSPITALS.map(h => <option key={h} value={h}>{h}</option>)}
                        <option value="Other">Other / Regional Hospital</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Urgency Level</label>
                    <select className="w-full p-3 border rounded-xl mt-1 text-card-foreground font-bold bg-muted/50"
                        value={form.urgency} onChange={e => setForm({...form, urgency: e.target.value})}>
                        <option value="ROUTINE">Routine Referral</option>
                        <option value="EMERGENCY">Emergency Handover</option>
                    </select>
                </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Provisional Diagnosis</label>
                    <Input required className="mt-1" 
                    onChange={e => setForm({...form, provisionalDiagnosis: e.target.value})} />
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Brief Clinical Summary & Justification</label>
                    <Textarea required className="mt-1 h-32" 
                    placeholder="Summary of history, examination findings, and why the patient is being referred..."
                    onChange={e => setForm({...form, clinicalSummary: e.target.value})} />
                </div>

                <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : <Printer />}
                        Create & Print Referral
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}
