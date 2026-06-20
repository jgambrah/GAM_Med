'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, useFirebaseApp, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, where, onSnapshot, Timestamp, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import {
  Activity, Thermometer, Pill, Beaker,
  History, Plus, Clipboard, User, Loader2, Layers, FileText, Bed, Scissors, Package, Baby, Skull, Eye, FileSignature, Globe, ShieldAlert, AlertCircle, ClipboardList, CreditCard, BrainCircuit, Camera, Download,
  Award, Sparkles, Droplets, Printer, Check, ShieldCheck, QrCode, Syringe
} from 'lucide-react';
import { NewEncounterDialog } from '@/components/clinical/NewEncounterDialog';
import { CwcEncounterDialog } from '@/components/clinical/CwcEncounterDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInYears } from 'date-fns';
import { AdmissionDialog } from '@/components/clinical/AdmissionDialog';
import { DischargeDialog } from '@/components/clinical/DischargeDialog';
import { ProcedureLogDialog } from '@/components/clinical/ProcedureLogDialog';
import { MaternityEnrollmentDialog } from '@/components/clinical/MaternityEnrollmentDialog';
import VitalsTrend from '@/components/clinical/VitalsTrend';
import { QRCodeSVG } from 'qrcode.react';
import { DeathCertificationDialog } from '@/components/clinical/DeathCertificationDialog';
import { ReferralLetterDialog } from '@/components/clinical/ReferralLetterDialog';
import { parseClinicalError } from '@/lib/error-handler';
import { Button } from '@/components/ui/button';
import { type Encounter } from '@/types/encounter';
import { askClinicalAssistant, ClinicalAssistantOutput } from '@/ai/flows/ai-clinical-assistant';
import { ClinicalAssistant } from '@/components/clinical/ClinicalAssistant';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';


