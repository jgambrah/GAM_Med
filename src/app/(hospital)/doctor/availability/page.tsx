'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { 
  Clock, CalendarDays, CheckCircle2, Globe, 
  Save, Sliders, Smartphone, ShieldAlert, 
  Loader2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ConsultationHoursAvailability() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [syncMobileApp, setSyncMobileApp] = useState(true);
  const [syncTelehealth, setSyncTelehealth] = useState(true);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const isDoctor = userProfile?.role === 'DOCTOR' || userProfile?.role === 'DIRECTOR';

  const availabilityRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, "doctor_availability", user.uid);
  }, [user, firestore]);
  const { data: availabilityData, isLoading: availabilityLoading } = useDoc(availabilityRef);
  
  const [schedule, setSchedule] = useState({
    days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
    startTime: '08:00',
    endTime: '16:00',
    slotDuration: 30,
  });

  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  useEffect(() => {
    if (availabilityData) {
      setSchedule(prev => ({
        ...prev,
        ...availabilityData,
        days: (availabilityData.days || []).map((d: string) => d.toUpperCase())
      }));
    }
  }, [availabilityData]);

  const toggleDay = (day: string) => {
    setSchedule(prev => {
      const isSelected = prev.days.includes(day);
      return {
        ...prev,
        days: isSelected ? prev.days.filter(d => d !== day) : [...prev.days, day]
      };
    });
  };

  const saveAvailability = async () => {
    if (!user || !userProfile || !availabilityRef) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated."});
      return;
    }
    setSaving(true);
    try {
      setDocumentNonBlocking(availabilityRef, {
        ...schedule,
        days: schedule.days.map(d => d.charAt(0) + d.slice(1).toLowerCase()), // Store as Title Case e.g. Monday
        syncMobileApp,
        syncTelehealth,
        hospitalId: userProfile.hospitalId,
        doctorId: user.uid,
        doctorName: userProfile.fullName,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Consultation Schedule Published Successfully" });
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Save Failed", description: e.message }); 
    } finally {
      setSaving(false);
    }
  };

  const isLoading = isUserLoading || profileLoading || availabilityLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isDoctor) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground font-medium">This page is for authorized doctors.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  const doctorInitials = userProfile?.fullName ? userProfile.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'DR';
  const doctorNameDisplay = userProfile?.fullName ? `DR. ${userProfile.fullName.toUpperCase()}` : 'DR. TRACY GAMBRAH';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Background Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and User Context */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Clock className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                CONSULTATION HOURS & AVAILABILITY
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CONFIGURE YOUR OPD CLINICAL BANDWIDTH, SLOT DURATION & PATIENT PORTAL PUBLICATION.
            </p>
          </div>

          {/* Clinician Badge */}
          <div className="self-start md:self-auto flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center font-black text-rose-400 text-sm">
              {doctorInitials}
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide">{doctorNameDisplay}</div>
              <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Lead Physician</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: Daily Bandwidth */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Daily Shift Coverage
              </span>
              <div className="text-2xl font-black text-white">8.0 Hours</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {schedule.startTime} – {schedule.endTime}
              </span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Active Days */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Weekly Frequency
              </span>
              <div className="text-2xl font-black text-emerald-400">{schedule.days.length} Days / Wk</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Full Coverage Selected</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Slot Interval */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Appt Interval
              </span>
              <div className="text-2xl font-black text-violet-400">{schedule.slotDuration} Mins</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Per Consult Window</span>
            </div>
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
              <Sliders className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Channel Sync */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Portal Status
              </span>
              <div className="text-2xl font-black text-sky-400">PUBLISHED</div>
              <span className="text-[10px] font-bold text-sky-400 mt-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Live on Patient Portal
              </span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Smartphone className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. SCHEDULE CONFIGURATION CONTAINER        */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 space-y-8">
        
        {/* Section Header */}
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Shift & Consultation Hours Setup
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Set your operating hours and appointment slots to automatically calculate available booking windows.
            </p>
          </div>
        </div>

        {/* Start / End Time & Slot Duration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Start Time Input */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-600" /> START TIME
            </label>
            <input
              type="time"
              value={schedule.startTime}
              onChange={(e) => setSchedule({ ...schedule, startTime: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* End Time Input */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-rose-600" /> END TIME
            </label>
            <input
              type="time"
              value={schedule.endTime}
              onChange={(e) => setSchedule({ ...schedule, endTime: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>

          {/* Slot Duration Select */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-violet-600" /> APPOINTMENT INTERVAL
            </label>
            <select
              value={schedule.slotDuration}
              onChange={(e) => setSchedule({ ...schedule, slotDuration: Number(e.target.value) })}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all cursor-pointer"
            >
              <option value={15}>15 Minutes / Consult</option>
              <option value={20}>20 Minutes / Consult</option>
              <option value={30}>30 Minutes / Consult</option>
              <option value={45}>45 Minutes / Consult</option>
              <option value={60}>60 Minutes / Consult</option>
            </select>
          </div>

        </div>

        {/* Days Selection Grid */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> ACTIVE CONSULTATION DAYS
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {daysOfWeek.map((day) => {
              const isSelected = schedule.days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`py-3.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Channel Publication Toggles & Action Bar */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-white flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 w-full lg:w-auto">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" /> Multi-Channel Synchronization
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={syncMobileApp} 
                  onChange={(e) => setSyncMobileApp(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer" 
                />
                Sync with Mobile Patient App
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={syncTelehealth} 
                  onChange={(e) => setSyncTelehealth(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 cursor-pointer" 
                />
                Enable Telehealth Virtual Slots
              </label>
            </div>
          </div>

          <button 
            type="button"
            onClick={saveAvailability}
            disabled={saving}
            className="w-full lg:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xl transition-all flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            PUBLISH AVAILABILITY TO PATIENT PORTAL
          </button>
        </div>

      </div>

    </div>
  );
}