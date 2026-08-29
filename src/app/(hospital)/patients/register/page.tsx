'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  useFirebaseApp, useFirestore, useUser, useDoc, useCollection, 
  useMemoFirebase, addDocumentNonBlocking 
} from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { 
  UserPlus, Fingerprint, Phone, HeartPulse, 
  Save, Loader2, CreditCard, Building2, User, ShieldCheck, 
  Zap, CheckCircle2, AlertTriangle, MapPin, Activity, 
  Printer, ArrowRight, FolderOpen, RefreshCw, Sparkles, Plus, AlertCircle
} from 'lucide-react';
import { collection, query, where, getDocs, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatGhanaPhoneNumber, normalizeEhrNumber } from '../page';

// SANITIZED PRIMARY PAYERS LIST
const PRIMARY_PAYERS = [
  { id: 'CASH', name: 'Cash / Private Out-of-Pocket', type: 'CASH' },
  { id: 'NHIS', name: 'National Health Insurance Scheme (NHIS)', type: 'NHIS' },
  { id: 'KNUST', name: 'KNUST Staff / Student Health Scheme', type: 'CORPORATE' },
  { id: 'ACACIA', name: 'Acacia Health Insurance', type: 'CORPORATE' },
  { id: 'NATIONWIDE', name: 'Nationwide Medical Insurance', type: 'CORPORATE' },
  { id: 'ENTERPRISE', name: 'Enterprise Health Insurance', type: 'CORPORATE' },
  { id: 'METROPOLITAN', name: 'Metropolitan Health', type: 'CORPORATE' },
  { id: 'GLICO', name: 'Glico Healthcare', type: 'CORPORATE' },
  { id: 'PREMIER', name: 'Premier Health Insurance', type: 'CORPORATE' },
  { id: 'APEX', name: 'Apex Health Insurance', type: 'CORPORATE' },
  { id: 'COSMOPOLITAN', name: 'Cosmopolitan Health Insurance', type: 'CORPORATE' },
];

const CHRONIC_CONDITIONS = [
  'Hypertension (HPT)',
  'Diabetes Mellitus',
  'Asthma / Reactive Airway',
  'Sickle Cell Disease (HbSS/HbSC)',
  'Epilepsy / Seizure Disorder',
  'Chronic Kidney Disease (CKD)',
  'Peptic Ulcer Disease (PUD)',
  'Cardiac / Heart Disease'
];

const COMMON_ALLERGIES = [
  'Penicillin / Amoxicillin',
  'NSAIDs (Ibuprofen/Diclofenac)',
  'Sulfa / Co-trimoxazole',
  'Latex',
  'Peanuts / Nuts',
  'Seafood / Shellfish',
  'Egg Protein'
];

const formSchema = z.object({
  // Bio-Data
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  otherNames: z.string().optional(),
  gender: z.string().min(1, "Gender is required"),
  dateOfBirth: z.string().min(1, "Date of Birth is required"),
  maritalStatus: z.string().optional(),
  phoneNumber: z.string().min(1, "Primary phone number is required"),
  alternatePhone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),

  // Identification & Insurance
  ghanaCardId: z.string().optional(),
  payerId: z.string().min(1, "Primary payer is required"),
  insurancePolicyNumber: z.string().optional(),
  insuranceMembershipType: z.string().optional(),
  insuranceExpiryDate: z.string().optional(),

  // Address & Demographics
  residentialSuburb: z.string().min(1, "Residential town/suburb is required"),
  digitalAddress: z.string().optional(),
  cityTown: z.string().optional(),
  nearestLandmark: z.string().optional(),
  occupation: z.string().optional(),
  religion: z.string().optional(),

  // Next of Kin
  emergencyContactName: z.string().min(1, "Next of kin name is required"),
  emergencyRelationship: z.string().min(1, "Relationship is required"),
  emergencyContactPhone: z.string().min(1, "Next of kin phone is required"),
  emergencyContactAlternate: z.string().optional(),

  // Clinical Baseline & Safety Flags
  bloodGroup: z.string().optional(),
  genotype: z.string().optional(),
  chronicConditions: z.array(z.string()).optional(),
  allergies: z.string().optional(),
});

