'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Clock, UserCheck, Plus, SlidersHorizontal, 
  CheckCircle2, AlertCircle, CalendarDays, Sparkles, 
  Loader2, ExternalLink 
} from 'lucide-react';
import Link from 'next/link';

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
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(today.setDate(diff));
  });

  // Fetch appointments for this doctor.
  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "appointments"),
      where("doctorId", "==", user.uid)
    );
  }, [firestore, user]);

  const { data: appointments, isLoading: areAppointmentsLoading } = useCollection<any>(appointmentsQuery);

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

  // Check if a specific slot is within set availability
  const isAvailable = useMemo(() => {
    return (date: Date, timeStr: string) => {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (!availability) {
        // Default availability: Monday - Friday, 08:00 AM to 04:00 PM (16:00)
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

  const getAppointment = (date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments?.find((a: any) => a.date === dateStr && a.timeSlot === time);
  };
  
  const isLoading = isUserLoading || areAppointmentsLoading || isAvailabilityLoading;

  const confirmedCount = appointments?.filter((a: any) => a.status === 'CONFIRMED' || a.status === 'COMPLETED').length ?? 12;
  const pendingCount = appointments?.filter((a: any) => a.status === 'PENDING').length ?? 3;

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

            {/* Actions */}
            <button 
              type="button"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" /> AVAILABILITY
            </button>

            <button 
              type="button"
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
              <div className="text-2xl font-black text-amber-400">{pendingCount} Pending</div>
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> CONFIRMED CONSULTATION
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> PENDING REQUEST
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
                        <Link key={dayIdx} href={appt.status !== 'CANCELLED_BY_PATIENT' ? `/patients/folder/${appt.patientId}` : '#'}>
                          <div className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[52px] cursor-pointer hover:shadow-md ${
                            appt.status === 'CANCELLED_BY_PATIENT' ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 opacity-50' :
                            appt.status === 'CONFIRMED' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100' :
                            appt.status === 'COMPLETED' ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-100' :
                            'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                          }`}>
                            <div className="flex items-center justify-between">
                              <p className={`text-[10px] font-black uppercase truncate ${appt.status === 'CANCELLED_BY_PATIENT' ? 'line-through' : ''}`}>
                                {appt.patientName || 'Patient'}
                              </p>
                              {appt.status !== 'CANCELLED_BY_PATIENT' && <ExternalLink className="w-3 h-3 opacity-60" />}
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-wider opacity-75 mt-0.5">
                              {appt.status}
                            </span>
                          </div>
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={dayIdx}
                        type="button"
                        className={`p-3 rounded-xl border transition-all flex items-center justify-center min-h-[52px] cursor-pointer ${
                          onDuty
                            ? (isToday 
                                ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60' 
                                : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-indigo-50/50 hover:border-indigo-300')
                            : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/40 opacity-50'
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

    </div>
  );
}
