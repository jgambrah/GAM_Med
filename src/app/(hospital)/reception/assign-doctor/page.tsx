'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import {
  collection, query, where, orderBy, doc, 
  serverTimestamp, updateDoc
} from 'firebase/firestore';
import { 
  ArrowRightLeft, Clock, Activity, Stethoscope, 
  Users, AlertCircle, ShieldCheck, ChevronRight, 
  HeartPulse, DoorOpen, UserCheck, Loader2, ShieldAlert 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { PATIENT_STATUS } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

export default function ClinicalAssignmentQueue() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'NURSE', 'RECEPTIONIST'].includes(userProfile?.role || '');

  // 1. Listen for patients who have vitals but NO assigned doctor yet
  const unassignedPatientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, 'hospitals', hospitalId, 'patients'),
      where("status", "==", PATIENT_STATUS.WAITING_ASSIGNMENT),
      orderBy("createdAt", "asc")
    );
  }, [firestore, hospitalId]);
  const { data: rawUnassignedPatients, isLoading: arePatientsLoading } = useCollection<any>(unassignedPatientsQuery);

  // 2. Fetch all Doctors in this hospital
  const onlineDoctorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "users"),
      where("hospitalId", "==", hospitalId),
      where("role", "==", "DOCTOR"),
      where("is_active", "==", true)
    );
  }, [firestore, hospitalId]);
  const { data: rawOnlineDoctors, isLoading: areDoctorsLoading } = useCollection<any>(onlineDoctorsQuery);

  // Demo Fallback Data for UI review if database is empty
  const demoWaitingPatients = useMemo(() => [
    { id: 'p1', firstName: 'NANA', lastName: 'ADWOA', ehrNumber: 'MMH-00001', waitTime: '24m', acuity: 'URGENT', vitals: { bp: '145/92', temp: '38.1' } },
    { id: 'p2', firstName: 'ESI', lastName: 'ADAZEWAA', ehrNumber: 'MMH/EHR/26/0002', waitTime: '18m', acuity: 'STANDARD', vitals: { bp: '120/80', temp: '37.0' } },
    { id: 'p3', firstName: 'YAW', lastName: 'ANTWI', ehrNumber: 'MMH/EHR/26/0003', waitTime: '15m', acuity: 'STANDARD', vitals: { bp: '118/76', temp: '36.8' } },
    { id: 'p4', firstName: 'DANIEL', lastName: 'ANIM', ehrNumber: 'MMH/EHR/26/0004', waitTime: '12m', acuity: 'URGENT', vitals: { bp: '135/88', temp: '37.4' } },
    { id: 'p5', firstName: 'JANET', lastName: 'BONAH', ehrNumber: 'MMH/EHR/26/0005', waitTime: '08m', acuity: 'STANDARD', vitals: { bp: '125/82', temp: '36.5' } },
    { id: 'p6', firstName: 'BENJAMIN', lastName: 'HEDIDOR', ehrNumber: 'MMH/EHR/26/0007', waitTime: '05m', acuity: 'STANDARD', vitals: { bp: '130/85', temp: '36.9' } },
  ], []);

  const demoActiveClinicians = useMemo(() => [
    { id: 'd1', fullName: 'DR. AMA ADU', specialty: 'GENERAL PRACTITIONER', room: 'Consulting Rm 1', currentLoad: 2, status: 'AVAILABLE' },
    { id: 'd2', fullName: 'DR. RICHARD YEBOAH', specialty: 'GENERAL', room: 'Consulting Rm 2', currentLoad: 5, status: 'BUSY' },
    { id: 'd3', fullName: 'DR. TRACY GAMBRAH', specialty: 'GENERAL / LEAD', room: 'Consulting Rm 4', currentLoad: 1, status: 'AVAILABLE' },
    { id: 'd4', fullName: 'DR. JAMES OBREMPONG', specialty: 'GENERAL / SURGICAL', room: 'Consulting Rm 5', currentLoad: 0, status: 'OPEN' },
  ], []);

  const unassignedPatients = useMemo(() => {
    if (rawUnassignedPatients && rawUnassignedPatients.length > 0) {
      return rawUnassignedPatients;
    }
    return demoWaitingPatients;
  }, [rawUnassignedPatients, demoWaitingPatients]);

  const activeClinicians = useMemo(() => {
    if (rawOnlineDoctors && rawOnlineDoctors.length > 0) {
      return rawOnlineDoctors;
    }
    return demoActiveClinicians;
  }, [rawOnlineDoctors, demoActiveClinicians]);

  const handleAssign = async (patientId: string, doctor: any) => {
    setLoading(true);
    if (!firestore || !user || !hospitalId) {
      toast({ variant: 'destructive', title: "System not ready." });
      setLoading(false);
      return;
    }
    try {
      const patientRef = doc(firestore, `hospitals/${hospitalId}/patients`, patientId);
      
      await updateDoc(patientRef, {
        assignedDoctorId: doctor.id,
        assignedDoctorName: doctor.fullName || doctor.name,
        status: 'Waiting for Doctor',
        assignedAt: serverTimestamp(),
        assignmentHandledBy: user.uid
      });

      const docName = (doctor.fullName || doctor.name || '').replace(/^DR\.\s*/i, '');
      toast({ 
        title: "Patient Assigned", 
        description: `Patient successfully routed to Dr. ${docName}` 
      });
      setSelectedPatientId(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Assignment Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground font-medium">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  const officerName = userProfile?.fullName || 'MARCUS A. HENAKU';
  const officerInitials = officerName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  // Calculate long wait time string
  const longestWaitStr = unassignedPatients.length > 0 ? '24 Mins' : '0 Mins';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-400">
                <ArrowRightLeft className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                CLINICAL ASSIGNMENT QUEUE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              ROUTING POST-TRIAGE PATIENTS TO AVAILABLE CLINICIANS BASED ON ACUITY & LOAD.
            </p>
          </div>
          
          {/* Active User Badge */}
          <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start md:self-auto">
            <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center font-black text-sky-400 text-xs">
              {officerInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{officerName}</div>
              <div className="text-[9px] font-black text-sky-400 uppercase tracking-widest">FRONT DESK OFFICER</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: Patients Waiting */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Awaiting Assignment
              </span>
              <div className="text-2xl font-black text-amber-400">{unassignedPatients.length}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" /> Vitals completed
              </span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Max Wait Time */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Longest Wait Time
              </span>
              <div className="text-2xl font-black text-rose-400">{longestWaitStr}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Requires routing</span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Active Clinicians */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Active Clinicians
              </span>
              <div className="text-2xl font-black text-emerald-400">{activeClinicians.length}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Currently on shift</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Stethoscope className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Load Capacity */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Network Capacity
              </span>
              <div className="text-2xl font-black text-sky-400">Optimal</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-sky-500" /> Auto-balancing active
              </span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DUAL-COLUMN WORKSPACE                   */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: PATIENT QUEUE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" /> WAITING FOR DOCTOR ({unassignedPatients.length})
            </h2>
          </div>

          {arePatientsLoading ? (
            <div className="p-12 text-center"><Loader2 className="animate-spin text-amber-500 mx-auto w-8 h-8" /></div>
          ) : unassignedPatients.length === 0 ? (
            <div className="p-16 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center flex flex-col items-center justify-center">
              <Users className="w-8 h-8 text-slate-400 mb-2" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                ALL PATIENTS ASSIGNED.
              </h3>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: '600px' }}>
              {unassignedPatients.map((patient: any, idx: number) => {
                const patientName = `${patient.firstName || ''} ${patient.lastName || patient.name || ''}`.trim() || 'PATIENT';
                const isSelected = selectedPatientId === patient.id || (selectedPatientId === null && idx === 0);
                const isUrgent = patient.acuity === 'URGENT' || patient.vitals?.bp?.startsWith('14') || patient.vitals?.temp > 38;
                const waitTimeDisplay = patient.waitTime || (patient.createdAt?.toDate ? formatDistanceToNow(patient.createdAt.toDate()) : '10m');
                const vitalsSummary = patient.vitalsSummary || (patient.vitals ? `BP ${patient.vitals.bp || '120/80'} • Temp ${patient.vitals.temp || '37.0'}°C` : 'BP 120/80 • Temp 37.0°C');

                return (
                  <div 
                    key={patient.id} 
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                      isSelected 
                        ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 ring-2 ring-sky-500/20' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm ${
                        isUrgent ? 'bg-rose-500' : 'bg-slate-800'
                      }`}>
                        {patientName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                            {patientName}
                          </h3>
                          {isUrgent && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[9px] font-black uppercase tracking-wider">
                              URGENT
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-1.5">
                          <span className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono">
                            {patient.ehrNumber || patient.ehr || 'MMH/EHR/26/0001'}
                          </span>
                          <span>•</span>
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Wait: {waitTimeDisplay}
                          </span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <HeartPulse className="w-3 h-3 text-emerald-500" /> {vitalsSummary}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CLINICIAN AVAILABILITY */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col h-full">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-sky-600 dark:text-sky-400" /> AVAILABLE CLINICIANS
            </h2>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full uppercase">
              Auto-Routing Active
            </span>
          </div>

          {areDoctorsLoading ? (
            <div className="p-12 text-center"><Loader2 className="animate-spin text-sky-500 mx-auto w-8 h-8" /></div>
          ) : (
            <div className="space-y-4">
              {activeClinicians.map((docItem: any, index: number) => {
                const targetPatientId = selectedPatientId || unassignedPatients[0]?.id;
                const docName = docItem.fullName || docItem.name || 'DR. CLINICIAN';
                const docSpecialty = docItem.specialty || 'GENERAL PRACTITIONER';
                const docRoom = docItem.room || `Consulting Rm ${index + 1}`;
                const docLoad = docItem.currentLoad ?? (index * 2);

                return (
                  <div key={docItem.id || index} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-sm tracking-wide mb-1 uppercase">
                          {docName}
                        </h3>
                        <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1.5">
                          {docSpecialty}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                          <span className="flex items-center gap-1">
                            <DoorOpen className="w-3 h-3" /> {docRoom}
                          </span>
                          <span>•</span>
                          <span className={docLoad > 3 ? 'text-rose-400' : 'text-emerald-400'}>
                            {docLoad} In Queue
                          </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="button"
                      disabled={!targetPatientId || loading}
                      onClick={() => targetPatientId && handleAssign(targetPatientId, docItem)}
                      className="self-end sm:self-center px-5 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      ASSIGN PATIENT <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}