'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, serverTimestamp, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scissors, ShieldCheck, Clipboard, Save, Loader2, ArrowLeft, Check, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SurgeryLogPage() {
  const { id: surgeryId } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    findings: '',
    procedureDone: '',
    anesthesiaType: 'General',
    bloodLoss: '',
    postOpInstructions: ''
  });

  // WHO Checklist State
  const [checklist, setChecklist] = useState({
    // Sign In (Before induction of anesthesia)
    patientIdentityConfirmed: false,
    siteMarked: false,
    anesthesiaSafetyCheck: false,
    pulseOxiFunctioning: false,
    
    // Time Out (Before skin incision)
    teamIntroduced: false,
    verbalIncisionConfirm: false,
    antibioticsAdministered: false,
    essentialImagingDisplayed: false,
    
    // Sign Out (Before leaving OR)
    countsConfirmed: false, // Sponge, Needle & Instrument counts verified correct
    specimenLabeled: false,
    equipmentProblemsAddressed: false,
    recoveryPlanReviewed: false,
  });

  const [activeTab, setActiveTab] = useState<'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT'>('SIGN_IN');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const surgeryRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !surgeryId) return null;
    return doc(firestore, `hospitals/${hospitalId}/surgeries`, surgeryId as string);
  }, [firestore, hospitalId, surgeryId]);

  const { data: surgery, isLoading: isSurgeryLoading } = useDoc(surgeryRef);

  const patientRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !surgery?.patientId) return null;
    return doc(firestore, `hospitals/${hospitalId}/patients`, surgery.patientId);
  }, [firestore, hospitalId, surgery?.patientId]);

  const { data: patient, isLoading: isPatientLoading } = useDoc(patientRef);

  const handleCommitSurgery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !surgeryRef || !surgery || !user || !patient) return;

    if (!isChecklistComplete) {
      toast({
        variant: 'destructive',
        title: 'Checklist Incomplete',
        description: 'Please verify and complete all WHO Surgical Safety Checklist points before final sign-off.'
      });
      return;
    }

    setLoading(true);
    const batch = writeBatch(firestore);

    try {
      // 1. Finalize the Surgery Document with checklist data
      batch.update(surgeryRef, {
        ...form,
        checklist,
        status: 'COMPLETED',
        completedAt: serverTimestamp()
      });

      // 2. CLINICAL HANDSHAKE: Create an Encounter record for the patient timeline
      const encounterId = doc(collection(firestore as any, 'encounters')).id;
      const ghanaCardId = patient?.ghanaCardId || '';
      
      const encounterData = {
        id: encounterId,
        patientId: (surgery as any).patientId,
        patientName: (surgery as any).patientName,
        ghanaCardId: ghanaCardId,
        chiefComplaint: `Scheduled Surgical Operation: ${(surgery as any).procedureName}`,
        diagnosis: form.procedureDone || (surgery as any).procedureName,
        hpi: `INTRA-OPERATIVE FINDINGS:\n${form.findings}\n\nANESTHESIA TYPE: ${form.anesthesiaType}\nESTIMATED BLOOD LOSS: ${form.bloodLoss}\nPOST-OP WARD INSTRUCTIONS:\n${form.postOpInstructions}\n\nWHO SAFETY CHECKLIST COMPLIANCE:\n- Patient Identity & Consent Checked\n- Incision Site Marked & Confirmed\n- Anesthesia & Pulse Oximeter Verified\n- Needle, Sponge & Instrument Counts Confirmed Correct`,
        type: 'Surgical Operation',
        encounterType: 'Surgical Operation',
        surgeryDetails: {
          findings: form.findings,
          procedureDone: form.procedureDone || (surgery as any).procedureName,
          anesthesiaType: form.anesthesiaType,
          bloodLoss: form.bloodLoss,
          postOpInstructions: form.postOpInstructions,
          checklistAudit: checklist
        },
        providerId: user.uid,
        providerName: userProfile?.fullName || (surgery as any).surgeonName || 'Surgical Team',
        providerRole: userProfile?.role || 'DOCTOR',
        hospitalId: hospitalId,
        hospitalName: userProfile?.hospitalName || 'Operating Hospital',
        createdAt: serverTimestamp(),
        vitals: {
          temp: 0,
          bp: '0/0',
          pulse: 0,
          respiration: 0,
          spo2: 0,
          weight: 0,
          height: 0,
          bmi: 0,
        }
      };

      // Write to nested path: hospitals/${hospitalId}/patients/${surgery.patientId}/encounters
      const nestedEncounterRef = doc(firestore as any, `hospitals/${hospitalId}/patients/${(surgery as any).patientId}/encounters`, encounterId);
      batch.set(nestedEncounterRef, encounterData);

      // Write to top-level path: encounters
      const topLevelEncounterRef = doc(firestore as any, 'encounters', encounterId);
      batch.set(topLevelEncounterRef, encounterData);

      // 3. FINANCIAL TRIGGER: Add Theater Fee using tariff procedure price
      const procedurePrice = typeof (surgery as any).procedurePrice === 'number' ? (surgery as any).procedurePrice : 1500;
      const billRef = doc(collection(firestore as any, `hospitals/${hospitalId}/billing_items`));
      batch.set(billRef, {
        patientId: (surgery as any).patientId,
        patientName: (surgery as any).patientName,
        hospitalId: hospitalId,
        description: `Surgical Theater Fee (${(surgery as any).procedureName})`,
        category: 'PROCEDURE',
        total: procedurePrice,
        unitPrice: procedurePrice,
        qty: 1,
        status: 'UNPAID',
        billedBy: user.uid,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Surgical Report Signed & Billed", description: "The theater fee has been added to the patient's folio." });
      router.push('/theater/schedule');
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Log Failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isChecklistComplete = useMemo(() => {
    return Object.values(checklist).every(Boolean);
  }, [checklist]);

  const signInCheckedCount = useMemo(() => {
    const keys: (keyof typeof checklist)[] = ['patientIdentityConfirmed', 'siteMarked', 'anesthesiaSafetyCheck', 'pulseOxiFunctioning'];
    return keys.filter(k => checklist[k]).length;
  }, [checklist]);

  const timeOutCheckedCount = useMemo(() => {
    const keys: (keyof typeof checklist)[] = ['teamIntroduced', 'verbalIncisionConfirm', 'antibioticsAdministered', 'essentialImagingDisplayed'];
    return keys.filter(k => checklist[k]).length;
  }, [checklist]);

  const signOutCheckedCount = useMemo(() => {
    const keys: (keyof typeof checklist)[] = ['countsConfirmed', 'specimenLabeled', 'equipmentProblemsAddressed', 'recoveryPlanReviewed'];
    return keys.filter(k => checklist[k]).length;
  }, [checklist]);

  if (isSurgeryLoading || isPatientLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-black">
        <Loader2 className="animate-spin h-16 w-16 text-primary" />
        <span className="ml-4 font-bold text-slate-500 italic">Opening Operating Theater Log...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 text-black font-bold">
      <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold text-xs uppercase transition-all rounded-xl">
        <ArrowLeft size={16} /> Back to OT Schedule
      </Button>
      
      <form onSubmit={handleCommitSurgery} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: WHO Surgical Safety Checklist */}
        <div className="lg:col-span-7 bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
            <Clipboard className="text-blue-600" size={24} />
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">WHO Surgical <span className="text-blue-600">Safety Checklist</span></h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Interactive intraoperative safety compliance log</p>
            </div>
          </div>

          {/* Checklist Step Tabs */}
          <div className="flex border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('SIGN_IN')}
              className={cn(
                "flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex flex-col items-center justify-center gap-0.5",
                activeTab === 'SIGN_IN' ? "bg-sky-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <span>1. Sign-In</span>
              <span className="text-[8px] font-bold opacity-85">({signInCheckedCount}/4 Complete)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TIME_OUT')}
              className={cn(
                "flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex flex-col items-center justify-center gap-0.5",
                activeTab === 'TIME_OUT' ? "bg-amber-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <span>2. Time-Out</span>
              <span className="text-[8px] font-bold opacity-85">({timeOutCheckedCount}/4 Complete)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SIGN_OUT')}
              className={cn(
                "flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex flex-col items-center justify-center gap-0.5",
                activeTab === 'SIGN_OUT' ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <span>3. Sign-Out</span>
              <span className="text-[8px] font-bold opacity-85">({signOutCheckedCount}/4 Complete)</span>
            </button>
          </div>

          {/* Checklist tab contents */}
          <div className="space-y-3 min-h-[300px]">
            {activeTab === 'SIGN_IN' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest pl-1 mb-2">Phase 1: Sign In (Before Anesthesia Induction)</p>
                
                <CheckCard
                  checked={checklist.patientIdentityConfirmed}
                  onClick={() => toggleCheck('patientIdentityConfirmed')}
                  title="Patient Identity & Consent"
                  description="Patient has verbally confirmed identity, surgical site, planned procedure, and signed consent."
                  colorClass="sky"
                />
                
                <CheckCard
                  checked={checklist.siteMarked}
                  onClick={() => toggleCheck('siteMarked')}
                  title="Surgical Site Marked"
                  description="The surgical incision site has been physically marked by the surgeon (or N/A)."
                  colorClass="sky"
                />

                <CheckCard
                  checked={checklist.anesthesiaSafetyCheck}
                  onClick={() => toggleCheck('anesthesiaSafetyCheck')}
                  title="Anesthesia Machine & Meds Check"
                  description="Anesthesia machine, monitor oximeters, and medication safety checks completed successfully."
                  colorClass="sky"
                />

                <CheckCard
                  checked={checklist.pulseOxiFunctioning}
                  onClick={() => toggleCheck('pulseOxiFunctioning')}
                  title="Pulse Oximeter Functioning"
                  description="Pulse oximeter is placed on the patient, is functioning properly, and reads audible oxygen levels."
                  colorClass="sky"
                />
              </div>
            )}

            {activeTab === 'TIME_OUT' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-300">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest pl-1 mb-2">Phase 2: Time Out (Before Skin Incision)</p>

                <CheckCard
                  checked={checklist.teamIntroduced}
                  onClick={() => toggleCheck('teamIntroduced')}
                  title="Team Introductions"
                  description="All team members (surgeons, anesthesiology, and nursing staff) have introduced themselves by name and role."
                  colorClass="amber"
                />

                <CheckCard
                  checked={checklist.verbalIncisionConfirm}
                  onClick={() => toggleCheck('verbalIncisionConfirm')}
                  title="Verbal Procedure Review"
                  description="Surgeon, nurse, and anesthesia staff have verbally confirmed: Name of patient, scheduled procedure, and target incision site."
                  colorClass="amber"
                />

                <CheckCard
                  checked={checklist.antibioticsAdministered}
                  onClick={() => toggleCheck('antibioticsAdministered')}
                  title="Antibiotic Prophylaxis (or N/A)"
                  description="Prophylactic antibiotics have been administered within the last 60 minutes prior to incision."
                  colorClass="amber"
                />

                <CheckCard
                  checked={checklist.essentialImagingDisplayed}
                  onClick={() => toggleCheck('essentialImagingDisplayed')}
                  title="Essential Imaging Results (or N/A)"
                  description="All critical diagnostic radiographs, CTs, or MRIs are displayed and confirmed correct for this patient."
                  colorClass="amber"
                />
              </div>
            )}

            {activeTab === 'SIGN_OUT' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest pl-1 mb-2">Phase 3: Sign Out (Before Patient leaves Operating Room)</p>

                <CheckCard
                  checked={checklist.countsConfirmed}
                  onClick={() => toggleCheck('countsConfirmed')}
                  title="Needle, Sponge, and Instrument Counts"
                  description="VERBAL CONFIRMATION: Needle, sponge, and instrument counts are completed and verified correct. Absolutely no materials left inside."
                  colorClass="emerald"
                  isCritical={true}
                />

                <CheckCard
                  checked={checklist.specimenLabeled}
                  onClick={() => toggleCheck('specimenLabeled')}
                  title="Specimen Labeling Check (or N/A)"
                  description="Verbal confirmation that specimen is labeled correctly with patient name, ID, and pathology details."
                  colorClass="emerald"
                />

                <CheckCard
                  checked={checklist.equipmentProblemsAddressed}
                  onClick={() => toggleCheck('equipmentProblemsAddressed')}
                  title="Equipment Check (or N/A)"
                  description="No major equipment problems or issues to report, or all issues have been logged for service."
                  colorClass="emerald"
                />

                <CheckCard
                  checked={checklist.recoveryPlanReviewed}
                  onClick={() => toggleCheck('recoveryPlanReviewed')}
                  title="Post-Op Recovery Concerns"
                  description="Surgeon, anesthesia professional, and nursing staff have reviewed recovery and management plans."
                  colorClass="emerald"
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Operative Details & Finalization */}
        <div className="lg:col-span-5 bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
            <Scissors className="text-primary rotate-90" size={24} />
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">Operative <span className="text-primary">Record</span></h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Log surgical findings and ward directions</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-400 font-medium uppercase text-[9px]">Patient</span>
              <span className="font-black uppercase tracking-tight">{surgery?.patientName}</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span className="text-slate-400 font-medium uppercase text-[9px]">Procedure</span>
              <span className="font-black uppercase tracking-tight">{surgery?.procedureName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium uppercase text-[9px]">Surgeon</span>
              <span className="font-black uppercase tracking-tight">Dr. {surgery?.surgeonName}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Intra-Operative Findings</label>
              <Textarea 
                required
                className="w-full p-4 bg-slate-50 border-2 rounded-2xl h-24 mt-1 font-bold text-sm outline-none focus:ring-2 focus:ring-slate-900" 
                placeholder="Detail pathological findings and organs examined..."
                onChange={e => setForm({...form, findings: e.target.value})} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Anesthesia Type</label>
                <Select onValueChange={(value) => setForm({...form, anesthesiaType: value})} defaultValue={form.anesthesiaType}>
                  <SelectTrigger className="w-full bg-slate-50 border-2 rounded-2xl mt-1 font-bold h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-black font-bold">
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Spinal">Spinal</SelectItem>
                    <SelectItem value="Sedation">Sedation</SelectItem>
                    <SelectItem value="Local">Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Estimated Blood Loss</label>
                <Input 
                  required
                  className="w-full p-4 bg-slate-50 border-2 rounded-2xl mt-1 font-bold h-12 outline-none focus:ring-2 focus:ring-slate-900" 
                  placeholder="e.g. 150ml"
                  onChange={e => setForm({...form, bloodLoss: e.target.value})} 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Post-Op Ward Instructions</label>
              <Input 
                required
                className="w-full p-4 bg-slate-50 border-2 rounded-2xl mt-1 font-bold h-12 outline-none focus:ring-2 focus:ring-slate-900 text-xs" 
                placeholder="e.g. Monitor vitals Q1h for 4h, IV analgesics..."
                onChange={e => setForm({...form, postOpInstructions: e.target.value})} 
              />
            </div>
          </div>

          {/* Safety Alerts / Validation summary */}
          <div className="pt-4 space-y-3">
            {!checklist.countsConfirmed && (
              <div className="bg-red-50 border-2 border-red-200 text-red-900 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
                <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-[10px] font-black uppercase">Critical Safety Count Guard</p>
                  <p className="text-[9px] font-bold text-red-700 leading-normal mt-0.5">
                    Needle, sponge, and instrument counts must be verbally confirmed as correct. Closing surgical incisions without this check is forbidden.
                  </p>
                </div>
              </div>
            )}

            {checklist.countsConfirmed && !isChecklistComplete && (
              <div className="bg-amber-50 border-2 border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-[10px] font-black uppercase">WHO Checklist Incomplete</p>
                  <p className="text-[9px] font-bold text-amber-700 leading-normal mt-0.5">
                    All Sign-In, Time-Out, and Sign-Out steps must be checked off to verify full surgical audit compliance before report submission.
                  </p>
                </div>
              </div>
            )}

            {isChecklistComplete && (
              <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-start gap-3">
                <Sparkles className="text-emerald-600 shrink-0 mt-0.5 animate-bounce" size={20} />
                <div>
                  <p className="text-[10px] font-black uppercase">Surgical Safety Compliant</p>
                  <p className="text-[9px] font-bold text-emerald-700 leading-normal mt-0.5">
                    All safety checkmarks and instrument count confirmations are signed off. This record is compliant with international WHO surgical safety metrics.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isChecklistComplete}
              className={cn(
                "w-full text-white py-5 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2",
                isChecklistComplete
                  ? "bg-blue-600 hover:bg-black shadow-lg cursor-pointer"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={16} />}
              Sign &amp; Authenticate Report
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

interface CheckCardProps {
  checked: boolean;
  onClick: () => void;
  title: string;
  description: string;
  colorClass: 'sky' | 'amber' | 'emerald';
  isCritical?: boolean;
}

function CheckCard({ checked, onClick, title, description, colorClass, isCritical }: CheckCardProps) {
  const activeBg = {
    sky: 'bg-sky-50 border-sky-500 text-sky-900',
    amber: 'bg-amber-50/50 border-amber-500 text-amber-900',
    emerald: 'bg-emerald-50 border-emerald-500 text-emerald-900',
  }[colorClass];

  const activeBox = {
    sky: 'bg-sky-600 border-sky-600',
    amber: 'bg-amber-600 border-amber-600',
    emerald: 'bg-emerald-600 border-emerald-600',
  }[colorClass];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all w-full",
        checked
          ? activeBg
          : (isCritical
              ? "bg-red-50/30 border-red-200 text-red-950 hover:bg-red-50/50"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50")
      )}
    >
      <div className={cn(
        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 text-white",
        checked
          ? activeBox
          : (isCritical ? "border-red-400 bg-red-50" : "border-slate-300")
      )}>
        {checked && <Check size={14} />}
      </div>
      <div>
        <p className={cn(
          "text-xs font-black uppercase tracking-tight flex items-center gap-1.5",
          isCritical && !checked && "text-red-700 font-extrabold"
        )}>
          {title}
          {isCritical && <span className="text-[8px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full uppercase tracking-widest font-black animate-pulse">Critical Safety Count</span>}
        </p>
        <p className="text-[10px] text-slate-400 font-bold mt-0.5 leading-normal">{description}</p>
      </div>
    </button>
  );
}