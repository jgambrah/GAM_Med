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
  Clipboard, HeartPulse, Pill, Search, Beaker, X, Layers, ShieldAlert
} from 'lucide-react';
import { useFirebaseApp, useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';

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
  
  // SOLID FIX 1: Use a single external flag
  const [isExternal, setIsExternal] = useState(false);

  const [drugSearch, setDrugSearch] = useState('');
  const [prescription, setPrescription] = useState<any[]>([]);
  
  const [labSearch, setLabSearch] = useState('');
  const [labOrders, setLabOrders] = useState<any[]>([]);

  const [imagingSearch, setImagingSearch] = useState('');
  const [imagingOrders, setImagingOrders] = useState<any[]>([]);
  
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
  
  const labMenuQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return collection(firestore, 'hospitals', hospitalId, 'lab_menu');
  }, [firestore, hospitalId]);
  const { data: labMenu, isLoading: isLabMenuLoading } = useCollection(labMenuQuery);
  
  const radiologyMenuQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'radiology_menu'));
  }, [firestore, hospitalId]);
  const { data: radiologyMenu, isLoading: isRadiologyMenuLoading } = useCollection(radiologyMenuQuery);

  const filteredInventory = (catalog || []).filter(item => 
    drugSearch && (
      item.name.toLowerCase().includes(drugSearch.toLowerCase()) || 
      item.sku.toLowerCase().includes(drugSearch.toLowerCase())
    )
  );

  const filteredLabMenu = (labMenu || []).filter(item => 
    labSearch && item.name.toLowerCase().includes(labSearch.toLowerCase())
  );
  
  const filteredRadiologyMenu = (radiologyMenu || []).filter(item => 
    imagingSearch && item.name.toLowerCase().includes(imagingSearch.toLowerCase())
  );
  
  const addDrugToOrder = (drug: any) => {
    const newDrug = {
      drugId: drug.id,
      sku: drug.sku,
      name: drug.name,
      strength: drug.strength,
      dosage: '1 tab', // Default
      frequency: '2x daily',
      duration: '5 days',
      instructions: 'After meals'
    };
    setPrescription(currentPrescription => [...currentPrescription, newDrug]);
    setDrugSearch('');
  };
  
  const removeDrug = (indexToRemove: number) => {
    setPrescription(prescription.filter((_, index) => index !== indexToRemove));
  };

  const requestTest = (test: any) => {
    if (labOrders.some(order => order.testId === test.id)) return;
    setLabOrders([...labOrders, { ...test, status: 'PENDING' }]);
    setLabSearch('');
  };
  
  const removeTest = (indexToRemove: number) => {
    setLabOrders(labOrders.filter((_, index) => index !== indexToRemove));
  };
  
  const requestScan = (scan: any) => {
    if (imagingOrders.some(order => order.scanId === scan.id)) return; // prevent duplicates
    setImagingOrders([...imagingOrders, { ...scan, status: 'PENDING', indication: '' }]);
    setImagingSearch('');
  };

  const removeScan = (indexToRemove: number) => {
    setImagingOrders(imagingOrders.filter((_, index) => index !== indexToRemove));
  };
  
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
    const h = parseFloat(height || '0') / 100; // Convert cm to meters
    if (w > 0 && h > 0) {
      const bmiVal = (w / (h * h)).toFixed(1);
      form.setValue('vitals.bmi', bmiVal);
    } else {
        form.setValue('vitals.bmi', '0.0');
    }
  }, [weight, height, form]);
  
  const bmiValue = form.watch('vitals.bmi') || '0.0';

  const onSubmit = async (values: EncounterFormValues) => {
    if (!firebaseApp || !firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'System not ready. Please try again.' });
      return;
    }
    setLoading(true);
    const functions = getFunctions(firebaseApp);
    const createEncounter = httpsCallable(functions, 'createEncounter');
    
    // SOLID FIX 2: Always use the correct, initialized arrays.
    const payload = {
        ...values,
        patientId,
        hospitalId,
        patientName,
        prescription: prescription || [],
        labOrders: labOrders || [],
        radiologyOrders: imagingOrders || [],
        isPrescriptionExternal: isExternal,
        isLabExternal: isExternal,
        isRadiologyExternal: isExternal,
    };

    try {
      const encounterResult: any = await createEncounter(payload);
      const { encounterId, externalOrderIds } = encounterResult.data;
      
      const externalIdToPrint = externalOrderIds.prescription || externalOrderIds.lab || externalOrderIds.imaging;

      if (isExternal && externalIdToPrint) {
        window.open(`/doctor/external-print/${externalIdToPrint}`, '_blank');
      }
      
       // CRITICAL VITALS ALERT LOGIC
      const temp = parseFloat(values.vitals?.temp || '0');
      const spo2 = parseFloat(values.vitals?.spo2 || '100');
      
      if (temp > 38.5 || spo2 < 92) {
          addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/clinical_alerts`), {
              hospitalId, patientId, patientName,
              encounterId,
              alertType: 'CRITICAL_VITALS',
              message: `Critical vitals: Temp ${temp}°C, SPO2 ${spo2}%.`,
              status: 'UNREAD',
              createdAt: serverTimestamp(),
          });
          toast({ variant: "destructive", title: "CRITICAL VITALS ALERT TRIGGERED", duration: 10000 });
      }


      toast({ title: 'Encounter Logged', description: `New ${values.encounterType} recorded for ${patientName}.` });
      
      form.reset();
      setPrescription([]);
      setLabOrders([]);
      setImagingOrders([]);
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
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
            <div className="bg-foreground p-8 text-background rounded-t-lg">
                <DialogHeader>
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                    <HeartPulse className="text-primary" /> New Encounter
                </DialogTitle>
                <DialogDescription className="text-primary/70 font-bold uppercase text-xs tracking-widest pt-2">
                    Patient: {patientName}
                </DialogDescription>
                </DialogHeader>
            </div>

            <div className="p-8 space-y-8 bg-card">
              {!isPayerLoading && creditStatus.name !== 'CASH PAYMENT' && (
                <div className={`p-4 rounded-2xl flex justify-between items-center ${!creditStatus.viable ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                  <div className="flex items-center gap-3">
                      <ShieldAlert size={20} />
                      <div>
                        <p className="text-[9px] uppercase opacity-60">Payer: {creditStatus.name}</p>
                        <p className="text-sm font-black uppercase">
                            {!creditStatus.viable ? 'CREDIT LIMIT EXCEEDED' : 'CREDIT ACTIVE'}
                        </p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] opacity-60">Balance Owed</p>
                      <p className="text-lg font-black italic">₵ {creditStatus.balance?.toLocaleString()}</p>
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
                        <SelectItem value="Consultation">Consultation</SelectItem>
                        <SelectItem value="Vitals Check">Vitals Check</SelectItem>
                        <SelectItem value="Procedure">Procedure</SelectItem>
                        <SelectItem value="Admission">Admission</SelectItem>
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

              <div className="bg-amber-50 p-4 rounded-2xl border-2 border-dashed border-amber-200 flex items-center gap-3">
                    <input type="checkbox" id="external-toggle-main" className="w-5 h-5 rounded accent-amber-600" checked={isExternal} onChange={(e) => setIsExternal(e.target.checked)}/>
                    <label htmlFor="external-toggle-main" className="text-xs font-black uppercase text-amber-700">
                        Request from External Facility (This will skip internal billing & inventory deduction)
                    </label>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-primary font-black text-xs uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                    <Pill size={16} /> Digital Prescription
                </h3>
                {isExternal ? (
                  <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border-2 border-dashed border-amber-200">
                     {/* Free-text input logic here */}
                  </div>
                ) : (
                  <div className="relative">
                      <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
                      <Input type="text" placeholder="Search Hospital Pharmacy Inventory..." className="pl-10" value={drugSearch} onChange={(e) => setDrugSearch(e.target.value)}/>
                      {drugSearch && (
                        <div className="absolute w-full mt-1 bg-card border rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                            {isCatalogLoading && <div className="p-3 text-center text-sm text-muted-foreground">Searching...</div>}
                            {filteredInventory.map(item => (
                            <div key={item.id} onClick={() => addDrugToOrder(item)} className="p-3 hover:bg-muted cursor-pointer flex justify-between items-center border-b last:border-0">
                                <div>
                                <p className="font-bold text-sm uppercase text-card-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.category} • {item.purchasePrice} GHS</p>
                                </div>
                                <Plus size={16} className="text-primary" />
                            </div>
                            ))}
                            {!isCatalogLoading && filteredInventory.length === 0 && <div className="p-3 text-center text-sm text-muted-foreground">No results found.</div>}
                        </div>
                      )}
                  </div>
                )}
                
                <div className="space-y-2">
                    {prescription.map((item, idx) => (
                    <div key={idx} className="bg-muted/50 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
                        <div>
                           <p className="font-bold text-primary text-sm uppercase">{item.name} {item.strength ? `(${item.strength})` : ''}</p>
                        </div>
                        <div className="flex gap-2">
                           <Input className="w-20 text-xs" placeholder="Dosage" value={item.dosage} onChange={e => { const updated = [...prescription]; updated[idx].dosage = e.target.value; setPrescription(updated); }} />
                           <Input className="w-24 text-xs" placeholder="Frequency" value={item.frequency} onChange={e => { const updated = [...prescription]; updated[idx].frequency = e.target.value; setPrescription(updated); }} />
                        </div>
                         <button type="button" onClick={() => removeDrug(idx)} className="text-destructive"><X size={16}/></button>
                    </div>
                    ))}
                </div>
              </div>

               <div className="space-y-4 pt-6 border-t">
                 <h3 className="text-purple-600 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Beaker size={16} /> Lab Investigations</h3>
                 <div className="relative">
                    <Input type="text" placeholder="Search Hospital Lab Menu..." className="bg-purple-50 border-purple-100 text-foreground font-bold" value={labSearch} onChange={(e) => setLabSearch(e.target.value)} disabled={isExternal}/>
                    {labSearch && !isExternal && (
                      <div className="absolute w-full mt-1 bg-card border rounded-2xl shadow-2xl z-50">
                        {isLabMenuLoading && <div className="p-3">Searching...</div>}
                        {filteredLabMenu.map(t => (<div key={t.id} onClick={() => requestTest(t)} className="p-3 hover:bg-purple-50 cursor-pointer">{t.name}</div>))}
                      </div>
                    )}
                 </div>
                 <div className="flex flex-wrap gap-2">{labOrders.map((order, i) => (<div key={i} className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2">{order.name} <X size={12} className="cursor-pointer" onClick={() => removeTest(i)} /></div>))}</div>
               </div>

                <div className="space-y-4 pt-6 border-t">
                    <h3 className="text-orange-600 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Layers size={16} /> Imaging Requests</h3>
                     <div className="relative">
                        <Input type="text" placeholder="Search Hospital Imaging Menu..." className="bg-orange-50 border-orange-100 text-foreground font-bold" value={imagingSearch} onChange={(e) => setImagingSearch(e.target.value)} disabled={isExternal}/>
                        {imagingSearch && !isExternal && (
                        <div className="absolute w-full mt-1 bg-card border rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                            {isRadiologyMenuLoading ? <div className="p-3">Searching...</div> : 
                            filteredRadiologyMenu.map(s => (<div key={s.id} onClick={() => requestScan(s)} className="p-3 hover:bg-orange-50 cursor-pointer">{s.name}</div>))}
                            {!isRadiologyMenuLoading && filteredRadiologyMenu.length === 0 && <div className="p-3 text-center text-sm">No results.</div>}
                        </div>
                        )}
                    </div>
                     <div className="space-y-3">{imagingOrders.map((order, i) => (<div key={i} className="bg-card p-4 rounded-2xl border-2 border-orange-100 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{order.name} ({order.modality})</span>
                            <X size={14} className="text-muted-foreground/50 cursor-pointer" onClick={() => removeScan(i)} />
                        </div>
                        <Input placeholder="Clinical Indication (e.g. Chronic cough)" className="w-full p-2 text-xs" onChange={(e) => { const up = [...imagingOrders]; up[i].indication = e.target.value; setImagingOrders(up); }} />
                    </div>))}</div>
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
