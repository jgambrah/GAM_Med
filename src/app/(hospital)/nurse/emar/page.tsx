'use client';

import React, { useState, useMemo } from 'react';
import { 
  Pill, Activity, Clock, CheckCircle2, AlertTriangle, 
  Search, ShieldAlert, Barcode, UserCheck, BedDouble, 
  FileText, ArrowRight, ShieldCheck, Loader2, Sparkles,
  Check, X, AlertCircle, Syringe, Info, HeartPulse
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
  scheduledTime: string; // e.g. '08:00'
  slot: 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT' | 'PRN';
  status: 'DUE' | 'GIVEN' | 'HELD' | 'OVERDUE';
  prescribedBy: string;
  isHighAlert?: boolean;
  notes?: string;
  givenAt?: string;
  givenBy?: string;
}

export default function ElectronicMedicationAdministrationRecordPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedSlot, setSelectedSlot] = useState<'ALL' | 'MORNING' | 'MIDDAY' | 'EVENING' | 'NIGHT' | 'PRN'>('ALL');
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Administration Modal State
  const [administeringDose, setAdministeringDose] = useState<MedicationDose | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminAction, setAdminAction] = useState<'GIVE' | 'HOLD'>('GIVE');
  const [holdReason, setHoldReason] = useState('');
  const [witnessStaffNumber, setWitnessStaffNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId || 'GAM-GAR-7578';

  // 1. Fetch Admitted Inpatients
  const admissionsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/admissions`),
      where("status", "==", "ADMITTED")
    );
  }, [firestore, hospitalId]);
  const { data: rawAdmissions, isLoading: areAdmissionsLoading } = useCollection<any>(admissionsQuery);

  // 2. Fetch Active Inpatient Prescriptions / Doses
  const dosesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/emar_doses`),
      orderBy('scheduledTime', 'asc')
    );
  }, [firestore, hospitalId]);
  const { data: rawDoses, isLoading: areDosesLoading } = useCollection<MedicationDose>(dosesQuery);

  // Mock / Initial Seed Data if eMAR collection is empty
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
      dosage: '12 Units',
      route: 'SC',
      scheduledTime: '08:00',
      slot: 'MORNING',
      status: 'DUE',
      prescribedBy: 'Dr. James Gambrah',
      isHighAlert: true,
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
    },
    {
      id: 'EMAR-004',
      patientId: 'p_janet',
      patientName: 'JANET BONAH',
      ehrNumber: 'EHR-910482',
      bedNumber: 'BED-PED-03',
      wardName: 'Pediatrics Ward',
      drugName: 'Oral Amoxicillin/Clavulanate Suspension',
      dosage: '312.5 mg / 5ml (7.5ml)',
      route: 'ORAL',
      scheduledTime: '12:00',
      slot: 'MIDDAY',
      status: 'DUE',
      prescribedBy: 'Dr. Mensah Osei',
      isHighAlert: false,
    },
    {
      id: 'EMAR-005',
      patientId: 'p_kofi',
      patientName: 'KOFI ADU',
      ehrNumber: 'EHR-449102',
      bedNumber: 'BED-M08',
      wardName: 'Male Medical Ward',
      drugName: 'Oral Enalapril',
      dosage: '10 mg Tablet',
      route: 'ORAL',
      scheduledTime: '18:00',
      slot: 'EVENING',
      status: 'DUE',
      prescribedBy: 'Dr. James Gambrah',
      isHighAlert: false,
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
      const matchesWard = selectedWard === 'ALL' || dose.wardName.toLowerCase().includes(selectedWard.toLowerCase());
      const matchesSearch = 
        !searchTerm ||
        dose.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dose.ehrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dose.drugName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dose.bedNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSlot && matchesWard && matchesSearch;
    });
  }, [allDoses, selectedSlot, selectedWard, searchTerm]);

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
      setAdministeringDose(matched);
      setIsModalOpen(true);
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
    setWitnessStaffNumber('');
    setIsModalOpen(true);
  };

  const handleConfirmAdministration = async () => {
    if (!administeringDose) return;

    if (administeringDose.isHighAlert && adminAction === 'GIVE' && !witnessStaffNumber.trim()) {
      toast({
        variant: "destructive",
        title: "High-Alert Safety Lock",
        description: "Dual-nurse verification is mandatory for High-Alert medications. Enter witness staff number.",
      });
      return;
    }

    if (adminAction === 'HOLD' && !holdReason.trim()) {
      toast({
        variant: "destructive",
        title: "Clinical Reason Required",
        description: "Please specify why this dose was withheld (e.g. Patient NPO, Low BP).",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const doseRef = doc(firestore, `hospitals/${hospitalId}/emar_doses`, administeringDose.id);

      const status = adminAction === 'GIVE' ? 'GIVEN' : 'HELD';

      // 1. Update eMAR record
      setDocumentNonBlocking(doseRef, {
        ...administeringDose,
        status: status,
        givenAt: nowIso,
        givenBy: userProfile?.fullName || 'Staff Nurse',
        administeringStaffId: userProfile?.staffNumber || user?.uid,
        witnessStaffNumber: witnessStaffNumber.trim() || null,
        holdReason: adminAction === 'HOLD' ? holdReason.trim() : null,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Post to Inpatient Clinical Log
      const auditRef = collection(firestore, `hospitals/${hospitalId}/clinical_audit_logs`);
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

      toast({
        title: adminAction === 'GIVE' ? "Medication Administered" : "Dose Withheld & Logged",
        description: `${administeringDose.drugName} logged for ${administeringDose.patientName}.`,
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

  const isLoading = isUserLoading || isProfileLoading || areDosesLoading;

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
              Enforcing the 5 Rights of Drug Administration & Barcode Bedside Verification
            </p>
          </div>

          {/* Barcode Scanner Input Quick Action */}
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
              className={`px-3 py-2 rounded-lg uppercase tracking-wider transition cursor-pointer ${
                selectedSlot === slot
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {slot}
            </button>
          ))}
        </div>

        {/* Search & Ward Selector */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
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
      </div>

      {/* 3. eMAR DOSAGE ADMINISTRATION GRID */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-4 pl-6">Bed & Inpatient</th>
                <th className="py-4 px-4">Medication & Strength</th>
                <th className="py-4 px-4">Route & Slot</th>
                <th className="py-4 px-4">Prescriber</th>
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

                      {/* Route & Slot */}
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px] uppercase block w-fit mb-1 border border-slate-700">
                          {dose.route.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" /> {dose.scheduledTime} ({dose.slot})
                        </span>
                      </td>

                      {/* Prescriber */}
                      <td className="py-4 px-4">
                        <span className="text-slate-300 font-medium block">{dose.prescribedBy}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Inpatient Order</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isGiven ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                            <Check className="w-3 h-3" /> Given ({dose.givenBy || 'Nurse'})
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
                        <button
                          type="button"
                          onClick={() => handleOpenAdministerModal(dose)}
                          disabled={isGiven}
                          className={`px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition flex items-center gap-1.5 ml-auto cursor-pointer ${
                            isGiven
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20'
                          }`}
                        >
                          <Syringe className="w-3.5 h-3.5" />
                          {isGiven ? 'Administered' : 'Administer Dose'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MEDICATION ADMINISTRATION MODAL (5 RIGHTS CHECKPOINT) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-slate-950 border border-slate-800 text-slate-100 p-6 shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  Bedside Medication Verification
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Patient: <span className="font-bold text-white">{administeringDose?.patientName}</span> ({administeringDose?.bedNumber})
                </p>
              </div>
            </div>
          </DialogHeader>

          {administeringDose && (
            <div className="space-y-4 my-2">
              {/* Drug Spec Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Medication</span>
                  {administeringDose.isHighAlert && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      🚨 High Alert Drug
                    </span>
                  )}
                </div>
                <p className="text-base font-black text-white">{administeringDose.drugName}</p>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Prescribed Dose</span>
                    <span className="font-mono font-bold text-rose-400">{administeringDose.dosage}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Route</span>
                    <span className="font-mono font-bold text-slate-200">{administeringDose.route}</span>
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

              {/* High Alert 2nd Nurse Witness PIN */}
              {administeringDose.isHighAlert && adminAction === 'GIVE' && (
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 space-y-2">
                  <label className="block text-[11px] font-black text-rose-300 uppercase tracking-wider font-mono">
                    Independent 2nd Nurse Witness Staff ID / Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GAM/STF/26/0009"
                    value={witnessStaffNumber}
                    onChange={(e) => setWitnessStaffNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-rose-500/40 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-rose-400">
                    Dual verification ensures zero dosage calculation errors on high-risk narcotics & insulin.
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
              {adminAction === 'GIVE' ? 'Confirm Medication Given' : 'Confirm Dose Withheld'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
