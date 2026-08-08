'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, orderBy, limit } from 'firebase/firestore';
import { 
  Inbox, Clock, Activity, CheckCircle2, ShieldAlert, Loader2, 
  Beaker, Pill, ClipboardList, AlertCircle, TrendingUp, Award, 
  FileText, ArrowRight, UserCheck, Stethoscope, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function PhysicianMyDayPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [activeTab, setActiveTab] = useState<'INBOX' | 'PATIENT_FLOW' | 'CME_AUDIT'>('INBOX');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const doctorUid = user?.uid;
  const isDoctor = ['DIRECTOR', 'DOCTOR'].includes(userProfile?.role || '');

  // 1. UNIFIED CLINICAL INBOX FEED ITEMS
  const mockInboxItems = [
    {
      id: 'inbox_1',
      category: 'LAB_RESULT',
      title: 'Critical Hb Result (7.8 g/dL) - Requires Signature',
      patientName: 'Akosua Mansah',
      ehrNumber: 'GAM/EHR/26/0031',
      urgency: 'HIGH',
      timestamp: '12 mins ago',
      details: 'Full Blood Count shows severe anemia. Transfusion evaluation required.',
    },
    {
      id: 'inbox_2',
      category: 'PRESCRIPTION_REFILL',
      title: 'e-Prescription Refill Request: Amoxicillin-Clavulanate',
      patientName: 'Kwame Nkrumah',
      ehrNumber: 'GAM/EHR/26/0018',
      urgency: 'MEDIUM',
      timestamp: '25 mins ago',
      details: 'Pharmacy requesting doctor sign-off for 7-day extension.',
    },
    {
      id: 'inbox_3',
      category: 'SHIFT_HANDOVER',
      title: 'Night Shift Handover Note: Ward 3 Bed 12',
      patientName: 'Kofi Mensah',
      ehrNumber: 'GAM/EHR/26/0009',
      urgency: 'ROUTINE',
      timestamp: '1 hour ago',
      details: 'Post-op Day 2 appendix. Vitals stable overnight. Pain controlled.',
    },
    {
      id: 'inbox_4',
      category: 'E_CONSULT',
      title: 'Inter-Departmental E-Consult Request from ANC Clinic',
      patientName: 'Ama Serwaa Prempeh',
      ehrNumber: 'GAM/EHR/26/0014',
      urgency: 'URGENT',
      timestamp: '2 hours ago',
      details: 'Gestational HTN workup consult requested by Dr. Osei.',
    },
  ];

  // 2. PATIENT FLOW & WAIT TIME QUEUE
  const mockPatientQueue = [
    {
      id: 'flow_1',
      patientName: 'Abena Osei',
      ehrNumber: 'GAM/EHR/26/0022',
      clinic: 'OPD Consultation',
      waitTimeMins: 14,
      status: 'WAITING_FOR_DOCTOR',
      vitalsTaken: '140/88 BP, 76 bpm',
    },
    {
      id: 'flow_2',
      patientName: 'Yaw Boateng',
      ehrNumber: 'GAM/EHR/26/0045',
      clinic: 'ANC Clinic',
      waitTimeMins: 28,
      status: 'WAITING_FOR_DOCTOR',
      vitalsTaken: '118/74 BP, 36.6°C',
    },
    {
      id: 'flow_3',
      patientName: 'Kojo Addo',
      ehrNumber: 'GAM/EHR/26/0051',
      clinic: 'Pediatric Desk',
      waitTimeMins: 8,
      status: 'IN_CONSULTATION',
      vitalsTaken: 'Weight: 12.4kg, Temp: 38.2°C',
    },
  ];

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isDoctor) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">Physician Command Center access restricted to doctors.</p>
          <Button onClick={() => window.location.href = '/dashboard'} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">"My Day" <span className="text-sky-600">Physician Command Center</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Unified Clinical Inbox, Real-Time OPD Wait Tracker & Personal CME Audit Metrics.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-sky-50 text-sky-700 px-5 py-2.5 rounded-2xl border border-sky-200 flex items-center gap-2">
            <UserCheck size={18} />
            <span className="text-xs font-black uppercase tracking-wider">Dr. {user?.displayName || 'Physician'}</span>
          </div>
        </div>
      </div>

      {/* TOP TAB NAVIGATION BAR */}
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-3xl w-fit border">
        <button
          onClick={() => setActiveTab('INBOX')}
          className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'INBOX' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Inbox size={16} /> Unified Clinical Inbox ({mockInboxItems.length})
        </button>

        <button
          onClick={() => setActiveTab('PATIENT_FLOW')}
          className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'PATIENT_FLOW' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock size={16} /> Patient Flow & Wait Times
        </button>

        <button
          onClick={() => setActiveTab('CME_AUDIT')}
          className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
            activeTab === 'CME_AUDIT' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Award size={16} /> Personal CME & Audit Metrics
        </button>
      </div>

      {/* TAB 1: UNIFIED CLINICAL INBOX FEED */}
      {activeTab === 'INBOX' && (
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Actionable Inbox Items Requiring Doctor Attention</h3>
          
          <div className="bg-white rounded-[40px] border shadow-sm divide-y">
            {mockInboxItems.map(item => (
              <div key={item.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                    item.urgency === 'HIGH' || item.urgency === 'URGENT' ? 'bg-red-50 text-red-600 border border-red-200' :
                    item.urgency === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                    'bg-sky-50 text-sky-600 border border-sky-200'
                  }`}>
                    {item.category === 'LAB_RESULT' ? <Beaker size={22} /> :
                     item.category === 'PRESCRIPTION_REFILL' ? <Pill size={22} /> :
                     item.category === 'SHIFT_HANDOVER' ? <ClipboardList size={22} /> : <FileText size={22} />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black uppercase">{item.title}</h4>
                      {item.urgency === 'HIGH' && (
                        <span className="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded-md uppercase">Action Required</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-600">{item.details}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Patient: {item.patientName} ({item.ehrNumber}) • {item.timestamp}</p>
                  </div>
                </div>

                <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  Review & Sign <ArrowRight size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PATIENT FLOW & WAIT TIME TRACKER */}
      {activeTab === 'PATIENT_FLOW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-sky-600">
                <Clock size={24} />
                <span className="text-[10px] font-black uppercase bg-sky-50 px-3 py-1 rounded-full text-sky-700">OPD Wait Time</span>
              </div>
              <p className="text-3xl font-black">16 min</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Average Patient Consultation Wait</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-emerald-600">
                <CheckCircle2 size={24} />
                <span className="text-[10px] font-black uppercase bg-emerald-50 px-3 py-1 rounded-full text-emerald-700">Consultation Duration</span>
              </div>
              <p className="text-3xl font-black">11.4 min</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Average Physician Time Per Patient</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center text-amber-600">
                <TrendingUp size={24} />
                <span className="text-[10px] font-black uppercase bg-amber-50 px-3 py-1 rounded-full text-amber-700">Queue Bottlenecks</span>
              </div>
              <p className="text-3xl font-black">Normal</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Triage & OPD Flow Rate Optimal</p>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border shadow-sm divide-y">
            <div className="p-6 bg-slate-50 rounded-t-[40px] border-b flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Current Clinic Patient Queue & Wait Time Breakdown</h3>
            </div>

            {mockPatientQueue.map(p => (
              <div key={p.id} className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-black">
                    <Stethoscope size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase">{p.patientName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">EHR: {p.ehrNumber} • {p.clinic} • Vitals: {p.vitalsTaken}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-black uppercase text-amber-600 bg-amber-50 px-3 py-1 rounded-xl">
                      Waiting: {p.waitTimeMins} mins
                    </span>
                  </div>

                  <Link href="/doctor">
                    <Button className="bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      Start Consultation <ChevronRight size={14} />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PERSONAL CME & CLINICAL AUDIT DASHBOARD */}
      {activeTab === 'CME_AUDIT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[32px] border shadow-sm space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultations This Month</span>
              <p className="text-3xl font-black text-slate-900">142</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase">+8% vs Previous Month</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border shadow-sm space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antibiotic Prescribing Rate</span>
              <p className="text-3xl font-black text-purple-600">22.4%</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase">Within WHO Target (&lt; 30%)</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border shadow-sm space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ICD-10 Coding Compliance</span>
              <p className="text-3xl font-black text-sky-600">99.2%</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase">Quality Standard Compliant</p>
            </div>

            <div className="bg-white p-6 rounded-[32px] border shadow-sm space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CME Credits Earned</span>
              <p className="text-3xl font-black text-amber-500">45 / 50</p>
              <p className="text-[10px] text-amber-600 font-bold uppercase">90% Annual Renewal Target</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 border-b pb-4">Clinical Governance & Quality Improvement Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                <p className="font-black text-slate-900 uppercase">🏆 Clinical Excellence Rating</p>
                <p>98.5% positive patient feedback and 0 adverse clinical event flags for Q3.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                <p className="font-black text-slate-900 uppercase">📜 Infection Control Audit</p>
                <p>Hand hygiene compliance and sterile protocol adherence audited at 100%.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
