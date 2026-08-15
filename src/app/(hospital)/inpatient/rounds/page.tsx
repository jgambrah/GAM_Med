'use client';

import React, { useState, useMemo } from 'react';
import { 
  BedDouble, CheckCircle2, Clock, FileText, Activity, 
  Search, Building2, Lock 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DischargeClearanceMatrix from '@/components/app/discharge-clearance-matrix';

export default function MultiPatientWardRoundingWorkspace() {
  const { toast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState('all');

  const [selectedPatientForDischarge, setSelectedPatientForDischarge] = useState<any | null>(null);
  const [isDischargeMatrixOpen, setIsDischargeMatrixOpen] = useState(false);

  const [patients, setPatients] = useState([
    {
      id: 'BED-01',
      name: 'AMA SERWAA',
      ehr: 'EHR-88392',
      ward: 'Maternity Ward',
      wardKey: 'maternity',
      bed: 'BED 01',
      vitals: 'BP 138/88 • HR 82 • Temp 36.8°C',
      vitalsAlert: false,
      soapNote: 'Patient feels better this morning. No vaginal bleeding. Pedal edema resolving.',
      status: 'ROUNDED'
    },
    {
      id: 'BED-02',
      name: 'KOFI MENSAH',
      ehr: 'EHR-99201',
      ward: 'Male Medical Ward',
      wardKey: 'medical',
      bed: 'BED 04',
      vitals: 'BP 152/94 • HR 90 • Temp 37.2°C',
      vitalsAlert: true,
      soapNote: 'Hypertension remains elevated. Increase Amlodipine to 10mg daily. Re-check BP in 4 hrs.',
      status: 'PENDING'
    },
    {
      id: 'BED-03',
      name: 'YAA ASANTEWAA',
      ehr: 'EHR-44102',
      ward: 'Female Surgical Ward',
      wardKey: 'surgical',
      bed: 'BED 08',
      vitals: 'BP 120/78 • HR 74 • Temp 36.5°C',
      vitalsAlert: false,
      soapNote: 'Post-op Day 2 clean surgical site. Dressing intact. Discontinue IV fluids, start oral diet.',
      status: 'PENDING'
    }
  ]);

  const handleUpdateNote = (id: string, newNote: string) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, soapNote: newNote } : p));
  };

  const handleSaveRound = (id: string) => {
    setSavingId(id);
    setTimeout(() => {
      setSavingId(null);
      setPatients(prev => prev.map(p => p.id === id ? { ...p, status: 'ROUNDED' } : p));
      const pt = patients.find(p => p.id === id);
      toast({
        title: '📋 Ward Round Note Saved',
        description: `SOAP note and orders updated for ${pt?.name || 'Patient'}.`
      });
    }, 500);
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.ehr.toLowerCase().includes(searchQuery.toLowerCase());
      const matchWard = selectedWard === 'all' || p.wardKey === selectedWard;
      return matchSearch && matchWard;
    });
  }, [patients, searchQuery, selectedWard]);

  const roundedCount = patients.filter(p => p.status === 'ROUNDED').length;
  const pendingCount = patients.filter(p => p.status === 'PENDING').length;
  const progressPercent = Math.round((roundedCount / patients.length) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Subtle Background Ambient Radial Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Quick Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <BedDouble className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                MULTI-PATIENT WARD ROUNDING WORKSPACE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              REVIEW VITALS, UPDATE SOAP NOTES, AND QUEUE ORDERS FOR ALL ADMITTED PATIENTS SIMULTANEOUSLY.
            </p>
          </div>

          {/* Action Badge */}
          <div className="self-start md:self-auto flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Shift</div>
              <div className="text-xs font-bold text-white">Morning Inpatient Rounds</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          
          {/* Telemetry Card 1: Rounding Progress */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Rounding Progress
              </span>
              <div className="text-3xl font-black text-white">{roundedCount} / {patients.length}</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {progressPercent}% Completed Today
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Telemetry Card 2: Remaining Inpatients */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Pending Floor Rounds
              </span>
              <div className="text-3xl font-black text-amber-400">{pendingCount}</div>
              <span className="text-[10px] font-bold text-slate-500 mt-1 block">Awaiting Physician Review</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Telemetry Card 3: Active Wards */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Assigned Wards
              </span>
              <div className="text-3xl font-black text-rose-400">3 Wards</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Maternity, Medical, Surgical</span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. CONTROL & FILTER BAR                    */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Patient Name or EHR Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:inline">
            Filter Ward:
          </span>
          <select 
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All Wards (3)</option>
            <option value="maternity">Maternity Ward</option>
            <option value="medical">Male Medical Ward</option>
            <option value="surgical">Female Surgical Ward</option>
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. PATIENT ROUNDING CARDS LIST             */}
      {/* ========================================== */}
      <div className="space-y-6">
        {filteredPatients.map((patient) => {
          const isRounded = patient.status === 'ROUNDED';

          return (
            <div 
              key={patient.id} 
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 relative overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                      {patient.name}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      patient.wardKey === 'maternity' ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800' :
                      patient.wardKey === 'medical' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' :
                      'bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800'
                    }`}>
                      {patient.ward.toUpperCase()} — {patient.bed}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                      {patient.ehr}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Activity className={`w-3.5 h-3.5 ${patient.vitalsAlert ? 'text-amber-500 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span>Vitals:</span>
                    <span className={patient.vitalsAlert ? 'text-amber-700 dark:text-amber-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'}>
                      {patient.vitals}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-center">
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedPatientForDischarge({
                        id: `ADM-2026-${patient.id}`,
                        patientName: patient.name,
                        patientId: patient.id,
                        ward: `${patient.ward} — ${patient.bed}`,
                        bedId: patient.id,
                        runningBalance: 4250.00,
                        clearanceStatus: {
                          clinical: { status: 'CLEARED', clearedBy: 'Dr. James Gambrah', time: '09:15 AM' },
                          pharmacy: { status: 'PENDING', clearedBy: null, time: null },
                          finance: { status: 'PENDING', clearedBy: null, time: null }
                        }
                      });
                      setIsDischargeMatrixOpen(true);
                    }}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-indigo-400" /> DISCHARGE GATE PASS 🔒
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleSaveRound(patient.id)}
                    disabled={savingId === patient.id}
                    className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer ${
                      isRounded 
                        ? 'bg-emerald-600 hover:bg-emerald-700' 
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> 
                    {savingId === patient.id ? 'SAVING...' : (isRounded ? 'UPDATE ROUND NOTE' : 'COMPLETE FLOOR ROUND')}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> Daily Ward Round SOAP Note:
                </label>
                <textarea
                  value={patient.soapNote}
                  onChange={(e) => handleUpdateNote(patient.id, e.target.value)}
                  rows={2}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-y"
                />
              </div>
            </div>
          );
        })}
      </div>

      <DischargeClearanceMatrix
        admissionRecord={selectedPatientForDischarge}
        isOpen={isDischargeMatrixOpen}
        onClose={() => {
          setIsDischargeMatrixOpen(false);
          setSelectedPatientForDischarge(null);
        }}
      />

    </div>
  );
}
