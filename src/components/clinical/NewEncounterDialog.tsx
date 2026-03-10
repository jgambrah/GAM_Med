
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Loader2, Save, Thermometer, Activity, Scale, 
  Clipboard, HeartPulse, Pill, Search, Beaker, X, Layers, ShieldAlert, Trash2
} from 'lucide-react';
import { useFirebaseApp, useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import ProductSearchDropdown from '@/components/inventory/ProductSearchDropdown';
import { useRouter } from 'next/navigation';

const encounterSchema = z.object({
  encounterType: z.string().min(1, 'Encounter type is required'),
  chiefComplaint: z.string().optional(),
  hpi: z.string().optional(),
  diagnosis: z.string().optional(),
  vitals: z.object({
    temp: z.string().optional(),
    systolic: z.string().optional(),
    diastolic: z.string().optional(),
    pulse: z.string().optional(),
    respiration: z.string().optional(),
    weight: z.string().optional(),
    height: z.string().optional(),
    bmi: z.string().optional(),
    spo2: z.string().optional(),
  }).optional(),
});

type EncounterFormValues = z.infer<typeof encounterSchema>;

interface NewEncounterDialogProps {
  patientId: string;
  hospitalId: string;
  patientName: string;
}

export function NewEncounterDialog({ patientId, hospitalId, patientName }: NewEncounterDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const firebaseApp = useFirebaseApp();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  // Standardized states
  const [isExternal, setIsExternal] = useState(false);
  const [items, setItems] = useState<any[]>([]); // Standardized list for all items

  // States for external free-text input
  const [extItemName, setExtItemName] = useState('');
  const [extInstruction, setExtInstruction] = useState('');
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const patientRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return doc(firestore, 'hospitals', hospitalId, 'patients', patientId);
  }, [firestore, hospitalId, patientId]);
  const { data: patient, isLoading: isPatientLoading } = useDoc(patientRef);

  const payerId = patient?.payerId;
  const payerRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !payerId) return null;
    return doc(firestore, `hospitals/${hospitalId}/payers`, payerId);
  }, [firestore, hospitalId, payerId]);
  const { data: payer, isLoading: isPayerLoading } = useDoc(payerRef);

  const creditStatus = useMemo(() => {
    if (!payer) return { viable: true, name: 'CASH PAYMENT', balance: 0 }; 
    if (payer.type === 'NHIS' || payer.type === 'PRIVATE_INSURANCE') return { viable: true, name: payer.name, balance: payer.currentBalance || 0 };

    const creditLimit = payer.creditLimit || 0;
    const currentBalance = payer.currentBalance || 0;

    if (creditLimit > 0 && currentBalance >= creditLimit) {
      return { 
        viable: false, 
        reason: "CREDIT_LIMIT_EXCEEDED",
        name: payer.name,
        balance: currentBalance,
      };
    }
    return { 
      viable: true,
      name: payer.name,
      balance: currentBalance,
    };
  }, [payer]);
  
  const catalogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'product_catalog'));
  }, [firestore, hospitalId]);
  const { data: catalog, isLoading: isCatalogLoading } = useCollection(catalogQuery);

  const form = useForm<EncounterFormValues>({
    resolver: zodResolver(encounterSchema),
    defaultValues: {
      encounterType: 'Consultation',
      vitals: { temp: '', systolic: '', diastolic: '', pulse: '', respiration: '', weight: '', height: '', spo2: '', bmi: '0.0' },
      chiefComplaint: '',
      hpi: '',
      diagnosis: '',
    },
  });

  const weight = form.watch('vitals.weight');
  const height = form.watch('vitals.height');

  useEffect(() => {
    const w = parseFloat(weight || '0');
    const h = parseFloat(height || '0') / 100;
    if (w > 0 && h > 0) {
      form.setValue('vitals.bmi', (w / (h * h)).toFixed(1));
    } else {
      form.setValue('vitals.bmi', '0.0');
    }
  }, [weight, height, form]);
  
  const bmiValue = form.watch('vitals.bmi') || '0.0';
  
  const addTypedItem = () => {
    if (!extItemName) return;
    const newItem = {
        name: extItemName,
        instruction: extInstruction,
        isExternal: true, // Mark for billing bypass
        id: Date.now().toString()
    };
    setItems([...items, newItem]);
    setExtItemName(''); // Clear input
    setExtInstruction(''); // Clear input
  };
  
  const addCatalogItem = (item: any) => {
    if (!items.some(i => i.id === item.id)) {
      setItems(currentItems => [...currentItems, item]);
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  const onSubmit = async (values: EncounterFormValues) => {
    if (!firebaseApp || !firestore || !user || !hospitalId) {
        toast({ variant: 'destructive', title: 'System not ready. Please try again.'});
        return;
    }
    setLoading(true);

    try {
      const functions = getFunctions(firebaseApp);
      const createEncounter = httpsCallable(functions, 'createEncounter');

      const payload = {
        ...values,
        patientId,
        hospitalId,
        patientName,
        items: items || [], // Standardized name, fallback to empty array
        isExternal: isExternal,
      };

      const result: any = await createEncounter(payload);

      if (result.data.success) {
        toast({ title: "Encounter Logged Successfully" });
        // Redirect to the print page
        router.push(`/doctor/external-print/${result.data.encounterId}?hospitalId=${hospitalId}&patientId=${patientId}`);
      } else {
         throw new Error(result.data.message || "Failed to create encounter.");
      }
      
    } catch (error: any) {
      console.error("Save Error:", error);
      toast({ variant: "destructive", title: "Transaction Aborted", description: "Data might be incomplete. " + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus /> New Encounter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="bg-foreground p-8 text-background rounded-t-lg">
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                    <HeartPulse className="text-primary" /> New Encounter
                </DialogTitle>
                <DialogDescription className="text-primary/70 font-bold uppercase text-xs tracking-widest pt-2">
                    Patient: {patientName}
                </DialogDescription>
            </DialogHeader>

            <div className="p-8 space-y-8 bg-card">
              {!isPayerLoading && creditStatus.name !== 'CASH PAYMENT' && (
                <div className={`p-4 rounded-2xl flex justify-between items-center ${!creditStatus.viable ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                    <div className="flex items-center gap-3">
                        <ShieldAlert size={24}/>
                        <div>
                            <p className="font-black uppercase text-sm">{creditStatus.name}</p>
                            <p className="text-xs">{!creditStatus.viable ? `Credit Limit Exceeded. Balance: GHS ${creditStatus.balance}` : `Outstanding: GHS ${creditStatus.balance}`}</p>
                        </div>
                    </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-primary font-black text-xs uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                    <Activity size={16} /> Nursing Vitals
                </h3>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <VitalInput control={form.control} name="vitals.temp" label="Temp (°C)" icon={Thermometer} />
                    <div className="grid grid-cols-2 gap-1">
                        <VitalInput control={form.control} name="vitals.systolic" label="BP (Sys)" />
                        <VitalInput control={form.control} name="vitals.diastolic" label="BP (Dia)" />
                    </div>
                    <VitalInput control={form.control} name="vitals.pulse" label="Pulse (bpm)" />
                    <VitalInput control={form.control} name="vitals.respiration" label="Respiration" />
                    <VitalInput control={form.control} name="vitals.spo2" label="SPO2 (%)" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <VitalInput control={form.control} name="vitals.weight" label="Weight (kg)" icon={Scale} />
                    <VitalInput control={form.control} name="vitals.height" label="Height (cm)" />
                    <div className={`p-4 rounded-2xl flex flex-col justify-center items-center border-2 transition-all ${parseFloat(bmiValue) > 25 ? 'bg-orange-50 border-orange-100 text-orange-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest">Calculated BMI</span>
                        <span className="text-2xl font-black">{bmiValue}</span>
                    </div>
                 </div>
              </div>
              
              <div className="space-y-4 pt-4">
                <h3 className="text-primary font-black text-xs uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                    <Clipboard size={16} /> Consultation Notes
                </h3>
                 <FormField control={form.control} name="encounterType" render={({ field }) => (
                    <FormItem><FormLabel>Encounter Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                        <SelectItem value="Consultation">Consultation</SelectItem><SelectItem value="Vitals Check">Vitals Check</SelectItem><SelectItem value="Procedure">Procedure</SelectItem><SelectItem value="Admission">Admission</SelectItem>
                    </SelectContent></Select><FormMessage /></FormItem>
                 )}/>
                 <FormField control={form.control} name="chiefComplaint" render={({ field }) => (
                    <FormItem><FormLabel>Chief Complaint</FormLabel><FormControl><Textarea placeholder="Why is the patient here?" {...field} /></FormControl></FormItem>
                 )}/>
                  <FormField control={form.control} name="hpi" render={({ field }) => (
                    <FormItem><FormLabel>History of Presenting Illness (HPI)</FormLabel><FormControl><Textarea placeholder="Detailed symptoms, duration, and severity..." {...field} rows={4} /></FormControl></FormItem>
                 )}/>
                 <FormField control={form.control} name="diagnosis" render={({ field }) => (
                    <FormItem><FormLabel>Final Diagnosis / Impression</FormLabel><FormControl><Input placeholder="ICD-10 or clinical term" {...field} /></FormControl></FormItem>
                 )}/>
              </div>

              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-blue-600">Medication & Services</h3>
                  
                  <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-200">
                     <input 
                       type="checkbox" 
                       id="ext-toggle"
                       className="w-5 h-5 rounded accent-amber-600 cursor-pointer"
                       checked={isExternal}
                       onChange={(e) => {
                          setIsExternal(e.target.checked);
                          setItems([]); // Clear list when switching modes to avoid mixing
                       }}
                     />
                     <label htmlFor="ext-toggle" className="text-[10px] font-black uppercase text-amber-700 cursor-pointer">
                        External Facility (No Billing)
                     </label>
                  </div>
                </div>

                {isExternal ? (
                  <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[32px] border-2 border-dashed border-slate-200">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Type Item Name</label>
                        <input 
                          className="w-full p-4 rounded-2xl border-none shadow-sm text-black font-bold"
                          placeholder="e.g. MRI Scan / Ciprofloxacin"
                          value={extItemName}
                          onChange={(e) => setExtItemName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Dosage / Instructions</label>
                        <div className="flex gap-2">
                          <input 
                            className="flex-1 p-4 rounded-2xl border-none shadow-sm text-black font-bold"
                            placeholder="e.g. 1 tab twice daily"
                            value={extInstruction}
                            onChange={(e) => setExtInstruction(e.target.value)}
                          />
                          <button 
                            type="button"
                            onClick={addTypedItem}
                            className="bg-blue-600 text-white p-4 rounded-2xl hover:bg-black transition-all"
                          >
                             <Plus size={24} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ProductSearchDropdown catalog={catalog || []} onSelect={(p) => addCatalogItem(p)} />
                  </div>
                )}
                
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={item.id || idx} className="bg-white p-4 rounded-2xl border-2 border-slate-50 flex justify-between items-center shadow-sm">
                       <div>
                          <p className="font-black text-black uppercase text-sm">{item.name}</p>
                          <p className="text-[10px] text-blue-600 font-bold italic">{item.instruction || item.dosage || 'No instructions'}</p>
                       </div>
                       <button type="button" onClick={() => removeItem(item.id)} className="text-red-300 hover:text-red-600"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 bg-muted/50 rounded-b-lg">
              <Button variant="ghost" onClick={() => setOpen(false)}>Discard</Button>
              <Button type="submit" disabled={loading || !creditStatus.viable} className="disabled:bg-slate-300">
                {loading ? <Loader2 className="animate-spin" /> : !creditStatus.viable ? 'Service Locked (Unpaid Debt)' : <><Save className="mr-2" size={18} /> Sign & Commit to EHR</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function VitalInput({ control, name, label, icon: Icon, disabled }: any) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter flex items-center gap-1">
                        {Icon && <Icon size={14} />} {label}
                    </FormLabel>
                    <FormControl>
                        <Input 
                            type="text" 
                            className="rounded-xl text-card-foreground font-black text-center"
                            {...field}
                            disabled={disabled}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
    );
}
    