// THE SUB-COMPONENT FOR THE TAB
function TabButton({ label, icon, active, onClick, color = "black" }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${
        active
        ? (color === 'blue' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-white shadow-lg')
        : 'text-slate-400 hover:bg-slate-50'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function MiniVital({ label, value, unit }: any) {
  return (
    <div className="text-center">
       <p className="text-[8px] font-black text-slate-400 uppercase">{label}</p>
       <p className="text-sm font-black text-black">{value || '--'}<span className="text-[8px] ml-0.5 opacity-40">{unit}</span></p>
    </div>
  );
}

export default function PatientFolderHub() {
  const { id } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'LOCAL' | 'NETWORK' | 'BILLING'>('NETWORK');
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital } = useDoc(hospitalRef);

  const patientRef = useMemoFirebase(() =>
    firestore && hospitalId && id ? doc(firestore, 'hospitals', hospitalId, 'patients', id as string) : null,
  [firestore, hospitalId, id]);
  const { data: patient, isLoading: isPatientLoading } = useDoc(patientRef);
  
  const [isVitalsDialogOpen, setIsVitalsDialogOpen] = useState(false);
  const [isDonorCardOpen, setIsDonorCardOpen] = useState(false);
  const [isEditAllergiesOpen, setIsEditAllergiesOpen] = useState(false);

  const donorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !id) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/blood_donors`),
      where("patientId", "==", id)
    );
  }, [firestore, hospitalId, id]);
  const { data: matchedDonors } = useCollection<any>(donorsQuery);

  const admissionsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !id) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/admissions`),
      where("patientId", "==", id)
    );
  }, [firestore, hospitalId, id]);
  const { data: patientAdmissions } = useCollection<any>(admissionsQuery);

  const activeAdmission = useMemo(() => {
    if (!patientAdmissions) return null;
    return patientAdmissions.find(adm => adm.status === 'ADMITTED') || null;
  }, [patientAdmissions]);

  const [patientRounds, setPatientRounds] = useState<any[]>([]);
  const [areRoundsLoading, setAreRoundsLoading] = useState(false);

  useEffect(() => {
    if (!firestore || !hospitalId || !patientAdmissions || patientAdmissions.length === 0) {
      setPatientRounds([]);
      setAreRoundsLoading(false);
      return;
    }

    let unsubscribes: (() => void)[] = [];
    setAreRoundsLoading(true);

    const allRoundsMap: Record<string, any[]> = {};

    patientAdmissions.forEach((admission: any) => {
      const roundsRef = collection(firestore, `hospitals/${hospitalId}/admissions/${admission.id}/rounds`);
      const q = query(roundsRef, orderBy('createdAt', 'desc'));
      
      const unsub = onSnapshot(q, (snapshot) => {
        const roundsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        allRoundsMap[admission.id] = roundsData;
        
        // Flatten and sort all rounds across all admissions
        const flattenedRounds = Object.values(allRoundsMap)
          .flat()
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate()?.getTime() || 0;
            const dateB = b.createdAt?.toDate()?.getTime() || 0;
            return dateB - dateA;
          });
        
        setPatientRounds(flattenedRounds);
        setAreRoundsLoading(false);
      }, (err) => {
        console.error("Error fetching rounds for admission:", admission.id, err);
      });
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [firestore, hospitalId, patientAdmissions]);

  const donorsPhoneQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patient?.phone) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/blood_donors`),
      where("phone", "==", patient.phone)
    );
  }, [firestore, hospitalId, patient?.phone]);
  const { data: matchedPhoneDonors } = useCollection<any>(donorsPhoneQuery);

  const donorProfile = useMemo(() => {
    if (matchedDonors && matchedDonors.length > 0) return matchedDonors[0];
    if (matchedPhoneDonors && matchedPhoneDonors.length > 0) return matchedPhoneDonors[0];
    return null;
  }, [matchedDonors, matchedPhoneDonors]);

  useEffect(() => {
    if (patient?.status === 'Awaiting Vitals') {
      setIsVitalsDialogOpen(true);
    }
  }, [patient]);


  const [allEncounters, setAllEncounters] = useState<Encounter[]>([]);
  const [areEncountersLoading, setAreEncountersLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  
  const [aiInsight, setAiInsight] = useState<ClinicalAssistantOutput | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchHistory = async () => {
    if (!patient?.ghanaCardId || !firebaseApp) {
        setAreEncountersLoading(false);
        return;
    }

    setErrorState(null);
    setAreEncountersLoading(true);
    setAuthRequired(false);

    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const getHistory = httpsCallable(functions, 'getPatientHistory');

      const result: any = await getHistory({
        ghanaCardId: patient.ghanaCardId,
        patientId: patient.id,
        homeHospitalId: patient.homeHospitalId || patient.hospitalId
      });

      if (result.data.success) {
          const encountersData = result.data.data as any[];
          if (Array.isArray(encountersData)) {
            const normalizedEncounters: Encounter[] = encountersData.map((enc: any) => ({
                id: enc.id,
                createdAt: enc.createdAt?._seconds
                  ? new Timestamp(enc.createdAt._seconds, enc.createdAt._nanoseconds).toDate()
                  : new Date(),
                chiefComplaint: enc.chiefComplaint || enc.complaint || '',
                diagnosis: enc.diagnosis || enc.assessment || '',
                vitals: enc.vitals || {},
                prescription: enc.prescription || enc.medications || [],
                labOrders: enc.labOrders || [],
                radiologyOrders: enc.radiologyOrders || [],
                providerName: enc.providerName,
                providerRole: enc.providerRole,
                hospitalId: enc.hospitalId,
                type: enc.type,
                hospitalName: enc.hospitalName,
            }));
            const uniqueEncounters = normalizedEncounters.filter((enc, index, self) =>
              self.findIndex(e => e.id === enc.id) === index
            );
            setAllEncounters(uniqueEncounters);
          } else {
             throw new Error("Invalid data format received from history function.");
          }
      } else if (result.data.reason === 'PERMISSION_REQUIRED') {
        setAuthRequired(true);
        setAllEncounters([]);
        setErrorState("AUTHORIZATION_REQUIRED");
      } else {
          throw new Error(result.data.message || "An unknown error occurred while fetching patient history.");
      }
    } catch (error: any) {
      const friendlyMessage = parseClinicalError(error);
      setErrorState(friendlyMessage);
      console.error("Clinical Bridge Handshake Failed:", error);
    } finally {
      setAreEncountersLoading(false);
    }
  };

  useEffect(() => {
    if(patient?.ghanaCardId){
      fetchHistory();
    } else if (!isPatientLoading) {
      setAreEncountersLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.ghanaCardId, patient?.id, firebaseApp, isPatientLoading]);
  
  const cleanEncounters = useMemo(() => {
    if (!allEncounters) return [];
    return allEncounters
      .filter(e => e && (e.vitals || e.diagnosis || e.chiefComplaint))
      .map(e => ({
        ...e,
        vitals: {
          bp: e.vitals?.bp || null,
          temp: Number(e.vitals?.temp) || null,
          pulse: Number(e.vitals?.pulse) || null,
          respiration: Number(e.vitals?.respiration) || null,
          spo2: Number(e.vitals?.spo2) || null,
        }
      }));
  }, [allEncounters]);

  const handleGenerateInsight = async () => {
    if (!patient || allEncounters.length === 0 || !userProfile || !firestore || !user) {
        toast({
            variant: "destructive",
            title: "Cannot Generate Insight",
            description: "Not enough patient data is available to run the AI analysis.",
        });
        return;
    }

    setIsAiLoading(true);
    setAiInsight(null);
    try {
        const result = await askClinicalAssistant({
            prompt: 'Analyze this patient file.',
            patientContext: JSON.stringify(cleanEncounters.slice(0, 5)),
            userRole: userProfile.role || 'Clinician',
            fullName: userProfile.fullName || 'Doctor',
            hospitalId: userProfile.hospitalId || '',
            history: []
        });
        setAiInsight(result);

        if (result && userProfile?.hospitalId) {
            const aiAnalysisRef = doc(firestore, 'ai_analysis', id as string);
            setDocumentNonBlocking(aiAnalysisRef, {
                ...result,
                hospitalId: userProfile.hospitalId,
                patientId: id,
                generatedAt: serverTimestamp()
            }, { merge: true });

            addDocumentNonBlocking(collection(firestore, "ai_audit_logs"), {
                patientId: patient.id,
                input: JSON.stringify(cleanEncounters.slice(0, 5)),
                output: result,
                userId: user.uid,
                timestamp: serverTimestamp()
            });

            if (result.riskLevel === "Critical" || result.triage?.triageRisk === 'Critical') {
                addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/clinical_alerts`), {
                    hospitalId: hospitalId,
                    patientId: patient.id,
                    patientName: `${patient.firstName} ${patient.lastName}`,
                    encounterId: allEncounters[0].id,
                    alertType: 'CRITICAL_AI_ALERT',
                    message: `AI detected Critical Risk: ${result.summary}`,
                    severity: result.riskLevel || 'Critical',
                    status: 'UNREAD',
                    createdAt: serverTimestamp(),
                });
            }
        }
    } catch (error) {
        console.error("Error fetching AI insight:", error);
        toast({
            variant: 'destructive',
            title: 'AI Assistant Error',
            description: 'Could not generate clinical insights.'
        });
        setAiInsight(null);
    } finally {
        setIsAiLoading(false);
    }
  };


  const labResultsQuery = useMemoFirebase(() =>
    firestore && hospitalId && id ? query(
        collection(firestore, `hospitals/${hospitalId}/lab_orders`),
        where("patientId", "==", id),
        where("status", "==", "COMPLETED"),
        orderBy("completedAt", "desc")
    ) : null,
  [firestore, hospitalId, id]);
  const { data: completedLabs, isLoading: areLabsLoading } = useCollection(labResultsQuery);

  const scanResultsQuery = useMemoFirebase(() =>
    firestore && hospitalId && id ? query(
        collection(firestore, `hospitals/${hospitalId}/radiology_orders`),
        where("status", "==", "COMPLETED"),
        where("patientId", "==", id),
        orderBy("completedAt", "desc")
    ) : null,
  [firestore, hospitalId, id]);
  const { data: completedScans, isLoading: areScansLoading } = useCollection(scanResultsQuery);

  const procedureLogsQuery = useMemoFirebase(() =>
    firestore && hospitalId && id ? query(
        collection(firestore, `hospitals/${hospitalId}/procedure_logs`),
        where("patientId", "==", id),
        orderBy("createdAt", "desc")
    ) : null,
  [firestore, hospitalId, id]);
  const { data: procedureLogs, isLoading: areProceduresLoading } = useCollection(procedureLogsQuery);



  const localEncounters = useMemo(() => {
    if (!allEncounters || !hospitalId) return [];
    return allEncounters.filter(encounter => encounter.hospitalId === hospitalId);
  }, [allEncounters, hospitalId]);

  const timelineActivities = useMemo(() => {
    const allActivities = [
        ...(allEncounters || []).map((e, idx) => ({ ...e, viewType: 'ENCOUNTER', date: e.createdAt, uniqueKey: `ENCOUNTER-${e.id || idx}` })),
        ...(completedLabs || []).map((l, idx) => ({ ...l, viewType: 'LAB_RESULT', date: l.completedAt?.toDate(), uniqueKey: `LAB_RESULT-${l.id || idx}` })),
        ...(completedScans || []).map((s, idx) => ({ ...s, viewType: 'SCAN_RESULT', date: s.completedAt?.toDate(), uniqueKey: `SCAN_RESULT-${s.id || idx}` })),
        ...(procedureLogs || []).map((p, idx) => ({ ...p, viewType: 'PROCEDURE_LOG', date: p.createdAt?.toDate(), uniqueKey: `PROCEDURE_LOG-${p.id || idx}` })),
        ...(patientRounds || []).map((r, idx) => ({ ...r, viewType: 'NURSING_ROUND', date: r.createdAt?.toDate(), uniqueKey: `NURSING_ROUND-${r.id || idx}` }))
    ];

    const uniqueActivities = allActivities.filter((item, index, self) =>
      self.findIndex(i => i.uniqueKey === item.uniqueKey) === index
    );

    return uniqueActivities
        .filter(item => item.date)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [allEncounters, completedLabs, completedScans, procedureLogs, patientRounds]);

  const isLoading = isProfileLoading || isPatientLoading;
  const isTimelineLoading = areEncountersLoading || areLabsLoading || areScansLoading || areProceduresLoading || areRoundsLoading;
  const isDeceased = patient?.status === 'DECEASED';

  const latestEncounter = allEncounters && allEncounters.length > 0 ? allEncounters[0] : null;
  const isChildUnder5 = useMemo(() => {
    if (!patient?.dateOfBirth) return false;
    try {
      return differenceInYears(new Date(), new Date(patient.dateOfBirth)) < 5;
    } catch (e) {
      return false;
    }
  }, [patient?.dateOfBirth]);

  if (isLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="ml-4 italic text-muted-foreground">Opening EHR Folder...</p>
        </div>
      );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="bg-[#0f172a] text-white p-8 rounded-[40px] shadow-2xl flex flex-wrap justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-3xl font-black">
            {patient ? `${patient?.firstName?.[0]}${patient?.lastName?.[0]}` : <Loader2 className="animate-spin" />}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">{patient?.firstName} {patient?.lastName}</h1>
            <div className="flex flex-wrap gap-4 mt-1.5 items-center">
              <span className="text-primary-foreground/70 font-bold text-xs uppercase tracking-widest">EHR: {patient?.ehrNumber}</span>
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">DOB: {patient?.dateOfBirth}</span>
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Ghana Card: {patient?.ghanaCardId || 'N/A'}</span>
              {patient?.allergies && patient.allergies !== 'NKDA' && patient.allergies !== 'NKDA / No Known Drug Allergies' ? (
                <span className="bg-red-600/30 text-red-300 border border-red-500/40 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={10} className="text-red-400 animate-pulse" />
                  ALLERGIES: {patient.allergies}
                </span>
              ) : (
                <span className="bg-green-600/10 text-green-300 border border-green-500/20 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Check size={10} className="text-green-400" />
                  NKDA
                </span>
              )}
              {donorProfile && (
                <button
                  onClick={() => setIsDonorCardOpen(true)}
                  className="bg-red-600/30 text-red-300 border border-red-500/40 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-red-600/45 transition-all outline-none"
                >
                  <Droplets size={10} className="fill-red-400 animate-pulse" />
                  Voluntary Donor: {donorProfile.donorTier}
                </button>
              )}
              {activeAdmission && (
                <span className="bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                  <Bed size={10} className="text-indigo-400" />
                  ADMITTED: {activeAdmission.wardName || activeAdmission.wardId} — {activeAdmission.bedName || activeAdmission.bedId}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
           {!isDeceased && patient && hospitalId && <NewEncounterDialog 
                open={isVitalsDialogOpen}
                onOpenChange={setIsVitalsDialogOpen}
                onSuccess={() => {
                    fetchHistory();
                    setIsVitalsDialogOpen(false);
                }}
                patientId={id as string} 
                hospitalId={hospitalId} 
                patientName={`${patient?.firstName} ${patient?.lastName}`} 
                encounterId={patient?.activeEncounterId}
            />}
           {!isDeceased && patient && hospitalId && (
             activeAdmission ? (
               <DischargeDialog admission={activeAdmission} />
             ) : (
               <AdmissionDialog patientId={id as string} hospitalId={hospitalId} patientName={`${patient?.firstName} ${patient?.lastName}`} />
             )
           )}
           {!isDeceased && patient && hospitalId && isChildUnder5 && (
             <CwcEncounterDialog
               patientId={id as string}
               hospitalId={hospitalId}
               patientName={`${patient?.firstName} ${patient?.lastName}`}
               onSuccess={fetchHistory}
             />
           )}
           {!isDeceased && patient && hospitalId && <ProcedureLogDialog patientId={id as string} hospitalId={hospitalId} patientName={`${patient?.firstName} ${patient?.lastName}`} />}
           {!isDeceased && patient && hospitalId && <MaternityEnrollmentDialog patientId={id as string} hospitalId={hospitalId} patientName={`${patient?.firstName} ${patient?.lastName}`} />}
           {!isDeceased && patient && latestEncounter && <ReferralLetterDialog patient={patient} latestEncounter={latestEncounter} />}
           {!isDeceased && patient && <DeathCertificationDialog patient={patient} />}
        </div>
      </div>
      
       {isDeceased && (
            <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center gap-4 my-4">
                <Skull size={24} />
                <div>
                    <h4 className="font-bold">Record Locked</h4>
                    <p className="text-xs">This patient is deceased. The record is now read-only.</p>
                </div>
            </div>
        )}

      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-6 rounded-[32px] space-y-3">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xs font-black uppercase text-blue-300">
                        Gemini AI Clinical Doctor
                    </h2>
                    <p className="text-xs text-red-500 font-bold mt-1">AI-GENERATED (NOT A MEDICAL DIAGNOSIS)</p>
                </div>
                 {aiInsight?.triage && (
                    <div className={`px-4 py-2 rounded-xl font-black text-white text-xs ${
                        aiInsight.triage.triageRisk === "Critical" ? "bg-red-600" :
                        aiInsight.triage.triageRisk === "High" ? "bg-orange-500" :
                        aiInsight.triage.triageRisk === "Medium" ? "bg-yellow-500" :
                        "bg-green-600"
                    }`}>
                        NEWS2: {aiInsight.triage.news2Score} ({aiInsight.triage.triageRisk})
                    </div>
                )}
            </div>
            {isAiLoading ? (
                <div className="flex items-center justify-center p-10">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
                    <span className="ml-4 text-slate-300 italic">Gemini is analyzing the file...</span>
                </div>
            ) : aiInsight ? (
                <>
                    <p className="text-sm whitespace-pre-line">
                        {aiInsight.summary}
                    </p>

                    <div className="text-sm">
                        <strong>Risk Level:</strong> {aiInsight.riskLevel}
                    </div>
                    
                    <div className="text-sm">
                        <strong>Possible Conditions:</strong> {(aiInsight.possibleConditions || []).join(', ')}
                    </div>

                    <div>
                        <strong>Key Findings:</strong>
                        <ul className="list-disc ml-5 text-sm">
                        {(aiInsight.keyFindings || []).map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                        ))}
                        </ul>
                    </div>

                    <div>
                        <strong>Concerns:</strong>
                        <ul className="list-disc ml-5 text-sm">
                        {(aiInsight.concerns || []).map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                        ))}
                        </ul>
                    </div>
                    
                    <div>
                        <strong>Recommendations:</strong>
                        <ul className="list-disc ml-5 text-sm">
                        {(aiInsight.recommendations || []).map((r: string, i: number) => (
                            <li key={i}>{r}</li>
                        ))}
                        </ul>
                    </div>
                </>
            ) : (
                 <div className="text-center py-6">
                    <Button onClick={handleGenerateInsight} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg">
                        <BrainCircuit className="mr-2 h-5 w-5" />
                        Generate AI Clinical Summary
                    </Button>
                    <p className="text-xs text-slate-400 mt-3">Analyzes the latest 5 encounters for risks & insights. This will make an API call.</p>
                </div>
            )}
        </div>


      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-[30px] border shadow-sm sticky top-4 z-20">
         <TabButton
           active={activeTab === 'SUMMARY'}
           onClick={() => setActiveTab('SUMMARY')}
           label="Vital Snapshot"
           icon={<Activity size={16}/>}
         />
         <TabButton
           active={activeTab === 'LOCAL'}
           onClick={() => setActiveTab('LOCAL')}
           label="Hospital History"
           icon={<History size={16}/>}
         />
         <TabButton
           active={activeTab === 'NETWORK'}
           onClick={() => setActiveTab('NETWORK')}
           label="Longitudinal Network"
           icon={<Globe size={16}/>}
           color="blue"
         />
         <TabButton
           active={activeTab === 'BILLING'}
           onClick={() => setActiveTab('BILLING')}
           label="Patient Ledger"
           icon={<CreditCard size={16}/>}
         />
      </div>

      <div className="animate-in fade-in duration-500 pt-4">
        {activeTab === 'SUMMARY' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {donorProfile && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-100 rounded-[32px] p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm text-black">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-600 text-white rounded-2xl">
                       <Award size={24} className="fill-red-200 animate-pulse" />
                    </div>
                    <div>
                       <h4 className="text-sm font-black uppercase tracking-tight text-slate-800">Active Blood Donor Privileges</h4>
                       <p className="text-xs text-slate-500 font-semibold mt-0.5">Tier Rank: <strong className="text-red-600">{donorProfile.donorTier}</strong> • {donorProfile.donationCount || 0} Cumulative Donations</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="text-right text-xs">
                       <span className="bg-green-100 text-green-700 font-black px-3 py-1.5 rounded-lg uppercase tracking-wider text-[9px] border border-green-200">
                          {donorProfile.donorTier === 'PLATINUM' ? '100% processing waiver' : donorProfile.donorTier === 'GOLD' ? '50% processing waiver & replacement exempt' : donorProfile.donorTier === 'SILVER' ? '15% processing waiver' : 'Health report & priority lane'}
                       </span>
                    </div>
                    <Button 
                       onClick={() => setIsDonorCardOpen(true)}
                       variant="outline" 
                       size="sm" 
                       className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold uppercase"
                    >
                       View Card
                    </Button>
                 </div>
              </div>
            )}
            <div className="flex items-center gap-2 px-2">
               <Activity className="text-blue-600" size={18} />
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Current Vital Snapshot</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <VitalDisplay 
                label="Blood Pressure" 
                value={patient?.lastVitals?.bp || "0/0"} 
                unit="mmHg" 
                color="text-red-600" 
              />
              <VitalDisplay 
                label="Body Temp" 
                value={patient?.lastVitals?.temp || "0"} 
                unit="°C" 
                color="text-orange-600" 
              />
              <VitalDisplay 
                label="Pulse Rate" 
                value={patient?.lastVitals?.pulse || "0"} 
                unit="bpm" 
                color="text-blue-600" 
              />
              <VitalDisplay 
                label="Respiration" 
                value={patient?.lastVitals?.respiration || "0"} 
                unit="bpm" 
                color="text-purple-600" 
              />
              <VitalDisplay 
                label="Oxygen (SpO2)" 
                value={patient?.lastVitals?.spo2 || "0"} 
                unit="%" 
                color={Number(patient?.lastVitals?.spo2) < 90 ? "text-red-500" : "text-green-600"} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
               <div className="bg-white p-6 rounded-[32px] border shadow-sm flex justify-between items-center">
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight & Height</p>
                     <p className="text-lg font-black text-black mt-1">
                        {patient?.lastVitals?.weight || "N/A"} kg / {patient?.lastVitals?.height || "N/A"} cm
                     </p>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated BMI</p>
                     <p className={`text-2xl font-black italic ${Number(patient?.lastVitals?.bmi) > 30 ? 'text-red-600' : 'text-blue-600'}`}>
                        {patient?.lastVitals?.bmi || "0.0"}
                     </p>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-[32px] border shadow-sm flex flex-col justify-between h-full text-black">
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allergies &amp; Drug Sensitivities</p>
                     <div className="mt-3">
                        {patient?.allergies && patient.allergies !== 'NKDA' && patient.allergies !== 'NKDA / No Known Drug Allergies' ? (
                           <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-2xl flex items-center gap-2">
                              <ShieldAlert size={16} className="text-red-600 shrink-0" />
                              <span className="font-black text-[11px] uppercase tracking-tight break-all truncate" title={patient.allergies}>{patient.allergies}</span>
                           </div>
                        ) : (
                           <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-2.5 rounded-2xl flex items-center gap-2">
                              <Check size={16} className="text-green-600 shrink-0" />
                              <span className="font-black text-[11px] uppercase tracking-tight">No Known Drug Allergies (NKDA)</span>
                           </div>
                        )}
                     </div>
                  </div>
                  <div className="pt-3 border-t mt-4 flex justify-between items-center">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Clinical Safety</span>
                     <Button 
                        onClick={() => setIsEditAllergiesOpen(true)}
                        variant="outline" 
                        size="sm" 
                        className="border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase h-8"
                     >
                        Update
                     </Button>
                  </div>
               </div>

               <VitalsTrend data={allEncounters} />
            </div>
          </div>
        )}

        {activeTab === 'LOCAL' && (
           <div className="space-y-6">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-2">Records from {userProfile?.hospitalName}</h3>
              {localEncounters?.map((encounter: any) => (
                <div key={encounter.id} className="bg-white p-6 rounded-[32px] border shadow-sm space-y-3 hover:border-primary/20 transition-all border-l-8 border-l-slate-900 text-black">
                    <div>
                        <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Diagnosis</p>
                        <p className="font-black uppercase text-sm text-black">{encounter.diagnosis || 'General Review'}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Chief Complaint</p>
                        <p className="text-xs text-slate-600 italic">"{encounter.chiefComplaint || 'N/A'}"</p>
                    </div>
                    {encounter.hpi && (
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">History of Present Illness (HPI)</p>
                            <p className="text-xs text-slate-700">{encounter.hpi}</p>
                        </div>
                    )}
                </div>
              ))}
              {(!localEncounters || localEncounters.length === 0) && <p className="text-muted-foreground italic">No local encounters found.</p>}
           </div>
        )}

        {activeTab === 'NETWORK' && (
            <div className="space-y-6">
                <div className="bg-blue-600 p-8 rounded-[40px] text-white shadow-xl flex items-center gap-6 border-b-8 border-blue-900">
                    <Globe className="animate-pulse" size={40} />
                    <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Unified <span className="text-blue-200 italic">Longitudinal Record</span></h2>
                    <p className="text-[10px] font-bold uppercase opacity-70">Sourced from the GamMed National Grid</p>
                    </div>
                </div>

                {isTimelineLoading ? (
                    <div className="p-10 text-center"><Loader2 className="animate-spin" /></div>
                ) : authRequired ? (
                    <div className="bg-amber-100 border-2 border-dashed border-amber-200 p-10 rounded-[40px] text-center">
                        <ShieldAlert size={48} className="mx-auto text-amber-500 mb-4" />
                        <h3 className="text-xl font-black uppercase text-amber-900">Inter-Hospital Access Restricted</h3>
                        <p className="text-sm text-amber-700 mt-2">
                            To see this patient's history from other facilities, the patient must log into
                            <strong> MyGamMed</strong> and authorize <strong>{userProfile?.hospitalName}</strong>.
                        </p>
                    </div>
                ) : (
                    timelineActivities.map((activity: any) => {
                      if (activity.viewType === 'ENCOUNTER') {
                        const isCwc = activity.encounterType === 'Child Welfare (CWC) Checkup' || activity.type === 'Child Welfare (CWC) Checkup';
                        if (isCwc) {
                          return (
                            <div key={activity.uniqueKey} className="bg-white p-8 rounded-[40px] border-4 border-sky-600 shadow-[12px_12px_0px_0px_rgba(14,165,233,0.05)] space-y-8 mb-8 text-black">
                              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
                                 <div>
                                    <span className="text-[10px] font-black bg-sky-600 text-white px-4 py-1.5 rounded-full uppercase tracking-widest italic flex items-center gap-1.5 w-fit">
                                       <Baby size={12} /> {activity.type || 'Child Welfare Checkup'}
                                    </span>
                                    <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-tighter">
                                       {activity.hospitalName} • Logged by: {activity.providerName} ({activity.providerRole})
                                    </p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-900 uppercase">
                                       {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                    </p>
                                    <p className="text-[10px] font-bold text-sky-600 uppercase mt-1">
                                       {activity.createdAt ? new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </p>
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-sky-50/50 p-6 rounded-[32px] border border-sky-100">
                                 <MiniVital label="Weight" value={activity.vitals?.weight} unit="kg" />
                                 <MiniVital label="Length" value={activity.vitals?.height} unit="cm" />
                                 <MiniVital label="Head Circ." value={activity.vitals?.headCircumference} unit="cm" />
                                 <MiniVital label="MUAC" value={activity.vitals?.muac} unit="cm" />
                                 <MiniVital label="Feeding" value={activity.vitals?.feedingMethod} unit="" />
                              </div>

                              {activity.cwcData && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {activity.cwcData.vaccinesAdministered && activity.cwcData.vaccinesAdministered.length > 0 && (
                                    <div className="space-y-2 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                      <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-1">
                                        <Syringe size={10} className="text-sky-500" /> Immunizations Administered
                                      </p>
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        {activity.cwcData.vaccinesAdministered.map((v: string) => (
                                          <span key={v} className="bg-sky-100 text-sky-800 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-sky-200">
                                            {v}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {activity.cwcData.milestonesObserved && activity.cwcData.milestonesObserved.length > 0 && (
                                    <div className="space-y-2 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                                        <Sparkles size={10} className="text-indigo-500" /> Milestones Observed
                                      </p>
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        {activity.cwcData.milestonesObserved.map((m: string) => (
                                          <span key={m} className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase px-2.5 py-1 rounded-full border border-indigo-200">
                                            {m}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-slate-300 pl-3">Developmental Remarks</p>
                                  <p className="text-xs font-semibold text-slate-800 leading-relaxed italic">
                                     "{activity.diagnosis || 'No remarks recorded.'}"
                                  </p>
                                </div>
                                {activity.cwcData?.nextCwcDate && (
                                  <div className="bg-amber-50 text-amber-900 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
                                     <Activity size={16} className="text-amber-600 animate-pulse" />
                                     <div>
                                        <p className="text-[9px] font-black uppercase text-amber-700">Next Scheduled CWC Visit</p>
                                        <p className="text-xs font-black uppercase mt-0.5">
                                          {new Date(activity.cwcData.nextCwcDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                     </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={activity.uniqueKey} className="bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(15,23,42,0.05)] space-y-8 mb-8">
                            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
                               <div>
                                  <span className="text-[10px] font-black bg-blue-600 text-white px-4 py-1.5 rounded-full uppercase tracking-widest italic">
                                     {activity.type || 'Consultation'}
                                  </span>
                                  <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-tighter">
                                     {activity.hospitalName} • Dr. {activity.providerName} ({activity.providerRole})
                                  </p>
                               </div>
                               <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-900 uppercase">
                                     {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                  </p>
                                  <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">
                                     {activity.createdAt ? new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </p>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-slate-50 p-6 rounded-[32px]">
                               <MiniVital label="BP" value={activity.vitals?.bp} unit="mmHg" />
                               <MiniVital label="Temp" value={activity.vitals?.temp} unit="°C" />
                               <MiniVital label="Pulse" value={activity.vitals?.pulse} unit="bpm" />
                               <MiniVital label="Resp" value={activity.vitals?.respiration} unit="bpm" />
                               <MiniVital label="BMI" value={activity.vitals?.bmi} unit="" />
                               <MiniVital label="Weight" value={activity.vitals?.weight} unit="kg" />
                            </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-black">
                                <div className="space-y-4">
                                   <div className="space-y-1">
                                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Chief Complaint</p>
                                      <p className="text-sm font-medium text-slate-800 leading-relaxed italic">
                                         "{activity.chiefComplaint || 'No subjective complaints recorded.'}"
                                      </p>
                                   </div>
                                   {activity.hpi && (
                                      <div className="space-y-1">
                                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-4 border-slate-500 pl-3">History of Present Illness (HPI)</p>
                                         <p className="text-xs font-medium text-slate-700 leading-relaxed">
                                            {activity.hpi}
                                         </p>
                                      </div>
                                   )}
                                </div>
                                <div className="space-y-2">
                                   <p className="text-[9px] font-black text-red-600 uppercase tracking-widest border-l-4 border-red-600 pl-3">Provisional Diagnosis</p>
                                   <p className="text-lg font-black text-black uppercase tracking-tight">
                                      {activity.diagnosis || 'Pending Review'}
                                   </p>
                                </div>
                             </div>

                            {(activity.labOrders?.length > 0 || activity.radiologyOrders?.length > 0) && (
                              <div className="space-y-4">
                                 <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Diagnostic Requests</p>
                                 <div className="flex flex-wrap gap-3">
                                    {activity.labOrders?.map((lab: any, i: number) => (
                                       <div key={i} className="bg-purple-50 text-purple-700 px-4 py-2 rounded-2xl border border-purple-100 flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-purple-400" />
                                          <span className="text-[11px] font-black uppercase">{lab.name || lab.testName}</span>
                                       </div>
                                    ))}
                                    {activity.radiologyOrders?.map((scan: any, i: number) => (
                                       <div key={i} className="bg-orange-50 text-orange-700 px-4 py-2 rounded-2xl border border-orange-100 flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-orange-400" />
                                          <span className="text-[11px] font-black uppercase">{scan.name}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                            )}

                            {activity.prescription?.length > 0 && (
                              <div className="bg-[#0f172a] p-6 rounded-[32px] text-white">
                                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4">Treatment Plan / RX</p>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {activity.prescription.map((rx: any, idx: number) => (
                                       <div key={idx} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                          <p className="text-xs font-black uppercase text-white">{rx.name}</p>
                                          <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase italic">{rx.dosage} • {rx.frequency}</p>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (activity.viewType === 'LAB_RESULT') {
                        const isCritical = activity.isAbnormal || false;
                        return (
                          <div key={activity.uniqueKey} className={`p-8 rounded-[40px] border-4 shadow-[12px_12px_0px_0px_rgba(15,23,42,0.05)] space-y-6 mb-8 bg-white ${isCritical ? 'border-red-600' : 'border-purple-600'}`}>
                            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
                               <div>
                                  <span className={`text-[10px] font-black text-white px-4 py-1.5 rounded-full uppercase tracking-widest italic ${isCritical ? 'bg-red-600 animate-pulse' : 'bg-purple-600'}`}>
                                     {isCritical ? 'Critical Lab Result' : 'Lab Result Release'}
                                  </span>
                                  <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-tighter">
                                     Tested at: {activity.hospitalName || userProfile?.hospitalName} • Tech: {activity.labTechName || 'Unknown Tech'}
                                  </p>
                               </div>
                               <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-900 uppercase">
                                     {activity.date ? new Date(activity.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                  </p>
                                  <p className={`text-[10px] font-bold uppercase mt-1 ${isCritical ? 'text-red-600' : 'text-purple-600'}`}>
                                     {activity.date ? new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </p>
                               </div>
                            </div>

                             {activity.parameters && activity.parameters.length > 0 ? (
                               <div className="bg-slate-50 p-6 rounded-[32px] overflow-x-auto border border-slate-100">
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Panel Result Details</p>
                                 <table className="w-full text-left text-xs font-bold text-slate-700 border-collapse">
                                   <thead>
                                     <tr className="border-b border-slate-200 text-[9px] text-slate-400 uppercase tracking-wider">
                                       <th className="pb-2">Parameter</th>
                                       <th className="pb-2 text-center">Value</th>
                                       <th className="pb-2 text-right">Reference Range</th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                     {activity.parameters.map((p: any, idx: number) => (
                                       <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-200/30">
                                         <td className="py-2.5 text-slate-800 font-black uppercase text-[11px]">{p.name}</td>
                                         <td className="py-2.5 text-center">
                                           <span className={p.isAbnormal ? "text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full font-black text-[11px] inline-block" : "text-purple-700 font-black"}>
                                             {p.value} <span className="text-[10px] font-semibold text-slate-400">{p.unit}</span>
                                           </span>
                                           {p.isAbnormal && <span className="ml-1 text-[8px] font-black text-red-500 uppercase animate-pulse">ABN</span>}
                                         </td>
                                         <td className="py-2.5 text-right font-mono text-slate-500 text-[11px]">{p.referenceRange || 'N/A'} {p.unit}</td>
                                       </tr>
                                     ))}
                                   </tbody>
                                 </table>
                               </div>
                             ) : (
                               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50 p-6 rounded-[32px]">
                                  <div>
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Test Parameter</p>
                                     <p className="text-sm font-black text-black uppercase tracking-tight mt-1">{activity.testName}</p>
                                   </div>
                                   <div className="text-left md:text-right">
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Measured Value</p>
                                     <p className={`text-2xl font-black italic tracking-tighter mt-1 ${isCritical ? 'text-red-600' : 'text-purple-600'}`}>
                                        {activity.resultValue} <span className="text-[10px] text-slate-400 not-italic font-bold">{activity.unit}</span>
                                     </p>
                                   </div>
                                   <div className="text-left md:text-right bg-white px-4 py-2 rounded-xl border border-slate-100">
                                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Reference Range</p>
                                     <p className="text-xs font-bold text-slate-700 mt-0.5">{activity.referenceRange || 'N/A'} {activity.unit}</p>
                                   </div>
                               </div>
                             )}

                            {activity.remarks && (
                               <div className="space-y-2">
                                  <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest border-l-4 border-purple-600 pl-3">Lab Tech Remarks</p>
                                  <p className="text-sm font-medium text-slate-800 leading-relaxed italic">
                                     "{activity.remarks}"
                                  </p>
                               </div>
                            )}

                            {activity.reportUrl && (
                               <div className="pt-2">
                                  <a href={activity.reportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 px-4 py-2.5 rounded-2xl border border-purple-200 text-xs font-black uppercase tracking-wider transition-all">
                                     <Download size={14} /> Download Digital Report File
                                  </a>
                               </div>
                            )}
                          </div>
                        );
                      }

                      if (activity.viewType === 'SCAN_RESULT') {
                        const isCritical = activity.isCritical || false;
                        return (
                          <div key={activity.uniqueKey} className={`p-8 rounded-[40px] border-4 shadow-[12px_12px_0px_0px_rgba(15,23,42,0.05)] space-y-6 mb-8 bg-white transition-all ${isCritical ? 'border-red-600 ring-4 ring-red-100/50' : 'border-orange-600'}`}>
                            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
                               <div>
                                  <span className={`text-[10px] font-black text-white px-4 py-1.5 rounded-full uppercase tracking-widest italic ${isCritical ? 'bg-red-600 animate-pulse' : 'bg-orange-600'}`}>
                                     {isCritical ? '⚠️ CRITICAL IMAGING REPORT' : 'Imaging Scan Report'}
                                  </span>
                                  <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-tighter">
                                     Acquired at: {activity.hospitalName || userProfile?.hospitalName} • Radiologist: {activity.radiologistName || 'Unknown Clinician'}
                                  </p>
                               </div>
                               <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-900 uppercase">
                                     {activity.date ? new Date(activity.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                  </p>
                                  <p className={`text-[10px] font-bold uppercase mt-1 ${isCritical ? 'text-red-600' : 'text-orange-600'}`}>
                                     {activity.date ? new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </p>
                               </div>
                            </div>

                            {isCritical && (
                               <div className="bg-red-50 border-2 border-red-200 text-red-900 p-4 rounded-2xl flex items-center gap-3">
                                  <AlertCircle className="text-red-600 animate-pulse shrink-0" size={20} />
                                  <div>
                                     <p className="text-xs font-black uppercase">Critical Pathology Alert</p>
                                     <p className="text-[10px] font-bold text-red-700 leading-normal">
                                        The radiologist has flagged this scan with critical findings. Please review the clinical impression and findings immediately.
                                     </p>
                                  </div>
                               </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[32px]">
                               <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Scan Request</p>
                                  <p className="text-lg font-black text-black uppercase tracking-tight mt-1">{activity.scanName || activity.name}</p>
                               </div>
                               {activity.indication && (
                                  <div>
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Clinical Indication</p>
                                     <p className="text-xs font-bold text-slate-700 mt-1 uppercase italic">{activity.indication}</p>
                                  </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                               <div className="space-y-6">
                                  <div className="space-y-2">
                                     <p className={`text-[9px] font-black uppercase tracking-widest border-l-4 pl-3 ${isCritical ? 'text-red-600 border-red-600' : 'text-orange-600 border-orange-600'}`}>Clinical Impression (Conclusion)</p>
                                     <p className={`text-sm font-black uppercase tracking-tight ${isCritical ? 'text-red-700' : 'text-slate-900'}`}>
                                        {activity.impression}
                                     </p>
                                  </div>
                                  <div className="space-y-2">
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-slate-300 pl-3">Detailed Findings</p>
                                     <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-line">
                                        {activity.findings}
                                     </p>
                                  </div>
                               </div>

                               {activity.imageUrl && (
                                  <div className="space-y-2">
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Clinical Scan Image</p>
                                     <div className="relative rounded-[28px] overflow-hidden border-4 border-slate-900 bg-slate-950 aspect-video group">
                                        <img src={activity.imageUrl} alt={activity.scanName} className="object-cover w-full h-full" />
                                        <a href={activity.imageUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white font-black text-xs uppercase tracking-widest transition-all">
                                           <Camera size={16} /> Open Full Image
                                        </a>
                                     </div>
                                  </div>
                               )}
                            </div>
                          </div>
                        );
                      }

                      if (activity.viewType === 'PROCEDURE_LOG') {
                        return (
                          <div key={activity.uniqueKey} className="p-8 rounded-[40px] border-4 border-slate-400 shadow-[12px_12px_0px_0px_rgba(15,23,42,0.05)] space-y-6 mb-8 bg-white">
                            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
                               <div>
                                  <span className="text-[10px] font-black bg-slate-400 text-white px-4 py-1.5 rounded-full uppercase tracking-widest italic">
                                     Surgical / Clinical Procedure
                                  </span>
                                  <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-tighter">
                                     Performed by: Dr. {activity.doctorName || 'Unknown Doctor'}
                                  </p>
                               </div>
                               <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-900 uppercase">
                                     {activity.date ? new Date(activity.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                                     {activity.date ? new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </p>
                               </div>
                            </div>

                            <div className="space-y-4">
                               <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Procedure Name</p>
                                  <p className="text-lg font-black text-black uppercase tracking-tight mt-1">{activity.procedureName}</p>
                                </div>
                               <div className="space-y-2">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-slate-300 pl-3">Procedure Notes</p>
                                  <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-line">
                                     {activity.notes}
                                  </p>
                                </div>
                            </div>
                          </div>
                        );
                      }

                      if (activity.viewType === 'NURSING_ROUND') {
                        return (
                          <div key={activity.uniqueKey} className="p-8 rounded-[40px] border-4 border-indigo-600 shadow-[12px_12px_0px_0px_rgba(99,102,241,0.05)] space-y-6 mb-8 bg-white text-black">
                            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
                               <div>
                                  <span className="text-[10px] font-black bg-indigo-600 text-white px-4 py-1.5 rounded-full uppercase tracking-widest italic flex items-center gap-1 w-fit">
                                     <ClipboardList size={12}/> Inpatient Round Notes
                                  </span>
                                  <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-tighter">
                                     Logged by Nurse: {activity.nurseName || 'System'}
                                  </p>
                               </div>
                               <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-900 uppercase">
                                     {activity.date ? new Date(activity.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                  </p>
                                  <p className="text-[10px] font-bold text-indigo-600 uppercase mt-1">
                                     {activity.date ? new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </p>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 p-6 rounded-[32px]">
                               <MiniVital label="BP" value={activity.vitals?.bp} unit="mmHg" />
                               <MiniVital label="Temp" value={activity.vitals?.temp} unit="°C" />
                               <MiniVital label="Pulse" value={activity.vitals?.pulse} unit="bpm" />
                               <MiniVital label="Resp" value={activity.vitals?.respiration} unit="bpm" />
                               <MiniVital label="SPO2" value={activity.vitals?.spo2} unit="%" />
                            </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-black">
                                <div className="space-y-4">
                                   <div className="space-y-1">
                                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">Nursing Progress Notes</p>
                                      <p className="text-xs font-medium text-slate-700 leading-relaxed italic">
                                         "{activity.nursingNotes || 'No progress notes recorded.'}"
                                      </p>
                                   </div>
                                </div>
                                {activity.medicationsAdministered && (
                                  <div className="space-y-2">
                                     <p className="text-[9px] font-black text-red-600 uppercase tracking-widest border-l-4 border-red-600 pl-3">Medications Administered</p>
                                     <p className="text-xs font-bold text-slate-800 leading-relaxed">
                                        {activity.medicationsAdministered}
                                     </p>
                                  </div>
                                )}
                             </div>
                          </div>
                        );
                      }

                      return null;
                    })
                )}
            </div>
        )}

        {activeTab === 'BILLING' && (
           <div className="bg-white p-8 rounded-[40px] border shadow-sm">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6">Financial Statement</h3>
              <div className="p-10 text-center text-slate-300 italic">Billing ledger view coming soon.</div>
           </div>
        )}
      </div>
      {donorProfile && (
        <DigitalDonorCardDialog
          donor={donorProfile}
          hospital={hospital}
          open={isDonorCardOpen}
          onOpenChange={setIsDonorCardOpen}
        />
      )}
      <EditAllergiesDialog
        patient={patient}
        patientRef={patientRef}
        open={isEditAllergiesOpen}
        onOpenChange={setIsEditAllergiesOpen}
      />
    </div>
  );
}

function EditAllergiesDialog({ patient, patientRef, open, onOpenChange }: any) {
  const [allergiesText, setAllergiesText] = useState(patient?.allergies || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (patient) {
      setAllergiesText(patient.allergies || '');
    }
  }, [patient, open]);

  const saveAllergies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientRef) return;
    setSaving(true);
    try {
      await updateDoc(patientRef, {
        allergies: allergiesText.trim() || 'NKDA'
      });
      toast({ title: "Allergies Updated", description: "The patient's clinical file has been updated successfully." });
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Update Failed", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white rounded-3xl p-6 text-black">
        <form onSubmit={saveAllergies} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-slate-900 flex items-center gap-2">
              <ShieldAlert className="text-red-500" /> Update Allergies &amp; Risks
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documented Drug Allergies</label>
            <textarea
              placeholder="e.g. Penicillin, Sulfa drugs, Peanuts. Enter NKDA if none."
              className="w-full p-4 border rounded-2xl bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-primary text-sm"
              value={allergiesText}
              onChange={e => setAllergiesText(e.target.value)}
              rows={4}
            />
            <p className="text-[9px] text-slate-400 font-bold uppercase leading-normal px-1">
              Warning: Documented allergies are displayed in red alerts across clinical stations and nursing desks.
            </p>
          </div>

          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-3xl">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl uppercase font-bold text-xs">Cancel</Button>
            <Button type="submit" disabled={saving} className="rounded-xl uppercase font-black text-xs tracking-widest">
              {saving ? <Loader2 className="animate-spin" /> : "Save & Synchronize"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function VitalDisplay({ label, value, unit, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[32px] border-2 border-slate-50 shadow-sm flex flex-col items-center justify-center text-center hover:border-blue-200 transition-all">
       <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2">{label}</p>
       <p className={`text-2xl font-black italic tracking-tighter ${color}`}>
          {value} <span className="text-[10px] text-slate-300 not-italic font-bold">{unit}</span>
       </p>
    </div>
  );
}

// Digital Blood Donor Privilege Card Component
function DigitalDonorCardDialog({ donor, hospital, open, onOpenChange }: { donor: any; hospital: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const donationCount = donor.donationCount || 0;
  const activeTier = donor.donorTier || 'BRONZE';

  // Compute next tier thresholds
  const tierConfig = useMemo(() => {
    switch (activeTier) {
      case 'PLATINUM':
        return { nextTier: 'MAX', target: donationCount, progress: 100, remaining: 0 };
      case 'GOLD':
        return { nextTier: 'PLATINUM', target: 20, progress: Math.min((donationCount / 20) * 100, 100), remaining: Math.max(20 - donationCount, 0) };
      case 'SILVER':
        return { nextTier: 'GOLD', target: 10, progress: Math.min((donationCount / 10) * 100, 100), remaining: Math.max(10 - donationCount, 0) };
      case 'BRONZE':
      default:
        return { nextTier: 'SILVER', target: 5, progress: Math.min((donationCount / 5) * 100, 100), remaining: Math.max(5 - donationCount, 0) };
    }
  }, [activeTier, donationCount]);

  const privileges = useMemo(() => {
    const bronzeList = (hospital?.bloodDonorBronzeBenefit || "Verified donor health screening reports & analytics;Priority queuing at blood bank and laboratory desks").split(';').filter(Boolean);
    const silverList = (hospital?.bloodDonorSilverBenefit || "15% discount waiver on standard blood processing fees;Priority queuing at blood bank and laboratory desks").split(';').filter(Boolean);
    const goldList = (hospital?.bloodDonorGoldBenefit || "50% discount waiver on standard blood processing fees;Exemption from family replacement donation requirements").split(';').filter(Boolean);
    const platinumList = (hospital?.bloodDonorPlatinumBenefit || "100% full processing fee waiver for donor and immediate family;Direct VIP billing desk priority").split(';').filter(Boolean);

    return [
      ...bronzeList.map((text: string) => ({ text, tier: 'BRONZE' })),
      ...silverList.map((text: string) => ({ text, tier: 'SILVER' })),
      ...goldList.map((text: string) => ({ text, tier: 'GOLD' })),
      ...platinumList.map((text: string) => ({ text, tier: 'PLATINUM' })),
    ];
  }, [hospital]);

  const hasAccess = (privilegeTier: string) => {
    const ranks: Record<string, number> = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4 };
    return ranks[activeTier] >= ranks[privilegeTier];
  };

  const printCard = () => {
    const printContent = document.getElementById('digital-blood-donor-card');
    if (!printContent) return;
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const printWindow = window.open(windowUrl, uniqueName.toString(), 'left=50,top=50,width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Blood Donor Card - ${donor.fullName}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #fff;
              }
              .print-container {
                border: 4px solid #dc2626;
                border-radius: 24px;
                width: 450px;
                height: 260px;
                padding: 24px;
                box-sizing: border-box;
                background: linear-gradient(135deg, #7f1d1d 0%, #1e293b 100%);
                color: white;
                position: relative;
                overflow: hidden;
              }
              .header {
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-bottom: 2px;
              }
              .subheader {
                font-size: 9px;
                color: #fbbf24;
                font-weight: 800;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                margin-bottom: 20px;
              }
              .name {
                font-size: 20px;
                font-weight: 900;
                text-transform: uppercase;
                margin: 0 0 6px 0;
                font-style: italic;
              }
              .info {
                font-size: 10px;
                font-family: monospace;
                color: #cbd5e1;
                margin: 2px 0;
              }
              .blood-group-container {
                position: absolute;
                right: 24px;
                top: 24px;
                border: 2px solid rgba(255,255,255,0.2);
                border-radius: 16px;
                background: rgba(255,255,255,0.1);
                width: 80px;
                height: 96px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .blood-group {
                font-size: 26px;
                font-weight: 900;
                font-style: italic;
              }
              .badge {
                position: absolute;
                right: 24px;
                bottom: 24px;
                font-size: 9px;
                font-weight: 900;
                padding: 6px 12px;
                border-radius: 8px;
                text-transform: uppercase;
                border: 2px solid;
              }
              .PLATINUM { border-color: #e9d5ff; background: rgba(168,85,247,0.2); color: #f3e8ff; }
              .GOLD { border-color: #fde047; background: rgba(234,179,8,0.2); color: #fef08a; }
              .SILVER { border-color: #cbd5e1; background: rgba(100,116,139,0.2); color: #f1f5f9; }
              .BRONZE { border-color: #fed7aa; background: rgba(194,65,12,0.2); color: #ffedd5; }
              .barcode {
                display: flex;
                gap: 2px;
                background: rgba(255,255,255,0.9);
                padding: 4px;
                border-radius: 4px;
                width: 120px;
                height: 30px;
                margin-top: 16px;
              }
              .bar {
                background: black;
                height: 100%;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <div class="header">Ghana National Blood Service</div>
              <div class="subheader">Voluntary Blood Donor Privilege Card</div>
              <div class="name">${donor.fullName}</div>
              <div class="info">DONOR NUMBER: ${donor.donorNumber}</div>
              <div class="info">TEL NO: ${donor.phone}</div>
              <div class="info">STATUS: ACTIVE</div>
              <div class="blood-group-container">
                <span style="font-size: 16px; color: #ef4444;">💧</span>
                <span class="blood-group">${donor.bloodGroup}</span>
              </div>
              <div class="badge ${activeTier}">${activeTier}</div>
              <div class="barcode">
                ${Array.from({ length: 22 }).map((_, i) => `
                  <div class="bar" style="width: ${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px;"></div>
                `).join('')}
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white rounded-3xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase italic text-slate-900 tracking-tight flex items-center justify-between">
            <span>Privilege Card View</span>
            <Button onClick={printCard} variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 rounded-xl text-xs">
              <Printer size={14}/> Print Card
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Digital Card Graphic */}
        <div 
          id="digital-blood-donor-card"
          className="relative w-full aspect-[1.7/1] rounded-3xl p-6 text-white overflow-hidden shadow-2xl bg-gradient-to-br from-red-800 via-red-950 to-slate-900 border border-red-500/20 flex flex-col justify-between"
        >
          {/* Hologram / dropled watermarks */}
          <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 pointer-events-none">
            <Droplets size={250} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-slate-100 flex items-center gap-1.5">
                <Award size={12} className="text-amber-400 fill-amber-400"/> Ghana National Blood Service
              </p>
              <p className="text-[8px] font-bold uppercase text-amber-400 tracking-widest mt-0.5">Voluntary Blood Donor Card</p>
            </div>
            
            {/* Dynamic Glass Tier badge */}
            <div className={cn(
              "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm",
              activeTier === 'PLATINUM' && "bg-purple-500/20 text-purple-200 border-purple-400/40",
              activeTier === 'GOLD' && "bg-amber-500/20 text-amber-200 border-amber-400/40",
              activeTier === 'SILVER' && "bg-slate-400/20 text-slate-200 border-slate-300/40",
              activeTier === 'BRONZE' && "bg-orange-500/20 text-orange-200 border-orange-400/40",
            )}>
              {activeTier}
            </div>
          </div>

          <div className="space-y-1 z-10">
            <h2 className="text-2xl font-black italic uppercase tracking-tight truncate max-w-[280px] drop-shadow-md">{donor.fullName}</h2>
            <div className="flex flex-col text-[9px] font-mono text-slate-300">
              <span>DONOR ID: {donor.donorNumber}</span>
              <span>TEL NUMBER: {donor.phone}</span>
            </div>
          </div>

          <div className="flex justify-between items-end mt-2 z-10">
            {/* Mock Barcode */}
            <div className="flex items-center gap-[2px] bg-white/95 p-1.5 rounded-lg h-8 w-32 shadow-inner font-black">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="bg-black h-full" style={{ width: `${(i % 3 === 0 ? 3.5 : i % 2 === 0 ? 1 : 2)}px` }} />
              ))}
            </div>
            
            {/* Blood Capsule display */}
            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 w-16 h-20 shadow-lg">
              <Droplets className="text-red-500 fill-red-500" size={24} />
              <span className="text-xl font-black italic tracking-tighter mt-0.5">{donor.bloodGroup}</span>
            </div>
          </div>
        </div>

        {/* Share actions & QR Code Scan */}
        <div className="mt-4 p-4 border rounded-2xl bg-slate-50 flex items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 text-black">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-tight flex items-center gap-1">
              <QrCode size={14} className="text-red-500"/> Share with Donor
            </h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase leading-normal">
              Donor can scan the QR code to save their card on their phone, or copy the link directly.
            </p>
            <Button
              onClick={() => {
                const shareUrl = `${window.location.origin}/donor/card/${donor.hospitalId}/${donor.id}`;
                navigator.clipboard.writeText(shareUrl);
                toast({ title: 'Share Link Copied', description: 'Unique donor card link is now in your clipboard.' });
              }}
              variant="outline"
              size="sm"
              className="border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl mt-1 h-8"
            >
              Copy Shared Link
            </Button>
          </div>
          <div className="bg-white p-2 rounded-xl border shrink-0 flex items-center justify-center">
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/donor/card/${donor.hospitalId}/${donor.id}`}
              size={64}
              level="H"
            />
          </div>
        </div>

        {/* Progression tracker */}
        <div className="mt-4 space-y-2 border-t pt-4">
          <div className="flex justify-between text-xs font-black uppercase text-slate-500 font-black">
            <span>Donations: {donationCount}</span>
            {activeTier === 'PLATINUM' ? (
              <span className="text-purple-600 flex items-center gap-1"><Sparkles size={12}/> VIP Maximum Rank</span>
            ) : (
              <span>Next: {tierConfig.nextTier} ({tierConfig.remaining} Left)</span>
            )}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border">
            <div 
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                activeTier === 'PLATINUM' ? 'bg-purple-600' : 'bg-red-600'
              )} 
              style={{ width: `${tierConfig.progress}%` }} 
            />
          </div>
        </div>

        {/* Benefits list */}
        <div className="mt-4 space-y-3">
          <h3 className="text-xs uppercase font-black text-slate-700 tracking-wider flex items-center gap-1.5">
            <FileText size={14} className="text-red-600"/> Current &amp; Locked Clinical Advantages
          </h3>
          <div className="border rounded-2xl overflow-hidden divide-y text-slate-800 text-xs font-semibold bg-slate-50">
            {privileges.map((p, i) => {
              const active = hasAccess(p.tier);
              return (
                <div key={i} className={cn("p-3 flex items-start gap-2.5 transition-all", active ? "bg-green-50/50 text-green-900" : "opacity-45 grayscale bg-white")}>
                  {active ? (
                    <ShieldCheck className="text-green-600 shrink-0 mt-0.5" size={16}/>
                  ) : (
                    <span className="bg-slate-200 text-slate-400 p-0.5 rounded-full shrink-0 mt-0.5 text-[8px] font-black w-4 h-4 flex items-center justify-center">🔒</span>
                  )}
                  <div>
                    <p className="font-bold">{p.text}</p>
                    <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-0.5 block">{p.tier} Privileges</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
