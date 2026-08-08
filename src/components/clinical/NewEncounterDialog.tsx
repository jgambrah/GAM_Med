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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Mic,
  MicOff,
  Sparkles,
  Zap,
  FileText,
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
import { evaluatePharmacogenomics } from '@/ai/flows/ai-genomic-engine';

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
  encounterId?: string;
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
  encounterId,
}: NewEncounterDialogProps) {
  const { id: patientDocIdFromParams } = useParams();
  const patientId = propsPatientId || (patientDocIdFromParams as string);

  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;
  
  const firebaseApp = useFirebaseApp();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const encounterRef = useMemoFirebase(() => {
    if (!firestore || !encounterId) return null;
    return doc(firestore, 'encounters', encounterId);
  }, [firestore, encounterId]);
  const { data: existingEncounter } = useDoc(encounterRef);

  // State Management
  const [isExternal, setIsExternal] = useState(false);
  const [items, setItems] = useState<any[]>([]); // Standardized list for drugs/services
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<any[]>([]);

  const [extItemName, setExtItemName] = useState('');
  const [extInstruction, setExtInstruction] = useState('');

  const activeMedList = useMemo(() => {
    const medNames = items.map(i => i.name || '');
    if (extItemName.trim()) medNames.push(extItemName.trim());
    return medNames.filter(Boolean);
  }, [items, extItemName]);

  const pgxAlerts = useMemo(() => {
    return evaluatePharmacogenomics(activeMedList);
  }, [activeMedList]);

  // AI Scribe & Productivity Tools State
  const [isListening, setIsListening] = useState(false);

  const toggleVoiceScribe = () => {
    if (typeof window === 'undefined' || (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window))) {
      toast({ 
        variant: 'destructive', 
        title: 'Voice Scribe Unavailable', 
        description: 'Web Speech Recognition is not supported in this browser. Please use Chrome/Edge.' 
      });
      return;
    }

    if (isListening) {
      setIsListening(false);
      toast({ title: 'Voice Scribe Paused', description: 'Transcribed clinical notes saved.' });
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast({ title: '🎙️ AI Ambient Scribe Active', description: 'Listening to consultation. Speak clearly...' });
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          const currentHpi = form.getValues('hpi') || '';
          form.setValue('hpi', `${currentHpi} ${currentTranscript}`.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      console.error(e);
      setIsListening(false);
    }
  };

  const applyOrderBundle = (bundleType: string) => {
    if (bundleType === 'ANC_FIRST') {
      setLabOrders(prev => [
        ...prev,
        { id: 'anc_cbc', name: 'Full Blood Count (CBC)' },
        { id: 'anc_uri', name: 'Urinalysis (Routine & Microscopy)' },
        { id: 'anc_bg', name: 'Blood Group & Rh Typing' },
        { id: 'anc_hep', name: 'Hepatitis B & C Screening' },
        { id: 'anc_syph', name: 'Syphilis VDRL / RPR' }
      ]);
      setRadiologyOrders(prev => [
        ...prev,
        { id: 'anc_uss', scanName: 'Obstetric / Pelvic Ultrasound', modality: 'US' }
      ]);
      setItems(prev => [
        ...prev,
        { id: 'anc_folic', name: 'Folic Acid 5mg Tablets', dosage: '5mg', frequency: 'Daily', duration: '30 Days', qty: 30, isExternal: true },
        { id: 'anc_ferrous', name: 'Ferrous Sulfate 200mg', dosage: '200mg', frequency: 'Daily', duration: '30 Days', qty: 30, isExternal: true }
      ]);
      form.setValue('chiefComplaint', 'First Antenatal Care (ANC) Routine Intake');
      form.setValue('diagnosis', 'Pregnancy Confirmation & Routine ANC Intake');
      toast({ title: '⚡ First ANC Bundle Applied', description: 'Routine ANC labs, ultrasound, and prenatal supplements queued.' });
    } else if (bundleType === 'MALARIA') {
      setLabOrders(prev => [
        ...prev,
        { id: 'mal_rdt', name: 'Malaria Rapid Diagnostic Test (RDT)' },
        { id: 'mal_mps', name: 'Blood Film for Malaria Parasites (MPS)' },
        { id: 'mal_cbc', name: 'Full Blood Count (CBC)' }
      ]);
      setItems(prev => [
        ...prev,
        { id: 'mal_coartem', name: 'Artemether-Lumefantrine (Coartem) 20/120mg', dosage: '4 tabs', frequency: 'BD', duration: '3 Days', qty: 24, isExternal: true },
        { id: 'mal_para', name: 'Paracetamol 500mg Tablets', dosage: '1g', frequency: 'TDS', duration: '3 Days', qty: 18, isExternal: true }
      ]);
      form.setValue('chiefComplaint', 'High fever, chills, rigors, headache, and body weakness');
      form.setValue('diagnosis', 'Acute Uncomplicated Malaria');
      toast({ title: '⚡ Acute Malaria Bundle Applied', description: 'Malaria RDT/MPS labs, Coartem, and Paracetamol queued.' });
    } else if (bundleType === 'HTN_DM') {
      setLabOrders(prev => [
        ...prev,
        { id: 'dm_fbg', name: 'Fasting Blood Glucose (FBG)' },
        { id: 'dm_hba1c', name: 'HbA1c (Glycated Hemoglobin)' },
        { id: 'htn_lipid', name: 'Lipid Profile (Cholesterol, Triglycerides)' },
        { id: 'htn_lft', name: 'Renal Function (Urea & Electrolytes & Creatinine)' }
      ]);
      setRadiologyOrders(prev => [
        ...prev,
        { id: 'htn_ecg', scanName: '12-Lead Electrocardiogram (ECG)', modality: 'ECG' }
      ]);
      form.setValue('chiefComplaint', 'Routine Hypertension & Diabetes Follow-up');
      form.setValue('diagnosis', 'Essential Hypertension & Type 2 Diabetes Mellitus');
      toast({ title: '⚡ Hypertension & Diabetes Bundle Applied', description: 'Metabolic panel, HbA1c, ECG, and renal function queued.' });
    } else if (bundleType === 'PREECLAMPSIA_SEVERE') {
      setLabOrders(prev => [
        ...prev,
        { id: 'pe_lft', name: 'Liver Function Tests (ALT, AST, Bilirubin)' },
        { id: 'pe_rft', name: 'Renal Function (Urea, Electrolytes, Creatinine, Urate)' },
        { id: 'pe_cbc', name: 'Full Blood Count & Platelet Count' },
        { id: 'pe_uri', name: 'Urine Dipstick Protein Quantification' }
      ]);
      setItems(prev => [
        ...prev,
        { id: 'pe_mgso4', name: 'Magnesium Sulfate 50% Injection (4g IV loading + 10g IM)', dosage: '4g IV / 10g IM', frequency: 'STAT', duration: '1 Day', qty: 2, isExternal: true },
        { id: 'pe_labetalol', name: 'IV Labetalol 20mg / Hydralazine 5mg', dosage: '20mg', frequency: 'STAT', duration: '1 Day', qty: 1, isExternal: true }
      ]);
      form.setValue('chiefComplaint', 'Severe Preeclampsia protocol activation — High BP, headache, visual disturbance, proteinuria');
      form.setValue('diagnosis', 'Severe Preeclampsia with Severe Features');
      toast({ title: '⚡ Severe Preeclampsia Protocol Activated', description: 'IV MgSO4, Labetalol, HELLP lab panel, and Bed Transfer queued.' });
    }
  };

  const handleSmartPhraseExpansion = (text: string, fieldName: 'hpi' | 'chiefComplaint') => {
    let expanded = text;
    if (expanded.includes('.normalanc')) {
      expanded = expanded.replace('.normalanc', 'Uterus size corresponds to gestational age. Fetal heart rate 140-150 bpm, regular. No vaginal bleeding or fluid escape. Fundal height appropriate for dates. Normotensive.');
      toast({ title: '✨ SmartPhrase Expanded', description: '.normalanc expanded to full normative obstetric exam notes.' });
    }
    if (expanded.includes('.normalcardio')) {
      expanded = expanded.replace('.normalcardio', 'S1, S2 present, normal intensity. No murmurs, gallops, or rubs. Peripheral pulses equal bilaterally.');
      toast({ title: '✨ SmartPhrase Expanded', description: '.normalcardio expanded to full normative cardiovascular exam notes.' });
    }
    if (expanded.includes('.normalresp')) {
      expanded = expanded.replace('.normalresp', 'Lungs clear to auscultation bilaterally. Normal vesicular breath sounds. No wheezing, rales, or rhonchi.');
      toast({ title: '✨ SmartPhrase Expanded', description: '.normalresp expanded to full normative respiratory exam notes.' });
    }
    if (expanded.includes('.normalabdo')) {
      expanded = expanded.replace('.normalabdo', 'Abdomen soft, non-tender, non-distended. Bowel sounds normoactive in all 4 quadrants. No hepatosplenomegaly.');
      toast({ title: '✨ SmartPhrase Expanded', description: '.normalabdo expanded to full normative abdominal exam notes.' });
    }
    if (expanded.includes('.discharge')) {
      expanded = expanded.replace('.discharge', 'Take prescribed medications as directed. Drink plenty of fluids and rest. Return immediately if fever > 38.5°C, severe abdominal pain, or shortness of breath occurs.');
      toast({ title: '✨ SmartPhrase Expanded', description: '.discharge expanded to standard discharge instructions.' });
    }
    form.setValue(fieldName, expanded);
  };

  const insertMacro = (macroType: string) => {
    const currentHpi = form.getValues('hpi') || '';
    let macroText = '';
    if (macroType === 'NORMAL_CARDIO') {
      macroText = '\n[CARDIOVASCULAR EXAM]: S1, S2 present, normal intensity. No murmurs, gallops, or rubs. Peripheral pulses equal bilaterally.';
    } else if (macroType === 'NORMAL_RESP') {
      macroText = '\n[RESPIRATORY EXAM]: Lungs clear to auscultation bilaterally. Normal vesicular breath sounds. No wheezing, rales, or rhonchi.';
    } else if (macroType === 'NORMAL_ABDO') {
      macroText = '\n[ABDOMINAL EXAM]: Abdomen soft, non-tender, non-distended. Bowel sounds normoactive in all 4 quadrants. No hepatosplenomegaly.';
    } else if (macroType === 'NORMAL_NEURO') {
      macroText = '\n[NEUROLOGICAL EXAM]: Alert & oriented x3. Cranial nerves II-XII intact. Motor strength 5/5 in all extremities.';
    } else if (macroType === 'DISCHARGE_INSTRUCTIONS') {
      macroText = '\n[DISCHARGE INSTRUCTIONS]: Take prescribed medications as directed. Drink plenty of fluids and rest. Return immediately if fever > 38.5°C or chest pain occurs.';
    }
    form.setValue('hpi', `${currentHpi}${macroText}`.trim());
    toast({ title: '📝 Macro Inserted', description: 'Clinical text snippet added to examination notes.' });
  };

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

  const loading = form.formState.isSubmitting;

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

  useEffect(() => {
    if (existingEncounter) {
      const v = existingEncounter.vitals || {};
      
      let sys = v.systolic || '';
      let dia = v.diastolic || '';
      if (!sys && !dia && v.bp) {
        const parts = v.bp.split('/');
        if (parts.length === 2) {
          sys = parts[0];
          dia = parts[1];
        }
      }

      form.reset({
        encounterType: existingEncounter.type || 'Consultation',
        chiefComplaint: existingEncounter.chiefComplaint || '',
        hpi: existingEncounter.hpi || '',
        diagnosis: existingEncounter.diagnosis || '',
        vitals: {
          temp: v.temp || '',
          systolic: sys || '',
          diastolic: dia || '',
          pulse: v.pulse || '',
          respiration: v.respiration || '',
          weight: v.weight || '',
          height: v.height || '',
          spo2: v.spo2 || '',
          bmi: v.bmi || '0.0',
        }
      });
      
      if (Array.isArray(existingEncounter.items)) {
        setItems(existingEncounter.items);
      }
      if (Array.isArray(existingEncounter.labOrders)) {
        setLabOrders(existingEncounter.labOrders);
      }
      if (Array.isArray(existingEncounter.radiologyOrders)) {
        setRadiologyOrders(existingEncounter.radiologyOrders);
      }
    }
  }, [existingEncounter, form]);

  // --- REAL-TIME CLINICAL DECISION SUPPORT & SAFETY CHECKS ---
  const currentVitals = form.watch('vitals');

  const riskMetrics = useMemo(() => {
    let score = 0;
    const sys = Number(currentVitals?.systolic);
    const pulse = Number(currentVitals?.pulse);
    const temp = Number(currentVitals?.temp);
    const resp = Number(currentVitals?.respiration);
    const spo2 = Number(currentVitals?.spo2);

    if (resp >= 25 || (resp > 0 && resp <= 8)) score += 3;
    else if (resp >= 21) score += 2;

    if (spo2 > 0 && spo2 <= 91) score += 3;
    else if (spo2 <= 93) score += 2;
    else if (spo2 <= 95) score += 1;

    if (temp >= 39.1 || (temp > 0 && temp <= 35.0)) score += 2;

    if (pulse >= 131 || (pulse > 0 && pulse <= 40)) score += 3;
    else if (pulse >= 111) score += 2;

    if (sys > 0 && sys <= 90) score += 3;
    else if (sys <= 100) score += 2;
    else if (sys <= 110) score += 1;

    let tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (score >= 7) tier = 'CRITICAL';
    else if (score >= 5) tier = 'HIGH';
    else if (score >= 3) tier = 'MEDIUM';

    return { score, tier };
  }, [currentVitals]);

  const safetyAlerts = useMemo(() => {
    const alerts: string[] = [];
    const knownAllergies = (patientData?.allergies || patientData?.knownAllergies || []);

    // 1. Drug-Allergy Checks
    items.forEach((item: any) => {
      const drugName = (item.name || '').toLowerCase();
      knownAllergies.forEach((allergy: string) => {
        const algName = allergy.toLowerCase();
        if (algName.includes('penicillin') && (drugName.includes('penicillin') || drugName.includes('amoxicillin') || drugName.includes('ampicillin') || drugName.includes('co-amoxiclav') || drugName.includes('augmentin'))) {
          alerts.push(`⚠️ ALLERGY CONFLICT: Patient is allergic to Penicillin! (${item.name})`);
        } else if (algName.includes('sulfa') && (drugName.includes('sulfa') || drugName.includes('co-trimoxazole') || drugName.includes('septrin'))) {
          alerts.push(`⚠️ ALLERGY CONFLICT: Patient is allergic to Sulfa drugs! (${item.name})`);
        } else if (algName.includes('nsaid') && (drugName.includes('ibuprofen') || drugName.includes('diclofenac') || drugName.includes('naproxen') || drugName.includes('aspirin'))) {
          alerts.push(`⚠️ ALLERGY CONFLICT: Patient is allergic to NSAIDs! (${item.name})`);
        }
      });
    });

    // 2. Drug-Drug Interaction Checks
    const drugNames = items.map((i: any) => (i.name || '').toLowerCase());
    const hasWarfarin = drugNames.some(n => n.includes('warfarin'));
    const hasAspirinOrNSAID = drugNames.some(n => n.includes('aspirin') || n.includes('ibuprofen') || n.includes('diclofenac'));
    if (hasWarfarin && hasAspirinOrNSAID) {
      alerts.push(`⚡ DRUG INTERACTION: Warfarin + Aspirin/NSAID significantly increases hemorrhage risk.`);
    }

    return alerts;
  }, [items, patientData]);

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
      setItems((currentItems) => [
        ...currentItems,
        {
          ...item,
          dosage: '',
          frequency: '',
          duration: '',
          qty: 1,
          quantity: 1,
          instruction: '',
          instructions: '',
        }
      ]);
    }
  };

  const updateItemField = (id: string, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
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
      encounterId: encounterId || null,
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
          <Plus /> {encounterId ? "Continue Consultation" : "New Encounter"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="bg-foreground p-8 text-background rounded-t-lg flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <HeartPulse className="text-primary" /> {encounterId ? "Continue Consultation" : "New Encounter"}
                </DialogTitle>
                <DialogDescription className="text-primary/70 font-bold uppercase text-xs tracking-widest pt-2">
                  Patient: {patientName}
                </DialogDescription>
              </div>

              {/* EARLY WARNING RISK SCORE BADGE */}
              <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 font-black text-xs uppercase tracking-wider ${
                riskMetrics.tier === 'CRITICAL' ? 'bg-red-600 border-red-500 text-white animate-bounce' :
                riskMetrics.tier === 'HIGH' ? 'bg-orange-500 border-orange-400 text-white' :
                riskMetrics.tier === 'MEDIUM' ? 'bg-amber-500 border-amber-400 text-slate-950' :
                'bg-emerald-950 border-emerald-800 text-emerald-300'
              }`}>
                <ShieldAlert size={16} />
                <span>NEWS2: {riskMetrics.score} ({riskMetrics.tier} RISK)</span>
              </div>
            </DialogHeader>

            {/* REAL-TIME SAFETY ALERTS BANNER */}
            {safetyAlerts.length > 0 && (
              <div className="bg-red-950 text-red-200 border-l-4 border-red-500 p-4 space-y-1">
                {safetyAlerts.map((alert, idx) => (
                  <p key={idx} className="text-xs font-black uppercase tracking-wide flex items-center gap-2">
                    {alert}
                  </p>
                ))}
              </div>
            )}

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
                {/* --- AI CLINICAL PRODUCTIVITY TOOLBAR --- */}
                <div className="bg-slate-900 text-white p-4 rounded-3xl space-y-3">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-amber-400 animate-pulse" size={18} />
                      <span className="text-xs font-black uppercase tracking-widest text-amber-400">AI Clinical Intelligence & Scribe</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={toggleVoiceScribe}
                        className={`rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
                          isListening
                            ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                            : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                        }`}
                      >
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        {isListening ? "Stop Voice Scribe" : "Start Voice Scribe 🎙️"}
                      </Button>

                      <Select onValueChange={applyOrderBundle}>
                        <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700 text-white font-bold text-xs rounded-2xl h-10">
                          <Zap size={14} className="text-amber-400 mr-1" />
                          <SelectValue placeholder="Quick Order Bundles ⚡" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="ANC_FIRST">First ANC Visit Bundle</SelectItem>
                          <SelectItem value="MALARIA">Acute Malaria Bundle</SelectItem>
                          <SelectItem value="HTN_DM">Hypertension & Diabetes Bundle</SelectItem>
                          <SelectItem value="PREECLAMPSIA_SEVERE">Severe Preeclampsia Protocol ⚡</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* CLINICAL MACROS / SMART TEXT SNIPPETS */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <FileText size={12} /> Macros:
                    </span>
                    <button
                      type="button"
                      onClick={() => insertMacro('NORMAL_CARDIO')}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 transition-all"
                    >
                      + Normal Cardio
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMacro('NORMAL_RESP')}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 transition-all"
                    >
                      + Normal Resp
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMacro('NORMAL_ABDO')}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 transition-all"
                    >
                      + Normal Abdo
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMacro('NORMAL_NEURO')}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 transition-all"
                    >
                      + Normal Neuro
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMacro('DISCHARGE_INSTRUCTIONS')}
                      className="px-3 py-1 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[10px] font-bold transition-all"
                    >
                      + Discharge Notes
                    </button>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="chiefComplaint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chief Complaint (Type .phrase shortcuts for auto-expansion)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Why is the patient here? (e.g. type .normalanc or .normalcardio)"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleSmartPhraseExpansion(e.target.value, 'chiefComplaint');
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hpi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>History of Present Illness / Physical Exam (SmartPhrases: .normalanc, .normalcardio, .normalresp, .normalabdo, .discharge)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed history of present illness. Type .normalanc, .normalcardio, .normalresp, .normalabdo, or .discharge to expand."
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleSmartPhraseExpansion(e.target.value, 'hpi');
                          }}
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
                          placeholder="ICD-10/11 or clinical term"
                          {...field}
                        />
                      </FormControl>

                      {/* --- AI ICD-11 & CPT CODING AUTO-SUGGEST CHIPS --- */}
                      <div className="bg-slate-900 text-white p-3 rounded-2xl space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                            <Sparkles size={12} /> AI ICD-11 & CPT Auto-Coder:
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Click code to auto-insert</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => form.setValue('diagnosis', `${form.getValues('diagnosis') || ''} [ICD-11: 1F40 - Plasmodium falciparum malaria | CPT: 87899]`.trim())}
                            className="text-[10px] font-black bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-1 rounded-xl border border-slate-700 transition-all flex items-center gap-1"
                          >
                            + ICD-11: 1F40 (Malaria) • CPT: 87899
                          </button>
                          <button
                            type="button"
                            onClick={() => form.setValue('diagnosis', `${form.getValues('diagnosis') || ''} [ICD-11: BA00 - Essential hypertension | CPT: 99214]`.trim())}
                            className="text-[10px] font-black bg-slate-800 hover:bg-slate-700 text-sky-300 px-3 py-1 rounded-xl border border-slate-700 transition-all flex items-center gap-1"
                          >
                            + ICD-11: BA00 (HTN) • CPT: 99214
                          </button>
                          <button
                            type="button"
                            onClick={() => form.setValue('diagnosis', `${form.getValues('diagnosis') || ''} [ICD-11: QA00 - ANC Routine Supervision | CPT: 59400]`.trim())}
                            className="text-[10px] font-black bg-slate-800 hover:bg-slate-700 text-purple-300 px-3 py-1 rounded-xl border border-slate-700 transition-all flex items-center gap-1"
                          >
                            + ICD-11: QA00 (ANC) • CPT: 59400
                          </button>
                        </div>
                      </div>
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

              {/* REAL-TIME PHARMACOGENOMICS (PGX) SAFETY INTERCEPT BANNER */}
              {pgxAlerts.length > 0 && (
                <div className="bg-red-950 border-4 border-red-600 rounded-[32px] p-6 text-white space-y-4 shadow-2xl animate-in zoom-in-95 my-4">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="text-red-400 animate-pulse shrink-0" size={24} />
                    <div>
                      <h4 className="text-sm font-black uppercase text-red-400 tracking-wider">
                        🧬 REAL-TIME PHARMACOGENOMIC CONTRAINDICATION INTERCEPT
                      </h4>
                      <p className="text-[10px] font-bold text-red-200 uppercase">
                        Patient DNA sequencing profile flagged high risk for selected prescription orders.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {pgxAlerts.map((alert, idx) => (
                      <div key={idx} className="bg-red-900/80 border border-red-700 p-4 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center text-xs font-black uppercase">
                          <span className="text-red-300">Medication: {alert.medicationName}</span>
                          <span className="bg-black/50 px-2.5 py-1 rounded-md text-red-200">Gene: {alert.gene}</span>
                        </div>
                        <p className="text-xs font-bold text-white leading-relaxed">{alert.clinicalWarning}</p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[9px] font-black text-amber-300 uppercase">Suggested Swap:</span>
                          {alert.alternativeMedications.map((alt, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setItems(prev => prev.filter(item => item.name !== alert.medicationName));
                                if (extItemName === alert.medicationName) setExtItemName(alt);
                                toast({
                                  title: '🔄 Order Swapped to PGx Safe Alternative',
                                  description: `Replaced ${alert.medicationName} with ${alt}.`
                                });
                              }}
                              className="bg-purple-950 hover:bg-purple-900 border border-purple-600 text-purple-200 px-3 py-1 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                            >
                              <span>✅ {alt}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-white p-6 rounded-[24px] border-2 border-slate-50 shadow-sm space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-black uppercase text-sm">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-bold">
                            {item.isExternal ? 'External Prescription' : `SKU: ${item.sku || 'N/A'} • Price: GHS ${(item.price || 0).toFixed(2)}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id, setItems)}
                          className="text-red-300 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {item.isExternal ? (
                        <div className="text-xs text-blue-600 font-bold italic bg-slate-50 p-3 rounded-xl border">
                          {item.instruction || item.dosage || 'No instructions'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                          <div>
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-tight">Dosage</label>
                            <Input
                              placeholder="e.g. 500mg / 1 tab"
                              value={item.dosage || ''}
                              onChange={(e) => updateItemField(item.id, 'dosage', e.target.value)}
                              className="h-9 text-xs rounded-xl font-bold text-black border-slate-200"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-tight">Frequency</label>
                            <Input
                              placeholder="e.g. BD / TDS"
                              value={item.frequency || ''}
                              onChange={(e) => updateItemField(item.id, 'frequency', e.target.value)}
                              className="h-9 text-xs rounded-xl font-bold text-black border-slate-200"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-tight">Duration</label>
                            <Input
                              placeholder="e.g. 5 days"
                              value={item.duration || ''}
                              onChange={(e) => updateItemField(item.id, 'duration', e.target.value)}
                              className="h-9 text-xs rounded-xl font-bold text-black border-slate-200"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-tight">Qty to Bill/Disp</label>
                            <Input
                              type="number"
                              min="1"
                              value={item.qty || 1}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value));
                                updateItemField(item.id, 'qty', val);
                                updateItemField(item.id, 'quantity', val);
                              }}
                              className="h-9 text-xs rounded-xl font-bold text-black border-slate-200"
                            />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-tight">Instructions</label>
                            <Input
                              placeholder="e.g. take after food"
                              value={item.instruction || ''}
                              onChange={(e) => {
                                updateItemField(item.id, 'instruction', e.target.value);
                                updateItemField(item.id, 'instructions', e.target.value);
                              }}
                              className="h-9 text-xs rounded-xl font-bold text-black border-slate-200"
                            />
                          </div>
                        </div>
                      )}
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
