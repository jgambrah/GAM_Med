'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, where } from 'firebase/firestore';
import { 
  Activity, Thermometer, Pill, Beaker, 
  History, Plus, Clipboard, User, Loader2, Layers, FileText, Bed, Scissors, Package, Baby, Skull
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

export default function ClinicalFolder() {
  const { id } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  useEffect(() => {
    if (user) {
      setIsClaimsLoading(true);
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else {
      setIsClaimsLoading(false);
    }
  }, [user]);

  const hospitalId = claims?.hospitalId;

  // 1. Fetch Patient Biodata
  const patientRef = useMemoFirebase(() => 
    firestore && hospitalId && id ? doc(firestore, 'hospitals', hospitalId, 'patients', id as string) : null,
  [firestore, hospitalId, id]);
  const { data: patient, isLoading: isPatientLoading } = useDoc(patientRef);

  // 2. Listen to All Timeline Items for this patient
  const encountersQuery = useMemoFirebase(() => 
    firestore && hospitalId && id ? query(collection(firestore, 'hospitals', hospitalId, 'patients', id as string, 'encounters'), orderBy('createdAt', 'desc')) : null,
  [firestore, hospitalId, id]);
  const { data: encounters, isLoading: areEncountersLoading } = useCollection(encountersQuery);

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
        where("patientId", "==", id),
        where("status", "==", "COMPLETED"),
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
        ...(encounters || []).map(e => ({ ...e, viewType: 'ENCOUNTER', date: e.createdAt?.toDate() })),
        ...(completedLabs || []).map(l => ({ ...l, viewType: 'LAB_RESULT', date: l.completedAt?.toDate() })),
        ...(completedScans || []).map(s => ({ ...s, viewType: 'SCAN_RESULT', date: s.completedAt?.toDate() })),
        ...(procedureLogs || []).map(p => ({ ...p, viewType: 'PROCEDURE_LOG', date: p.createdAt?.toDate() }))
    ];

    return allActivities
        .filter(item => item.date)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [encounters, completedLabs, completedScans, procedureLogs]);

  const patientContextForAI = useMemo(() => {
    if (areEncountersLoading || !encounters) {
      return "No encounter data available.";
    }
    // The user's original code limited to 5 encounters. Let's do the same.
    return JSON.stringify(encounters.slice(0, 5));
  }, [encounters, areEncountersLoading]);

  const isLoading = isClaimsLoading || isPatientLoading;
  const isTimelineLoading = areEncountersLoading || areLabsLoading || areScansLoading || areProceduresLoading;
  const isDeceased = patient?.status === 'DECEASED';

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
          <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <History size={16} className="text-primary" /> Longitudinal History
          </h3>
          
          {encounters && encounters.length > 1 && <VitalsTrend data={encounters} />}

          {isTimelineLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-48 w-full rounded-3xl" />
                <Skeleton className="h-32 w-full rounded-3xl" />
             </div>
          ) : timelineActivities && timelineActivities.length === 0 ? (
            <div className="bg-card p-20 border-2 border-dashed rounded-[32px] text-center text-muted-foreground italic">
              No clinical encounters recorded. Register first vitals or consultation.
            </div>
          ) : (
            timelineActivities?.map(activity => {
              if (activity.viewType === 'ENCOUNTER') {
                return (
                  <div key={activity.id} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4 hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-start border-b pb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted p-2 rounded-xl text-primary font-bold text-xs">
                          {format(activity.date, 'PP')}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${activity.type === 'ANC Visit' ? 'bg-pink-100 text-pink-700' : 'bg-primary/10 text-primary'}`}>
                          {activity.type}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground italic">Signed by: {activity.providerName}</span>
                    </div>

                    {activity.ancDetails && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 py-2 bg-pink-50/50 rounded-2xl p-4 border border-pink-100">
                            <AncVitalItem label="Fundal Height" value={activity.ancDetails.fundalHeight} unit="cm" />
                            <AncVitalItem label="Fetal Heart Rate" value={activity.ancDetails.fetalHeartRate} unit="bpm" />
                            <AncVitalItem label="Presentation" value={activity.ancDetails.presentation} />
                            <AncVitalItem label="Fetal Movement" value={activity.ancDetails.fetalMovement} />
                        </div>
                    )}

                    {activity.vitals && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 py-2">
                        <VitalItem label="BP" value={activity.vitals.bp} unit="mmHg" />
                        <VitalItem label="Temp" value={activity.vitals.temp} unit="°C" />
                        <VitalItem label="Pulse" value={activity.vitals.pulse} unit="bpm" />
                        <VitalItem label="Weight" value={activity.vitals.weight} unit="kg" />
                      </div>
                    )}

                    <div className="text-card-foreground space-y-4">
                        {activity.chiefComplaint && <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Chief Complaint</p>
                            <p className="text-sm font-medium leading-relaxed">{activity.chiefComplaint}</p>
                        </div>}
                        {activity.hpi && <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">History of Presenting Illness</p>
                            <p className="text-sm font-medium leading-relaxed">{activity.hpi}</p>
                        </div>}
                        {activity.diagnosis && <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Diagnosis</p>
                            <p className="text-sm font-bold leading-relaxed">{activity.diagnosis}</p>
                        </div>}
                        
                        {activity.prescription && activity.prescription.length > 0 && (
                          <div className='pt-4 border-t mt-4'>
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Prescription</p>
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 mb-1 uppercase text-right">Scan to Verify Digital Signature</p>
                                <QRCodeSVG 
                                  value={`https://gammed.com/verify/rx/${activity.id}`} 
                                  size={40} 
                                  level={"H"}
                                />
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                {activity.prescription.map((order: any, index: number) => (
                                    <div key={index} className="bg-blue-100/50 text-blue-800 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between gap-2">
                                        <span>{order.name} ({order.strength})</span>
                                        <span className='font-mono'>{order.dosage} • {order.frequency}</span>
                                    </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {activity.labOrders && activity.labOrders.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 mt-4">Lab Requests</p>
                                <div className="flex flex-wrap gap-2">
                                    {activity.labOrders.map((order: any, index: number) => (
                                        <div key={index} className="bg-purple-100/50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                                            <Beaker size={14} />
                                            <span>{order.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activity.radiologyOrders && activity.radiologyOrders.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 mt-4">Imaging Requests</p>
                                <div className="flex flex-wrap gap-2">
                                    {activity.radiologyOrders.map((order: any, index: number) => (
                                        <div key={index} className="bg-orange-100/50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                                            <Layers size={14} />
                                            <span>{order.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                  </div>
                )
              }
              if (activity.viewType === 'LAB_RESULT') {
                return (
                    <div key={activity.id} className="bg-card p-6 rounded-[32px] border-2 border-purple-100 shadow-sm space-y-3">
                        <div className="flex justify-between font-black text-[10px] uppercase text-purple-600 tracking-widest">
                           <span>Lab Result: {activity.testName}</span>
                           <span>Validated by: {activity.labTechName}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                           <span className="text-2xl font-black text-foreground">{activity.resultValue}</span>
                           <span className="text-xs font-bold text-muted-foreground uppercase">{activity.unit}</span>
                        </div>
                        {activity.remarks && <p className="text-xs text-muted-foreground italic">"{activity.remarks}"</p>}
                    </div>
                )
              }
              if (activity.viewType === 'SCAN_RESULT') {
                return (
                     <div key={activity.id} className="bg-card p-6 rounded-[32px] border-2 border-orange-100 shadow-sm space-y-3">
                        <div className="flex justify-between font-black text-[10px] uppercase text-orange-600 tracking-widest">
                           <span>Imaging Report: {activity.scanName}</span>
                           <span>Signed by: {activity.radiologistName}</span>
                        </div>
                        <p className="text-base font-bold text-foreground border-l-4 border-orange-500 pl-4 py-1 uppercase">{activity.impression}</p>
                        <button className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                            <FileText size={12}/> View Full Findings & Report
                        </button>
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
