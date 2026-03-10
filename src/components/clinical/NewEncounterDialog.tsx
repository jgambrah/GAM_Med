
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
  Clipboard, HeartPulse, Pill, Search, Beaker, X, Layers, ShieldAlert, Trash2, ChevronsUpDown, Check, FileSignature
} from 'lucide-react';
import { useFirebaseApp, useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import ProductSearchDropdown from '@/components/inventory/ProductSearchDropdown';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ReferralLetterDialog } from './ReferralLetterDialog';


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
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  // State Management
  const [isExternal, setIsExternal] = useState(false);
  const [items, setItems] = useState<any[]>([]); // Standardized list for both Internal/External
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<any[]>([]);
  
  // Free-text input state for external orders
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

  // DATA FETCHING
  const catalogQuery = useMemoFirebase(() => firestore && hospitalId ? query(collection(firestore, 'hospitals', hospitalId, 'product_catalog')) : null, [firestore, hospitalId]);
  const { data: catalog, isLoading: isCatalogLoading } = useCollection(catalogQuery);
  const labMenuQuery = useMemoFirebase(() => firestore && hospitalId ? query(collection(firestore, 'hospitals', hospitalId, 'lab_menu')) : null, [firestore, hospitalId]);
  const { data: labMenu, isLoading: isLabMenuLoading } = useCollection(labMenuQuery);
  const radiologyMenuQuery = useMemoFirebase(() => firestore && hospitalId ? query(collection(firestore, 'hospitals', hospitalId, 'radiology_menu')) : null, [firestore, hospitalId]);
  const { data: radiologyMenu, isLoading: isRadiologyMenuLoading } = useCollection(radiologyMenuQuery);

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

  useEffect(() => {
    // Clear all lists when switching modes
    setItems([]);
    setLabOrders([]);
    setRadiologyOrders([]);
  }, [isExternal]);

  const addTypedItem = () => {
    if (!extItemName) return;
    const newItem = {
        name: extItemName,
        instruction: extInstruction,
        isExternal: true,
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

  const removeItem = (id: string, listSetter: React.Dispatch<React.SetStateAction<any[]>>) => {
    listSetter(prev => prev.filter(item => item.id !== id));
  };
  
  const onSubmit = async (values: EncounterFormValues) => {
    if (!firebaseApp || !user || !userProfile) {
      toast({ variant: 'destructive', title: 'System Error', description: 'System not ready. Please re-login.' });
      return;
    }
    setLoading(true);

    try {
      const functions = getFunctions(firebaseApp);
      const createEncounter = httpsCallable(functions, 'createEncounter');
      
      const payload = {
        patientId,
        patientName,
        encounterType: values.encounterType,
        vitals: values.vitals || {},
        chiefComplaint: values.chiefComplaint,
        hpi: values.hpi,
        diagnosis: values.diagnosis,
        items: items || [], // Standardized name
        labOrders: labOrders || [],
        radiologyOrders: radiologyOrders || [],
        isExternal: isExternal, // The toggle state
        hospitalId: hospitalId
      };
  
      const result: any = await createEncounter(payload);
  
      if (result.data.success && result.data.encounterId) {
        toast({ title: "EHR Record Committed" });
        
        if (isExternal) {
            router.push(`/doctor/external-print/${result.data.encounterId}`);
        } else {
            setOpen(false);
            form.reset();
            setItems([]);
            setLabOrders([]);
            setRadiologyOrders([]);
        }

      } else {
        throw new Error(result.data.message || 'Cloud function did not return a success status or ID.');
      }
    } catch (e: any) {
      console.error("Encounter submission failed:", e);
      toast({ variant: "destructive", title: "Submission Failed", description: e.message });
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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
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

            <div className="p-8 space-y-8 bg-card overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Vitals and Notes */}
              <div className="space-y-4">
                <h3 className="text-primary font-black text-xs uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2"><Activity size={16} /> Vitals & Notes</h3>
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
                 <FormField control={form.control} name="chiefComplaint" render={({ field }) => (
                    <FormItem><FormLabel>Chief Complaint</FormLabel><FormControl><Textarea placeholder="Why is the patient here?" {...field} /></FormControl></FormItem>
                 )}/>
                 <FormField control={form.control} name="diagnosis" render={({ field }) => (
                    <FormItem><FormLabel>Final Diagnosis / Impression</FormLabel><FormControl><Input placeholder="ICD-10 or clinical term" {...field} /></FormControl></FormItem>
                 )}/>
              </div>

              {/* Diagnostics */}
              <div className="space-y-4 pt-4">
                <h3 className="text-primary font-black text-xs uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                  <Beaker size={16} /> Diagnostics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DiagnosticSearch
                        placeholder="Search Lab Tests..."
                        menu={labMenu || []}
                        onSelect={(item) => setLabOrders(prev => [...prev, item])}
                        selectedItems={labOrders}
                        onRemove={(id) => setLabOrders(prev => prev.filter(i => i.id !== id))}
                        disabled={isExternal || isLabMenuLoading}
                        title="Laboratory Requests"
                    />
                    <DiagnosticSearch
                        placeholder="Search Imaging Scans..."
                        menu={radiologyMenu || []}
                        onSelect={(item) => setRadiologyOrders(prev => [...prev, item])}
                        selectedItems={radiologyOrders}
                        onRemove={(id) => setRadiologyOrders(prev => prev.filter(i => i.id !== id))}
                        disabled={isExternal || isRadiologyMenuLoading}
                        title="Imaging Requests"
                    />
                </div>
              </div>

              {/* Medication & Services */}
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
                            setItems([]);
                            setLabOrders([]);
                            setRadiologyOrders([]);
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
                      <ProductSearchDropdown catalog={catalog || []} onSelect={addCatalogItem} />
                    </div>
                )}
                
                <div className="space-y-2">
                    {items.map((item, idx) => (
                    <div key={item.id || idx} className="bg-white p-4 rounded-2xl border-2 border-slate-50 flex justify-between items-center shadow-sm">
                        <div>
                            <p className="font-black text-black uppercase text-sm">{item.name}</p>
                            <p className="text-[10px] text-blue-600 font-bold italic">{item.instruction || item.dosage || 'No instructions'}</p>
                        </div>
                        <button type="button" onClick={() => removeItem(item.id, setItems)} className="text-red-300 hover:text-red-600"><Trash2 size={18} /></button>
                    </div>
                    ))}
                </div>
                </div>

            </div>

            <DialogFooter className="p-8 bg-muted/50 rounded-b-lg">
              <Button variant="ghost" onClick={() => setOpen(false)}>Discard</Button>
              <Button type="submit" disabled={loading} className="disabled:bg-slate-300">
                {loading ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={18} /> Sign & Commit to EHR</>}
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
                        <Input type="text" className="rounded-xl text-card-foreground font-black text-center" {...field} disabled={disabled} />
                    </FormControl>
                </FormItem>
            )}
        />
    );
}

function DiagnosticSearch({ title, placeholder, menu, onSelect, selectedItems, onRemove, disabled, isLoading }: any) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  return (
    <div className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4">
      <h4 className="text-xs font-black uppercase text-muted-foreground">{title}</h4>
      <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={dropdownOpen}
            className="w-full justify-between"
            disabled={disabled}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {menu.map((item: any) => (
                  <CommandItem
                    key={item.id}
                    value={item.name}
                    onSelect={() => {
                      onSelect(item);
                      setDropdownOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedItems.some((i:any) => i.id === item.id) ? "opacity-100" : "opacity-0")} />
                    {item.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="space-y-2">
        {selectedItems.map((item: any) => (
          <div key={item.id} className="flex justify-between items-center bg-muted/50 p-2 pl-4 rounded-lg text-xs">
            <span className="font-bold">{item.name}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemove(item.id)}><X size={14} /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
