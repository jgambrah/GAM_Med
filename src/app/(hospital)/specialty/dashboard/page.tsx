'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { 
  Baby, HeartPulse, Activity, Loader2, ShieldAlert, 
  Droplets, Camera, CheckCircle2, TrendingUp, Calendar, Stethoscope, ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import VitalsTrend from '@/components/clinical/VitalsTrend';
import { EnterpriseCapacityFederatedCard } from '@/components/clinical/EnterpriseCapacityFederatedCard';

export default function SpecialtyDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [activeSpecialty, setActiveSpecialty] = useState<'OBGYN' | 'CARDIOLOGY' | 'PEDIATRICS'>('OBGYN');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'DOCTOR', 'NURSE', 'ADMIN'].includes(userProfile?.role || '');

  // EPI Immunization Schedule Matrix
  const VACCINE_MATRIX = [
    { age: 'At Birth', vaccines: ['BCG (Tuberculosis)', 'OPV 0 (Polio)', 'Hepatitis B Birth Dose'] },
    { age: '6 Weeks', vaccines: ['DPT-HepB-Hib 1 (Penta 1)', 'OPV 1', 'Pneumococcal 1 (PCV 1)', 'Rotavirus 1'] },
    { age: '10 Weeks', vaccines: ['DPT-HepB-Hib 2 (Penta 2)', 'OPV 2', 'Pneumococcal 2', 'Rotavirus 2'] },
    { age: '14 Weeks', vaccines: ['DPT-HepB-Hib 3 (Penta 3)', 'OPV 3', 'IPV (Inactivated Polio)', 'Pneumococcal 3'] },
    { age: '9 Months', vaccines: ['Measles-Rubella 1 (MR 1)', 'Yellow Fever'] },
    { age: '18 Months', vaccines: ['Measles-Rubella 2 (MR 2)', 'Meningococcal A'] },
  ];

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="animate-spin h-16 w-16 text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="text-destructive h-16 w-16 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">Authorized clinical staff access only.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Doctor Portal — <span className="text-sky-600">Specialty Modules</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Stork ANC Analytics, Cardiology & Chronic Care Home-Sync, and NICU Growth Matrix.</p>
        </div>

        {/* SPECIALTY TAB SELECTOR */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-3xl border">
          <button
            onClick={() => setActiveSpecialty('OBGYN')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeSpecialty === 'OBGYN' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <HeartPulse size={16} /> ANC & OB/GYN (Stork)
          </button>

          <button
            onClick={() => setActiveSpecialty('CARDIOLOGY')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeSpecialty === 'CARDIOLOGY' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity size={16} /> Cardiology & Chronic Care
          </button>

          <button
            onClick={() => setActiveSpecialty('PEDIATRICS')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeSpecialty === 'PEDIATRICS' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Baby size={16} /> Pediatrics & NICU
          </button>
        </div>
      </div>

      {/* MULTI-TENANT ENTERPRISE OPERATIONS & FEDERATED LEARNING DECK */}
      <EnterpriseCapacityFederatedCard hospitalName={userProfile?.hospitalName || 'GamMed Grid Hospital'} />

      {/* --- SPECIALTY 1: ANC & OB/GYN (STORK ANALYTICS) --- */}
      {activeSpecialty === 'OBGYN' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[32px] border-2 border-purple-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-purple-600">
                <HeartPulse size={24} />
                <span className="text-[10px] font-black uppercase bg-purple-50 px-3 py-1 rounded-full text-purple-700">ANC Registry</span>
              </div>
              <p className="text-3xl font-black">28</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Active Maternity Registrations</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border-2 border-purple-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-purple-600">
                <Droplets size={24} />
                <span className="text-[10px] font-black uppercase bg-purple-50 px-3 py-1 rounded-full text-purple-700">Anemia Tracker</span>
              </div>
              <p className="text-3xl font-black">11.8 g/dL</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Cohort Mean Hemoglobin (Hb)</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border-2 border-purple-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-purple-600">
                <TrendingUp size={24} />
                <span className="text-[10px] font-black uppercase bg-purple-50 px-3 py-1 rounded-full text-purple-700">Fundal Height Canvas</span>
              </div>
              <p className="text-3xl font-black">98%</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Gestational Age Growth Compliance</p>
            </div>
          </div>

          {/* MULTI-CURVE GRAPH CANVAS */}
          <VitalsTrend />
        </div>
      )}

      {/* --- SPECIALTY 2: CARDIOLOGY & CHRONIC CARE --- */}
      {activeSpecialty === 'CARDIOLOGY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[32px] border-2 border-red-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-red-600">
                <Activity size={24} />
                <span className="text-[10px] font-black uppercase bg-red-50 px-3 py-1 rounded-full text-red-700">Home-Log Sync</span>
              </div>
              <p className="text-3xl font-black">18</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Longitudinal BP & Glucose Telehealth Syncs</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border-2 border-red-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-red-600">
                <Camera size={24} />
                <span className="text-[10px] font-black uppercase bg-red-50 px-3 py-1 rounded-full text-red-700">ECG & PACS</span>
              </div>
              <p className="text-3xl font-black">12-Lead</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Digital Waveform & PACS Imaging Viewer</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border-2 border-red-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-red-600">
                <Stethoscope size={24} />
                <span className="text-[10px] font-black uppercase bg-red-50 px-3 py-1 rounded-full text-red-700">High Risk HTN</span>
              </div>
              <p className="text-3xl font-black">4</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Patients Flagged for Medication Adjustment</p>
            </div>
          </div>

          <div className="flex gap-4">
            <Link href="/telehealth/rpm" className="flex-1">
              <Button className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                Open Home BP & Glucose RPM Feed <ArrowRight size={16} />
              </Button>
            </Link>

            <Link href="/radiology/queue" className="flex-1">
              <Button variant="outline" className="w-full h-16 rounded-3xl font-black text-xs uppercase tracking-widest border-2 flex items-center justify-center gap-2">
                Open PACS Diagnostic Imaging Queue <ArrowRight size={16} />
              </Button>
            </Link>
          </div>

          <VitalsTrend />
        </div>
      )}

      {/* --- SPECIALTY 3: PEDIATRICS & NEONATAL (NICU) --- */}
      {activeSpecialty === 'PEDIATRICS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[32px] border-2 border-sky-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-sky-600">
                <Baby size={24} />
                <span className="text-[10px] font-black uppercase bg-sky-50 px-3 py-1 rounded-full text-sky-700">Child Wellness</span>
              </div>
              <p className="text-3xl font-black">34</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Under-5 Clinic Registrations</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border-2 border-sky-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-sky-600">
                <Calendar size={24} />
                <span className="text-[10px] font-black uppercase bg-sky-50 px-3 py-1 rounded-full text-sky-700">EPI Immunizations</span>
              </div>
              <p className="text-3xl font-black">96%</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Vaccination Milestone Compliance Rate</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border-2 border-sky-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-sky-600">
                <TrendingUp size={24} />
                <span className="text-[10px] font-black uppercase bg-sky-50 px-3 py-1 rounded-full text-sky-700">WHO Percentiles</span>
              </div>
              <p className="text-3xl font-black">50th %</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">WHO Target Growth Benchmark Line</p>
            </div>
          </div>

          {/* IMMUNIZATION MILESTONE MATRIX */}
          <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 border-b pb-4 flex items-center gap-2">
              <Calendar size={18} className="text-sky-600" /> Expanded EPI Pediatric Immunization Milestone Matrix
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
              {VACCINE_MATRIX.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border space-y-2">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-black text-sky-600 uppercase">{item.age}</span>
                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                      <CheckCircle2 size={10} /> Active Protocol
                    </span>
                  </div>
                  <ul className="space-y-1 text-slate-700 text-[11px]">
                    {item.vaccines.map((v, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> {v}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <VitalsTrend />
        </div>
      )}
    </div>
  );
}
