'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Activity, HeartPulse, Droplets, Scale, Thermometer, AlertTriangle, ShieldAlert, Loader2, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function DoctorRpmConsolePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BP' | 'GLUCOSE' | 'WEIGHT'>('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // Mock RPM Log stream for clinical demonstration
  const mockRpmLogs = [
    {
      id: 'rpm_1',
      patientName: 'Ama Serwaa Prempeh',
      ehrNumber: 'GAM/EHR/26/0014',
      readingType: 'GLUCOSE',
      glucoseLevel: 142,
      glucoseTiming: 'FASTING',
      notes: 'Gestational Diabetes daily home monitoring. Slightly high after breakfast.',
      status: 'HIGH_ALERT',
      loggedAt: '10 mins ago',
    },
    {
      id: 'rpm_2',
      patientName: 'Kofi Mensah',
      ehrNumber: 'GAM/EHR/26/0009',
      readingType: 'BP',
      systolic: 158,
      diastolic: 96,
      bp: '158/96',
      pulse: 84,
      notes: 'Morning BP check before taking Lisinopril.',
      status: 'HIGH_ALERT',
      loggedAt: '35 mins ago',
    },
    {
      id: 'rpm_3',
      patientName: 'Abena Osei',
      ehrNumber: 'GAM/EHR/26/0022',
      readingType: 'BP',
      systolic: 118,
      diastolic: 76,
      bp: '118/76',
      pulse: 70,
      notes: 'Evening post-walk reading. Feeling well.',
      status: 'NORMAL',
      loggedAt: '2 hours ago',
    },
    {
      id: 'rpm_4',
      patientName: 'Akosua Mansah',
      ehrNumber: 'GAM/EHR/26/0031',
      readingType: 'WEIGHT',
      weight: 74.2,
      notes: 'Preeclampsia daily weight log. +1.5kg gain in 48 hours.',
      status: 'WARNING',
      loggedAt: '4 hours ago',
    },
  ];

  const filteredLogs = useMemo(() => {
    return mockRpmLogs.filter(log => {
      const matchSearch = log.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || log.ehrNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'ALL' || log.readingType === filterType;
      return matchSearch && matchType;
    });
  }, [searchQuery, filterType]);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Remote Patient <span className="text-sky-600">Monitoring (RPM) Sync</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Real-time sync of patient self-logged home blood pressure, glucose, and weight readings.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/telehealth">
            <Button variant="outline" className="rounded-2xl font-black text-xs uppercase tracking-widest">
              Back to Telehealth Suite
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI ALERT TILES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border-2 border-red-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-red-600">
            <AlertTriangle size={24} />
            <span className="text-[10px] font-black uppercase bg-red-50 px-3 py-1 rounded-full text-red-700">Critical Alerts</span>
          </div>
          <p className="text-3xl font-black text-red-600">2</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">High BP / Glucose Threshold Exceeded</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border-2 border-purple-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-purple-600">
            <Droplets size={24} />
            <span className="text-[10px] font-black uppercase bg-purple-50 px-3 py-1 rounded-full text-purple-700">Gestational DM</span>
          </div>
          <p className="text-3xl font-black">6</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Active Home Glucose Logs</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border-2 border-sky-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-sky-600">
            <HeartPulse size={24} />
            <span className="text-[10px] font-black uppercase bg-sky-50 px-3 py-1 rounded-full text-sky-700">HTN Cohort</span>
          </div>
          <p className="text-3xl font-black">18</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Daily BP Self-Monitors</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border-2 border-emerald-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-emerald-600">
            <Activity size={24} />
            <span className="text-[10px] font-black uppercase bg-emerald-50 px-3 py-1 rounded-full text-emerald-700">Sync Rate</span>
          </div>
          <p className="text-3xl font-black">94%</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">24-Hour Patient Compliance</p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter RPM feed by patient name or EHR..."
              className="pl-9 bg-slate-50 border rounded-2xl font-bold h-12 text-xs text-black placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                filterType === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Syncs
            </button>
            <button
              onClick={() => setFilterType('BP')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                filterType === 'BP' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              BP Feeds
            </button>
            <button
              onClick={() => setFilterType('GLUCOSE')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                filterType === 'GLUCOSE' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Glucose Feeds
            </button>
          </div>
        </div>

        {/* LOG STREAM LIST */}
        <div className="bg-white rounded-[40px] border shadow-sm divide-y">
          {filteredLogs.map(log => (
            <div key={log.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                  log.status === 'HIGH_ALERT' ? 'bg-red-50 text-red-600 border border-red-200' :
                  log.status === 'WARNING' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                  'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}>
                  {log.readingType === 'BP' ? <HeartPulse size={24} /> :
                   log.readingType === 'GLUCOSE' ? <Droplets size={24} /> : <Scale size={24} />}
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-black uppercase">{log.patientName}</h4>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{log.ehrNumber}</span>
                    {log.status === 'HIGH_ALERT' && (
                      <span className="text-[9px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded-md animate-pulse">
                        ⚠️ High Threshold Alert
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-bold text-slate-700 pt-1">
                    {log.readingType === 'BP' && `Home BP Reading: ${log.bp} mmHg (Pulse: ${log.pulse} bpm)`}
                    {log.readingType === 'GLUCOSE' && `Home Fasting Blood Glucose: ${log.glucoseLevel} mg/dL`}
                    {log.readingType === 'WEIGHT' && `Home Body Weight: ${log.weight} kg`}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 italic pt-0.5">"{log.notes}" • Sync {log.loggedAt}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  Review & Contact Patient <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
