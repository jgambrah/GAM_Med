'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Loader2,
  Save,
  Thermometer,
  Activity,
  Scale,
  HeartPulse,
  Pill,
  Search,
  Beaker,
  X,
  Layers,
  ShieldAlert,
  Trash2,
  ChevronsUpDown,
  Check,
  FileSignature,
} from 'lucide-react';
import {
  useFirebaseApp,
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
} from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import ProductSearchDropdown from '@/components/inventory/ProductSearchDropdown';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ReferralLetterDialog } from './ReferralLetterDialog';
import { parseClinicalError } from '@/lib/error-handler';
import { Timestamp } from 'firebase/firestore';

const encounterSchema = z.object({
  encounterType: z.string().min(1, 'Encounter type is required'),
  chiefComplaint: z.string().optional(),
  hpi: z.string().optional(),
  diagnosis: z.string().optional(),
  vitals: z
    .object({
      temp: z.string().optional(),
      systolic: z.string().optional(),
      diastolic: z.string().optional(),
      pulse: z.string().optional(),
      respiration: z.string().optional(),
      weight: z.string().optional(),
      height: z.string().optional(),
      bmi: z.string().optional(),
      spo2: z.string().optional(),
    })
    .optional(),
});

type EncounterFormValues = z.infer<typeof encounterSchema>;

