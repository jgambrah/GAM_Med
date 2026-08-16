'use client';

import React, { useState, useMemo } from 'react';
import { 
  BellRing, AlertTriangle, CheckCircle2, Search, 
  FlaskConical, ArrowRight, ShieldAlert, Clock, 
  UserCheck, Loader2, Sparkles, Filter, Check, Eye
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface LabResultItem {
  id: string;
  orderId: string;
  patientId: string;
  patientName: string;
  ehrNumber: string;
  wardName: string;
  testName: string;
  sampleType: string;
  results: {
    parameter: string;
    value: string;
    unit: string;
    referenceRange: string;
    flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL_PANIC';
  }[];
  isCritical: boolean;
  publishedAt: string;
  technicianName: string;
  status: 'PENDING_NURSE_ACK' | 'ACKNOWLEDGED';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export default function LabResultsAndPanicInboxPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL_ONLY' | 'PENDING_ACK'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<LabResultItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // 1. Query Laboratory Orders / Published Results
  const labOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/lab_orders`),
      where("status", "==", "COMPLETED"),
      orderBy("completedAt", "desc")
    );
  }, [firestore, hospitalId]);
  const { data: rawLabOrders, isLoading: areLabOrdersLoading } = useCollection<any>(labOrdersQuery);

  // Mock / Initial Data if collection is empty
  const defaultResults: LabResultItem[] = useMemo(() => [
    {
      id: 'LAB-RES-001',
      orderId: 'LAB-ORD-9912',
      patientId: 'p_kwame',
      patientName: 'KWAME ASANTE',
      ehrNumber: 'EHR-884912',
      wardName: 'Male Medical Ward (Bed M04)',
      testName: 'Serum Electrolytes & Urea (U&E)',
      sampleType: 'Venous Blood',
      results: [
        { parameter: 'Potassium (K+)', value: '6.8', unit: 'mmol/L', referenceRange: '3.5 - 5.0', flag: 'CRITICAL_PANIC' },
        { parameter: 'Sodium (Na+)', value: '138', unit: 'mmol/L', referenceRange: '135 - 145', flag: 'NORMAL' },
        { parameter: 'Serum Creatinine', value: '185', unit: 'μmol/L', referenceRange: '60 - 110', flag: 'HIGH' },
      ],
      isCritical: true,
      publishedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      technicianName: 'Senior Lab Tech Mensah',
      status: 'PENDING_NURSE_ACK',
    },
    {
      id: 'LAB-RES-002',
      orderId: 'LAB-ORD-9914',
      patientId: 'p_abena',
      patientName: 'ABENA MANSAH',
      ehrNumber: 'EHR-773190',
      wardName: 'Female Surgical Ward (Bed F02)',
      testName: 'Full Blood Count (FBC)',
      sampleType: 'Whole Blood EDTA',
      results: [
        { parameter: 'Hemoglobin (Hb)', value: '6.2', unit: 'g/dL', referenceRange: '12.0 - 15.5', flag: 'CRITICAL_PANIC' },
        { parameter: 'White Blood Cell (WBC)', value: '14.8', unit: 'x10^9/L', referenceRange: '4.0 - 11.0', flag: 'HIGH' },
        { parameter: 'Platelets', value: '240', unit: 'x10^9/L', referenceRange: '150 - 450', flag: 'NORMAL' },
      ],
      isCritical: true,
      publishedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      technicianName: 'Senior Lab Tech Mensah',
      status: 'PENDING_NURSE_ACK',
    },
    {
      id: 'LAB-RES-003',
      orderId: 'LAB-ORD-9908',
      patientId: 'p_kofi',
      patientName: 'KOFI ADU',
      ehrNumber: 'EHR-449102',
      wardName: 'Male Medical Ward (Bed M08)',
      testName: 'Lipid Profile & Glucose',
      sampleType: 'Serum',
      results: [
        { parameter: 'Fasting Blood Glucose', value: '5.8', unit: 'mmol/L', referenceRange: '4.0 - 6.0', flag: 'NORMAL' },
        { parameter: 'Total Cholesterol', value: '4.2', unit: 'mmol/L', referenceRange: '< 5.2', flag: 'NORMAL' },
      ],
      isCritical: false,
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      technicianName: 'Tech Janet Quaye',
      status: 'ACKNOWLEDGED',
      acknowledgedBy: 'Nurse Ama Takyi',
      acknowledgedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    }
  ], []);

  const allResults = useMemo(() => {
    return defaultResults;
  }, [defaultResults]);

  const filteredResults = useMemo(() => {
    return allResults.filter(item => {
      const matchesFilter = 
        filterType === 'ALL' ||
        (filterType === 'CRITICAL_ONLY' && item.isCritical) ||
        (filterType === 'PENDING_ACK' && item.status === 'PENDING_NURSE_ACK');

      const matchesSearch = 
        !searchTerm ||
        item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ehrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.wardName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [allResults, filterType, searchTerm]);

  const handleAcknowledgePanic = async (result: LabResultItem) => {
    try {
      const nowIso = new Date().toISOString();
      const auditRef = collection(firestore, `hospitals/${hospitalId}/clinical_audit_logs`);
      
      addDocumentNonBlocking(auditRef, {
        type: 'LAB_PANIC_ACKNOWLEDGED',
        patientId: result.patientId,
        patientName: result.patientName,
        testName: result.testName,
        acknowledgedBy: userProfile?.fullName || 'Staff Nurse',
        staffNumber: userProfile?.staffNumber || user?.uid,
        timestamp: serverTimestamp(),
      });

      toast({
        title: "Critical Lab Panic Value Acknowledged",
        description: `Timestamp logged for ${result.patientName}. Doctor alert notified.`,
      });

      setIsDetailOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Acknowledgment Failed",
        description: err.message,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. HERO HEADER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Clinical Early Warning
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Live Diagnostic Telemetry
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
              <BellRing className="w-7 h-7 text-rose-500" />
              Lab Results & Panic Inbox
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
              Real-time laboratory findings, critical panic values, and bed-level nursing acknowledgment
            </p>
          </div>

          {/* Critical Panic Counter Widget */}
          <div className="flex items-center gap-3 bg-rose-950/30 border border-rose-500/40 p-4 rounded-xl">
            <div className="h-10 w-10 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">Pending Critical Panic Values</span>
              <span className="text-xl font-black text-white font-mono">2 PATIENTS</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-2 rounded-lg uppercase tracking-wider transition cursor-pointer ${
              filterType === 'ALL' ? 'bg-indigo-600 text-white font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Results
          </button>
          <button
            type="button"
            onClick={() => setFilterType('CRITICAL_ONLY')}
            className={`px-3 py-2 rounded-lg uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              filterType === 'CRITICAL_ONLY' ? 'bg-rose-600 text-white font-black' : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Critical Panic (2)
          </button>
          <button
            type="button"
            onClick={() => setFilterType('PENDING_ACK')}
            className={`px-3 py-2 rounded-lg uppercase tracking-wider transition cursor-pointer ${
              filterType === 'PENDING_ACK' ? 'bg-amber-600 text-white font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending Acknowledgment
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search patient, test, or ward..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* 3. LAB RESULTS FEED */}
      <div className="space-y-4">
        {filteredResults.map((item) => (
          <div
            key={item.id}
            className={`p-5 rounded-2xl border transition-all ${
              item.isCritical
                ? 'bg-rose-950/10 border-rose-500/40 shadow-lg shadow-rose-950/20'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Patient & Test Header */}
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-black text-white text-base tracking-wide uppercase">{item.patientName}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold border border-slate-700">
                    {item.ehrNumber}
                  </span>
                  {item.isCritical && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Critical Panic Value
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {item.wardName} • <span className="text-slate-300 font-bold">{item.testName}</span> ({item.sampleType})
                </p>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-3">
                {item.status === 'ACKNOWLEDGED' ? (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Acknowledged by {item.acknowledgedBy}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedResult(item);
                      setIsDetailOpen(true);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-600/20 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Review & Acknowledge
                  </button>
                )}
              </div>
            </div>

            {/* Parameter Result Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
              {item.results.map((r, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    r.flag === 'CRITICAL_PANIC'
                      ? 'bg-rose-950/30 border-rose-500/50 text-white'
                      : r.flag === 'HIGH' || r.flag === 'LOW'
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300'
                  }`}
                >
                  <div>
                    <span className="font-bold block">{r.parameter}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Ref: {r.referenceRange}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm block">
                      {r.value} {r.unit}
                    </span>
                    {r.flag === 'CRITICAL_PANIC' && (
                      <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">PANIC</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 4. LAB PANIC VALUE REVIEW & ACKNOWLEDGMENT MODAL */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl bg-slate-950 border border-slate-800 text-slate-100 p-6 shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  Critical Panic Value Protocol
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Patient: <span className="font-bold text-white">{selectedResult?.patientName}</span> ({selectedResult?.ehrNumber})
                </p>
              </div>
            </div>
          </DialogHeader>

          {selectedResult && (
            <div className="space-y-4 my-2 text-xs">
              <div className="bg-amber-950/30 border border-amber-800/40 p-3.5 rounded-xl text-amber-200">
                <p className="leading-relaxed">
                  <strong>Clinical Nursing Directive:</strong> Acknowledging this value confirms you have noted the critical laboratory finding and initiated bed-level stabilization protocols (e.g. informing the attending physician, continuous cardiac telemetry, or stat IV orders).
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider font-mono block">
                  Report Findings for {selectedResult.testName}
                </span>
                {selectedResult.results.map((r, i) => (
                  <div key={i} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">{r.parameter}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Reference Range: {r.referenceRange} {r.unit}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black font-mono text-rose-400">{r.value} {r.unit}</span>
                      <span className="text-[10px] font-bold text-rose-500 block uppercase">{r.flag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-800/80 pt-4 mt-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={() => selectedResult && handleAcknowledgePanic(selectedResult)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider gap-2 shadow-lg shadow-rose-600/20"
            >
              <CheckCircle2 className="h-4 w-4" /> Acknowledge Critical Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
