'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import {
  Calendar as CalIcon, ChevronLeft, ChevronRight,
  Clock, User, MoreVertical, CheckCircle2,
  AlertCircle, ExternalLink, CalendarDays, Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function DoctorWeeklyCalendar() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(today.setDate(diff));
  });

  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    const startOfWeek = new Date(currentWeekStart);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    return query(
      collection(firestore, "appointments"),
      where("doctorId", "==", user.uid),
      where("date", ">=", startOfWeek.toISOString().split('T')[0]),
      where("date", "<", endOfWeek.toISOString().split('T')[0])
    );
  }, [firestore, user, currentWeekStart]);

  const { data: appointments, isLoading: areAppointmentsLoading } = useCollection(appointmentsQuery);

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
  const timeSlots = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];

  const getAppointment = (date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments?.find(a => a.date === dateStr && a.timeSlot === time);
  };
  
  const isLoading = isUserLoading || areAppointmentsLoading;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      {/* CALENDAR HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-slate-900 pb-8">
        <div>
           <div className="flex items-center gap-3 text-blue-600 mb-2">
              <CalendarDays size={32} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Clinical Scheduler</span>
           </div>
           <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Weekly <span className="text-blue-600">Planner</span></h1>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
           <button onClick={() => {
             const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d);
           }} className="hover:text-blue-600"><ChevronLeft/></button>
           <span className="text-xs font-black uppercase w-48 text-center italic">
              {weekDays[0].toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {weekDays[6].toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
           </span>
           <button onClick={() => {
             const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d);
           }} className="hover:text-blue-600"><ChevronRight/></button>
        </div>
      </div>

      {/* --- THE CALENDAR GRID --- */}
      <div className="bg-white rounded-[50px] border-4 border-slate-900 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-8 divide-x-4 divide-slate-900 border-b-4 border-slate-900">
           <div className="p-6 bg-slate-50 flex items-center justify-center">
              <Clock className="text-slate-400" size={20} />
           </div>
           {weekDays.map((day, i) => (
              <div key={i} className={`p-6 text-center ${day.toDateString() === new Date().toDateString() ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                 <p className="text-2xl font-black">{day.getDate()}</p>
              </div>
           ))}
        </div>

        {/* TIME ROWS */}
        <div className="divide-y-2 divide-slate-100">
          {isLoading ? (
            <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>
          ) : (
            timeSlots.map((time, tIdx) => (
              <div key={tIdx} className="grid grid-cols-8 divide-x-2 divide-slate-100 group">
                {/* TIME LABEL */}
                <div className="p-6 text-[10px] font-black text-slate-400 text-center flex items-center justify-center bg-slate-50/50">
                   {time}
                </div>
                
                {/* DAYS SLOTS */}
                {weekDays.map((day, dIdx) => {
                  const appt = getAppointment(day, time);
                  return (
                    <div key={dIdx} className="relative h-24 p-2 transition-all hover:bg-blue-50/30">
                      {appt ? (
                        <Link href={appt.status !== 'CANCELLED_BY_PATIENT' ? `/patients/folder/${appt.patientId}` : '#'}>
                          <div className={`h-full w-full rounded-2xl p-3 shadow-md border-l-8 flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer ${
                            appt.status === 'CANCELLED_BY_PATIENT' ? 'bg-slate-50 border-slate-300 opacity-50 grayscale' :
                            appt.status === 'CONFIRMED' ? 'bg-blue-50 border-blue-600 text-blue-900' :
                            appt.status === 'COMPLETED' ? 'bg-green-50 border-green-600 text-green-900' :
                            'bg-amber-50 border-amber-500 text-amber-900'
                          }`}>
                            <div>
                                <p className={`text-[9px] font-black uppercase leading-tight truncate ${appt.status === 'CANCELLED_BY_PATIENT' ? 'line-through' : ''}`}>
                                  {appt.patientName || 'Unknown Patient'}
                                </p>
                                <p className="text-[7px] font-bold opacity-60 uppercase mt-1">
                                  {appt.status === 'CANCELLED_BY_PATIENT' ? 'VOID / CANCELLED' : appt.status}
                                </p>
                            </div>
                            {appt.status !== 'CANCELLED_BY_PATIENT' && <ExternalLink size={10} className="opacity-40 ml-auto" />}
                          </div>
                        </Link>
                      ) : (
                        <div className="h-full w-full border-2 border-dashed border-slate-50 rounded-2xl flex items-center justify-center">
                           <span className="text-[8px] font-black text-slate-200 uppercase tracking-widest">Available</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* FOOTER LEGEND */}
      <div className="flex gap-8 justify-center items-center p-6 bg-slate-50 rounded-[32px] border">
         <LegendItem color="bg-amber-500" label="Pending Request" />
         <LegendItem color="bg-blue-600" label="Confirmed Consultation" />
         <LegendItem color="bg-green-600" label="Completed / Discharged" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: any) {
  return (
    <div className="flex items-center gap-2">
       <div className={`w-3 h-3 rounded-full ${color}`} />
       <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</span>
    </div>
  );
}
