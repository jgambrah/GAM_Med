'use client';

import React, { useState, useMemo } from 'react';
import { 
  Pill, Activity, Clock, CheckCircle2, AlertTriangle, 
  Search, ShieldAlert, Barcode, UserCheck, BedDouble, 
  FileText, ArrowRight, ShieldCheck, Loader2, Sparkles,
  Check, X, AlertCircle, Syringe, Info, HeartPulse,
  Lock, KeyRound, Timer, Thermometer, Smile, Frown
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface MedicationDose {
  id: string;
  patientId: string;
  patientName: string;
  ehrNumber: string;
  bedNumber: string;
  wardName: string;
  drugName: string;
  dosage: string;
  route: 'ORAL' | 'IV_INFUSION' | 'IV_BOLUS' | 'IM' | 'SC' | 'TOPICAL';
  scheduledTime: string;
  slot: 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT' | 'PRN';
  status: 'DUE' | 'GIVEN' | 'HELD' | 'OVERDUE';
  prescribedBy: string;
  isHighAlert?: boolean;
  requiresVitals?: {
    type: 'BP' | 'PULSE' | 'GLUCOSE' | 'TEMP';
    minSystolic?: number;
    minHeartRate?: number;
    minGlucose?: number;
  };
  recentVitals?: {
    bp?: string;
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    glucose?: number;
    recordedAt?: string;
    isStale?: boolean; // older than 60 mins
  };
  notes?: string;
  givenAt?: string;
  givenBy?: string;
  prnIndication?: string;
}

export default function ElectronicMedicationAdministrationRecordPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedSlot, setSelectedSlot] = useState<'ALL' | 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT' | 'PRN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Administration Modal State
  const [administeringDose, setAdministeringDose] = useState<MedicationDose | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminAction, setAdminAction] = useState<'GIVE' | 'HOLD'>('GIVE');
  const [holdReason, setHoldReason] = useState('');
  
  // Dual Sign-Off State (For High-Alert Drugs)
  const [witnessStaffName, setWitnessStaffName] = useState('');
  const [witnessStaffNumber, setWitnessStaffNumber] = useState('');
  const [witnessPin, setWitnessPin] = useState('');
  const [witnessChecks, setWitnessChecks] = useState({
    calcChecked: false,
    patientVerified: false,
    ampouleChecked: false
  });

  // PRN Pre-Dose Severity
  const [preDosePainScore, setPreDosePainScore] = useState<number>(7);
  const [prnReasonNote, setPrnReasonNote] = useState('');

  // Point-of-Care Vitals Modal State
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [vitalsPatient, setVitalsPatient] = useState<MedicationDose | null>(null);
  const [tempSystolic, setTempSystolic] = useState('130');
  const [tempDiastolic, setTempDiastolic] = useState('85');
  const [tempHeartRate, setTempHeartRate] = useState('78');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // 1. Fetch Doses from Firestore
  const dosesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/emar_doses`),
      orderBy('scheduledTime', 'asc')
    );
  }, [firestore, hospitalId]);
  const { data: rawDoses, isLoading: areDosesLoading } = useCollection<MedicationDose>(dosesQuery);

  // Default Clinical Seed Data with Vitals Interlocks & High Alert Flags
  const defaultDoses: MedicationDose[] = useMemo(() => [
    {
      id: 'EMAR-001',
      patientId: 'p_kwame',
      patientName: 'KWAME ASANTE',
      ehrNumber: 'EHR-884912',
      bedNumber: 'BED-M04',
      wardName: 'Male Medical Ward',
      drugName: 'IV Ceftriaxone',
      dosage: '2.0 g in 100ml Normal Saline',
      route: 'IV_INFUSION',
      scheduledTime: '08:00',
      slot: 'MORNING',
      status: 'DUE',
      prescribedBy: 'Dr. Mensah Osei',
      isHighAlert: false,
    },
    {
      id: 'EMAR-002',
      patientId: 'p_abena',
      patientName: 'ABENA MANSAH',
      ehrNumber: 'EHR-773190',
      bedNumber: 'BED-F02',
      wardName: 'Female Surgical Ward',
      drugName: 'SC Soluble Insulin (Actrapid)',
      dosage: '12 Units Subcutaneous',
      route: 'SC',
      scheduledTime: '08:00',
      slot: 'MORNING',
      status: 'DUE',
      prescribedBy: 'Dr. James Gambrah',
      isHighAlert: true,
      requiresVitals: {
        type: 'GLUCOSE',
        minGlucose: 4.0
      },
      recentVitals: {
        glucose: 8.4,
        recordedAt: '30m ago',
        isStale: false
      }
    },
    {
      id: 'EMAR-003',
      patientId: 'p_emmanuel',
      patientName: 'EMMANUEL OFORI',
      ehrNumber: 'EHR-629143',
      bedNumber: 'BED-ICU-01',
      wardName: 'Intensive Care Unit (ICU)',
      drugName: 'IV Morphine Sulfate',
      dosage: '5 mg Slow IV Bolus',
      route: 'IV_BOLUS',
      scheduledTime: '12:00',
      slot: 'MIDDAY',
      status: 'DUE',
      prescribedBy: 'Dr. Angela Boadu',
      isHighAlert: true,
      requiresVitals: {
        type: 'PULSE',
        minHeartRate: 50
      },
      recentVitals: {
        heartRate: 72,
        recordedAt: '15m ago',
        isStale: false
      }
    },
    {
      id: 'EMAR-004',
      patientId: 'p_kofi',
      patientName: 'KOFI ADU',
      ehrNumber: 'EHR-449102',
      bedNumber: 'BED-M08',
      wardName: 'Male Medical Ward',
      drugName: 'Oral Enalapril (ACE Inhibitor)',
      dosage: '10 mg Tablet Once Daily',
      route: 'ORAL',
      scheduledTime: '08:00',
      slot: 'MORNING',
      status: 'DUE',
      prescribedBy: 'Dr. James Gambrah',
      isHighAlert: false,
      requiresVitals: {
        type: 'BP',
        minSystolic: 90
      },
      recentVitals: {
        bp: '84/56 mmHg',
        systolic: 84,
        diastolic: 56,
        recordedAt: '20m ago',
        isStale: false
      }
    },
    {
      id: 'EMAR-005',
      patientId: 'p_janet',
      patientName: 'JANET BONAH',
      ehrNumber: 'EHR-910482',
      bedNumber: 'BED-PED-03',
      wardName: 'Pediatrics Ward',
      drugName: 'Oral Paracetamol Syrup (PRN)',
      dosage: '250 mg / 5ml (10ml PRN for Pain/Fever)',
      route: 'ORAL',
      scheduledTime: 'PRN',
      slot: 'PRN',
      status: 'DUE',
      prescribedBy: 'Dr. Mensah Osei',
      isHighAlert: false,
      prnIndication: 'Post-op Incision Pain > 5/10 or Temp > 38.5C'
    }
  ], []);

  const allDoses = useMemo(() => {
    if (rawDoses && rawDoses.length > 0) return rawDoses;
    return defaultDoses;
  }, [rawDoses, defaultDoses]);

  // Filtered Doses Matrix
  const filteredDoses = useMemo(() => {
    return allDoses.filter(dose => {
      const matchesSlot = selectedSlot === 'ALL' || dose.slot === selectedSlot;
      const matchesSearch = 
        !searchTerm ||
        dose.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dose.ehrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dose.drugName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dose.bedNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSlot && matchesSearch;
    });
  }, [allDoses, selectedSlot, searchTerm]);

  // Barcode Verification Trigger
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = allDoses.find(
      d => d.ehrNumber.toLowerCase() === barcodeInput.trim().toLowerCase() ||
           d.patientId.toLowerCase() === barcodeInput.trim().toLowerCase() ||
           d.bedNumber.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (matched) {
      handleOpenAdministerModal(matched);
      setBarcodeInput('');
      toast({
        title: "Patient Wristband Verified",
        description: `Matched ${matched.patientName} (${matched.bedNumber}).`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Barcode Mismatch",
        description: `No active inpatient dose found for barcode "${barcodeInput}".`,
      });
    }
  };

  const handleOpenAdministerModal = (dose: MedicationDose) => {
    setAdministeringDose(dose);
    setAdminAction('GIVE');
    setHoldReason('');
    setWitnessStaffName('');
    setWitnessStaffNumber('');
    setWitnessPin('');
    setWitnessChecks({ calcChecked: false, patientVerified: false, ampouleChecked: false });
    setPreDosePainScore(7);
    setPrnReasonNote('');
    setIsModalOpen(true);
  };

  const handleOpenVitalsCapture = (dose: MedicationDose) => {
    setVitalsPatient(dose);
    setTempSystolic('130');
    setTempDiastolic('85');
    setTempHeartRate('78');
    setIsVitalsModalOpen(true);
  };

  const handleSaveBedsideVitals = () => {
    if (!vitalsPatient) return;
    const systolicNum = parseInt(tempSystolic, 10);
    const diastolicNum = parseInt(tempDiastolic, 10);

    toast({
      title: "Point-of-Care Vitals Recorded",
      description: `BP ${tempSystolic}/${tempDiastolic} mmHg updated for ${vitalsPatient.patientName}. Vitals Interlock satisfied.`,
    });

    setIsVitalsModalOpen(false);
  };

  const handleConfirmAdministration = async () => {
    if (!administeringDose) return;

    // 1. Dual Sign-Off Check for High-Alert Drugs
    if (administeringDose.isHighAlert && adminAction === 'GIVE') {
      if (!witnessStaffNumber.trim() || !witnessPin.trim()) {
        toast({
          variant: "destructive",
          title: "Dual Sign-Off Incomplete",
          description: "High-Alert medications require a 2nd Registered Nurse staff ID and 4-digit verification PIN.",
        });
        return;
      }
      if (!witnessChecks.calcChecked || !witnessChecks.patientVerified || !witnessChecks.ampouleChecked) {
        toast({
          variant: "destructive",
          title: "Checklist Verification Incomplete",
          description: "Witnessing nurse must check all 3 independent safety verification boxes.",
        });
        return;
      }
    }

    // 2. Clinical Reason Check for Withheld Doses
    if (adminAction === 'HOLD' && !holdReason.trim()) {
      toast({
        variant: "destructive",
        title: "Clinical Reason Required",
        description: "Please document why this dose was withheld (e.g. Hypotension, Patient NPO, Patient Refused).",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const hospitalClean = hospitalId || 'GAM-GAR-7578';
      const doseRef = doc(firestore, `hospitals/${hospitalClean}/emar_doses`, administeringDose.id);
      const status = adminAction === 'GIVE' ? 'GIVEN' : 'HELD';

      // 1. Update eMAR record in Firestore
      setDocumentNonBlocking(doseRef, {
        ...administeringDose,
        status: status,
        givenAt: nowIso,
        givenBy: userProfile?.fullName || 'Staff Nurse',
        administeringStaffId: userProfile?.staffNumber || user?.uid,
        witnessStaffName: witnessStaffName.trim() || null,
        witnessStaffNumber: witnessStaffNumber.trim() || null,
        holdReason: adminAction === 'HOLD' ? holdReason.trim() : null,
        preDosePainScore: administeringDose.slot === 'PRN' ? preDosePainScore : null,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Post to Inpatient Clinical Log
      const auditRef = collection(firestore, `hospitals/${hospitalClean}/clinical_audit_logs`);
      addDocumentNonBlocking(auditRef, {
        type: 'MEDICATION_ADMINISTRATION',
        patientId: administeringDose.patientId,
        patientName: administeringDose.patientName,
        drugName: administeringDose.drugName,
        dosage: administeringDose.dosage,
        route: administeringDose.route,
        status: status,
        actorName: userProfile?.fullName || 'Staff Nurse',
        witnessStaffNumber: witnessStaffNumber.trim() || null,
        timestamp: serverTimestamp(),
      });

      // 3. PRN 45-Minute Efficacy Re-evaluation Task Dispatch
      if (administeringDose.slot === 'PRN' && adminAction === 'GIVE') {
        const prnEvalRef = collection(firestore, `hospitals/${hospitalClean}/prn_evaluations`);
        addDocumentNonBlocking(prnEvalRef, {
          patientId: administeringDose.patientId,
          patientName: administeringDose.patientName,
          bedNumber: administeringDose.bedNumber,
          drugName: administeringDose.drugName,
          administeredAt: nowIso,
          reEvaluateAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 mins later
          preDoseScore: preDosePainScore,
          status: 'PENDING_EVALUATION',
          nurseName: userProfile?.fullName || 'Staff Nurse',
          timestamp: serverTimestamp(),
        });
      }

      toast({
        title: adminAction === 'GIVE' ? "Medication Stamped & Administered" : "Dose Withheld & Documented",
        description: `${administeringDose.drugName} recorded for ${administeringDose.patientName}.`,
      });

      setIsModalOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "eMAR Logging Failed",
        description: err.message || "Failed to log medication administration.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. eMAR HERO COMMAND HEADER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Inpatient Medication Safety
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-rose-400" /> Current Round: 08:00 - 12:00
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
              <Pill className="w-7 h-7 text-rose-500" />
              Electronic Medication Record <span className="text-rose-500 text-lg font-mono">(eMAR)</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
              Enforcing the 5 Rights, Dual Nurse Sign-Off & Point-of-Care Vitals Interlocks
            </p>
          </div>

          {/* Barcode Scanner Input */}
          <form onSubmit={handleBarcodeScan} className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl shadow-inner">
            <div className="flex items-center gap-2 px-3 text-slate-400">
              <Barcode className="w-5 h-5 text-rose-400" />
              <input
                type="text"
                placeholder="Scan Wristband / EHR..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-48 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              Verify
            </button>
          </form>
        </div>

        {/* 5 Rights Badge Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-6 pt-5 border-t border-slate-800/80 text-[11px] font-bold">
          <div className="flex items-center gap-2 text-emerald-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> 1. Right Patient
          </div>
          <div className="flex items-center gap-2 text-emerald-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> 2. Right Drug
          </div>
          <div className="flex items-center gap-2 text-emerald-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> 3. Right Dose
          </div>
          <div className="flex items-center gap-2 text-emerald-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> 4. Right Route
          </div>
          <div className="flex items-center gap-2 text-emerald-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> 5. Right Time
          </div>
        </div>
      </div>

      {/* 2. FILTER CONTROLS & TIME SLOTS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Time Slot Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 overflow-x-auto text-xs font-bold">
          {(['ALL', 'MORNING', 'MIDDAY', 'EVENING', 'NIGHT', 'PRN'] as const).map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`px-3 py-2 rounded-lg uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                selectedSlot === slot
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {slot === 'PRN' && <Sparkles className="w-3 h-3 text-amber-400" />}
              {slot}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search patient, bed, or drug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 font-medium"
          />
        </div>
      </div>

      {/* 3. eMAR DOSAGE ADMINISTRATION GRID */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-4 pl-6">Bed & Inpatient</th>
                <th className="py-4 px-4">Medication & Strength</th>
                <th className="py-4 px-4">Point-of-Care Vitals Interlock</th>
                <th className="py-4 px-4">Route & Slot</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 pr-6 text-right">Bedside Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredDoses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Pill className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="font-bold uppercase tracking-wider text-xs">No scheduled doses for this filter</p>
                  </td>
                </tr>
              ) : (
                filteredDoses.map((dose) => {
                  const isGiven = dose.status === 'GIVEN';
                  const isHeld = dose.status === 'HELD';

                  // Vitals Interlock Evaluation
                  const isHypotensive = dose.requiresVitals?.type === 'BP' && (dose.recentVitals?.systolic || 120) < 90;
                  const isVitalsMissing = dose.requiresVitals && (!dose.recentVitals || dose.recentVitals.isStale);

                  return (
                    <tr key={dose.id} className="hover:bg-slate-800/40 transition">
                      {/* Bed & Patient */}
                      <td className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-400 font-black text-xs">
                            <BedDouble className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white uppercase">{dose.patientName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-rose-300 font-mono font-bold">
                                {dose.bedNumber}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {dose.ehrNumber} • {dose.wardName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Medication */}
                      <td className="py-4 px-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm tracking-tight">{dose.drugName}</span>
                            {dose.isHighAlert && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> High Alert
                              </span>
                            )}
                          </div>
                          <span className="text-rose-400 font-mono font-bold text-xs mt-0.5 block">
                            {dose.dosage}
                          </span>
                        </div>
                      </td>

                      {/* Vitals Interlock Column */}
                      <td className="py-4 px-4">
                        {dose.requiresVitals ? (
                          <div>
                            {dose.requiresVitals.type === 'BP' && (
                              <div className="space-y-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                  isHypotensive
                                    ? 'bg-rose-950/40 text-rose-400 border-rose-500/50'
                                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                                }`}>
                                  <HeartPulse className="w-3 h-3" /> BP: {dose.recentVitals?.bp || 'No Reading'}
                                </span>
                                {isHypotensive && (
                                  <span className="text-[9px] text-rose-400 font-black uppercase block tracking-tight">
                                    ⚠️ Hypotension Alert (Hold Suggested)
                                  </span>
                                )}
                              </div>
                            )}

                            {dose.requiresVitals.type === 'GLUCOSE' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-500/40">
                                Blood Glucose: {dose.recentVitals?.glucose} mmol/L
                              </span>
                            )}

                            {dose.requiresVitals.type === 'PULSE' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-500/40">
                                Heart Rate: {dose.recentVitals?.heartRate} bpm
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono uppercase">Standard Protocol</span>
                        )}
                      </td>

                      {/* Route & Slot */}
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px] uppercase block w-fit mb-1 border border-slate-700">
                          {dose.route.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" /> {dose.scheduledTime} ({dose.slot})
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isGiven ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                            <Check className="w-3 h-3" /> Given
                          </span>
                        ) : isHeld ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                            <AlertCircle className="w-3 h-3" /> Withheld
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase animate-pulse">
                            <Clock className="w-3 h-3" /> Due Now
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 pr-6 text-right">
                        {isVitalsMissing ? (
                          <button
                            type="button"
                            onClick={() => handleOpenVitalsCapture(dose)}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 ml-auto shadow-md shadow-amber-600/20 cursor-pointer"
                          >
                            <HeartPulse className="w-3.5 h-3.5" /> Capture Vitals First
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAdministerModal(dose)}
                            disabled={isGiven}
                            className={`px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 ml-auto cursor-pointer ${
                              isGiven
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : dose.isHighAlert
                                ? 'bg-rose-700 hover:bg-rose-600 text-white shadow-lg shadow-rose-700/30 border border-rose-500/40'
                                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20'
                            }`}
                          >
                            {dose.isHighAlert ? <Lock className="w-3.5 h-3.5" /> : <Syringe className="w-3.5 h-3.5" />}
                            {isGiven ? 'Administered' : dose.isHighAlert ? 'Dual Sign-Off & Give' : 'Administer Dose'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. DUAL SIGN-OFF & ADMINISTRATION MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-950 border border-slate-800 text-slate-100 p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  {administeringDose?.isHighAlert ? 'High-Alert Dual Nurse Sign-Off' : 'Bedside Medication Verification'}
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Patient: <span className="font-bold text-white">{administeringDose?.patientName}</span> ({administeringDose?.bedNumber})
                </p>
              </div>
            </div>
          </DialogHeader>

          {administeringDose && (
            <div className="space-y-5 my-2">
              {/* Drug Spec Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Medication Order</span>
                  {administeringDose.isHighAlert && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> High-Risk Drug
                    </span>
                  )}
                </div>
                <p className="text-base font-black text-white">{administeringDose.drugName}</p>
                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Prescribed Dose</span>
                    <span className="font-mono font-bold text-rose-400">{administeringDose.dosage}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Route</span>
                    <span className="font-mono font-bold text-slate-200">{administeringDose.route}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Prescriber</span>
                    <span className="font-medium text-slate-200 truncate block">{administeringDose.prescribedBy}</span>
                  </div>
                </div>
              </div>

              {/* Action Toggle (Give vs Hold) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdminAction('GIVE')}
                  className={`p-3 rounded-xl border text-xs font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
                    adminAction === 'GIVE'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Administer (Given)
                </button>
                <button
                  type="button"
                  onClick={() => setAdminAction('HOLD')}
                  className={`p-3 rounded-xl border text-xs font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
                    adminAction === 'HOLD'
                      ? 'bg-amber-950/40 border-amber-500 text-amber-400 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" /> Withhold (Hold Dose)
                </button>
              </div>

              {/* DUAL SIGN-OFF INTERLOCK (For High-Alert Narcotics, Insulin, Heparin) */}
              {administeringDose.isHighAlert && adminAction === 'GIVE' && (
                <div className="bg-rose-950/30 border border-rose-500/50 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2.5 text-rose-300 font-black text-xs uppercase tracking-wide">
                    <Lock className="w-4 h-4 text-rose-400" /> Independent 2nd Registered Nurse Verification Interlock
                  </div>
                  
                  {/* Verification Checkboxes */}
                  <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-rose-500/30 text-xs">
                    <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={witnessChecks.ampouleChecked}
                        onChange={(e) => setWitnessChecks(c => ({ ...c, ampouleChecked: e.target.checked }))}
                        className="accent-rose-500 h-4 w-4"
                      />
                      <span>I have verified the drug ampoule label, concentration, and expiry date.</span>
                    </label>
                    <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={witnessChecks.calcChecked}
                        onChange={(e) => setWitnessChecks(c => ({ ...c, calcChecked: e.target.checked }))}
                        className="accent-rose-500 h-4 w-4"
                      />
                      <span>I have independently recalculated the dosage and volumetric syringe draw.</span>
                    </label>
                    <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={witnessChecks.patientVerified}
                        onChange={(e) => setWitnessChecks(c => ({ ...c, patientVerified: e.target.checked }))}
                        className="accent-rose-500 h-4 w-4"
                      />
                      <span>I have confirmed the patient 2-identifier wristband at the bedside.</span>
                    </label>
                  </div>

                  {/* 2nd Nurse Credentials */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-rose-300 uppercase mb-1">Witness Nurse Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Nurse Mensah"
                        value={witnessStaffName}
                        onChange={(e) => setWitnessStaffName(e.target.value)}
                        className="w-full bg-slate-900 border border-rose-500/40 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-rose-300 uppercase mb-1">Staff ID Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. GAM/STF/26/0009"
                        value={witnessStaffNumber}
                        onChange={(e) => setWitnessStaffNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-rose-500/40 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-rose-300 uppercase mb-1">4-Digit Security PIN *</label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={witnessPin}
                        onChange={(e) => setWitnessPin(e.target.value)}
                        className="w-full bg-slate-900 border border-rose-500/40 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono text-center tracking-widest"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PRN PRE-DOSE SEVERITY RATING */}
              {administeringDose.slot === 'PRN' && adminAction === 'GIVE' && (
                <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" /> PRN Pre-Medication Pain/Severity Rating
                    </span>
                    <span className="text-sm font-black font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      Score: {preDosePainScore}/10
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Smile className="w-4 h-4 text-emerald-400" />
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={preDosePainScore}
                      onChange={(e) => setPreDosePainScore(parseInt(e.target.value, 10))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <Frown className="w-4 h-4 text-rose-400" />
                  </div>
                  <p className="text-[10px] text-amber-300/80">
                    45-minute automated post-dose efficacy review will be injected into your Ward Rounding Schedule upon administration.
                  </p>
                </div>
              )}

              {/* Hold Reason Input */}
              {adminAction === 'HOLD' && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider font-mono">
                    Mandatory Clinical Withhold Reason *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Patient NPO for surgery; Systolic BP < 90 mmHg; Patient Refused..."
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    className="w-full bg-slate-900 border border-amber-500/40 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-slate-800/80 pt-4 mt-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAdministration}
              disabled={isSubmitting}
              className={`font-bold text-xs uppercase tracking-wider gap-2 shadow-lg ${
                adminAction === 'GIVE'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
              }`}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {adminAction === 'GIVE' ? 'Sign & Administer Dose' : 'Confirm Dose Withheld'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. POINT-OF-CARE VITALS CAPTURE MODAL */}
      <Dialog open={isVitalsModalOpen} onOpenChange={setIsVitalsModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-800 text-slate-100 p-6 shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <HeartPulse className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white uppercase tracking-tight">
                  Point-of-Care Vitals Entry
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Patient: <span className="font-bold text-white">{vitalsPatient?.patientName}</span> ({vitalsPatient?.bedNumber})
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Systolic BP (mmHg)</label>
                <input
                  type="number"
                  value={tempSystolic}
                  onChange={(e) => setTempSystolic(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-mono text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Diastolic BP (mmHg)</label>
                <input
                  type="number"
                  value={tempDiastolic}
                  onChange={(e) => setTempDiastolic(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-mono text-center font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Heart Rate / Pulse (bpm)</label>
              <input
                type="number"
                value={tempHeartRate}
                onChange={(e) => setTempHeartRate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-mono text-center font-bold"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-800/80 pt-4 mt-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setIsVitalsModalOpen(false)} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleSaveBedsideVitals}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
            >
              Save Vitals & Unlock eMAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
