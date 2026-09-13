'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
  CalendarDays, Clock, Search, Filter, Plus, 
  ChevronLeft, ChevronRight, UserCheck, Activity, 
  CheckCircle2, XCircle, MoreHorizontal, Loader2, 
  ShieldAlert, Check, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, addDays, subDays } from 'date-fns';
import Link from 'next/link';

type Appointment = {
  id: string;
  patientName: string;
  patientId: string;
  doctorName?: string;
  department?: string;
  timeSlot: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'CANCELLED_BY_PATIENT' | 'CHECKED IN' | 'CHECKED_IN' | 'IN SESSION' | 'IN_SESSION' | 'NO SHOW';
  ehrNumber?: string;
  checkedInAt?: string;
  date?: string;
  [key: string]: any;
};

export default function AppointmentsQueueHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [currentDateObj, setCurrentDateObj] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const todayStr = useMemo(() => {
    return currentDateObj.toISOString().split('T')[0];
  }, [currentDateObj]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId || 'default-hospital';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'NURSE', 'RECEPTIONIST'].includes(userProfile?.role || '');

  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, 'appointments'),
      where('hospitalId', '==', hospitalId),
      where('date', '==', todayStr),
      orderBy('timeSlot', 'asc')
    );
  }, [firestore, hospitalId, todayStr]);

  const { data: rawAppointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

  // Fallback demo appointments if Firestore is empty for demonstration
  const demoAppointments: Appointment[] = useMemo(() => [
    { id: '1', timeSlot: '08:00 AM', patientName: 'AKUA DENTEH', ehrNumber: 'MMH/EHR/26/0104', doctorName: 'Dr. Tracy Gambrah', department: 'General OPD', status: 'CHECKED_IN', patientId: 'p1' },
    { id: '2', timeSlot: '08:30 AM', patientName: 'KOFI MENSAH', ehrNumber: 'MMH/EHR/26/0009', doctorName: 'Dr. James Obrempong', department: 'Surgical Consult', status: 'IN_SESSION', patientId: 'p2' },
    { id: '3', timeSlot: '09:00 AM', patientName: 'AMA SERWAA', ehrNumber: 'MMH/EHR/26/0014', doctorName: 'Dr. Tracy Gambrah', department: 'General OPD', status: 'CONFIRMED', patientId: 'p3' },
    { id: '4', timeSlot: '09:45 AM', patientName: 'YAW DABO', ehrNumber: 'MMH/EHR/26/0006', doctorName: 'Dr. Sarah Osei', department: 'Cardiology', status: 'CONFIRMED', patientId: 'p4' },
    { id: '5', timeSlot: '10:30 AM', patientName: 'JANET BONAH', ehrNumber: 'MMH/EHR/26/0005', doctorName: 'Dr. James Obrempong', department: 'General OPD', status: 'NO SHOW', patientId: 'p5' },
  ], []);

  const [appointments, setAppointments] = useState<Appointment[]>(demoAppointments);

  // Helper to persist appointments to localStorage
  const saveAppointmentsToStore = (updated: Appointment[]) => {
    try {
      const json = JSON.stringify(updated);
      localStorage.setItem(`gam_appointments_data_${hospitalId}`, json);
      localStorage.setItem('gam_appointments_data', json);
    } catch (err) {
      console.warn("Error saving appointments to store:", err);
    }
  };

  // Hydrate persistent state from localStorage first, then merge or fallback to Firestore/demo
  useEffect(() => {
    try {
      const storageKey = `gam_appointments_data_${hospitalId}`;
      const stored = localStorage.getItem(storageKey) || localStorage.getItem('gam_appointments_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (rawAppointments && rawAppointments.length > 0) {
            // Merge rawAppointments while preserving local checked-in status and timestamps
            const storedMap = new Map(parsed.map((a: Appointment) => [a.id, a]));
            const merged = rawAppointments.map((r: Appointment) => {
              const local = storedMap.get(r.id);
              if (local && (local.status === 'CHECKED_IN' || local.status === 'CHECKED IN' || local.status === 'COMPLETED')) {
                return { ...r, status: local.status, checkedInAt: local.checkedInAt };
              }
              return local || r;
            });
            const rawIds = new Set(rawAppointments.map((r: Appointment) => r.id));
            parsed.forEach((p: Appointment) => {
              if (!rawIds.has(p.id)) merged.push(p);
            });
            setAppointments(merged);
          } else {
            setAppointments(parsed);
          }
          return;
        }
      }

      // If no stored state in localStorage, use Firestore or demo fallback
      if (rawAppointments && rawAppointments.length > 0) {
        setAppointments(rawAppointments);
      } else {
        setAppointments(demoAppointments);
      }
    } catch (err) {
      console.warn("Could not load stored appointments from localStorage:", err);
      setAppointments(demoAppointments);
    }
  }, [hospitalId, rawAppointments, demoAppointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || (
        app.patientName?.toLowerCase().includes(q) || 
        app.ehrNumber?.toLowerCase().includes(q) || 
        app.doctorName?.toLowerCase().includes(q)
      );
      
      if (statusFilter !== 'all') {
        const s = app.status?.toUpperCase();
        if (statusFilter === 'scheduled') return matchQuery && (s === 'CONFIRMED' || s === 'PENDING' || s === 'SCHEDULED');
        if (statusFilter === 'checked-in') return matchQuery && (s === 'CHECKED IN' || s === 'CHECKED_IN' || s === 'COMPLETED');
        if (statusFilter === 'in-session') return matchQuery && (s === 'IN SESSION' || s === 'IN_SESSION');
      }
      return matchQuery;
    });
  }, [appointments, searchQuery, statusFilter]);

  // Dynamic KPI Metrics computed from active appointments array
  const totalScheduled = appointments.length;
  const checkedInCount = useMemo(() => {
    return appointments.filter(a => {
      const s = a.status?.toUpperCase();
      return s === 'CHECKED_IN' || s === 'CHECKED IN' || s === 'COMPLETED' || s === 'IN SESSION' || s === 'IN_SESSION';
    }).length;
  }, [appointments]);

  const pendingCount = useMemo(() => {
    return appointments.filter(a => {
      const s = a.status?.toUpperCase();
      return s === 'CONFIRMED' || s === 'PENDING' || s === 'SCHEDULED';
    }).length;
  }, [appointments]);

  const cancelledCount = useMemo(() => {
    return appointments.filter(a => {
      const s = a.status?.toUpperCase();
      return s === 'CANCELLED' || s === 'CANCELLED_BY_PATIENT' || s === 'NO SHOW' || s === 'NO_SHOW';
    }).length;
  }, [appointments]);

  const handlePrevDay = () => {
    setCurrentDateObj(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setCurrentDateObj(prev => addDays(prev, 1));
  };

  const handleUpdateStatus = async (id: string, status: Appointment['status']) => {
    const updated = appointments.map(apt => 
      apt.id === id ? { ...apt, status } : apt
    );
    setAppointments(updated);
    saveAppointmentsToStore(updated);
    toast({ title: `Appointment status updated to ${status.replace('_', ' ')}` });

    if (!firestore) return;
    try {
      const targetAppt = updated.find(a => a.id === id);
      const appointmentRef = doc(firestore, 'appointments', id);
      await setDoc(appointmentRef, {
        ...(targetAppt || {}),
        status,
        hospitalId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err: any) {
      console.warn("Status update fallback applied locally:", err);
    }
  };

  const handleCheckIn = async (appointmentOrId: string | Appointment) => {
    const appointmentId = typeof appointmentOrId === 'string' ? appointmentOrId : appointmentOrId.id;
    const target = appointments.find(a => a.id === appointmentId) || (typeof appointmentOrId === 'object' ? appointmentOrId : null);
    
    if (!target) return;

    const checkedInAt = new Date().toISOString();

    // 1. Persistent State Mutation in Data Store / LocalStorage
    const updated = appointments.map(apt => 
      apt.id === appointmentId 
        ? { ...apt, status: 'CHECKED_IN' as const, checkedInAt } 
        : apt
    );
    setAppointments(updated);
    saveAppointmentsToStore(updated);

    toast({ 
      title: "Patient Checked In", 
      description: `${target.patientName} has been checked in and queued for Nurse Triage.` 
    });

    const nameParts = (target.patientName || 'PATIENT').trim().split(' ');
    const firstName = nameParts[0] || 'PATIENT';
    const lastName = nameParts.slice(1).join(' ') || '';
    const patientKey = target.patientId || `p_${appointmentId}`;
    const ehrNumber = target.ehrNumber || `MMH/EHR/26/000${appointmentId}`;

    // 2. Push to Nurse Triage Shared Local Stores (gam_checked_in_patients & triage_patients)
    try {
      const triageStorageKey = `gam_checked_in_patients_${hospitalId}`;
      const existingCheckedIns = JSON.parse(localStorage.getItem(triageStorageKey) || '{}');
      existingCheckedIns[patientKey] = {
        id: patientKey,
        firstName,
        lastName,
        patientName: target.patientName,
        ehrNumber,
        status: 'Awaiting Vitals',
        currentStatus: 'CHECKED_IN',
        checkedInAt,
        checkInTime: checkedInAt,
        chiefComplaint: target.department ? `Appointment: ${target.department}` : 'Medical Review / Scheduled Consultation',
        urgencyPriority: 'ROUTINE',
        doctorName: target.doctorName || 'Lead Clinician',
        department: target.department || 'General OPD'
      };
      localStorage.setItem(triageStorageKey, JSON.stringify(existingCheckedIns));
      localStorage.setItem('gam_checked_in_patients', JSON.stringify(existingCheckedIns));
    } catch (err) {
      console.warn("Could not save to gam_checked_in_patients:", err);
    }

    try {
      const existingTriageList = JSON.parse(localStorage.getItem('triage_patients') || '[]');
      const newTriageEntry = {
        id: patientKey,
        patientId: patientKey,
        firstName,
        lastName,
        patientName: target.patientName,
        ehrNumber,
        status: 'AWAITING_VITALS',
        currentStatus: 'CHECKED_IN',
        checkedInAt,
        checkInTime: checkedInAt,
        chiefComplaint: target.department ? `Appointment: ${target.department}` : 'Medical Review / Scheduled Consultation',
        urgencyPriority: 'ROUTINE',
        doctorName: target.doctorName || 'Lead Clinician',
        department: target.department || 'General OPD'
      };
      const filtered = existingTriageList.filter((item: any) => item.id !== patientKey);
      filtered.unshift(newTriageEntry);
      localStorage.setItem('triage_patients', JSON.stringify(filtered));
    } catch (err) {
      console.warn("Could not save to triage_patients:", err);
    }

    // 3. Persist to Firestore: appointment, patient doc, and triage_queue
    if (firestore) {
      try {
        const appointmentRef = doc(firestore, 'appointments', appointmentId);
        const patientRef = doc(firestore, `hospitals/${hospitalId}/patients`, patientKey);
        const triageQueueRef = doc(firestore, `hospitals/${hospitalId}/triage_queue`, patientKey);
        const rootTriageRef = doc(firestore, 'triage_queue', patientKey);

        const appointmentPayload = {
          ...target,
          status: 'CHECKED_IN',
          checkedInAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          hospitalId,
        };

        const patientPayload = {
          firstName,
          lastName,
          name: target.patientName,
          patientName: target.patientName,
          ehrNumber,
          status: 'Awaiting Vitals',
          currentStatus: 'CHECKED_IN',
          department: target.department || 'General OPD',
          doctorName: target.doctorName || 'Lead Clinician',
          hospitalId,
          checkedInAt: serverTimestamp(),
          checkInTime: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const triagePayload = {
          id: patientKey,
          patientId: patientKey,
          firstName,
          lastName,
          patientName: target.patientName,
          ehrNumber,
          status: 'AWAITING_VITALS',
          currentStatus: 'CHECKED_IN',
          chiefComplaint: target.department ? `Appointment: ${target.department}` : 'Medical Review / Scheduled Consultation',
          urgencyPriority: 'ROUTINE',
          hospitalId,
          createdAt: serverTimestamp(),
          checkedInAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await Promise.allSettled([
          setDoc(appointmentRef, appointmentPayload, { merge: true }),
          setDoc(patientRef, patientPayload, { merge: true }),
          setDoc(triageQueueRef, triagePayload, { merge: true }),
          setDoc(rootTriageRef, triagePayload, { merge: true }),
        ]);
      } catch (err: any) {
        console.warn("Firestore sync fallback applied locally:", err);
      }
    }
  };

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
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

  const activeDateFormatted = format(currentDateObj, 'MMM dd, yyyy').toUpperCase();

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Date Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-400">
                <CalendarDays className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                TODAY'S APPOINTMENTS QUEUE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              LIVE SCHEDULE MONITORING, PATIENT CHECK-IN & CLINICIAN ASSIGNMENT.
            </p>
          </div>

          {/* Date Navigation & Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            
            {/* Interactive Date Selector */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
              <button 
                type="button"
                onClick={handlePrevDay}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center px-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-sky-400">CURRENT DATE</span>
                <span className="text-xs font-black uppercase tracking-widest text-slate-200">
                  {activeDateFormatted}
                </span>
              </div>
              <button 
                type="button"
                onClick={handleNextDay}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Link href="/reception/assign-doctor">
              <button className="px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer">
                <Plus className="w-4 h-4" /> NEW APPOINTMENT
              </button>
            </Link>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: Total Scheduled */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Total Scheduled
              </span>
              <div className="text-2xl font-black text-white">{totalScheduled}</div>
              <span className="text-[10px] font-bold text-sky-400 mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Booked for today
              </span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Checked In */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Checked In
              </span>
              <div className="text-2xl font-black text-emerald-400">{checkedInCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Awaiting Triage/Doctor</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Pending Arrival */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Pending Arrival
              </span>
              <div className="text-2xl font-black text-amber-400">{pendingCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Yet to check in</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Cancellations / No Shows */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                No Shows & Cancels
              </span>
              <div className="text-2xl font-black text-rose-400">{cancelledCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Missed slots today</span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <XCircle className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER, SEARCH & DATA TABLE CONTAINER   */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Control Bar: Search & Filters */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Patient Name, EHR, or Clinician..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
              <Activity className="w-4 h-4 text-slate-400" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent focus:outline-none w-full cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">All Statuses</option>
                <option value="scheduled" className="bg-slate-900 text-white">Scheduled / Pending</option>
                <option value="checked-in" className="bg-slate-900 text-white">Checked In / Completed</option>
                <option value="in-session" className="bg-slate-900 text-white">In Session</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enterprise Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Time Slot
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Patient Details
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Clinician & Dept
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {areAppointmentsLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Loader2 className="animate-spin text-sky-500 mx-auto w-8 h-8" />
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    No appointments scheduled for {activeDateFormatted}.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appt) => {
                  const statusUpper = appt.status?.toUpperCase();

                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 whitespace-nowrap">
                          <Clock className="w-4 h-4 text-slate-400" /> {appt.timeSlot}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                          {appt.patientName}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                          EHR: <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono">{appt.ehrNumber || 'MMH/EHR/26/0001'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {appt.doctorName || 'Lead Clinician'}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                          {appt.department || 'General OPD'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(statusUpper === 'CONFIRMED' || statusUpper === 'PENDING' || statusUpper === 'SCHEDULED') && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {statusUpper}
                          </span>
                        )}
                        {(statusUpper === 'CHECKED IN' || statusUpper === 'CHECKED_IN' || statusUpper === 'COMPLETED') && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> {statusUpper.replace(/_/g, ' ')}
                          </span>
                        )}
                        {(statusUpper === 'IN SESSION' || statusUpper === 'IN_SESSION') && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" /> {statusUpper.replace(/_/g, ' ')}
                          </span>
                        )}
                        {(statusUpper === 'NO SHOW' || statusUpper === 'NO_SHOW' || statusUpper === 'CANCELLED' || statusUpper === 'CANCELLED_BY_PATIENT') && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> {statusUpper.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(statusUpper === 'CONFIRMED' || statusUpper === 'PENDING' || statusUpper === 'SCHEDULED') ? (
                          <button 
                            type="button"
                            onClick={() => handleCheckIn(appt)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer border border-slate-700"
                          >
                            CHECK IN
                          </button>
                        ) : (statusUpper === 'CHECKED IN' || statusUpper === 'CHECKED_IN' || statusUpper === 'COMPLETED') ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-lg">
                            <Check className="w-3.5 h-3.5" /> IN TRIAGE QUEUE
                          </span>
                        ) : (
                          <button 
                            type="button"
                            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
