'use client';

import React, { useState } from 'react';
import { 
  Smartphone, QrCode, Camera, Search, ChevronRight, 
  Activity 
} from 'lucide-react';
import { CriticalLabPushNotification } from '@/components/clinical/CriticalLabPushNotification';
import { ClinicalPhotoCaptureDialog } from '@/components/clinical/ClinicalPhotoCaptureDialog';
import Link from 'next/link';

export default function MobileClinicianApp() {
  const [searchTerm, setSearchTerm] = useState('');

  const PATIENT_QUEUE = [
    { id: 'P-101', name: 'Ama Serwaa', room: 'Maternity Bed 04', status: 'ANC High Risk (Hb 5.8)', isUrgent: true },
    { id: 'P-102', name: 'Kofi Mensah', room: 'OPD Queue #03', status: 'Hypertension Follow-up', isUrgent: false },
    { id: 'P-103', name: 'Yaa Asantewaa', room: 'Ward 2 Bed 12', status: 'Post-op Day 1', isUrgent: false }
  ];

  const filteredQueue = PATIENT_QUEUE.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-0 pb-12 relative">
      
      {/* 1. INTERACTIVE CRITICAL LAB PUSH ALERT (TOP-RIGHT) */}
      <CriticalLabPushNotification />

      {/* 2. DESKTOP CONTEXT BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden mb-10">
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 pb-5 border-b border-slate-800/60 mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <Smartphone className="w-7 h-7 text-blue-400" />
              MOBILE CLINICIAN COMPANION
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest">
              Web Emulator & Handheld Ward Device Synchronization
            </p>
          </div>

          {/* QR Code Prompt */}
          <div className="hidden md:flex bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 items-center gap-4">
            <div className="p-2 bg-white rounded-lg">
              <QrCode className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Access on your device</span>
              <span className="text-xs font-black text-white uppercase tracking-wide">Scan to open on phone</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. THE MOBILE DEVICE EMULATOR */}
      <div className="mx-auto w-full max-w-[400px] h-[800px] bg-slate-950 rounded-[3rem] border-[12px] border-slate-900 shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Mobile Status Bar (Fake) */}
        <div className="flex justify-between items-center px-6 pt-3 pb-2 bg-slate-950 text-slate-400 text-[10px] font-bold">
          <span>09:41</span>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-blue-400" />
            <div className="w-4 h-2.5 bg-slate-400 rounded-sm"></div>
          </div>
        </div>

        {/* Mobile App Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-500" /> Handheld View
          </h2>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        {/* Mobile Scrollable Content */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-5 space-y-6">
          
          {/* Quick Camera Card */}
          <div className="bg-blue-950/20 border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2 relative z-10">Quick Media Capture</h3>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-4 relative z-10">
              Snap wound photos, ultrasound prints, or rashes directly into EHR media attachments.
            </p>

            <div className="relative z-10">
              <ClinicalPhotoCaptureDialog patientId="P-101" patientName="Ama Serwaa" />
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" 
              placeholder="Search EHR or bed number..." 
            />
          </div>

          {/* Ward Queue */}
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
              Active Rounds Queue
            </h3>
            
            <div className="space-y-3">
              {filteredQueue.map((patient) => (
                <Link key={patient.id} href={`/patients/folder/${patient.id}`}>
                  <div className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition cursor-pointer flex items-center justify-between group">
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                        {patient.name}
                        {patient.isUrgent && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        )}
                      </h4>
                      <span className="block text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{patient.room}</span>
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold ${
                        patient.isUrgent 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {patient.status}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Bottom Nav (Fake) */}
        <div className="h-16 bg-slate-900 border-t border-slate-800 flex justify-around items-center px-4 shrink-0">
          <div className="flex flex-col items-center gap-1 text-blue-400">
            <Activity className="w-5 h-5" />
            <span className="text-[8px] font-bold">Rounds</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 cursor-pointer">
            <Camera className="w-5 h-5" />
            <span className="text-[8px] font-bold">Capture</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 cursor-pointer">
            <Search className="w-5 h-5" />
            <span className="text-[8px] font-bold">Search</span>
          </div>
        </div>

      </div>
    </div>
  );
}
