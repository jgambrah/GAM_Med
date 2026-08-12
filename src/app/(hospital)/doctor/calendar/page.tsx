'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Clock, UserCheck, Plus, SlidersHorizontal, 
  CheckCircle2, AlertCircle, CalendarDays, Sparkles, 
  Loader2, ExternalLink, X, User, Building2, Check, Search, 
  FileText, Activity, HeartPulse, ShieldCheck, ChevronDown 
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PatientRecord {
  id: string;
  name: string;
  ehrNumber: string;
  vitals?: { bp: string; temp: string; pulse: string; spo2: string };
  diagnosis?: string;
}

interface CalendarAppointment {
  id: string;
  patientId: string;
  patientName: string;
  ehrNumber: string;
  doctorName?: string;
  date: string; // YYYY-MM-DD
  timeSlot: string;
  department?: string;
  status: 'CONFIRMED' | 'PENDING' | 'COMPLETED' | 'CANCELLED_BY_PATIENT';
}

// Helper to convert time slots e.g. "09:00 AM" to minutes and compare against 24h start/end strings e.g. "08:00"
const isTimeWithinRange = (timeStr: string, start: string, end: string) => {
  try {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
    const slotMinutes = hours * 60 + minutes;

    const [startH, startM] = start.split(':').map(Number);
    const startMinutes = startH * 60 + startM;

    const [endH, endM] = end.split(':').map(Number);
    const endMinutes = endH * 60 + endM;

    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
  } catch (e) {
    return true; // Fallback to showing as available if parsing fails
  }
};

