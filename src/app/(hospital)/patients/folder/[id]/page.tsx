
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { doc, collection, query, orderBy, where, collectionGroup, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, Thermometer, Pill, Beaker, 
  History, Plus, Clipboard, User, Loader2, Layers, FileText, Bed, Scissors, Package, Baby, Skull, Eye, FileSignature, Globe, ShieldAlert
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

export default function ClinicalFolder() {
  const { id } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();

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

  useEffect(() => {
    if (!patient?.ghanaCardId || !firebaseApp) {
      if (patient) setAreEncountersLoading(false);
      return;
    }

    const fetchHistory = async () => {
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
            setAuthRequired(false);
        } else if (result.data.reason === 'PERMISSION_REQUIRED') {
          setAuthRequired(true);
          setAllEncounters([]); // Clear any old data
          toast({
                title: "Consent Required for Full History",
                description: `This patient's primary records are from another facility. Please ask them to grant access via their MyGamMed patient portal.`,
                duration: 10000,
            });
        } else {
            throw new Error(result.data.message || "An unknown error occurred while fetching patient history.");
        }
      } catch (error: any) {
        console.error("Clinical Bridge Handshake Failed:", error);
        toast({
            variant: "destructive",
            title: "Could Not Load Global History",
            description: error.message,
        });
        setAllEncounters([]);
      } finally {
        setAreEncountersLoading(false);
      }
    };

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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. THE CLINICAL HEADER (Floating Identity) */}
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
           {!isDeceased && patient && hospitalId && <NewEncounterDialog patientId={id as string} hospitalId={hospitalId} patientName={`${patient?.firstName} ${patient?.lastName}`} />}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* 2. THE VISIT TIMELINE (Main EHR Body) */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-black text-xs uppercase tracking-widest text-blue-600 flex items-center gap-2">
            <Globe size={16} /> Unified Longitudinal Record
          </h3>
          
          {authRequired ? (
             <div className="bg-amber-100 border-2 border-dashed border-amber-200 p-10 rounded-[40px] text-center">
                <ShieldAlert size={48} className="mx-auto text-amber-500 mb-4" />
                <h3 className="text-xl font-black uppercase text-amber-900">Inter-Hospital Access Restricted</h3>
                <p className="text-sm text-amber-700 mt-2">
                    To see this patient's history from other facilities, the patient must log into 
                    <strong> MyGamMed</strong> and authorize <strong>{userProfile?.hospitalName}</strong>.
                </p>
            </div>
          ) : allEncounters && allEncounters.length > 1 ? (
            <VitalsTrend data={allEncounters} />
          ) : null}

          {isTimelineLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-48 w-full rounded-3xl" />
                <Skeleton className="h-32 w-full rounded-3xl" />
             </div>
          ) : timelineActivities && timelineActivities.length === 0 && !authRequired ? (
            <div className="bg-card p-20 border-2 border-dashed rounded-[32px] text-center text-muted-foreground italic">
              No clinical encounters recorded. Register first vitals or consultation.
            </div>
          ) : (
            timelineActivities?.map(activity => {
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
              if (activity.viewType === 'LAB_RESULT') {
                return (
                  <div key={activity.id} className="bg-card p-6 rounded-[32px] border-2 border-purple-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-center font-black text-[10px] uppercase text-purple-600 tracking-widest">
                        <span>Lab Result: {activity.testName}</span>
                        <span>Validated by: {activity.labTechName}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-foreground">{activity.resultValue}</span>
                        <span className="text-xs font-bold text-muted-foreground uppercase">{activity.unit}</span>
                    </div>
                    {activity.remarks && <p className="text-xs text-muted-foreground italic">"{activity.remarks}"</p>}
                    {activity.reportUrl && (
                        <div className="pt-4 border-t border-dashed">
                            <a href={activity.reportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 transition-all shadow-md w-fit">
                                <Eye size={14} /> View Attached Report
                            </a>
                        </div>
                    )}
                  </div>
                )
              }
              if (activity.viewType === 'SCAN_RESULT') {
                return (
                    <div key={activity.id} className="bg-card p-6 rounded-[32px] border-2 border-orange-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center font-black text-[10px] uppercase text-orange-600 tracking-widest border-b pb-2">
                            <span>Imaging Report: {activity.scanName}</span>
                            <span>Signed by: {activity.radiologistName}</span>
                        </div>
                        
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Radiologist's Findings</p>
                            <p className="text-sm font-medium leading-relaxed italic text-foreground">"{activity.findings}"</p>
                        </div>

                        <div className="p-4 bg-orange-50 border-l-4 border-orange-500">
                            <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1">Impression</p>
                            <p className="text-base font-bold text-orange-900 uppercase">{activity.impression}</p>
                        </div>
                        
                        {activity.imageUrl && (
                        <div className="pt-4 border-t border-dashed">
                            <a href={activity.imageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 transition-all shadow-md w-fit">
                            <Eye size={14} /> View Scan Image
                            </a>
                        </div>
                        )}
                    </div>
                )
              }
              if (activity.viewType === 'PROCEDURE_LOG') {
                return (
                  <div key={activity.id} className="bg-card p-6 rounded-[32px] border-2 border-blue-100 shadow-sm space-y-4">
                     <div className="flex justify-between items-start border-b pb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted p-2 rounded-xl text-blue-600 font-bold text-xs">
                          {format(activity.date, 'PP')}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-blue-100/60 text-blue-800 rounded-full flex items-center gap-1">
                          <Scissors size={12}/> PROCEDURE
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground italic">Performed by: {activity.providerName}</span>
                    </div>
                    <div>
                        <p className="text-base font-black text-foreground uppercase tracking-tighter">{activity.procedureName}</p>
                        <p className="text-xs font-medium text-muted-foreground mt-2 italic">"{activity.techniqueNotes}"</p>
                    </div>
                    {activity.consumables && activity.consumables.length > 0 && (
                        <div>
                           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Materials Consumed</p>
                           <div className="flex flex-wrap gap-2">
                               {activity.consumables.map((item: any, index: number) => (
                                   <div key={index} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                                       <Package size={14} />
                                       <span>{item.name} (x{item.quantityUsed})</span>
                                   </div>
                               ))}
                           </div>
                        </div>
                    )}
                  </div>
                )
              }
              return null;
            })
          )}
        </div>

        {/* 3. CLINICAL SIDEBAR: QUICK VIEW */}
        <div className="space-y-6 sticky top-24">
          <div className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4">
             <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground border-b pb-2">Active Prescriptions</h3>
             <div className="text-center py-6 text-muted-foreground/50 italic text-xs uppercase">No active drugs</div>
          </div>
          
          <div className="bg-primary p-6 rounded-[32px] text-primary-foreground shadow-xl space-y-4">
             <h3 className="font-black text-xs uppercase tracking-widest border-b border-primary-foreground/20 pb-2">Risk Factors</h3>
             <ul className="space-y-2 text-sm font-medium">
                <li className="flex items-center gap-2">⚠️ Allergies: None Reported</li>
                <li className="flex items-center gap-2">🩸 Blood Group: Unknown</li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function VitalItem({ label, value, unit }: any) {
  if (!value) return null;
  return (
    <div className="bg-muted/50 p-2 rounded-xl text-center">
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">{label}</p>
      <p className="text-sm font-bold text-card-foreground">{value} <span className="text-[8px] text-muted-foreground">{unit}</span></p>
    </div>
  );
}

function AncVitalItem({ label, value, unit }: any) {
    if (!value) return null;
    return (
      <div className="text-center">
        <p className="text-[9px] font-black text-pink-900/50 uppercase tracking-tighter">{label}</p>
        <p className="text-sm font-bold text-pink-900">{value} <span className="text-[8px]">{unit}</span></p>
      </div>
    );
}

    