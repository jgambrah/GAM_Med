'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, serverTimestamp, collection } from 'firebase/firestore';
import { 
  ShieldAlert, CheckCircle2, Loader2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { areBloodGroupsCompatible } from '@/lib/blood-compatibility';

export default function TransfusionSafetyGate() {
  const pintId = useParams()?.pintId;
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [processing, setProcessing] = useState(false);
  const [manualVerifyChecked, setManualVerifyChecked] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  const hospitalId = userProfile?.hospitalId;

  const pintRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !pintId) return null;
    return doc(firestore, 'hospitals', hospitalId, 'blood_pints', pintId as string);
  }, [firestore, hospitalId, pintId]);
  
  const { data: pint, isLoading } = useDoc(pintRef);

  const patientRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !pint?.crossmatchedForPatientId) return null;
    return doc(firestore, 'hospitals', hospitalId, 'patients', pint.crossmatchedForPatientId);
  }, [firestore, hospitalId, pint?.crossmatchedForPatientId]);
  
  const { data: patient, isLoading: isPatientLoading } = useDoc(patientRef);

  const compatibility = useMemo(() => {
    if (!pint || !patient) return { isCompatible: true, isDocumented: false };
    const patientBg = patient.bloodGroup;
    if (!patientBg || patientBg === 'N/A') return { isCompatible: false, isDocumented: false };
    return {
      isCompatible: areBloodGroupsCompatible(pint.bloodGroup, patientBg),
      isDocumented: true,
      patientBg
    };
  }, [pint, patient]);

  const canStartTransfusion = useMemo(() => {
    if (!pint || !patient) return false;
    if (!compatibility.isDocumented) return manualVerifyChecked;
    return compatibility.isCompatible;
  }, [pint, patient, compatibility, manualVerifyChecked]);

  const handleTransfusionStart = async () => {
    if (!pintRef || !pint || !user || !firestore || !hospitalId) {
        toast({ variant: "destructive", title: "System Error", description: "Critical data missing. Cannot proceed."});
        return;
    }

    const confirmMatch = confirm(`Are you certain the patient's ID and Blood Group (${pint.bloodGroup}) match this bag? This action is irreversible.`);
    if (!confirmMatch) return;
    
    setProcessing(true);

    try {
      const batch = writeBatch(firestore);
      
      // 1. Mark pint as USED
      batch.update(pintRef, {
        status: 'TRANSFUSED',
        transfusedBy: user.uid,
        transfusedByName: user.displayName,
        transfusedAt: serverTimestamp()
      });

      // 2. Add to Patient clinical history (as an Encounter)
      const encounterRef = doc(collection(firestore, `hospitals/${hospitalId}/patients/${pint.crossmatchedForPatientId}/encounters`));
      batch.set(encounterRef, {
        patientId: pint.crossmatchedForPatientId,
        patientName: pint.crossmatchedForPatientName,
        hospitalId: hospitalId,
        type: 'BLOOD_TRANSFUSION',
        chiefComplaint: `Blood Transfusion: Pint ID: ${pint.pintId} (${pint.bloodGroup}) administered.`,
        providerUid: user.uid,
        providerName: user.displayName,
        providerRole: userProfile?.role,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Transfusion Authorized & Logged" });
      router.push('/nurse'); // Go back to nurse dashboard
    } catch (e: any) { 
        toast({ variant: 'destructive', title: "Transfusion Error", description: e.message });
    } finally {
        setProcessing(false);
    }
  };

  if (isLoading || isPatientLoading) return <div className="p-20 text-center font-black flex items-center justify-center gap-4"><Loader2 className="animate-spin" /> Safety Handshake in Progress...</div>;
  if (!pint) return <div className="p-20 text-center font-black text-destructive">Pint data not found or invalid ID.</div>;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 text-black font-bold">
      <div className="bg-red-600 p-8 rounded-[40px] text-white shadow-2xl flex flex-col items-center text-center space-y-4">
         <ShieldAlert size={48} className="animate-pulse" />
         <h1 className="text-3xl font-black uppercase tracking-tighter">Safety <span className="text-red-200">Verification</span></h1>
         <p className="text-xs font-bold uppercase opacity-80">Double-Check Blood Group and Patient Identity Now.</p>
      </div>

      <div className="bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-xl space-y-6">
         <div className="flex justify-between items-center border-b pb-4">
            <span className="text-xs text-slate-400 uppercase">Pint Identity</span>
            <span className="text-xl font-black text-red-600 italic">#{pint.pintId}</span>
         </div>
         
         <div className="grid grid-cols-2 gap-8">
            <div className="bg-slate-50 p-6 rounded-3xl text-center border-2 border-red-100">
               <p className="text-[10px] uppercase text-slate-400">Bag Blood Group</p>
               <p className="text-4xl font-black text-red-600">{pint.bloodGroup}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl text-center border-2 border-blue-100">
               <p className="text-[10px] uppercase text-slate-400">Patient</p>
               <p className="text-xl font-black text-blue-600 uppercase italic">{pint.crossmatchedForPatientName}</p>
            </div>
         </div>

         {/* Compatibility Banners */}
         {!compatibility.isDocumented ? (
           <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 space-y-3">
             <p className="text-xs font-bold uppercase flex items-center gap-2">
               ⚠️ Patient Blood Group Unknown
             </p>
             <p className="text-xs">
               The recipient patient's blood group is not documented in the system. You must manually check the compatibility of the blood bag against the patient's card or record at the bedside.
             </p>
             <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
               <input 
                 type="checkbox" 
                 checked={manualVerifyChecked} 
                 onChange={(e) => setManualVerifyChecked(e.target.checked)} 
                 className="rounded border-amber-300 mr-2"
               />
               I have manually verified the patient's blood group compatibility.
             </label>
           </div>
         ) : !compatibility.isCompatible ? (
           <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 space-y-2">
             <p className="text-xs font-black uppercase flex items-center gap-2">
               🚨 CRITICAL MISMATCH: INCOMPATIBLE BLOOD
             </p>
             <p className="text-xs">
               Donor Blood Group ({pint.bloodGroup}) is incompatible with Patient's documented Blood Group ({compatibility.patientBg}).
             </p>
             <p className="text-xs font-bold text-red-900 border border-red-300 bg-red-100 p-2 rounded-lg">
               Transfusion has been strictly blocked for patient safety.
             </p>
           </div>
         ) : (
           <div className="p-4 rounded-2xl border border-green-200 bg-green-50 text-green-800">
             <p className="text-xs font-bold uppercase flex items-center gap-2">
               ✓ Verified Blood Compatibility
             </p>
             <p className="text-xs">
               Pint Blood Group ({pint.bloodGroup}) is compatible with Patient Blood Group ({compatibility.patientBg}).
             </p>
           </div>
         )}

         <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
            <p className="text-[10px] text-slate-700 leading-relaxed uppercase">
              Clinical Protocol: Verify baseline vitals (T, BP, P) before starting. Watch for transfusion reactions within the first 15 minutes.
            </p>
         </div>

         <button 
           onClick={handleTransfusionStart}
           disabled={processing || !canStartTransfusion}
           className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-green-600 transition-all flex items-center justify-center gap-3 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
         >
            {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
            Authorize & Start Transfusion
         </button>
      </div>
    </div>
  );
}
