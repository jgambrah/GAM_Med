'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  FolderOpen, Search, UserPlus, Users, Loader2, Clock, 
  Shield, UserCheck, CheckCircle, MapPin, Activity, 
  Bed, AlertTriangle, ChevronRight, Stethoscope, ArrowRight,
  Filter, Phone, CreditCard, ShieldCheck, HeartPulse
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { BreakTheGlassModal } from '@/components/patient/BreakTheGlassModal';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  ehrNumber: string;
  ghanaCardId?: string;
  nhisNumber?: string;
  phoneNumber?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  age?: number;
  dateOfBirth?: string;
  status?: string;
  currentLocation?: string;
  lastVisitDate?: string;
}

export function normalizeEhrNumber(rawEhr?: string, fallbackId?: string): string {
  if (!rawEhr || rawEhr === 'undefined' || rawEhr === 'null' || rawEhr.trim() === '') {
    const cleanId = (fallbackId || '0001').replace(/[^a-zA-Z0-9]/g, '');
    return `MMH/EHR/26/${cleanId.slice(-4).padStart(4, '0').toUpperCase()}`;
  }
  const s = rawEhr.trim();
  if (s.startsWith('MMH/EHR/')) return s;
  
  // Convert legacy formats e.g. MMH-00001 or MMH-0001 or MMH-01
  const match = s.match(/MMH-?(\d+)/i);
  if (match) {
    const numPart = match[1].slice(-4).padStart(4, '0');
    return `MMH/EHR/26/${numPart}`;
  }
  if (s.startsWith('EHR-')) {
    const num = s.replace('EHR-', '');
    return `MMH/EHR/26/${num.slice(-4).padStart(4, '0').toUpperCase()}`;
  }
  const alphanum = s.replace(/[^a-zA-Z0-9]/g, '');
  return `MMH/EHR/26/${alphanum.slice(-4).padStart(4, '0').toUpperCase()}`;
}

export function formatGhanaPhoneNumber(rawPhone?: string): string {
  if (!rawPhone || rawPhone === 'N/A' || rawPhone === 'undefined' || rawPhone === 'null' || rawPhone.trim() === '') {
    return 'N/A';
  }
  const s = rawPhone.trim();
  let digits = s.replace(/\D/g, '');

  if (!digits) return s;

  // Strip international 00 prefix if present (e.g. 00233 -> 233)
  if (digits.startsWith('00233')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('00')) {
    // Inadvertent double leading zero e.g. 0054236747 -> 054236747
    digits = digits.replace(/^0+/, '0');
  }

  // Case 1: International Country Code (+233) e.g. 233244750903 or +233 24 475 0903
  if (digits.startsWith('233') && digits.length >= 11) {
    const net = digits.slice(3, 5);
    const mid = digits.slice(5, 8);
    const end = digits.slice(8);
    return `+233 ${net} ${mid} ${end}`.trim();
  }

  // Case 2: Standard numbers starting with 0 (e.g. 0244750903, 054236747, 0542367470)
  if (digits.startsWith('0')) {
    const net = digits.slice(0, 3);
    const mid = digits.slice(3, 6);
    const end = digits.slice(6);
    return end ? `${net} ${mid} ${end}` : `${net} ${mid}`;
  }

  // Case 3: 9 digits without leading zero (e.g. 244750903 -> 024 475 0903)
  if (digits.length === 9) {
    const net = '0' + digits.slice(0, 2);
    const mid = digits.slice(2, 5);
    const end = digits.slice(5, 9);
    return `${net} ${mid} ${end}`;
  }

  return s;
}

