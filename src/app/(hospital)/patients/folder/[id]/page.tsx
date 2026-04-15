'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { doc, collection, query, orderBy, where, collectionGroup, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import {
  Activity, Thermometer, Pill, Beaker,
  History, Plus, Clipboard, User, Loader2, Layers, FileText, Bed, Scissors, Package, Baby, Skull, Eye, FileSignature, Globe, ShieldAlert, AlertCircle, ClipboardList, CreditCard, BrainCircuit
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
import { type Encounter } from '@/types/encounter';

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

function PatientSummaryCard({ summary, isLoading }: { summary: any, isLoading: boolean }) {
    if (isLoading) {
        return <Skeleton className="h-36 w-full rounded-[32px]" />;
    }
    if (typeof summary === 'string') {
        return (
            <div className="bg-white p-6 rounded-[32px] border shadow-sm flex items-center gap-4">
                <BrainCircuit className="text-primary" size={24} />
                <p className="text-sm font-medium text-muted-foreground">{summary}</p>
            </div>
        )
    }
    return (
        <div className="bg-white p-6 rounded-[32px] border shadow-sm">
            <div className="flex items-center gap-3 mb-4 border-b pb-3">
                <BrainCircuit className="text-primary" size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">AI Clinical Summary</h3>
            </div>
            <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                    <span className="text-muted-foreground">Encounters:</span>
                    <span className="font-bold">{summary.encounterCount} on record</span>
                </li>
                <li className="flex justify-between">
                    <span className="text-muted-foreground">Top Complaints:</span>
                    <span className="font-bold">{summary.complaints.join(', ') || 'N/A'}</span>
                </li>
                <li className="flex justify-between">
                    <span className="text-muted-foreground">Latest Diagnosis:</span>
                    <span className="font-bold">{summary.latestDiagnosis}</span>
                </li>
                <li className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Temp:</span>
                    <span className="font-bold">{summary.avgTemp ? `${summary.avgTemp}°C` : 'N/A'}</span>
                </li>
                 <li className="flex justify-between items-center bg-amber-50 p-2 rounded-lg mt-2">
                    <span className="text-amber-700 font-bold">Risk Flag:</span>
                    <span className="font-black text-amber-900">{summary.risk}</span>
                </li>
            </ul>
        </div>
    )
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

  const patientRef = useMemoFirebase(() =>
    firestore && hospitalId && id ? doc(firestore, 'hospitals', hospitalId, 'patients', id as string) : null,
  [firestore, hospitalId, id]);
  const { data: patient, isLoading: isPatientLoading } = useDoc(patientRef);

  const [allEncounters, setAllEncounters] = useState<Encounter[]>([]);
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
            setAllEncounters(normalizedEncounters);
            console.log("ENCOUNTER DATA:", normalizedEncounters.map(e => ({ hasVitals: !!e.vitals, hasComplaint: !!e.chiefComplaint, hasDiagnosis: !!e.diagnosis, hasPrescription: !!e.prescription && e.prescription.length > 0 })));
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
  }, [patient?.ghanaCardId, patient?.id, patient?.homeHospitalId, patient?.hospitalId, firebaseApp, isPatientLoading]);
  
  const generateClinicalAlerts = (encounters: any[]) => {
    if (!encounters || encounters.length === 0) return [];

    const alerts: string[] = [];
    const recent = encounters.slice(0, 5);

    const bpReadings = recent
      .map(e => e.vitals?.bp)
      .filter(Boolean);

    const temps = recent
      .map(e => Number(e.vitals?.temp))
      .filter(t => !isNaN(t));

    const spo2s = recent
      .map(e => Number(e.vitals?.spo2))
      .filter(s => !isNaN(s));

    const pulses = recent
      .map(e => Number(e.vitals?.pulse))
      .filter(p => !isNaN(p));

    // 🔴 Hypertension check
    const highBPCount = bpReadings.filter(bp => {
      const [sys] = bp.split('/').map(Number);
      return sys >= 140;
    }).length;

    if (highBPCount >= 2) {
      alerts.push("⚠ Possible Hypertension (Repeated high BP)");
    }

    // 🔴 Fever check
    const highTemp = temps.some(t => t > 37.5);
    if (highTemp) {
      alerts.push("⚠ Fever detected");
    }

    // 🔴 Oxygen check
    const lowSpo2 = spo2s.some(s => s < 92);
    if (lowSpo2) {
      alerts.push("⚠ Low Oxygen Saturation");
    }

    // 🔴 Pulse check
    const highPulse = pulses.some(p => p > 100);
    if (highPulse) {
      alerts.push("⚠ Tachycardia (High Pulse)");
    }

    return alerts;
  };
  
  const generateClinicalInsights = (encounters: any[]) => {
    if (!encounters || encounters.length < 2) return [];
  
    const insights: string[] = [];
  
    const recent = encounters.slice(0, 10);
  
    // 🔍 1. Hypertension Risk (trend-based)
    const highBPCount = recent.filter(e => {
      const bp = e.vitals?.bp;
      if (!bp) return false;
      const [sys] = bp.split('/').map(Number);
      return sys >= 140;
    }).length;
  
    if (highBPCount >= 3) {
      insights.push("⚠ Patient at risk of Chronic Hypertension");
    }
  
    // 🔍 2. Recurrent Diagnosis Pattern
    const diagnoses = recent
      .map(e => e.diagnosis?.toLowerCase())
      .filter(Boolean);
  
    const diagnosisCount: Record<string, number> = {};
  
    diagnoses.forEach(d => {
      diagnosisCount[d] = (diagnosisCount[d] || 0) + 1;
    });
  
    Object.entries(diagnosisCount).forEach(([diag, count]) => {
      if (count >= 3) {
        insights.push(`⚠ Recurrent condition detected: ${diag}`);
      }
    });
  
    // 🔍 3. Frequent Visits (utilization risk)
    if (recent.length >= 5) {
      insights.push("⚠ High healthcare utilization (frequent visits)");
    }
  
    // 🔍 4. Fever Trend
    const feverCount = recent.filter(e => Number(e.vitals?.temp) > 37.5).length;
  
    if (feverCount >= 3) {
      insights.push("⚠ Recurrent fever pattern detected");
    }
  
    return insights;
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

  const generatePatientSummary = (encounters: Encounter[]) => {
    if (!encounters || encounters.length === 0) {
      return "No clinical history available.";
    }

    const recent = encounters.slice(0, 5);
    const complaints = recent.map(e => e.chiefComplaint).filter(Boolean);
    const diagnoses = recent.map(e => e.diagnosis).filter(Boolean);
    const temps = recent.map(e => Number(e.vitals?.temp)).filter(t => t && !isNaN(t));
    const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : null;

    let risk = "Low";
    if (avgTemp && Number(avgTemp) > 37.5) {
      risk = "Possible infection";
    }

    return {
      encounterCount: encounters.length,
      complaints: [...new Set(complaints)].slice(0, 3),
      latestDiagnosis: diagnoses[0] || "N/A",
      avgTemp,
      risk,
    };
  };

  const patientSummary = useMemo(() => generatePatientSummary(allEncounters), [allEncounters]);
  
  const clinicalAlerts = useMemo(() => {
    return generateClinicalAlerts(allEncounters);
  }, [allEncounters]);

  const clinicalInsights = useMemo(() => {
    return generateClinicalInsights(allEncounters);
  }, [allEncounters]);


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

      {clinicalAlerts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-[32px] space-y-2 animate-in fade-in duration-300">
            <h3 className="text-xs font-black uppercase text-red-600">
            Clinical Alerts
            </h3>

            {clinicalAlerts.map((alert, index) => (
            <p key={index} className="text-sm font-bold text-red-700">
                {alert}
            </p>
            ))}
        </div>
      )}
      
      {clinicalInsights.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[32px] space-y-2 animate-in fade-in duration-300">
            <h3 className="text-xs font-black uppercase text-amber-600">
            Predictive Insights
            </h3>

            {clinicalInsights.map((insight, index) => (
            <p key={index} className="text-sm font-bold text-amber-700">
                {insight}
            </p>
            ))}
        </div>
      )}

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
            <PatientSummaryCard summary={patientSummary} isLoading={isTimelineLoading} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
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
                <VitalsTrend data={allEncounters} />
            </div>
          </div>
        )}

        {activeTab === 'LOCAL' && (
           <div className="space-y-6">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 border-b pb-2">Records from {userProfile?.hospitalName}</h3>
              {localEncounters?.map((encounter: any) => (
                <div key={encounter.id} className="bg-white p-6 rounded-[32px] border shadow-sm">
                    <p className="font-black uppercase text-sm text-black">{encounter.diagnosis || 'General Review'}</p>
                    <p className="text-xs text-slate-500 mt-2">{encounter.chiefComplaint}</p>
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
                    timelineActivities.filter(a => a.viewType === 'ENCOUNTER').map((encounter) => (
                      <div key={encounter.id} className="bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(15,23,42,0.05)] space-y-8 mb-8">
                        
                        <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
                           <div>
                              <span className="text-[10px] font-black bg-blue-600 text-white px-4 py-1.5 rounded-full uppercase tracking-widest italic">
                                 {encounter.type || 'Consultation'}
                              </span>
                              <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-tighter">
                                 {encounter.hospitalName} • Dr. {encounter.providerName} ({encounter.providerRole})
                              </p>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-slate-900 uppercase">
                                 {encounter.createdAt ? new Date(encounter.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                              </p>
                              <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">
                                 {encounter.createdAt ? new Date(encounter.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-slate-50 p-6 rounded-[32px]">
                           <MiniVital label="BP" value={encounter.vitals?.bp} unit="mmHg" />
                           <MiniVital label="Temp" value={encounter.vitals?.temp} unit="°C" />
                           <MiniVital label="Pulse" value={encounter.vitals?.pulse} unit="bpm" />
                           <MiniVital label="Resp" value={encounter.vitals?.respiration} unit="bpm" />
                           <MiniVital label="BMI" value={encounter.vitals?.bmi} unit="" />
                           <MiniVital label="Weight" value={encounter.vitals?.weight} unit="kg" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="space-y-2">
                              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Chief Complaint</p>
                              <p className="text-sm font-medium text-slate-800 leading-relaxed italic">
                                 "{encounter.chiefComplaint || 'No subjective complaints recorded.'}"
                              </p>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[9px] font-black text-red-600 uppercase tracking-widest border-l-4 border-red-600 pl-3">Provisional Diagnosis</p>
                              <p className="text-lg font-black text-black uppercase tracking-tight">
                                 {encounter.diagnosis || 'Pending Review'}
                              </p>
                           </div>
                        </div>

                        {(encounter.labOrders?.length > 0 || encounter.radiologyOrders?.length > 0) && (
                          <div className="space-y-4">
                             <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Diagnostic Requests</p>
                             <div className="flex flex-wrap gap-3">
                                {encounter.labOrders?.map((lab: any, i: number) => (
                                   <div key={i} className="bg-purple-50 text-purple-700 px-4 py-2 rounded-2xl border border-purple-100 flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                                      <span className="text-[11px] font-black uppercase">{lab.name || lab.testName}</span>
                                   </div>
                                ))}
                                {encounter.radiologyOrders?.map((scan: any, i: number) => (
                                   <div key={i} className="bg-orange-50 text-orange-700 px-4 py-2 rounded-2xl border border-orange-100 flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-orange-400" />
                                      <span className="text-[11px] font-black uppercase">{scan.name}</span>
                                   </div>
                                ))}
                             </div>
                          </div>
                        )}

                        {encounter.prescription?.length > 0 && (
                          <div className="bg-[#0f172a] p-6 rounded-[32px] text-white">
                             <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4">Treatment Plan / RX</p>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {encounter.prescription.map((rx: any, idx: number) => (
                                   <div key={idx} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                      <p className="text-xs font-black uppercase text-white">{rx.name}</p>
                                      <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase italic">{rx.dosage} • {rx.frequency}</p>
                                   </div>
                                ))}
                             </div>
                          </div>
                        )}
                      </div>
                    ))
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