interface NewEncounterDialogProps {
  patientId: string;
  hospitalId: string;
  patientName: string;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const validateVitals = (vitals: any) => {
  const errors: string[] = [];
  if (!vitals) return errors;

  const temp = Number(vitals.temp);
  if (vitals.temp && (temp < 30 || temp > 45)) {
    errors.push("Invalid temperature");
  }

  const spo2 = Number(vitals.spo2);
  if (vitals.spo2 && (spo2 < 70 || spo2 > 100)) {
    errors.push("Invalid SpO2");
  }

  const pulse = Number(vitals.pulse);
  if (vitals.pulse && (pulse < 30 || pulse > 220)) {
    errors.push("Invalid pulse");
  }
  
  const respiration = Number(vitals.respiration);
  if (vitals.respiration && (respiration < 5 || respiration > 60)) {
    errors.push("Invalid respiration");
  }

  return errors;
};

export function NewEncounterDialog({
  patientId: propsPatientId,
  hospitalId,
  patientName,
  onSuccess,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: NewEncounterDialogProps) {
  const { id: patientDocIdFromParams } = useParams();
  const patientId = propsPatientId || (patientDocIdFromParams as string);

  const [internalOpen, setInternalOpen] = useState(false);
  const loading = form.formState.isSubmitting;
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;
  
  const firebaseApp = useFirebaseApp();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  // State Management
  const [isExternal, setIsExternal] = useState(false);
  const [items, setItems] = useState<any[]>([]); // Standardized list for drugs/services
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<any[]>([]);

  const [extItemName, setExtItemName] = useState('');
  const [extInstruction, setExtInstruction] = useState('');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const patientRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId) return null;
    return doc(
      firestore,
      'hospitals',
      hospitalId,
      'patients',
      patientId
    );
  }, [firestore, hospitalId, patientId]);
  const { data: patientData, isLoading: isPatientLoading } = useDoc(patientRef);

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital } = useDoc(hospitalRef);

  const catalogQuery = useMemoFirebase(
    () =>
      firestore && hospitalId
        ? query(collection(firestore, 'hospitals', hospitalId, 'product_catalog'))
        : null,
    [firestore, hospitalId]
  );
  const { data: catalog, isLoading: isCatalogLoading } =
    useCollection(catalogQuery);
  const labMenuQuery = useMemoFirebase(
    () =>
      firestore && hospitalId
        ? query(collection(firestore, 'hospitals', hospitalId, 'lab_menu'))
        : null,
    [firestore, hospitalId]
  );
  const { data: labMenu, isLoading: isLabMenuLoading } =
    useCollection(labMenuQuery);
  const radiologyMenuQuery = useMemoFirebase(
    () =>
      firestore && hospitalId
        ? query(collection(firestore, 'hospitals', hospitalId, 'radiology_menu'))
        : null,
    [firestore, hospitalId]
  );
  const { data: radiologyMenu, isLoading: isRadiologyMenuLoading } =
    useCollection(radiologyMenuQuery);

  const form = useForm<EncounterFormValues>({
    resolver: zodResolver(encounterSchema),
    defaultValues: {
      encounterType: 'Consultation',
      vitals: {
        temp: '',
        systolic: '',
        diastolic: '',
        pulse: '',
        respiration: '',
        weight: '',
        height: '',
        spo2: '',
        bmi: '0.0',
      },
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
      id: Date.now().toString(),
    };
    setItems([...items, newItem]);
    setExtItemName('');
    setExtInstruction('');
  };

  const addCatalogItem = (item: any) => {
    if (!items.some((i) => i.id === item.id)) {
      setItems((currentItems) => [...currentItems, item]);
    }
  };

  const removeItem = (
    id: string,
    listSetter: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    listSetter((prev) => prev.filter((item) => item.id !== id));
  };

  const onSubmit = async (values: EncounterFormValues) => {
    if (!firebaseApp) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'System not ready. Please try again.',
      });
      return;
    }
    
    const vitalErrors = validateVitals(values.vitals);
    if (vitalErrors.length > 0) {
      toast({
        title: "Invalid Vitals",
        description: vitalErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    const payload = {
      patientId: patientId,
      patientName: patientName || `${patientData?.firstName} ${patientData?.lastName}`,
      ghanaCardId: patientData?.ghanaCardId || 'GHA-NOT-SET',
      hospitalName: userProfile?.hospitalName || 'GamMed Facility',
      encounterType: values.encounterType || 'OPD Consultation',
      vitals: {
        systolic: values.vitals?.systolic || '',
        diastolic: values.vitals?.diastolic || '',
        bp: `${values.vitals?.systolic || '0'}/${
          values.vitals?.diastolic || '0'
        }`,
        temp: values.vitals?.temp || '',
        pulse: values.vitals?.pulse || '',
        respiration: values.vitals?.respiration || '',
        weight: values.vitals?.weight || '',
        height: values.vitals?.height || '',
        bmi: values.vitals?.bmi || '',
        spo2: values.vitals?.spo2 || '',
      },
      chiefComplaint: values.chiefComplaint || '',
      hpi: values.hpi || '',
      diagnosis: values.diagnosis || '',
      isExternal: isExternal,
      items: items || [],
      labOrders: labOrders || [],
      radiologyOrders: radiologyOrders || [],
    };
    
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const createEncounter = httpsCallable(functions, 'createEncounter');
      const result: any = await createEncounter(payload);

      if (result.data.success && result.data.encounterId) {
        toast({ title: 'EHR Record Committed' });
        onSuccess?.(); // Call the success callback to trigger a refresh
        if (isExternal) {
          setTimeout(() => {
            router.push(`/doctor/external-print/${result.data.encounterId}`);
            setOpen(false);
          }, 1000);
        } else {
          setOpen(false);
        }
        form.reset();
      } else {
        throw new Error(
          result.data.message ||
            'Cloud function did not return a success status or ID.'
        );
      }
    } catch (error: any) {
      const friendlyMessage = parseClinicalError(error);
      console.error('❌ CLOUD CRASH DETAILS:', error);
      toast({
        variant: 'destructive',
        title: 'COMMIT FAILED',
        description: friendlyMessage,
        duration: 6000,
      });
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
                <h3 className="text-primary font-black text-xs uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                  <Activity size={16} /> Vitals & Notes
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <VitalInput
                    control={form.control}
                    name="vitals.temp"
                    label="Temp (°C)"
                    icon={Thermometer}
                  />
                  <div className="grid grid-cols-2 gap-1">
                    <VitalInput
                      control={form.control}
                      name="vitals.systolic"
                      label="BP (Sys)"
                    />
                    <VitalInput
                      control={form.control}
                      name="vitals.diastolic"
                      label="BP (Dia)"
                    />
                  </div>
                  <VitalInput
                    control={form.control}
                    name="vitals.pulse"
                    label="Pulse (bpm)"
                  />
                  <VitalInput
                    control={form.control}
                    name="vitals.respiration"
                    label="Respiration"
                  />
                  <VitalInput
                    control={form.control}
                    name="vitals.spo2"
                    label="SPO2 (%)"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <VitalInput
                    control={form.control}
                    name="vitals.weight"
                    label="Weight (kg)"
                    icon={Scale}
                  />
                  <VitalInput
                    control={form.control}
                    name="vitals.height"
                    label="Height (cm)"
                  />
                  <div
                    className={`p-4 rounded-2xl flex flex-col justify-center items-center border-2 transition-all ${
                      parseFloat(bmiValue) > 25
                        ? 'bg-orange-50 border-orange-100 text-orange-700'
                        : 'bg-green-50 border-green-100 text-green-700'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Calculated BMI
                    </span>
                    <span className="text-2xl font-black">{bmiValue}</span>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="chiefComplaint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chief Complaint</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Why is the patient here?"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Diagnosis / Impression</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ICD-10 or clinical term"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
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
                    onSelect={(item: any) =>
                      setLabOrders((prev) => [...prev, item])
                    }
                    selectedItems={labOrders}
                    onRemove={(id: string) =>
                      setLabOrders((prev) => prev.filter((i) => i.id !== id))
                    }
                    disabled={isExternal || isLabMenuLoading}
                    isLoading={isLabMenuLoading}
                    title="Laboratory Requests"
                  />
                  <DiagnosticSearch
                    placeholder="Search Imaging Scans..."
                    menu={radiologyMenu || []}
                    onSelect={(item: any) =>
                      setRadiologyOrders((prev) => [...prev, item])
                    }
                    selectedItems={radiologyOrders}
                    onRemove={(id: string) =>
                      setRadiologyOrders((prev) => prev.filter((i) => i.id !== id))
                    }
                    disabled={isExternal || isRadiologyMenuLoading}
                    isLoading={isRadiologyMenuLoading}
                    title="Imaging Requests"
                  />
                </div>
              </div>

              {/* Medication & Services */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-blue-600">
                    Medication & Services
                  </h3>
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
                    <label
                      htmlFor="ext-toggle"
                      className="text-[10px] font-black uppercase text-amber-700 cursor-pointer"
                    >
                      External Facility (No Billing)
                    </label>
                  </div>
                </div>

                {isExternal ? (
                  <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[32px] border-2 border-dashed border-slate-200">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">
                          Type Item Name
                        </label>
                        <input
                          className="w-full p-4 rounded-2xl border-none shadow-sm text-black font-bold"
                          placeholder="e.g. MRI Scan / Ciprofloxacin"
                          value={extItemName}
                          onChange={(e) => setExtItemName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">
                          Dosage / Instructions
                        </label>
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
                    <ProductSearchDropdown
                      catalog={catalog || []}
                      onSelect={(p) => addCatalogItem(p)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-white p-4 rounded-2xl border-2 border-slate-50 flex justify-between items-center shadow-sm"
                    >
                      <div>
                        <p className="font-black text-black uppercase text-sm">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-blue-600 font-bold italic">
                          {item.instruction || item.dosage || 'No instructions'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id, setItems)}
                        className="text-red-300 hover:text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 bg-muted/50 rounded-b-lg">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Discard
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="disabled:bg-slate-300"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Save className="mr-2" size={18} /> Sign & Commit to EHR
                  </>
                )}
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

function DiagnosticSearch({
  title,
  placeholder,
  menu,
  onSelect,
  selectedItems,
  onRemove,
  disabled,
  isLoading,
}: any) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMenu = useMemo(() => {
    if (!menu) return [];
    if (!searchTerm) return menu;
    return menu.filter((item: any) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [menu, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <div className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4">
      <h4 className="text-xs font-black uppercase text-muted-foreground">
        {title}
      </h4>
      <div className="relative" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={dropdownOpen}
          className="w-full justify-between"
          disabled={disabled}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        {dropdownOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="p-1">
              {filteredMenu.length === 0 ? (
                <p className="p-2 text-center text-sm text-muted-foreground">
                  No results.
                </p>
              ) : (
                filteredMenu.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center p-2 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(item);
                      setDropdownOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedItems.some((i: any) => i.id === item.id)
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {selectedItems.map((item: any) => (
          <div
            key={item.id}
            className="flex justify-between items-center bg-muted/50 p-2 pl-4 rounded-lg text-xs"
          >
            <span className="font-bold">{item.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => onRemove(item.id)}
            >
              <X size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