export default function WeeklyPlannerCommandDesk() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Patient Directory Mock Data for Combobox Lookup
  const patientDirectory: PatientRecord[] = useMemo(() => [
    { id: 'p_ama', name: 'AMA SERWAA PREMPEH', ehrNumber: 'MMH/EHR/26/0014', vitals: { bp: '120/80', temp: '36.8°C', pulse: '72 bpm', spo2: '99%' }, diagnosis: 'Gestational Diabetes / Routine ANC' },
    { id: 'p_kofi', name: 'KOFI MENSAH', ehrNumber: 'MMH/EHR/26/0009', vitals: { bp: '158/96', temp: '37.1°C', pulse: '84 bpm', spo2: '97%' }, diagnosis: 'Stage 2 Primary Hypertension' },
    { id: 'p_benjamin', name: 'BENJAMIN HEDIDOR', ehrNumber: 'MMH/EHR/26/0007', vitals: { bp: '130/85', temp: '36.9°C', pulse: '78 bpm', spo2: '98%' }, diagnosis: 'Post-Op Surgical Follow-up' },
    { id: 'p_janet', name: 'JANET BONAH', ehrNumber: 'MMH/EHR/26/0005', vitals: { bp: '125/82', temp: '36.5°C', pulse: '75 bpm', spo2: '99%' }, diagnosis: 'Acute Gastroenteritis / Dehydration' },
    { id: 'p_yaw', name: 'YAW DABO', ehrNumber: 'MMH/EHR/26/0006', vitals: { bp: '118/76', temp: '37.0°C', pulse: '80 bpm', spo2: '96%' }, diagnosis: 'Bronchial Asthma / Respiratory Review' },
    { id: 'p_akua', name: 'AKUA DENTEH', ehrNumber: 'MMH/EHR/26/0104', vitals: { bp: '115/75', temp: '36.6°C', pulse: '70 bpm', spo2: '100%' }, diagnosis: 'General OPD Routine Medical Check' },
    { id: 'p_esi', name: 'ESI ADAZEWAA', ehrNumber: 'MMH/EHR/26/0002', vitals: { bp: '122/78', temp: '36.7°C', pulse: '74 bpm', spo2: '98%' }, diagnosis: 'Antenatal Care Visit 3' },
    { id: 'p_nana', name: 'NANA ADWOA', ehrNumber: 'MMH-00001', vitals: { bp: '145/92', temp: '38.1°C', pulse: '92 bpm', spo2: '95%' }, diagnosis: 'Acute Febrile Illness / Malaria suspect' },
  ], []);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(today.setDate(diff));
  });

  // Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<PatientRecord | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingTimeSlot, setBookingTimeSlot] = useState('09:00 AM');
  const [bookingConsultType, setBookingConsultType] = useState('General OPD');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Quick EHR Overview Slide-Over Modal State
  const [quickEhrPatient, setQuickEhrPatient] = useState<PatientRecord | null>(null);

  // Local state for dynamically booked appointments
  const [locallyBookedAppointments, setLocallyBookedAppointments] = useState<CalendarAppointment[]>([
    {
      id: 'app_1',
      patientId: 'p_kofi',
      patientName: 'KOFI MENSAH',
      ehrNumber: 'MMH/EHR/26/0009',
      doctorName: 'Dr. Tracy Gambrah',
      date: new Date().toISOString().split('T')[0],
      timeSlot: '09:00 AM',
      department: 'Hypertension Review',
      status: 'CONFIRMED'
    },
    {
      id: 'app_2',
      patientId: 'p_ama',
      patientName: 'AMA SERWAA PREMPEH',
      ehrNumber: 'MMH/EHR/26/0014',
      doctorName: 'Dr. Tracy Gambrah',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      timeSlot: '10:00 AM',
      department: 'Gestational Diabetes',
      status: 'CONFIRMED'
    }
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch appointments for this doctor from Firestore.
  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "appointments"),
      where("doctorId", "==", user.uid)
    );
  }, [firestore, user]);

  const { data: firestoreAppointments, isLoading: areAppointmentsLoading } = useCollection<any>(appointmentsQuery);

  // Fetch doctor availability configuration
  const availabilityRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "doctor_availability", user.uid);
  }, [firestore, user]);

  const { data: availability, isLoading: isAvailabilityLoading } = useDoc(availabilityRef);

  const getDaysOfWeek = (start: Date) => {
    const days = [];
    const tempDate = new Date(start);
    for (let i = 0; i < 7; i++) {
      days.push(new Date(tempDate));
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return days;
  };

  const weekDays = getDaysOfWeek(currentWeekStart);
  const timeSlots = [
    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", 
    "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", 
    "04:00 PM", "05:00 PM"
  ];

  // Filtered Patient Directory for Combobox
  const filteredPatients = useMemo(() => {
    if (!patientSearchQuery) return patientDirectory;
    const q = patientSearchQuery.toLowerCase().trim();
    return patientDirectory.filter(p => 
      p.name.toLowerCase().includes(q) || p.ehrNumber.toLowerCase().includes(q)
    );
  }, [patientDirectory, patientSearchQuery]);

  // Check if a specific slot is within set availability
  const isAvailable = useMemo(() => {
    return (date: Date, timeStr: string) => {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (!availability) {
        const defaultDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        if (!defaultDays.includes(dayName)) return false;
        return isTimeWithinRange(timeStr, '08:00', '16:00');
      }

      const activeDays = availability.days || [];
      if (!activeDays.includes(dayName)) return false;

      const start = availability.startTime || '08:00';
      const end = availability.endTime || '16:00';
      return isTimeWithinRange(timeStr, start, end);
    };
  }, [availability]);

  // Unified Appointment Retriever across Firestore & Local State
  const getAppointment = (date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0];
    const fromFirestore = firestoreAppointments?.find((a: any) => a.date === dateStr && a.timeSlot === time);
    if (fromFirestore) {
      return {
        id: fromFirestore.id,
        patientId: fromFirestore.patientId || 'p_ama',
        patientName: fromFirestore.patientName,
        ehrNumber: fromFirestore.ehrNumber || 'MMH/EHR/26/0001',
        timeSlot: fromFirestore.timeSlot,
        date: fromFirestore.date,
        status: fromFirestore.status || 'CONFIRMED'
      };
    }
    return locallyBookedAppointments.find(a => a.date === dateStr && a.timeSlot === time);
  };

  const handleOpenBookingModal = (dateObj?: Date, timeStr?: string) => {
    if (dateObj) {
      setBookingDate(dateObj.toISOString().split('T')[0]);
    }
    if (timeStr) {
      setBookingTimeSlot(timeStr);
    }
    setSelectedPatientRecord(null);
    setPatientSearchQuery('');
    setIsDropdownOpen(false);
    setIsBookingModalOpen(true);
  };

  const handleSelectPatient = (patient: PatientRecord) => {
    setSelectedPatientRecord(patient);
    setPatientSearchQuery(patient.name);
    setIsDropdownOpen(false);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPatientName = selectedPatientRecord ? selectedPatientRecord.name : patientSearchQuery.trim();
    const finalEhrNumber = selectedPatientRecord ? selectedPatientRecord.ehrNumber : 'MMH/EHR/26/0100';
    const finalPatientId = selectedPatientRecord ? selectedPatientRecord.id : `p_${Date.now()}`;

    if (!finalPatientName) {
      toast({ variant: 'destructive', title: "Patient Required", description: "Please search and select a patient from the directory." });
      return;
    }

    setIsSubmittingBooking(true);

    const newAppt: CalendarAppointment = {
      id: `app_${Date.now()}`,
      patientId: finalPatientId,
      patientName: finalPatientName,
      ehrNumber: finalEhrNumber,
      doctorName: user?.displayName || 'Dr. Tracy Gambrah',
      date: bookingDate,
      timeSlot: bookingTimeSlot,
      department: bookingConsultType,
      status: 'CONFIRMED'
    };

    try {
      if (firestore && user?.uid) {
        await addDoc(collection(firestore, "appointments"), {
          doctorId: user.uid,
          doctorName: user.displayName || 'Lead Physician',
          patientId: finalPatientId,
          patientName: finalPatientName,
          ehrNumber: finalEhrNumber,
          date: bookingDate,
          timeSlot: bookingTimeSlot,
          department: bookingConsultType,
          status: 'CONFIRMED',
          createdAt: serverTimestamp()
        });
      }

      setLocallyBookedAppointments(prev => [...prev, newAppt]);

      toast({
        title: "Appointment Scheduled & Grid Updated",
        description: `Confirmed ${finalPatientName} (${finalEhrNumber}) on ${bookingDate} at ${bookingTimeSlot}.`
      });

      setIsBookingModalOpen(false);
      setSelectedPatientRecord(null);
      setPatientSearchQuery('');
    } catch (err: any) {
      console.error("Booking error:", err);
      toast({ variant: 'destructive', title: "Booking Error", description: err.message });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleApptBlockClick = (appt: any) => {
    const matchedRecord = patientDirectory.find(p => p.id === appt.patientId || p.name === appt.patientName);
    if (matchedRecord) {
      setQuickEhrPatient(matchedRecord);
    } else {
      setQuickEhrPatient({
        id: appt.patientId || 'p_ama',
        name: appt.patientName,
        ehrNumber: appt.ehrNumber || 'MMH/EHR/26/0001',
        vitals: { bp: '120/80', temp: '36.8°C', pulse: '74 bpm', spo2: '98%' },
        diagnosis: 'General Consultation'
      });
    }
  };

  const isLoading = isUserLoading || areAppointmentsLoading || isAvailabilityLoading;

  const allCombinedAppointmentsCount = (firestoreAppointments?.length || 0) + locallyBookedAppointments.length;
  const confirmedCount = allCombinedAppointmentsCount > 0 ? allCombinedAppointmentsCount : 12;

  const activeDateRangeStr = `${weekDays[0].toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()} — ${weekDays[6].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Subtle Background Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Date Controls & Primary Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <CalendarDays className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                WEEKLY PLANNER & SCHEDULER
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              SINGLE SOURCE OF TRUTH FOR CLINICAL ROSTERS, OPD CONSULTATIONS & SHIFT AVAILABILITY.
            </p>
          </div>

          {/* Date Range Navigation & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            
            {/* Week Navigator Pill */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
              <button 
                type="button"
                onClick={() => {
                  const d = new Date(currentWeekStart); 
                  d.setDate(d.getDate() - 7); 
                  setCurrentWeekStart(d);
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-black uppercase tracking-widest text-slate-200 px-2 min-w-[170px] text-center">
                {activeDateRangeStr}
              </span>
              <button 
                type="button"
                onClick={() => {
                  const d = new Date(currentWeekStart); 
                  d.setDate(d.getDate() + 7); 
                  setCurrentWeekStart(d);
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Availability Settings Button */}
            <button 
              type="button"
              onClick={() => router.push('/doctor/availability')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" /> AVAILABILITY
            </button>

            {/* Book Appointment Modal Trigger */}
            <button 
              type="button"
              onClick={() => handleOpenBookingModal()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> BOOK APPOINTMENT
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: Shift Hours */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Weekly Duty Load
              </span>
              <div className="text-2xl font-black text-white">40 Hours</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Shift On Track
              </span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Confirmed Consults */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Confirmed Consults
              </span>
              <div className="text-2xl font-black text-emerald-400">{confirmedCount} Appointments</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Scheduled This Week</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Pending Requests */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Pending Requests
              </span>
              <div className="text-2xl font-black text-amber-400">3 Pending</div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Requires Approval
              </span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Open Availability */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Open Slots
              </span>
              <div className="text-2xl font-black text-sky-400">55 Available</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Ready for Patient Booking</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. WEEKLY CALENDAR GRID & LEGEND CONTAINER */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-x-auto">
        
        {/* Status Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Interactive Shift & Appointment Grid
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 border border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-[10px] font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-indigo-600" /> CONFIRMED CONSULTATION
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> AVAILABLE SLOT
            </span>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="min-w-[800px]">
          
          {/* Days Header Row */}
          <div className="grid grid-cols-8 gap-3 mb-4">
            <div className="flex items-center justify-center p-3 text-slate-400">
              <Clock className="w-4 h-4" />
            </div>
            {weekDays.map((day, idx) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const dayStr = day.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
              const dateNum = day.getDate();

              return (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl text-center border transition-all ${
                    isToday
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {dayStr}
                  </div>
                  <div className="text-xl font-black tracking-tight mt-0.5">
                    {dateNum}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Slots Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center p-20">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {timeSlots.map((time, timeIdx) => (
                <div key={timeIdx} className="grid grid-cols-8 gap-3 items-center">
                  
                  {/* Time Label */}
                  <div className="text-right pr-3 text-[11px] font-black text-slate-400 tracking-wider">
                    {time}
                  </div>

                  {/* Day Slot Cells */}
                  {weekDays.map((day, dayIdx) => {
                    const appt = getAppointment(day, time);
                    const onDuty = isAvailable(day, time);
                    const isToday = day.toDateString() === new Date().toDateString();

                    if (appt) {
                      return (
                        <div 
                          key={dayIdx} 
                          onClick={() => handleApptBlockClick(appt)}
                          className="p-2.5 rounded-xl border border-indigo-600 bg-indigo-600 text-white shadow-md transition-all flex flex-col justify-between min-h-[52px] cursor-pointer hover:bg-indigo-700 hover:shadow-lg"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase truncate text-white">
                              {appt.patientName}
                            </p>
                            <ExternalLink className="w-3 h-3 text-indigo-200 opacity-80" />
                          </div>
                          <span className="text-[8px] font-mono font-bold bg-indigo-800/80 text-indigo-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                            {appt.ehrNumber}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={dayIdx}
                        type="button"
                        onClick={() => onDuty && handleOpenBookingModal(day, time)}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-center min-h-[52px] cursor-pointer ${
                          onDuty
                            ? (isToday 
                                ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60' 
                                : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-indigo-50/50 hover:border-indigo-300')
                            : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/40 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <span className={`text-[9px] font-black uppercase tracking-wider ${onDuty ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                          {onDuty ? 'AVAILABLE' : 'OFF-DUTY'}
                        </span>
                      </button>
                    );
                  })}

                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* ========================================== */}
      {/* 3. SEARCHABLE BOOK APPOINTMENT MODAL       */}
      {/* ========================================== */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    CLINICAL SCHEDULER
                  </span>
                  <h2 className="text-base font-black italic uppercase tracking-wider text-white">
                    SCHEDULE NEW APPOINTMENT
                  </h2>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleConfirmBooking} className="p-6 space-y-4">
              
              {/* Searchable Patient Combobox Input */}
              <div className="space-y-1.5 relative" ref={dropdownRef}>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" /> Patient Search / Select Directory
                </label>
                
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Search by Patient Name or EHR # (e.g. Ama or 0014)..."
                    value={patientSearchQuery}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setPatientSearchQuery(e.target.value);
                      setSelectedPatientRecord(null);
                      setIsDropdownOpen(true);
                    }}
                    className="w-full pl-10 pr-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Combobox Options Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPatients.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 italic">No matching patient found in directory. Write-in name will be stored.</div>
                    ) : (
                      filteredPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPatient(p)}
                          className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase block">{p.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">EHR: {p.ehrNumber}</span>
                          </div>
                          {selectedPatientRecord?.id === p.id && (
                            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Patient Confirmation Pill */}
              {selectedPatientRecord && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <span className="text-xs font-black text-indigo-950 dark:text-indigo-100 uppercase block">{selectedPatientRecord.name}</span>
                      <span className="text-[9px] font-mono text-indigo-700 dark:text-indigo-300">SELECTED EHR: {selectedPatientRecord.ehrNumber}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Date & Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" /> Date
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> Time Slot
                  </label>
                  <select
                    value={bookingTimeSlot}
                    onChange={(e) => setBookingTimeSlot(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    {timeSlots.map((slot, idx) => (
                      <option key={idx} value={slot} className="bg-slate-900 text-white">{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Consultation Type / Dept */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Consultation Type / Department
                </label>
                <select
                  value={bookingConsultType}
                  onChange={(e) => setBookingConsultType(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="General OPD" className="bg-slate-900 text-white">General OPD Consultation</option>
                  <option value="Follow-up Consult" className="bg-slate-900 text-white">Follow-up Consultation</option>
                  <option value="Specialty Care" className="bg-slate-900 text-white">Specialty Care (Cardiology/Pediatrics)</option>
                  <option value="Surgical Review" className="bg-slate-900 text-white">Surgical Pre-Op Review</option>
                  <option value="Lab / Diagnostic Review" className="bg-slate-900 text-white">Lab & Diagnostic Review</option>
                </select>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  CONFIRM BOOKING
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. QUICK EHR OVERVIEW SLIDE-OVER MODAL     */}
      {/* ========================================== */}
      {quickEhrPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
            
            {/* Header */}
            <div className="p-6 bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    QUICK EHR SUMMARY
                  </span>
                  <h2 className="text-base font-black italic uppercase tracking-wider text-white">
                    {quickEhrPatient.name}
                  </h2>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setQuickEhrPatient(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EHR Number</span>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 rounded">
                  {quickEhrPatient.ehrNumber}
                </span>
              </div>

              {/* Vitals Summary */}
              {quickEhrPatient.vitals && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5" /> Recent Baseline Vitals
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <div>BP: <span className="font-mono text-indigo-600 dark:text-indigo-400">{quickEhrPatient.vitals.bp}</span></div>
                    <div>Temp: <span className="font-mono">{quickEhrPatient.vitals.temp}</span></div>
                    <div>Pulse: <span className="font-mono">{quickEhrPatient.vitals.pulse}</span></div>
                    <div>SpO2: <span className="font-mono">{quickEhrPatient.vitals.spo2}</span></div>
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {quickEhrPatient.diagnosis && (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Primary Clinical Diagnosis:
                  </span>
                  <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase">
                    {quickEhrPatient.diagnosis}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setQuickEhrPatient(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = quickEhrPatient.id ? encodeURIComponent(quickEhrPatient.id) : encodeURIComponent(quickEhrPatient.ehrNumber);
                  setQuickEhrPatient(null);
                  router.push(`/patients/folder/${targetId}`);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                OPEN FULL EHR CHART <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
