'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { doc, collection, query, orderBy, where, collectionGroup, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import {
  Activity, Thermometer, Pill, Beaker,
  History, Plus, Clipboard, User, Loader2, Layers, FileText, Bed, Scissors, Package, Baby, Skull, Eye, FileSignature, Globe, ShieldAlert, AlertCircle, ClipboardList, CreditCard
} from 'lucide-react';
import { NewEncounterDialog } from '@/components/clinical/NewEncounterDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { AdmissionDialog } from '@/components/clinical/AdmissionDialog';
import { ProcedureLogDialog } from '@/components/clinical/ProcedureLogDialog';
import { MaternityEnrollmentDialog } from '@/components/clinical/MaternityEnrollmentDialog';
import VitalsTrend from '@/components/clinical/VitalsTrend';
import { QRCodeSVG } from 'qrcode.react';
import { DeathCertificationDialog } from '@/components/clinical/DeathCertificationDialog';
import { ReferralLetterDialog } from '@/components/clinical/ReferralLetterDialog';
import { parseClinicalError } from '@/lib/error-handler';
import { Button } from '@/components/ui/button';

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


export default function PatientFolderHub() {
  const { id } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();

  // 1. STATE FOR ACTIVE TAB
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'LOCAL' | 'NETWORK' | 'BILLING'>('SUMMARY');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // 1. Fetch Patient Biodata
  const patientRef = useMemoFirebase(() =>
    firestore && hospitalId && id ? doc(firestore, 'hospitals', hospitalId, 'patients', id as string) : null,
  [firestore, hospitalId, id]);
  const { data: patient, isLoading: isPatientLoading } = useDoc(patientRef);

  // 2. State for encounters and the permission error
  const [allEncounters, setAllEncounters] = useState<any[]>([]);
  const [areEncountersLoading, setAreEncountersLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

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
            const encountersWithDates = encountersData.map((enc: any) => ({
              ...enc,
              createdAt: enc.createdAt && enc.createdAt._seconds
                ? new Timestamp(enc.createdAt._seconds, enc.createdAt._nanoseconds).toDate()
                : new Date()
            }));
            setAllEncounters(encountersWithDates);
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
      const friendlyError = parseClinicalError(error);
      setErrorState(friendlyError);
      console.error("Clinical Bridge Handshake Failed:", error);
    } finally {
      setAreEncountersLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [patient?.ghanaCardId, patient?.id, patient?.homeHospitalId, patient?.hospitalId, firebaseApp, toast]);


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

  const localEncountersQuery = useMemoFirebase(() =>
    firestore && hospitalId && id ? query(
        collection(firestore, `hospitals/${hospitalId}/patients/${id}/encounters`),
        orderBy("createdAt", "desc")
    ) : null,
  [firestore, hospitalId, id]);
  const { data: localEncounters } = useCollection(localEncountersQuery);

  const timelineActivities = useMemo(() => {
    const allActivities = [
        ...(allEncounters || []).map(e => ({ ...e, viewType: 'ENCOUNTER', date: e.createdAt })),
        ...(completedLabs || []).map(l => ({ ...l, viewType: 'LAB_RESULT', date: l.completedAt?.toDate() })),
        ...(completedScans || []).map(s => ({ ...s, viewType: 'SCAN_RESULT', date: s.completedAt?.toDate() })),
        ...(procedureLogs || []).map(p => ({ ...p, viewType: 'PROCEDURE_LOG', date: p.createdAt?.toDate() }))
    ];

    return allActivities
        .filter(item => item.date)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [allEncounters, completedLabs, completedScans, procedureLogs]);

  const patientContextForAI = useMemo(() => {
    if (areEncountersLoading || !allEncounters) {
      return "No encounter data available.";
    }
    return JSON.stringify(allEncounters.slice(0, 5));
  }, [allEncounters, areEncountersLoading]);

  const isLoading = isProfileLoading || isPatientLoading;
  const isTimelineLoading = areEncountersLoading || areLabsLoading || areScansLoading || areProceduresLoading;
  const isDeceased = patient?.status === 'DECEASED';

  const latestEncounter = allEncounters && allEncounters.length > 0 ? allEncounters[0] : null;

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
      {/* --- 2. THE CLINICAL HEADER (Already built) --- */}
      <div className="bg-[#0f172a] text-white p-8 rounded-[40px] shadow-2xl flex flex-wrap justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-3xl font-black">
            {patient ? `${patient?.firstName?.[0]}${patient?.lastName?.[0]}` : <Loader2 className="animate-spin" />}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">{patient?.firstName} {patient?.lastName}</h1>
            <div className="flex flex-wrap gap-4 mt-1">
              <span className="text-primary-foreground/70 font-bold text-xs uppercase tracking-widest">EHR: {patient?.ehrNumber}</span>
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">DOB: {patient?.dateOfBirth}</span>
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Ghana Card: {patient?.ghanaCardId || 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
           {!isDeceased && patient && hospitalId && <NewEncounterDialog onSuccess={fetchHistory} patientId={id as string} hospitalId={hospitalId} patientName={`${patient?.firstName} ${patient?.lastName}`} />}
           {!isDeceased && patient && hospitalId && <AdmissionDialog patientId={id as string} hospitalId={hospitalId} patientName={`${patient?.firstName} ${patient?.lastName}`} />}
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

      {/* --- 3. THE "SOLID" TAB NAVIGATION --- */}
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

      {/* --- 4. CONDITIONAL CONTENT RENDER --- */}
      <div className="animate-in fade-in duration-500 pt-4">
        {activeTab === 'SUMMARY' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-3">
                <VitalsTrend data={allEncounters} />
              </div>
           </div>
        )}

        {activeTab === 'LOCAL' && (
           <div className="space-y-6">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-2">Records from {userProfile?.hospitalName}</h3>
              {localEncounters?.map((item: any) => (
                <div key={item.id} className="bg-white p-6 rounded-[32px] border shadow-sm">
                    <p className="font-black uppercase text-sm text-black">{item.diagnosis || 'General Review'}</p>
                    <p className="text-xs text-slate-500 mt-2">{item.chiefComplaint}</p>
                </div>
              ))}
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

                {authRequired ? (
                    <div className="bg-amber-100 border-2 border-dashed border-amber-200 p-10 rounded-[40px] text-center">
                        <ShieldAlert size={48} className="mx-auto text-amber-500 mb-4" />
                        <h3 className="text-xl font-black uppercase text-amber-900">Inter-Hospital Access Restricted</h3>
                        <p className="text-sm text-amber-700 mt-2">
                            To see this patient's history from other facilities, the patient must log into
                            <strong> MyGamMed</strong> and authorize <strong>{userProfile?.hospitalName}</strong>.
                        </p>
                    </div>
                ) : isTimelineLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-48 w-full rounded-3xl" />
                    <Skeleton className="h-32 w-full rounded-3xl" />
                </div>
                ) : timelineActivities.length === 0 ? (
                <div className="bg-white p-12 rounded-[40px] border-2 border-dashed border-slate-100 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-400 italic">
                        {errorState ? "Clinical history is synchronizing..." : "No clinical encounters recorded yet."}
                    </p>
                </div>
                ) : (
                timelineActivities.map(activity => {
                    if (activity.viewType === 'ENCOUNTER') {
                    const isLocal = activity.hospitalId === userProfile?.hospitalId;
                    return (
                        <div key={activity.id} className={`p-6 rounded-[32px] border-4 shadow-sm space-y-4 transition-all ${isLocal ? 'border-blue-100 bg-white' : 'border-slate-900 bg-slate-50'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${isLocal ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
                                {activity.hospitalName || 'External Facility'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                                {activity.date ? new Date(activity.date).toLocaleDateString('en-GB') : ''}
                            </span>
                            </div>
                            <span className="text-[10px] font-black text-blue-600 uppercase">Dr. {activity.providerName}</span>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-black text-black uppercase">Diagnosis: {activity.diagnosis || 'General Consultation'}</p>
                            <p className="text-xs text-slate-600 leading-relaxed italic">"{activity.chiefComplaint || activity.hpi || 'No clinical notes.'}"</p>
                        </div>
                        {activity.prescription?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Medications Ordered here:</p>
                            <div className="flex flex-wrap gap-2">
                                {activity.prescription.map((rx:any, i:any) => (
                                <span key={i} className="bg-white border text-[10px] font-bold px-2 py-0.5 rounded-lg text-blue-800">
                                    {rx.name} {rx.dosage || ''}
                                </span>
                                ))}
                            </div>
                            </div>
                        )}
                        </div>
                    )
                    }
                    // ... Other activity types would go here ...
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
    </div>
  );
}
