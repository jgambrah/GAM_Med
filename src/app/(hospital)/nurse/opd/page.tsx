'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import {
  collection, query, where, orderBy, doc, 
  serverTimestamp, updateDoc
} from 'firebase/firestore';
import { 
  HeartPulse, Activity, Stethoscope, Clock, Users, 
  AlertCircle, ChevronRight, UserCheck, Loader2, 
  ShieldAlert, Sparkles, Filter, Search, DoorOpen, 
  CheckCircle2, ArrowRight, BedDouble, Plus, FileText,
  Volume2, ArrowRightLeft, ExternalLink, Flame
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Standardized Demo OPD Registry
const DEMO_OPD_PATIENTS = [
  {
    id: 'opd_01',
    name: 'BENJAMIN HEDIDOR',
    ehr: 'MMH/EHR/26/0007',
    age: 42,
    gender: 'M',
    acuity: 'URGENT',
    stage: 'Awaiting Doctor',
    assignedDoctor: 'Dr. Ama Adu',
    room: 'Consulting Room 1',
    vitals: { bp: '142/90', temp: '38.2°C', pulse: '92 bpm', spo2: '97%' },
    timeIn: '08:15 AM',
    complaint: 'High Fever & Severe Ear Discomfort'
  },
  {
    id: 'opd_02',
    name: 'NANA ADWOA',
    ehr: 'MMH/EHR/26/0001',
    age: 34,
    gender: 'F',
    acuity: 'URGENT',
    stage: 'In Consultation',
    assignedDoctor: 'Dr. Richard Yeboah',
    room: 'Consulting Room 2',
    vitals: { bp: '145/92', temp: '38.1°C', pulse: '94 bpm', spo2: '98%' },
    timeIn: '08:30 AM',
    complaint: 'Severe Migraine & Elevated BP'
  },
  {
    id: 'opd_03',
    name: 'DANIEL ANIM',
    ehr: 'MMH/EHR/26/0004',
    age: 28,
    gender: 'M',
    acuity: 'URGENT',
    stage: 'Awaiting Doctor',
    assignedDoctor: 'Dr. Tracy Gambrah',
    room: 'Consulting Room 4',
    vitals: { bp: '136/88', temp: '37.8°C', pulse: '88 bpm', spo2: '96%' },
    timeIn: '08:45 AM',
    complaint: 'Persistent Cough & Low Grade Fever'
  },
  {
    id: 'opd_04',
    name: 'ESI ADAZEWAA',
    ehr: 'MMH/EHR/26/0002',
    age: 29,
    gender: 'F',
    acuity: 'STANDARD',
    stage: 'Vitals Logged',
    assignedDoctor: 'Pending Assignment',
    room: 'Waiting Hall A',
    vitals: { bp: '120/80', temp: '36.8°C', pulse: '74 bpm', spo2: '99%' },
    timeIn: '09:00 AM',
    complaint: 'Routine Antenatal Follow-up'
  },
  {
    id: 'opd_05',
    name: 'YAW ANTWI',
    ehr: 'MMH/EHR/26/0003',
    age: 51,
    gender: 'M',
    acuity: 'STANDARD',
    stage: 'Vitals Logged',
    assignedDoctor: 'Pending Assignment',
    room: 'Waiting Hall A',
    vitals: { bp: '118/76', temp: '37.0°C', pulse: '72 bpm', spo2: '99%' },
    timeIn: '09:12 AM',
    complaint: 'General Malaise & Fatigue'
  },
  {
    id: 'opd_06',
    name: 'JANET BONAH',
    ehr: 'MMH/EHR/26/0005',
    age: 45,
    gender: 'F',
    acuity: 'STANDARD',
    stage: 'Vitals Logged',
    assignedDoctor: 'Pending Assignment',
    room: 'Waiting Hall B',
    vitals: { bp: '124/82', temp: '36.6°C', pulse: '70 bpm', spo2: '98%' },
    timeIn: '09:25 AM',
    complaint: 'Medication Refill & Blood Sugar Review'
  },
];

// Active Consulting Rooms Reference
const OPD_CONSULTING_ROOMS = [
  { room: 'Consulting Room 1', doctor: 'Dr. Ama Adu', specialty: 'GP / Family Med' },
  { room: 'Consulting Room 2', doctor: 'Dr. Richard Yeboah', specialty: 'Medical Officer' },
  { room: 'Consulting Room 4', doctor: 'Dr. Tracy Gambrah', specialty: 'Lead Physician' },
  { room: 'Consulting Room 5', doctor: 'Dr. James Obrempong', specialty: 'Surgical OPD' },
];

export default function OutpatientDeskPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | 'VITALS_LOGGED' | 'WAITING_DOC' | 'IN_CONSULT'>('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId || 'default-hospital';
  const isAuthorized = ['NURSE', 'DOCTOR', 'DIRECTOR', 'ADMIN'].includes(userProfile?.role || 'NURSE');

  // Dynamically Compute Consulting Rooms Active Queue Count from Roster
  const consultingRoomsWithDynamicLoad = useMemo(() => {
    return OPD_CONSULTING_ROOMS.map(crm => {
      const assignedPatients = DEMO_OPD_PATIENTS.filter(
        p => p.room === crm.room || (p.assignedDoctor && p.assignedDoctor.toLowerCase() === crm.doctor.toLowerCase())
      );
      const activeLoad = assignedPatients.length;
      const inConsult = assignedPatients.some(p => p.stage === 'In Consultation');

      return {
        ...crm,
        load: activeLoad,
        status: inConsult ? 'IN SESSION' : activeLoad === 0 ? 'OPEN' : 'AVAILABLE'
      };
    });
  }, []);

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    return DEMO_OPD_PATIENTS.filter(p => {
      // Stage filter
      if (stageFilter === 'VITALS_LOGGED' && p.stage !== 'Vitals Logged') return false;
      if (stageFilter === 'WAITING_DOC' && p.stage !== 'Awaiting Doctor') return false;
      if (stageFilter === 'IN_CONSULT' && p.stage !== 'In Consultation') return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || 
             p.ehr.toLowerCase().includes(q) || 
             p.complaint.toLowerCase().includes(q) ||
             p.assignedDoctor.toLowerCase().includes(q);
    });
  }, [stageFilter, searchQuery]);

  // Synchronized Accurate KPI Counters
  const totalActiveCount = DEMO_OPD_PATIENTS.length; // 6
  const vitalsLoggedPendingCount = DEMO_OPD_PATIENTS.filter(p => p.stage === 'Vitals Logged').length; // 3
  const awaitingDoctorAssignedCount = DEMO_OPD_PATIENTS.filter(p => p.stage === 'Awaiting Doctor').length; // 2
  const inConsultCount = DEMO_OPD_PATIENTS.filter(p => p.stage === 'In Consultation').length; // 1
  const urgentCount = DEMO_OPD_PATIENTS.filter(p => p.acuity === 'URGENT').length; // 3

  // Action Handlers
  const handleCallPatient = (patient: any) => {
    toast({
      title: "🔊 Patient Callout Broadcasted!",
      description: `Calling ${patient.name} (${patient.ehr}) to ${patient.room} (${patient.assignedDoctor}) on OPD waiting TV screens.`
    });
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
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

  const nurseName = userProfile?.fullName || 'Alice Tsifokor';
  const nurseInitials = nurseName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'AT';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* ========================================================================= */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER & ACCURATE SYNCHRONIZED KPIS        */}
      {/* ========================================================================= */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-800 space-y-6">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-rose-400">
                <HeartPulse className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-widest">
                    Outpatient Nursing Command
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    • OPD-DESK-2026
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-0.5">
                  Outpatient Desk (OPD)
                </h1>
              </div>
            </div>
            <p className="mt-1 text-xs md:text-sm text-slate-400 font-medium max-w-2xl">
              Real-time outpatient consultation monitoring, synchronized room load telemetry, and contextual clinical actions.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 self-start md:self-auto shadow-inner">
            <div className="w-9 h-9 rounded-full bg-rose-950 border border-rose-700/60 flex items-center justify-center font-black text-rose-400 text-xs">
              {nurseInitials}
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide uppercase">{nurseName}</div>
              <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Outpatient Charge Nurse</div>
            </div>
          </div>
        </div>

        {/* Dynamic Synchronized Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: Total Active OPD */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Total Active OPD
              </span>
              <div className="text-2xl font-black text-white">{totalActiveCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                {urgentCount} High Acuity Alerts
              </span>
            </div>
            <div className="p-3 bg-slate-800 text-slate-300 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Vitals Logged (Pending Assignment) */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Pending Assignment
              </span>
              <div className="text-2xl font-black text-sky-400">{vitalsLoggedPendingCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Vitals Logged • In Hall</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Awaiting Doctor (Assigned to Room) */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Awaiting Doctor
              </span>
              <div className="text-2xl font-black text-amber-400">{awaitingDoctorAssignedCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Outside Room Queue</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <DoorOpen className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: In Active Consult */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                In Active Consult
              </span>
              <div className="text-2xl font-black text-emerald-400">{inConsultCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">With Clinicians</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Stethoscope className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SYNCHRONIZED CONSULTING ROOMS LIVE TELEMETRY                           */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-indigo-500" />
              Active Consulting Rooms & Clinician Status
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Real-time room occupancy directly calculated from active roster assignments.</p>
          </div>
          <Link 
            href="/reception/assign-doctor" 
            className="text-[10px] font-black text-blue-600 hover:text-blue-500 uppercase tracking-wider flex items-center gap-1"
          >
            <span>Assign Patients</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {consultingRoomsWithDynamicLoad.map((crm, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black text-slate-900 dark:text-white">{crm.room}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                  crm.status === 'OPEN' ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" :
                  crm.status === 'AVAILABLE' ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300" :
                  "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                )}>
                  {crm.status}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{crm.doctor}</div>
              <div className="text-[10px] text-slate-400">{crm.specialty}</div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-500">Active Queue:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {crm.load} {crm.load === 1 ? 'Patient' : 'Patients'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. OPD PATIENT ROSTER WITH CONTEXTUAL ACTIONS                            */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-500" />
              Outpatient Roster ({filteredPatients.length})
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Track patient progress from triage vitals to consultation completion.</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, EHR, or doctor..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
            />
          </div>
        </div>

        {/* Quick Filter Chips (Synchronized naming and counts) */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* All Tab */}
          <button
            type="button"
            onClick={() => setStageFilter('ALL')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
              stageFilter === 'ALL' 
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            )}
          >
            All Active ({totalActiveCount})
          </button>

          {/* Vitals Logged (Pending Assignment) Tab */}
          <button
            type="button"
            onClick={() => setStageFilter('VITALS_LOGGED')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
              stageFilter === 'VITALS_LOGGED' 
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/60"
            )}
          >
            Pending Assignment ({vitalsLoggedPendingCount})
          </button>

          {/* Awaiting Doctor (Assigned) Tab */}
          <button
            type="button"
            onClick={() => setStageFilter('WAITING_DOC')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
              stageFilter === 'WAITING_DOC' 
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60"
            )}
          >
            Awaiting Doctor ({awaitingDoctorAssignedCount})
          </button>

          {/* In Consultation Tab */}
          <button
            type="button"
            onClick={() => setStageFilter('IN_CONSULT')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
              stageFilter === 'IN_CONSULT' 
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60"
            )}
          >
            In Consultation ({inConsultCount})
          </button>
        </div>

        {/* Table View with Contextual Actions */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Patient Details</th>
                <th className="p-3.5">Triage Vitals</th>
                <th className="p-3.5">Chief Complaint</th>
                <th className="p-3.5">Assigned Clinician & Room</th>
                <th className="p-3.5">OPD Stage</th>
                <th className="p-3.5 text-right">Contextual Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredPatients.map((patient) => {
                const isUrgent = patient.acuity === 'URGENT';

                return (
                  <tr key={patient.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    
                    {/* Patient Name & EHR */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="font-black text-slate-900 dark:text-white uppercase">{patient.name}</div>
                        {isUrgent && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5">
                            <Flame className="w-2 h-2" />
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {patient.ehr} • {patient.age}y / {patient.gender}
                      </div>
                    </td>

                    {/* Vitals */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        BP: {patient.vitals.bp} • {patient.vitals.temp}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Pulse: {patient.vitals.pulse} • SpO2: {patient.vitals.spo2}
                      </div>
                    </td>

                    {/* Chief Complaint */}
                    <td className="p-3.5 max-w-xs truncate text-slate-700 dark:text-slate-300">
                      {patient.complaint}
                    </td>

                    {/* Assigned Clinician */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{patient.assignedDoctor}</div>
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">{patient.room}</div>
                    </td>

                    {/* OPD Stage */}
                    <td className="p-3.5">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        patient.stage === 'In Consultation' ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" :
                        patient.stage === 'Awaiting Doctor' ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300" :
                        "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
                      )}>
                        {patient.stage}
                      </span>
                    </td>

                    {/* Contextual Row Actions */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Case A: Vitals Logged (Needs Doctor Assignment) */}
                        {patient.stage === 'Vitals Logged' && (
                          <Link
                            href="/reception/assign-doctor"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow transition inline-flex items-center gap-1 uppercase tracking-wider"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Assign Room &gt;</span>
                          </Link>
                        )}

                        {/* Case B: Awaiting Doctor (Assigned to Room -> Call Patient & Chart) */}
                        {patient.stage === 'Awaiting Doctor' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCallPatient(patient)}
                              className="px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 transition inline-flex items-center gap-1 cursor-pointer"
                              title="Broadcast patient chime to waiting TV"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Call Patient</span>
                            </button>
                            <Link
                              href="/patients"
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Chart</span>
                            </Link>
                          </>
                        )}

                        {/* Case C: In Consultation (Active Encounter) */}
                        {patient.stage === 'In Consultation' && (
                          <Link
                            href="/patients"
                            className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl transition inline-flex items-center gap-1 uppercase tracking-wider"
                          >
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-500" />
                            <span>View Encounter</span>
                          </Link>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