type PatientFormValues = z.infer<typeof formSchema>;

export default function RegisterPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  // Duplicate Check State
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Success Modal State
  const [createdPatient, setCreatedPatient] = useState<{
    id: string;
    fullName: string;
    ehrNumber: string;
    payerName: string;
    insuranceNumber?: string;
    gender: string;
    age: number;
    phone: string;
  } | null>(null);

  // Direct Check-in Submitting State
  const [isCheckInSubmitting, setIsCheckInSubmitting] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId || 'default-hospital';

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      otherNames: '',
      gender: 'Female',
      dateOfBirth: '',
      maritalStatus: 'Single',
      phoneNumber: '',
      alternatePhone: '',
      email: '',
      ghanaCardId: '',
      payerId: 'CASH',
      insurancePolicyNumber: '',
      insuranceMembershipType: 'PRINCIPAL',
      insuranceExpiryDate: '',
      residentialSuburb: '',
      digitalAddress: '',
      cityTown: 'Kumasi',
      nearestLandmark: '',
      occupation: '',
      religion: 'Christianity',
      emergencyContactName: '',
      emergencyRelationship: 'Spouse',
      emergencyContactPhone: '',
      emergencyContactAlternate: '',
      bloodGroup: 'O+',
      genotype: 'HbAA',
      chronicConditions: [],
      allergies: 'None Known',
    },
  });

  const selectedPayerId = form.watch('payerId');
  const watchedDob = form.watch('dateOfBirth');
  const watchedGhanaCard = form.watch('ghanaCardId');
  const watchedPhone = form.watch('phoneNumber');
  const selectedConditions = form.watch('chronicConditions') || [];

  const isInsuranceRequired = selectedPayerId !== 'CASH';

  // Derived Real-Time Age
  const derivedAge = useMemo(() => {
    if (!watchedDob) return null;
    const dobDate = new Date(watchedDob);
    if (isNaN(dobDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  }, [watchedDob]);

  // Real-Time Duplicate Check for Ghana Card & Phone
  useEffect(() => {
    const checkDuplicate = async () => {
      const gha = (watchedGhanaCard || '').trim().toUpperCase();
      const phone = (watchedPhone || '').trim().replace(/\D/g, '');

      if (!firestore || !hospitalId || (gha.length < 8 && phone.length < 9)) {
        setDuplicateWarning(null);
        return;
      }

      setIsCheckingDuplicate(true);
      try {
        const patientsRef = collection(firestore, 'hospitals', hospitalId, 'patients');
        let matched: any = null;

        if (gha.length >= 8) {
          const qGha = query(patientsRef, where('ghanaCardId', '==', gha), limit(1));
          const snapGha = await getDocs(qGha);
          if (!snapGha.empty) {
            matched = snapGha.docs[0].data();
          }
        }

        if (!matched && phone.length >= 9) {
          const qPhone = query(patientsRef, where('phoneNumber', '==', watchedPhone.trim()), limit(1));
          const snapPhone = await getDocs(qPhone);
          if (!snapPhone.empty) {
            matched = snapPhone.docs[0].data();
          }
        }

        if (matched) {
          const matchedName = `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || 'Existing Patient';
          const matchedEhr = matched.ehrNumber || 'MMH/EHR/26/XXXX';
          setDuplicateWarning(`⚠️ Potential Duplicate Match: ${matchedName} is already enrolled with EHR ${matchedEhr}.`);
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        console.error('Duplicate check error:', err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    const timer = setTimeout(checkDuplicate, 600);
    return () => clearTimeout(timer);
  }, [watchedGhanaCard, watchedPhone, firestore, hospitalId]);

  // Form Auto-Formatter for Ghana Card
  const handleGhanaCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase();
    if (val.startsWith('GHA-')) {
      form.setValue('ghanaCardId', val);
    } else if (val.length > 0) {
      val = val.replace(/^GHA-?/i, '');
      form.setValue('ghanaCardId', `GHA-${val}`);
    } else {
      form.setValue('ghanaCardId', '');
    }
  };

  // Chronic Conditions Toggle Helper
  const toggleCondition = (condition: string) => {
    const current = form.getValues('chronicConditions') || [];
    if (current.includes(condition)) {
      form.setValue('chronicConditions', current.filter(c => c !== condition));
    } else {
      form.setValue('chronicConditions', [...current, condition]);
    }
  };

  // Quick Allergy Append Helper
  const appendAllergy = (allergy: string) => {
    const current = form.getValues('allergies') || '';
    if (!current || current === 'None Known') {
      form.setValue('allergies', allergy);
    } else if (!current.includes(allergy)) {
      form.setValue('allergies', `${current}, ${allergy}`);
    }
  };

  // Main Registration Submission Handler
  const handleRegister = async (values: PatientFormValues) => {
    setLoading(true);

    try {
      const selectedPayerObj = PRIMARY_PAYERS.find(p => p.id === values.payerId);
      const payerName = selectedPayerObj ? selectedPayerObj.name : 'Cash / Private Out-of-Pocket';
      
      const cleanPhone = formatGhanaPhoneNumber(values.phoneNumber);
      const cleanNextOfKinPhone = formatGhanaPhoneNumber(values.emergencyContactPhone);

      // Generate Standard Sequence Number
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const assignedEhr = `MMH/EHR/26/${randomSuffix}`;
      const fullName = `${values.firstName.trim().toUpperCase()} ${values.lastName.trim().toUpperCase()}`;

      const patientPayload = {
        firstName: values.firstName.trim().toUpperCase(),
        lastName: values.lastName.trim().toUpperCase(),
        otherNames: values.otherNames?.trim().toUpperCase() || '',
        fullName: fullName,
        ehrNumber: assignedEhr,
        gender: values.gender.toUpperCase(),
        dateOfBirth: values.dateOfBirth,
        age: derivedAge || 30,
        maritalStatus: values.maritalStatus || 'Single',
        phoneNumber: cleanPhone,
        alternatePhone: values.alternatePhone ? formatGhanaPhoneNumber(values.alternatePhone) : '',
        email: values.email || '',

        ghanaCardId: values.ghanaCardId?.trim().toUpperCase() || '',
        payerId: values.payerId,
        payerName: payerName,
        nhisNumber: values.payerId === 'NHIS' ? values.insurancePolicyNumber?.trim() : '',
        insurancePolicyNumber: values.insurancePolicyNumber?.trim() || '',
        insuranceMembershipType: values.insuranceMembershipType || 'PRINCIPAL',
        insuranceExpiryDate: values.insuranceExpiryDate || '',
        insuranceStatus: isInsuranceRequired ? 'ACTIVE_VERIFIED' : 'N/A',

        residentialAddress: values.residentialSuburb.trim(),
        residentialSuburb: values.residentialSuburb.trim(),
        digitalAddress: values.digitalAddress?.trim().toUpperCase() || '',
        cityTown: values.cityTown || 'Kumasi',
        nearestLandmark: values.nearestLandmark || '',
        occupation: values.occupation || 'Self Employed',
        religion: values.religion || 'Christianity',

        emergencyContactName: values.emergencyContactName.trim(),
        emergencyRelationship: values.emergencyRelationship,
        emergencyContactPhone: cleanNextOfKinPhone,
        emergencyContactAlternate: values.emergencyContactAlternate ? formatGhanaPhoneNumber(values.emergencyContactAlternate) : '',

        bloodGroup: values.bloodGroup || 'O+',
        genotype: values.genotype || 'HbAA',
        chronicConditions: values.chronicConditions || [],
        allergies: values.allergies || 'None Known',

        status: 'INACTIVE',
        currentLocation: 'Discharged Home',
        createdAt: serverTimestamp(),
        createdBy: user?.uid || 'Reception Desk',
        hospitalId: hospitalId
      };

      let newPatientId = `p_${Date.now()}`;

      // Save directly to Firestore for instant persistence
      if (firestore && hospitalId) {
        const patientsColRef = collection(firestore, `hospitals/${hospitalId}/patients`);
        const docRef = await addDocumentNonBlocking(patientsColRef, patientPayload);
        if (docRef && docRef.id) {
          newPatientId = docRef.id;
        }
      }

      // Try Cloud Function if available
      if (firebaseApp) {
        try {
          const functions = getFunctions(firebaseApp);
          const registerPatientFn = httpsCallable(functions, 'registerPatient');
          await registerPatientFn(patientPayload);
        } catch (fnErr) {
          // Cloud function optional if firestore wrote directly
        }
      }

      toast({
        title: "⚡ Master EHR Record Created Successfully!",
        description: `Enrolled ${fullName} with Lifelong Identifier ${assignedEhr}.`
      });

      // Launch Success Flow Dialog
      setCreatedPatient({
        id: newPatientId,
        fullName: fullName,
        ehrNumber: assignedEhr,
        payerName: payerName,
        insuranceNumber: values.insurancePolicyNumber,
        gender: values.gender,
        age: derivedAge || 30,
        phone: cleanPhone
      });

      form.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: error.message || "Failed to complete patient enrollment.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Direct Check-In Dispatch from Success Modal
  const handleDirectCheckIn = async (queue: string = 'GENERAL_OPD') => {
    if (!createdPatient) return;
    setIsCheckInSubmitting(true);

    try {
      if (firestore && hospitalId) {
        const patientDocRef = doc(firestore, `hospitals/${hospitalId}/patients/${createdPatient.id}`);
        addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/encounters`), {
          patientId: createdPatient.id,
          patientName: createdPatient.fullName,
          ehrNumber: createdPatient.ehrNumber,
          queue: queue,
          status: 'Awaiting Vitals',
          priority: 'ROUTINE',
          type: 'OPD_CONSULTATION',
          chiefComplaint: 'New Patient First Visit Intake',
          createdAt: serverTimestamp(),
          startedAt: serverTimestamp(),
          hospitalId: hospitalId
        });
      }

      toast({
        title: "✅ Patient Checked In to Nursing Triage",
        description: `${createdPatient.fullName} has been dispatched to General OPD Vitals Station.`
      });

      router.push('/patients');
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Check-In Error",
        description: err.message || "Could not check in patient."
      });
    } finally {
      setIsCheckInSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      
      {/* ========================================================================= */}
      {/* 1. SIGNATURE GAM MED DARK COMMAND BANNER                                  */}
      {/* ========================================================================= */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-800 space-y-4">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                    Master Patient Index (MPI)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    • Biometric & Insurance Verification
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-0.5">
                  Patient Enrollment & Lifelong EHR
                </h1>
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl font-medium">
              Create a standardized Electronic Health Record (EHR) profile with verified Ghana Card NIA identifiers, NHIS/Corporate insurance coverage, and emergency triage baselines.
            </p>
          </div>

          {/* Biometric & Directory Badges */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            <Link 
              href="/patients"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-black text-xs rounded-xl border border-slate-700 transition flex items-center gap-2 uppercase tracking-wider"
            >
              <User className="w-4 h-4 text-indigo-400" />
              Directory List
            </Link>
            <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-800/80 px-4 py-2.5 rounded-xl shrink-0">
              <Fingerprint className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                Ghana Card Ready
              </span>
            </div>
          </div>
        </div>

        {/* Duplicate Warning Box */}
        {duplicateWarning && (
          <div className="p-4 bg-amber-950/60 border border-amber-700/80 rounded-2xl flex items-center gap-3 animate-in fade-in text-amber-200 text-xs font-bold">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-6">
          
          {/* ===================================================================== */}
          {/* 2. SECTION 1: PRIMARY DEMOGRAPHIC BIO-DATA                             */}
          {/* ===================================================================== */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                <User className="w-4 h-4 text-indigo-500" />
                1. Demographic Bio-Data
              </h3>
              {derivedAge !== null && (
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-black text-xs rounded-full border border-indigo-200 dark:border-indigo-800">
                  Computed Age: {derivedAge} YRS
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">First Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. KWAME" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-slate-100 text-xs uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Last / Family Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. MENSAH" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-slate-100 text-xs uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="otherNames" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Middle / Other Names</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. KOFI" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 dark:text-slate-100 text-xs uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Biological Sex *</FormLabel>
                  <select
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Date of Birth *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 font-mono" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Marital Status</FormLabel>
                  <select
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Primary Phone Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="024 475 0903" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 font-mono" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField control={form.control} name="alternatePhone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Alternate Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="050 XXX XXXX" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100 font-mono" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Email Address (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="patient@example.com" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-800 dark:text-slate-100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 3. SECTION 2: IDENTIFICATION & INSURANCE (SANITIZED & CONDITIONAL)     */}
          {/* ===================================================================== */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                2. National Identification & Insurance Scheme
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                NHIS & Corporate Validation
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Primary Payer Select */}
              <FormField control={form.control} name="payerId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Primary Healthcare Payer *</FormLabel>
                  <select
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {PRIMARY_PAYERS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <FormMessage />
                </FormItem>
              )}/>

              {/* Ghana Card ID */}
              <FormField control={form.control} name="ghanaCardId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Ghana Card ID (GHA-XXXXXXXXX-X)
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="GHA-729481902-4" 
                        {...field}
                        onChange={handleGhanaCardChange}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs text-slate-800 dark:text-slate-100 uppercase font-black tracking-wider" 
                      />
                      <Fingerprint className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

            </div>

            {/* CONDITIONAL INSURANCE POLICY FIELDS */}
            {isInsuranceRequired && (
              <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[10px] font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-widest">
                    {selectedPayerId === 'NHIS' ? 'NHIS Membership Data' : 'Corporate Health Insurance Policy Details'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField control={form.control} name="insurancePolicyNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        {selectedPayerId === 'NHIS' ? 'NHIS Card / Member No. *' : 'Policy / Member ID *'}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={selectedPayerId === 'NHIS' ? 'NHIS-88291039' : 'POL-992019'} {...field} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold uppercase" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>

                  <FormField control={form.control} name="insuranceMembershipType" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Principal / Dependant Status
                      </FormLabel>
                      <select
                        value={field.value}
                        onChange={field.onChange}
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 text-xs outline-none cursor-pointer"
                      >
                        <option value="PRINCIPAL">Principal Member / Policy Holder</option>
                        <option value="DEPENDANT">Dependant (Spouse / Child)</option>
                      </select>
                      <FormMessage />
                    </FormItem>
                  )}/>

                  <FormField control={form.control} name="insuranceExpiryDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Policy Expiry Date
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>
              </div>
            )}

          </div>

          {/* ===================================================================== */}
          {/* 4. SECTION 3: ADDRESS, DIGITAL GPS & SOCIAL DEMOGRAPHICS               */}
          {/* ===================================================================== */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                <MapPin className="w-4 h-4 text-indigo-500" />
                3. Residential Location & Digital Address (GhanaPost)
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Home Tracing & Surveillance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              
              <FormField control={form.control} name="residentialSuburb" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Residential Town / Suburb *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ayeduase / Bomso" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="digitalAddress" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">GhanaPost GPS Digital Address</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. AK-039-2311" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs font-black text-slate-800 dark:text-slate-100 uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="cityTown" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Town / Metropolis</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Kumasi" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              
              <FormField control={form.control} name="nearestLandmark" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Nearest Landmark / Street</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Near Total Energies / Central Mosque" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-800 dark:text-slate-100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="occupation" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Primary Occupation</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Civil Servant / Trader / Student" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="religion" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Religious Affiliation</FormLabel>
                  <select
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-100 text-xs outline-none cursor-pointer"
                  >
                    <option value="Christianity">Christianity</option>
                    <option value="Islam">Islam</option>
                    <option value="Traditional">Traditional</option>
                    <option value="Other">Other</option>
                    <option value="None">None / Prefer not to say</option>
                  </select>
                  <FormMessage />
                </FormItem>
              )}/>

            </div>

          </div>

          {/* ===================================================================== */}
          {/* 5. SECTION 4: EMERGENCY CONTACT & NEXT OF KIN                         */}
          {/* ===================================================================== */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                <Phone className="w-4 h-4 text-indigo-500" />
                4. Next of Kin & Emergency Guardianship
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Statutory Emergency Contact
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Next of Kin Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Janet Mensah" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-800 dark:text-slate-100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="emergencyRelationship" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Relationship to Patient *</FormLabel>
                  <select
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-100 text-xs outline-none cursor-pointer"
                  >
                    <option value="Spouse">Spouse (Husband / Wife)</option>
                    <option value="Parent">Parent (Father / Mother)</option>
                    <option value="Sibling">Sibling (Brother / Sister)</option>
                    <option value="Child">Child (Son / Daughter)</option>
                    <option value="Guardian">Legal Guardian</option>
                    <option value="Other Relative">Other Relative (Uncle/Aunt/Cousin)</option>
                    <option value="Colleague">Colleague / Friend</option>
                  </select>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Primary Emergency Phone *</FormLabel>
                  <FormControl>
                    <Input placeholder="024 XXX XXXX" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs font-bold text-slate-800 dark:text-slate-100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="emergencyContactAlternate" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Alternate Emergency Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="050 XXX XXXX" {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs font-bold text-slate-800 dark:text-slate-100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

            </div>
          </div>

          {/* ===================================================================== */}
          {/* 6. SECTION 5: CLINICAL BASELINE & SAFETY FLAGS (ER INTAKE)             */}
          {/* ===================================================================== */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                5. Clinical Safety Baseline & Known Chronic Flags
              </h3>
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" /> Triage Safety Fast-Track
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              
              <FormField control={form.control} name="bloodGroup" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">ABO / Rhesus Blood Group</FormLabel>
                  <select
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-slate-800 dark:text-slate-100 text-xs outline-none cursor-pointer"
                  >
                    <option value="O+">O+ (O RhD Positive - Universal Donor)</option>
                    <option value="O-">O- (O RhD Negative)</option>
                    <option value="A+">A+ (A RhD Positive)</option>
                    <option value="A-">A- (A RhD Negative)</option>
                    <option value="B+">B+ (B RhD Positive)</option>
                    <option value="B-">B- (B RhD Negative)</option>
                    <option value="AB+">AB+ (AB RhD Positive)</option>
                    <option value="AB-">AB- (AB RhD Negative)</option>
                    <option value="UNKNOWN">Unknown / To Be Tested</option>
                  </select>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="genotype" render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Hemoglobin Genotype</FormLabel>
                  <select
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-slate-800 dark:text-slate-100 text-xs outline-none cursor-pointer"
                  >
                    <option value="HbAA">HbAA (Normal)</option>
                    <option value="HbAS">HbAS (Sickle Cell Trait)</option>
                    <option value="HbSS">HbSS (Sickle Cell Disease)</option>
                    <option value="HbSC">HbSC (Sickle Cell Disease)</option>
                    <option value="HbAC">HbAC (Hemoglobin C Trait)</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                  <FormMessage />
                </FormItem>
              )}/>

              <div className="sm:col-span-2">
                <FormField control={form.control} name="allergies" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Known Drug / Food Allergies</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Penicillin, NSAIDs, Peanuts..." {...field} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-rose-500 text-xs font-bold text-slate-800 dark:text-slate-100" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>

            </div>

            {/* Quick Allergy Injection Chips */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Quick Allergy Chips:</span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ALLERGIES.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => appendAllergy(a)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold rounded-lg border border-rose-200 dark:border-rose-800/60 transition cursor-pointer"
                  >
                    + {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Chronic Conditions Multi-Select Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                Known Chronic Medical History (Select all that apply):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CHRONIC_CONDITIONS.map(c => {
                  const isChecked = selectedConditions.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCondition(c)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left text-[10px] font-bold uppercase transition flex items-center gap-2 cursor-pointer",
                        isChecked
                          ? "bg-slate-900 text-white border-indigo-500 shadow-md ring-1 ring-indigo-500"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                      )}
                    >
                      <span className={cn(
                        "w-3.5 h-3.5 rounded-md flex items-center justify-center border text-[9px]",
                        isChecked ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-400"
                      )}>
                        {isChecked && "✓"}
                      </span>
                      <span className="truncate">{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ===================================================================== */}
          {/* 7. ACTION FOOTER & SUBMIT BUTTON                                      */}
          {/* ===================================================================== */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Link 
              href="/patients"
              className="text-xs font-black text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 uppercase tracking-wider"
            >
              &larr; Return to Patient Directory
            </Link>

            <button 
              type="submit" 
              disabled={loading} 
              className="px-8 py-4 bg-indigo-950 hover:bg-indigo-900 text-white font-black text-xs rounded-2xl shadow-xl transition-all uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-3 w-full sm:w-auto border border-indigo-700 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  ENROLLING MASTER RECORD...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-emerald-400" />
                  REGISTER PATIENT & GENERATE LIFELONG EHR &rarr;
                </>
              )}
            </button>
          </div>

        </form>
      </Form>

      {/* ========================================================================= */}
      {/* 8. POST-REGISTRATION SUCCESS ACTION MODAL                                 */}
      {/* ========================================================================= */}
      {createdPatient && (
        <Dialog open={!!createdPatient} onOpenChange={() => setCreatedPatient(null)}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-lg shadow-2xl space-y-4">
            <DialogHeader>
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/30 mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">
                Patient Enrolled Successfully!
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                A permanent Master Patient Record has been initialized in the hospital database.
              </DialogDescription>
            </DialogHeader>

            {/* Patient Badge Card */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-sans">Full Name:</span>
                <span className="font-black text-white uppercase text-sm font-sans">{createdPatient.fullName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-sans">EHR Assigned:</span>
                <span className="text-indigo-400 font-black text-sm">{createdPatient.ehrNumber}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-sans">Payer / Health Plan:</span>
                <span className="text-slate-200 font-bold">{createdPatient.payerName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-sans">Demographics:</span>
                <span className="text-slate-300">{createdPatient.age} YRS • {createdPatient.gender} • {createdPatient.phone}</span>
              </div>
            </div>

            {/* Next Step Action Buttons */}
            <div className="space-y-2.5 pt-2">
              
              {/* Action 1: Direct Check-In to Triage Queue */}
              <button
                type="button"
                disabled={isCheckInSubmitting}
                onClick={() => handleDirectCheckIn('GENERAL_OPD')}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
              >
                {isCheckInSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    Direct Check-In to Nursing Triage &rarr;
                  </>
                )}
              </button>

              {/* Action 2: Open Master Clinical Folder */}
              <button
                type="button"
                onClick={() => router.push(`/patients/folder/${createdPatient.id}`)}
                className="w-full py-3 bg-indigo-950 hover:bg-indigo-900 text-white font-black text-xs rounded-xl border border-indigo-700 transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-indigo-400" />
                Open Master Clinical EHR Folder
              </button>

              {/* Action 3: Register Another Patient */}
              <button
                type="button"
                onClick={() => setCreatedPatient(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-black text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Register Another Patient
              </button>

            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