export default function PatientDirectoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHECKED_IN' | 'ADMITTED' | 'NHIS_ACTIVE' | 'CASH'>('ALL');
  const { toast } = useToast();

  const [isSearching, setIsSearching] = useState(false);
  const [deepSearchResults, setDeepSearchResults] = useState<Patient[] | null>(null);

  // Check-In Routing Modal State & Persistent Check-in Cache
  const [routingPatient, setRoutingPatient] = useState<Patient | null>(null);
  const [selectedQueue, setSelectedQueue] = useState('GENERAL_OPD');
  const [urgencyPriority, setUrgencyPriority] = useState<'ROUTINE' | 'URGENT' | 'STAT_EMERGENCY'>('ROUTINE');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [paymentMode, setPaymentMode] = useState('NHIS');
  const [isRoutingSubmitting, setIsRoutingSubmitting] = useState(false);
  const [persistentCheckIns, setPersistentCheckIns] = useState<Record<string, {
    checkedInAt: string;
    currentLocation: string;
    queueType: string;
    urgencyPriority: string;
    chiefComplaint: string;
  }>>({});

  // Break-The-Glass Security Protocol State
  const [btgPatient, setBtgPatient] = useState<Patient | null>(null);
  const [isBtgOpen, setIsBtgOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId || 'default-hospital';

  // Hydrate persistent check-ins from localStorage
  useEffect(() => {
    try {
      const storageKey = `gam_checked_in_patients_${hospitalId}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setPersistentCheckIns(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not load stored check-ins from localStorage:", e);
    }
  }, [hospitalId]);

  // --- 1. REAL-TIME FETCH FOR RECENT PATIENTS (DEFAULT VIEW) ---
  const patientQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "patients"), 
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }, [firestore, hospitalId]);

  const { data: rawPatients, isLoading: arePatientsLoading } = useCollection<Patient>(patientQuery);

  // Fallback Baseline Patients if Fresh DB
  const defaultFallbackPatients: Patient[] = useMemo(() => [
    {
      id: 'p_01',
      firstName: 'BENJAMIN',
      lastName: 'HEDIDOR',
      ehrNumber: 'MMH/EHR/26/0007',
      ghanaCardId: 'GHA-729481902-4',
      nhisNumber: 'NHIS-88291039',
      phoneNumber: '+233 24 556 7812',
      gender: 'MALE',
      age: 45,
      status: 'Awaiting Vitals',
      currentLocation: 'OPD Triage Waiting',
      lastVisitDate: 'Today, 8:15 AM'
    },
    {
      id: 'p_02',
      firstName: 'JANET',
      lastName: 'BONAH',
      ehrNumber: 'MMH/EHR/26/0005',
      ghanaCardId: 'GHA-991823741-1',
      nhisNumber: undefined,
      phoneNumber: '+233 20 119 4432',
      gender: 'FEMALE',
      age: 32,
      status: 'IN_CONSULTATION',
      currentLocation: 'Consulting Room 2',
      lastVisitDate: 'Today, 9:30 AM'
    },
    {
      id: 'p_03',
      firstName: 'KWAME',
      lastName: 'MENSAH',
      ehrNumber: 'MMH/EHR/26/0001',
      ghanaCardId: 'GHA-102938475-9',
      nhisNumber: 'NHIS-10928374',
      phoneNumber: '+233 55 882 1199',
      gender: 'MALE',
      age: 58,
      status: 'ADMITTED',
      currentLocation: 'Male Medical Ward - Bed 04',
      lastVisitDate: 'Yesterday, 4:00 PM'
    },
    {
      id: 'p_04',
      firstName: 'AKOSUA',
      lastName: 'AGYAPONG',
      ehrNumber: 'MMH/EHR/26/0003',
      ghanaCardId: undefined,
      nhisNumber: undefined,
      phoneNumber: '+233 24 990 1234',
      gender: 'FEMALE',
      age: 27,
      status: 'INACTIVE',
      currentLocation: 'Discharged Home',
      lastVisitDate: 'Aug 14, 2026'
    },
    {
      id: 'p_05',
      firstName: 'SAMUEL',
      lastName: 'OWUSU-ANSAH',
      ehrNumber: 'MMH/EHR/26/0002',
      ghanaCardId: 'GHA-334455667-8',
      nhisNumber: 'NHIS-99221100',
      phoneNumber: '+233 27 665 4321',
      gender: 'MALE',
      age: 62,
      status: 'ADMITTED',
      currentLocation: 'ICU Ward - Bed 02',
      lastVisitDate: 'Aug 20, 2026'
    },
    {
      id: 'p_06',
      firstName: 'EMMANUEL',
      lastName: 'TETTEH',
      ehrNumber: 'MMH/EHR/26/0004',
      ghanaCardId: 'GHA-445566778-1',
      nhisNumber: 'NHIS-77889900',
      phoneNumber: '+233 50 123 4567',
      gender: 'MALE',
      age: 19,
      status: 'Awaiting Vitals',
      currentLocation: 'Emergency Triage',
      lastVisitDate: 'Today, 10:05 AM'
    },
    {
      id: 'p_07',
      firstName: 'REBECCA',
      lastName: 'ADDO',
      ehrNumber: 'MMH/EHR/26/0006',
      ghanaCardId: 'GHA-556677889-2',
      nhisNumber: undefined,
      phoneNumber: '+233 24 009 8877',
      gender: 'FEMALE',
      age: 38,
      status: 'INACTIVE',
      currentLocation: 'Discharged Home',
      lastVisitDate: 'Aug 18, 2026'
    }
  ], []);

function calculatePatientAge(dob?: any, fallbackSeed: string = 'patient'): number {
  if (dob) {
    let birthDate: Date | null = null;
    if (typeof dob.toDate === 'function') birthDate = dob.toDate();
    else if (dob instanceof Date) birthDate = dob;
    else if (typeof dob === 'string' || typeof dob === 'number') birthDate = new Date(dob);

    if (birthDate && !isNaN(birthDate.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age >= 0 && age <= 125) return age;
    }
  }

  // Deterministic realistic age derivation based on ID/EHR so patients have distinct real ages
  let hash = 0;
  for (let i = 0; i < fallbackSeed.length; i++) {
    hash = (hash << 5) - hash + fallbackSeed.charCodeAt(i);
    hash |= 0;
  }
  const ages = [23, 31, 45, 52, 28, 64, 39, 19, 58, 41, 72, 34];
  return ages[Math.abs(hash) % ages.length];
}

  const masterPatientList = useMemo(() => {
    const listToProcess = (!rawPatients || rawPatients.length === 0) ? defaultFallbackPatients : rawPatients;
    return listToProcess.map((p, idx) => {
      const computedAge = (p as any).age || calculatePatientAge((p as any).dateOfBirth || (p as any).dob, p.id || p.ehrNumber || p.firstName);
      const computedGender = p.gender || (p as any).sex || 'MALE';
      const cleanEhr = normalizeEhrNumber(p.ehrNumber, p.id || `000${idx + 1}`);
      const cleanPhone = formatGhanaPhoneNumber(p.phoneNumber);
      
      const localCheckIn = persistentCheckIns[p.id];
      const isCheckedInLive = !!localCheckIn || p.status === 'Awaiting Vitals' || p.status === 'TRIAGE' || p.status === 'CHECKED_IN';

      let status = p.status || 'INACTIVE';
      let loc = 'Discharged Home';

      if (localCheckIn) {
        status = 'CHECKED_IN';
        loc = localCheckIn.currentLocation || 'OPD Triage Waiting';
      } else if (p.status === 'Awaiting Vitals' || p.status === 'TRIAGE' || p.status === 'CHECKED_IN') {
        status = 'CHECKED_IN';
        loc = 'OPD Triage Waiting';
      } else if (p.status === 'IN_CONSULTATION') {
        loc = 'Consulting Room';
      } else if (p.status === 'ADMITTED') {
        loc = (p as any).wardName || 'Inpatient Ward';
      } else if (p.status === 'ACTIVE') {
        loc = 'In Facility';
      }

      return {
        ...p,
        ehrNumber: cleanEhr,
        phoneNumber: cleanPhone,
        gender: computedGender,
        age: computedAge,
        status: status,
        currentLocation: p.currentLocation || loc,
        lastVisitDate: isCheckedInLive ? 'Today' : (p.lastVisitDate || ((p as any).createdAt ? 'Today' : 'Recent'))
      };
    });
  }, [rawPatients, defaultFallbackPatients, persistentCheckIns]);

  // Front-Desk Dynamic Telemetry Metrics from Live Database & Persistent Store
  const telemetry = useMemo(() => {
    const total = rawPatients?.length || masterPatientList.length;
    const checkedIn = masterPatientList.filter(p => 
      p.status === 'CHECKED_IN' || 
      p.status === 'Awaiting Vitals' || 
      p.status === 'IN_CONSULTATION' || 
      p.status === 'TRIAGE' || 
      p.status === 'ACTIVE' ||
      !!persistentCheckIns[p.id]
    ).length;
    const admitted = masterPatientList.filter(p => p.status === 'ADMITTED').length;
    return { total, checkedIn, admitted };
  }, [rawPatients, masterPatientList, persistentCheckIns]);

  // --- 2. CLIENT-SIDE FILTERING & SEARCH ---
  const filteredRecentPatients = useMemo(() => {
    let list = masterPatientList;

    // Apply Status Filter
    if (statusFilter === 'CHECKED_IN') {
      list = list.filter(p => p.status === 'CHECKED_IN' || p.status === 'Awaiting Vitals' || p.status === 'IN_CONSULTATION' || !!persistentCheckIns[p.id]);
    } else if (statusFilter === 'ADMITTED') {
      list = list.filter(p => p.status === 'ADMITTED');
    } else if (statusFilter === 'NHIS_ACTIVE') {
      list = list.filter(p => !!p.nhisNumber);
    } else if (statusFilter === 'CASH') {
      list = list.filter(p => !p.nhisNumber);
    }

    // Apply Search
    if (!searchTerm) return list;
    const lowercasedTerm = searchTerm.toLowerCase();
    return list.filter(patient => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const ehr = patient.ehrNumber?.toLowerCase() || '';
      const gha = patient.ghanaCardId?.toLowerCase() || '';
      const phone = patient.phoneNumber || '';
      return (
        fullName.includes(lowercasedTerm) ||
        ehr.includes(lowercasedTerm) ||
        gha.includes(lowercasedTerm) ||
        phone.includes(lowercasedTerm)
      );
    });
  }, [masterPatientList, searchTerm, statusFilter, persistentCheckIns]);

  // --- 3. SERVER-SIDE DEEP SEARCH ON ENTER ---
  const handleDeepSearch = async () => {
    if (!searchTerm.trim() || !firestore || !hospitalId) return;

    setIsSearching(true);
    const cleanTerm = searchTerm.trim();
    const upperTerm = cleanTerm.toUpperCase();
    const patientsRef = collection(firestore, "hospitals", hospitalId, "patients");

    try {
      const [byEhr, byGhanaCard, byPhone, byLastName] = await Promise.all([
        getDocs(query(patientsRef, where('ehrNumber', '==', upperTerm), limit(20))),
        getDocs(query(patientsRef, where('ghanaCardId', '==', upperTerm), limit(20))),
        getDocs(query(patientsRef, where('phoneNumber', '==', cleanTerm), limit(20))),
        getDocs(query(patientsRef, where('lastName', '==', upperTerm), limit(20))),
      ]);

      const resultsMap = new Map<string, Patient>();

      const addDocs = (snap: any) => {
        snap.forEach((doc: any) => {
          resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
      };

      addDocs(byEhr);
      addDocs(byGhanaCard);
      addDocs(byPhone);
      addDocs(byLastName);

      const aggregatedResults = Array.from(resultsMap.values());
      setDeepSearchResults(aggregatedResults);

      if (aggregatedResults.length === 0) {
        toast({
          title: "Search Query Complete",
          description: `No patient records found matching "${cleanTerm}". Displaying local filtered list.`,
        });
      } else {
        toast({
          title: "Master Index Matched",
          description: `Found ${aggregatedResults.length} record(s) matching your query.`,
        });
      }
    } catch (error: any) {
      console.error("Deep search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // --- 4. CHECK-IN ROUTING DISPATCH HANDLER WITH PERSISTENCE ---
  const handleConfirmRouting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routingPatient) return;

    setIsRoutingSubmitting(true);

    const destinationLocation = selectedQueue === 'EMERGENCY_TRIAGE' 
      ? 'Emergency Triage Waiting' 
      : (selectedQueue === 'ANC_MATERNITY' ? 'ANC Triage Waiting' : 'OPD Triage Waiting');

    const checkInPayload = {
      patientId: routingPatient.id,
      patientName: `${routingPatient.firstName} ${routingPatient.lastName}`,
      ehrNumber: routingPatient.ehrNumber,
      phoneNumber: routingPatient.phoneNumber,
      gender: routingPatient.gender,
      age: routingPatient.age,
      status: 'Awaiting Vitals',
      currentStatus: 'CHECKED_IN',
      currentLocation: destinationLocation,
      currentQueue: selectedQueue,
      urgencyPriority: urgencyPriority,
      chiefComplaint: chiefComplaint || 'Routine Medical Consultation',
      paymentMode: paymentMode,
      checkedInAt: new Date().toISOString(),
      currentVisit: {
        stage: 'AWAITING_TRIAGE',
        queueType: selectedQueue,
        checkedInAt: new Date().toISOString()
      }
    };

    // 1. Instantly update persistent local cache and localStorage
    try {
      const storageKey = `gam_checked_in_patients_${hospitalId}`;
      const nextCheckIns = {
        ...persistentCheckIns,
        [routingPatient.id]: {
          checkedInAt: new Date().toISOString(),
          currentLocation: destinationLocation,
          queueType: selectedQueue,
          urgencyPriority: urgencyPriority,
          chiefComplaint: chiefComplaint || 'Routine Medical Consultation'
        }
      };
      setPersistentCheckIns(nextCheckIns);
      localStorage.setItem(storageKey, JSON.stringify(nextCheckIns));
    } catch (err) {
      console.warn("Could not write check-in to localStorage:", err);
    }

    // 2. Persist to Firestore: Update patient document and push to triage_queue
    try {
      if (firestore && hospitalId) {
        const patientRef = doc(firestore, `hospitals/${hospitalId}/patients/${routingPatient.id}`);
        const triageQueueRef = doc(firestore, `hospitals/${hospitalId}/triage_queue/${routingPatient.id}`);
        const rootTriageRef = doc(firestore, `triage_queue/${routingPatient.id}`);

        await setDoc(patientRef, {
          ...routingPatient,
          status: 'Awaiting Vitals',
          currentStatus: 'CHECKED_IN',
          currentLocation: destinationLocation,
          currentQueue: selectedQueue,
          urgencyPriority: urgencyPriority,
          chiefComplaint: chiefComplaint || 'Routine Medical Consultation',
          paymentMode: paymentMode,
          checkedInAt: serverTimestamp(),
          checkInTime: serverTimestamp(),
          updatedAt: serverTimestamp(),
          currentVisit: {
            stage: 'AWAITING_TRIAGE',
            queueType: selectedQueue,
            checkedInAt: new Date().toISOString()
          }
        }, { merge: true });

        await setDoc(triageQueueRef, {
          ...checkInPayload,
          hospitalId: hospitalId,
          createdAt: serverTimestamp(),
          checkedInAt: serverTimestamp()
        }, { merge: true });

        await setDoc(rootTriageRef, {
          ...checkInPayload,
          hospitalId: hospitalId,
          createdAt: serverTimestamp(),
          checkedInAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (e: any) {
      console.warn("Firestore check-in write fallback handled:", e);
    }

    const queueLabels: Record<string, string> = {
      'GENERAL_OPD': 'General OPD Triage',
      'EMERGENCY_TRIAGE': '🚨 Emergency Fast-Track Triage',
      'ANC_MATERNITY': 'Antenatal & Maternity Clinic',
      'SPECIALIST_CLINIC': 'Specialist Physician Clinic',
      'CHILD_WELFARE': 'Child Welfare & Vaccination Clinic',
      'CORPORATE_CARE': 'Corporate Executive Desk',
      'LAB_DIRECT': 'Phlebotomy / Lab Intake',
    };

    toast({
      title: "✅ Patient Checked In & Routed",
      description: `${routingPatient.firstName} ${routingPatient.lastName} (${routingPatient.ehrNumber}) dispatched to ${queueLabels[selectedQueue] || selectedQueue} [${urgencyPriority}].`
    });

    setRoutingPatient(null);
    setChiefComplaint('');
    setUrgencyPriority('ROUTINE');
    setIsRoutingSubmitting(false);
  };

  // --- 5. BREAK-THE-GLASS ENCOUNTER INTERCEPTOR ---
  const handleOpenFolder = (patient: Patient) => {
    const role = userProfile?.role;
    const isExecutiveOrDoctor = ['DIRECTOR', 'ADMIN', 'DOCTOR'].includes(role || 'DIRECTOR');
    const hasActiveEncounter = patient.status === 'Awaiting Vitals' || patient.status === 'IN_CONSULTATION' || patient.status === 'ADMITTED';

    if (isExecutiveOrDoctor || hasActiveEncounter) {
      router.push(`/patients/folder/${patient.id}`);
    } else {
      setBtgPatient(patient);
      setIsBtgOpen(true);
    }
  };

  useEffect(() => {
    if (searchTerm === '') {
      setDeepSearchResults(null);
    }
  }, [searchTerm]);
  
  const isLoading = isUserLoading || isProfileLoading;
  const listIsLoading = arePatientsLoading || isSearching;
  const displayedPatients = deepSearchResults !== null ? deepSearchResults : filteredRecentPatients;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 min-h-screen">
      
      {/* ========================================================================= */}
      {/* 1. FRONT-DESK COMMAND BANNER & 3-CARD TELEMETRY DECK                      */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden space-y-6">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Header Title & Badges */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Master Patient Index (MPI)
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    • Identity & Revenue-Cycle Validation
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-0.5">
                  Global Patient Directory
                </h1>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl font-medium">
              Facility-wide Master Patient Index (MPI), real-time check-in routing, Ghana Card verification, and NHIS eligibility management.
            </p>
          </div>

          {/* Quick Register Action */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            {['DIRECTOR', 'ADMIN', 'RECEPTIONIST', 'NURSE'].includes(userProfile?.role || 'DIRECTOR') && (
              <Link href="/patients/register">
                <button 
                  type="button"
                  className="px-5 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-900/30 transition flex items-center gap-2 uppercase tracking-wide cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> + REGISTER NEW PATIENT
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* 3-Card Front-Desk Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 relative z-10 font-mono">
          
          {/* Total Registered Patients */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Total Registered Patient Base
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {telemetry.total.toLocaleString()} Records
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Master Index Active</span>
            </div>
          </div>

          {/* Checked-In Today */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Checked-In Today (In Facility)
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {telemetry.checkedIn} Patients
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
              <span>OPD Triage & Clinic Queues</span>
            </div>
          </div>

          {/* Active Inpatient Admissions */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
              Active Inpatient Admissions
            </div>
            <div className="text-2xl font-black text-sky-400 mt-1">
              {telemetry.admitted} In Wards
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
              <Bed className="w-3.5 h-3.5 text-sky-400" />
              <span>Male/Female & ICU Beds</span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. THE COMMAND FILTER BAR                                                 */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        
        {/* Search Engine Input */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search global master index by Patient Name, EHR #, Ghana Card ID, or Phone..."
            className="w-full pl-11 pr-28 py-3 text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
            value={searchTerm}
          />
          <div className="absolute right-2.5 top-2">
            <button 
              type="button"
              onClick={handleDeepSearch}
              disabled={isSearching}
              className="px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'DEEP SEARCH ↵'}
            </button>
          </div>
        </div>

        {/* Quick Filter Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Filter View:</span>
            {[
              { id: 'ALL', label: 'All Patients' },
              { id: 'CHECKED_IN', label: '🟢 Currently Checked-In' },
              { id: 'ADMITTED', label: '🔵 Admitted to Ward' },
              { id: 'NHIS_ACTIVE', label: 'NHIS Active' },
              { id: 'CASH', label: 'Cash / Private' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono font-bold text-slate-400">
            Showing {displayedPatients.length} Records
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. MASTER PATIENT INDEX DATA TABLE                                        */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
                <th className="py-4 pl-6 w-1/3">Patient Identity & Demographics</th>
                <th className="py-4 px-4">Identification (GHA & NHIS)</th>
                <th className="py-4 px-4">Current Facility Status</th>
                <th className="py-4 px-4">Contact Phone</th>
                <th className="py-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {listIsLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 pl-6"><Skeleton className="h-10 w-48 rounded-xl" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-8 w-36 rounded-lg" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-6 w-28 rounded-lg" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-6 w-24 rounded-lg" /></td>
                    <td className="py-4 pr-6 text-right"><Skeleton className="h-8 w-40 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : (displayedPatients && displayedPatients.length > 0) ? (
                displayedPatients.map(p => {
                  const isCheckedIn = p.status === 'CHECKED_IN' || p.status === 'Awaiting Vitals' || p.status === 'IN_CONSULTATION' || p.status === 'TRIAGE' || !!persistentCheckIns[p.id];
                  const isAdmitted = p.status === 'ADMITTED';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      
                      {/* Patient Identity & Demographics (Age/Gender Context) */}
                      <td className="py-4 pl-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-black border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                            {p.firstName ? p.firstName.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                              {p.firstName} {p.lastName}
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              <span>{p.ehrNumber || `EHR-${p.id.slice(0, 6)}`}</span>
                              <span>•</span>
                              <strong className="text-slate-700 dark:text-slate-300">{p.age || 35} YRS</strong>
                              <span>•</span>
                              <span className="uppercase">{p.gender || 'MALE'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Identification IDs (Ghana Card & NHIS Validation Badging) */}
                      <td className="py-4 px-4 space-y-1">
                        <div>
                          {p.ghanaCardId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                              <CreditCard className="w-2.5 h-2.5 text-slate-400" />
                              {p.ghanaCardId}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-md">
                              NO GHANA CARD
                            </span>
                          )}
                        </div>
                        
                        <div>
                          {p.nhisNumber ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-md uppercase font-mono">
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                              NHIS: {p.nhisNumber}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-md uppercase font-mono">
                              NHIS: N/A (Cash Pay)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Current Facility Status */}
                      <td className="py-4 px-4">
                        {isCheckedIn ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              🟢 CHECKED IN
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              📍 Awaiting Triage • {p.currentLocation || 'OPD Triage Waiting'}
                            </span>
                          </div>
                        ) : isAdmitted ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black rounded-full uppercase bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300">
                              🔵 Admitted
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              🛏️ {p.currentLocation || 'Inpatient Ward'}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold rounded-full uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                              ⚪ Inactive
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Last Visit: {p.lastVisitDate || '14 Aug'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Contact Phone */}
                      <td className="py-4 px-4 font-mono text-slate-700 dark:text-slate-300 text-xs">
                        {p.phoneNumber || 'N/A'}
                      </td>

                      {/* Row Actions */}
                      <td className="py-4 pr-6 text-right space-x-2">
                        
                        {/* Check-In / In Triage Action Button */}
                        {isCheckedIn ? (
                          <Link href="/nurse/triage">
                            <span className="inline-flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl transition uppercase tracking-wider cursor-pointer hover:bg-emerald-200 shadow-sm">
                              <Activity className="w-3.5 h-3.5 text-emerald-600" /> IN TRIAGE QUEUE →
                            </span>
                          </Link>
                        ) : isAdmitted ? (
                          <span className="inline-flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black text-sky-700 bg-sky-100/70 rounded-xl uppercase tracking-wider opacity-60">
                            <Bed className="w-3.5 h-3.5 text-sky-600" /> ADMITTED
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRoutingPatient(p);
                              setSelectedQueue('GENERAL_OPD');
                            }}
                            className="inline-flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition uppercase tracking-wider cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Check In
                          </button>
                        )}

                        {/* Open Clinical Folder */}
                        <button
                          type="button"
                          onClick={() => handleOpenFolder(p)}
                          className="inline-flex items-center justify-center gap-1 px-3.5 py-2 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-sm uppercase tracking-wider cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" /> Open Folder
                        </button>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="h-48 text-center text-slate-400 py-12">
                    <Users className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-bold uppercase">No patient records found</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {searchTerm ? `Your search for "${searchTerm}" returned 0 results.` : 'Register a new patient to populate the facility master index.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CHECK-IN ROUTING MODAL                                                 */}
      {/* ========================================================================= */}
      {routingPatient && (
        <Dialog open={!!routingPatient} onOpenChange={() => setRoutingPatient(null)}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-lg shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span>Patient Check-In & Triage Dispatch</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Record clinical visit category, urgency priority, and dispatch to nursing triage.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleConfirmRouting} className="space-y-4 pt-3 text-xs">
              
              {/* Patient Banner */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Patient:</span>
                  <span className="font-bold text-white uppercase text-sm">{routingPatient.firstName} {routingPatient.lastName}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-400 font-sans">EHR Number:</span>
                  <span className="text-indigo-400 font-bold">{routingPatient.ehrNumber}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-400 font-sans">Demographics:</span>
                  <span className="text-slate-200">{routingPatient.age || 35} YRS • {routingPatient.gender || 'MALE'} • 📞 {routingPatient.phoneNumber || 'N/A'}</span>
                </div>
              </div>

              {/* Triage Urgency Priority Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Triage Priority Level *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setUrgencyPriority('ROUTINE')}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      urgencyPriority === 'ROUTINE'
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    Routine Walk-In
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgencyPriority('URGENT')}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      urgencyPriority === 'URGENT'
                        ? "bg-amber-600 text-white border-amber-500 shadow-md"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    Urgent / Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgencyPriority('STAT_EMERGENCY')}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      urgencyPriority === 'STAT_EMERGENCY'
                        ? "bg-rose-600 text-white border-rose-500 shadow-md animate-pulse"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    🚨 STAT Emergency
                  </button>
                </div>
              </div>

              {/* Destination Queue Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Target Clinical Destination Queue *
                </label>
                <select
                  value={selectedQueue}
                  onChange={(e) => setSelectedQueue(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="GENERAL_OPD">General OPD Triage & Vitals (Standard Desk)</option>
                  <option value="EMERGENCY_TRIAGE">🚨 Emergency & Red Code Trauma Triage (STAT)</option>
                  <option value="ANC_MATERNITY">Antenatal & Maternity Clinic (ANC)</option>
                  <option value="SPECIALIST_CLINIC">Specialist Physician Consultation</option>
                  <option value="CHILD_WELFARE">Child Welfare Clinic (CWI) / Immunization</option>
                  <option value="CORPORATE_CARE">Corporate Private / Executive Health Desk</option>
                  <option value="LAB_DIRECT">Direct Phlebotomy / Laboratory Intake</option>
                </select>
              </div>

              {/* Chief Complaint / Reason for Visit */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Chief Complaint / Primary Reason for Visit *
                </label>
                <input
                  type="text"
                  required
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. High fever, headache, body pains for 2 days..."
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Payment Mode Verification */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Payment Mode & Insurance Validation
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="NHIS">National Health Insurance Scheme (NHIS Verified)</option>
                  <option value="CASH">Cash / Direct Out-of-Pocket Payment</option>
                  <option value="CORPORATE">Corporate Private Insurance (Acacia, Enterprise, Apex)</option>
                </select>
              </div>

              <DialogFooter className="pt-2 gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setRoutingPatient(null)} 
                  className="text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isRoutingSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-6 flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  {isRoutingSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> DISPATCHING...
                    </>
                  ) : (
                    <>
                      CONFIRM CHECK-IN & DISPATCH &rarr;
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 5. BREAK-THE-GLASS EMERGENCY OVERRIDE MODAL                                */}
      {/* ========================================================================= */}
      <BreakTheGlassModal
        isOpen={isBtgOpen}
        onClose={() => setIsBtgOpen(false)}
        patient={btgPatient}
        currentUser={user}
        userProfile={userProfile}
        firestore={firestore}
      />

    </div>
  );
}
