'use client';
import { useState } from 'react';
import { Smartphone, Camera, Bell, ShieldAlert, HeartPulse, Search, User, ChevronRight } from 'lucide-react';
import { ClinicalPhotoCaptureDialog } from '@/components/clinical/ClinicalPhotoCaptureDialog';
import { CriticalLabPushNotification } from '@/components/clinical/CriticalLabPushNotification';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function MobileClinicianApp() {
  const [searchTerm, setSearchTerm] = useState('');

  const PATIENT_QUEUE = [
    { id: 'P-101', name: 'Ama Serwaa', age: 28, room: 'Maternity Bed 04', status: 'ANC High Risk (Hb 5.8)', phone: '+233240001111' },
    { id: 'P-102', name: 'Kofi Mensah', age: 45, room: 'OPD Queue #03', status: 'Hypertension Follow-up', phone: '+233240002222' },
    { id: 'P-103', name: 'Yaa Asantewaa', age: 32, room: 'Ward 2 Bed 12', status: 'Post-op Day 1', phone: '+233240003333' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto space-y-6">
      <CriticalLabPushNotification />

      {/* MOBILE HEADER */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Smartphone className="text-sky-400" size={24} />
          <div>
            <h1 className="text-lg font-black uppercase tracking-tighter text-sky-400">Mobile Clinician Companion</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Handheld Ward & OPD View</p>
          </div>
        </div>

        <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
      </div>

      {/* QUICK PHOTO CAPTURE BANNER */}
      <div className="bg-gradient-to-r from-sky-900 to-indigo-900 p-5 rounded-3xl space-y-3 shadow-xl">
        <div className="flex justify-between items-center">
          <span className="text-xs font-black uppercase text-sky-300 tracking-wider">Quick Camera Capture</span>
          <Camera size={18} className="text-sky-300" />
        </div>
        <p className="text-xs text-slate-200 font-bold">Snap wound photos, ultrasound prints, or rashes directly into EHR media attachments.</p>
        <ClinicalPhotoCaptureDialog patientId="P-101" patientName="Ama Serwaa" />
      </div>

      {/* PATIENT SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-slate-500" size={16} />
        <Input 
          placeholder="Search patient name, EHR, or bed..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="pl-10 bg-slate-900 border-slate-800 text-white rounded-2xl h-12 font-bold text-xs" 
        />
      </div>

      {/* ACTIVE PATIENT LIST */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">Active Ward & OPD Rounds Queue</h2>

        {PATIENT_QUEUE.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(patient => (
          <Link key={patient.id} href={`/patients/folder/${patient.id}`}>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center hover:border-sky-500 transition-all">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-white">{patient.name}</span>
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md uppercase font-bold">{patient.room}</span>
                </div>
                <p className="text-[11px] font-bold text-amber-400">{patient.status}</p>
              </div>

              <ChevronRight size={18} className="text-slate-500" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
