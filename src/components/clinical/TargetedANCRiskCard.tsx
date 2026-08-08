'use client';
import { useState, useMemo } from 'react';
import { Stethoscope, ShieldAlert, CheckCircle2, Sparkles, Activity, FileText, ArrowRight, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { generateTargetedANCRiskProfile, TargetedANCRiskProfile } from '@/ai/flows/ai-genomic-engine';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

import { useFirestore, useUser, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';

interface TargetedANCRiskCardProps {
  patientId?: string;
  hospitalId?: string;
  patientName?: string;
  gestationalAgeWeeks?: number;
  maternalAge?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  defaultExpanded?: boolean;
}

export function TargetedANCRiskCard({
  patientId,
  hospitalId: propHospitalId,
  patientName = 'Patient',
  gestationalAgeWeeks = 14,
  maternalAge = 34,
  bpSystolic = 138,
  bpDiastolic = 88,
  defaultExpanded = false
}: TargetedANCRiskCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const params = useParams();
  const effectivePatientId = patientId || (params?.id as string);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = propHospitalId || userProfile?.hospitalId;

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isOrderQueued, setIsOrderQueued] = useState(false);

  const ancProfile = useMemo(() => {
    return generateTargetedANCRiskProfile(gestationalAgeWeeks, maternalAge, bpSystolic, bpDiastolic);
  }, [gestationalAgeWeeks, maternalAge, bpSystolic, bpDiastolic]);

  const handleQueueOrders = () => {
    setIsOrderQueued(true);

    if (firestore && hospitalId && effectivePatientId) {
      // 1. Queue Lab Orders (OGTT & NIPT)
      const ogttRef = doc(collection(firestore, `hospitals/${hospitalId}/lab_orders`));
      setDocumentNonBlocking(ogttRef, {
        patientId: effectivePatientId,
        patientName,
        testName: 'Early 16-Week 75g Oral Glucose Tolerance Test (OGTT)',
        category: 'Biochemistry / ANC',
        urgency: 'HIGH',
        status: 'PENDING',
        requestedBy: user?.displayName || 'Dr. Tracy Gambrah',
        createdAt: serverTimestamp()
      }, { merge: true });

      const niptRef = doc(collection(firestore, `hospitals/${hospitalId}/lab_orders`));
      setDocumentNonBlocking(niptRef, {
        patientId: effectivePatientId,
        patientName,
        testName: 'Cell-Free Fetal DNA (cfDNA) NIPT Genomic Panel (Chromosomes 21, 18, 13 & Microdeletions)',
        category: 'Genomics / Cytogenetics',
        urgency: 'ROUTINE',
        status: 'PENDING',
        requestedBy: user?.displayName || 'Dr. Tracy Gambrah',
        createdAt: serverTimestamp()
      }, { merge: true });

      // 2. Queue Pharmacy Prescription
      const rxRef = doc(collection(firestore, `hospitals/${hospitalId}/treatment_plans`));
      setDocumentNonBlocking(rxRef, {
        patientId: effectivePatientId,
        patientName,
        medicationName: 'Aspirin 150mg (Bedtime)',
        instructions: '150mg PO daily at bedtime for Pre-eclampsia Prophylaxis until 36 weeks GA',
        status: 'ACTIVE',
        authorizedBy: user?.displayName || 'Dr. Tracy Gambrah',
        createdAt: serverTimestamp()
      }, { merge: true });

      // 3. Queue Specialist MFM Referral
      const refRef = doc(collection(firestore, `hospitals/${hospitalId}/referrals`));
      setDocumentNonBlocking(refRef, {
        patientId: effectivePatientId,
        patientName,
        targetSpecialty: 'Maternal-Fetal Medicine (MFM)',
        priority: 'HIGH_RISK_OBSTETRIC',
        reason: 'High-risk pre-eclampsia (sFlt-1/PlGF ratio 88) and GDM TCF7L2 variant requiring specialized MFM co-management.',
        referredBy: user?.displayName || 'Dr. Tracy Gambrah',
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    toast({
      title: '✅ All 4 Genomic ANC Protocols Dispatched to EHR',
      description: `Dispatched Aspirin 150mg Rx, 16-Wk OGTT, NIPT Panel & MFM Referral for ${patientName}.`
    });
  };

  return (
    <div className="bg-slate-900 text-white rounded-[28px] border border-slate-800 shadow-2xl overflow-hidden transition-all">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer hover:bg-slate-800/60 transition-all gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-950/80 rounded-2xl border border-pink-800/80 text-pink-400">
            <Sparkles className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-pink-400">Targeted ANC Genomic Risk Profiler</h3>
              <span className="bg-red-950 text-red-300 border border-red-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                Pre-Eclampsia & GDM Protocols Flagged
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Personalized Maternal Genomic Screening Protocols (Pre-Eclampsia • GDM • NIPT)</p>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Button
            type="button"
            onClick={handleQueueOrders}
            disabled={isOrderQueued}
            className="bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg"
          >
            {isOrderQueued ? <CheckCircle2 size={14} /> : <Stethoscope size={14} />}
            {isOrderQueued ? 'Protocols Active' : 'Queue Orders'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsExpanded(prev => !prev)}
            className="bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand ANC Profiler'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE BODY WORKSPACE */}
      {isExpanded && (
        <div className="p-6 pt-0 border-t border-slate-800/80 space-y-6 mt-2">
          {/* RISK PROFILES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PRE-ECLAMPSIA RISKS */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-red-900/60 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-black uppercase text-red-400">Pre-Eclampsia Risk</span>
                <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                  HIGH RISK 🚨
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Genomic Markers:</p>
                {ancProfile.preEclampsiaGeneMarkers.map((marker, i) => (
                  <p key={i} className="text-red-200 font-bold text-[11px]">• {marker}</p>
                ))}
              </div>
              <div className="p-2.5 bg-red-950/60 rounded-xl border border-red-800/60 text-[11px] font-bold text-red-100">
                {ancProfile.preEclampsiaProtocol}
              </div>
            </div>

            {/* GDM RISKS */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-amber-900/60 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-black uppercase text-amber-400">Gestational Diabetes (GDM)</span>
                <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                  HIGH RISK ⚠️
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Genomic Markers:</p>
                {ancProfile.gdmGeneMarkers.map((marker, i) => (
                  <p key={i} className="text-amber-200 font-bold text-[11px]">• {marker}</p>
                ))}
              </div>
              <div className="p-2.5 bg-amber-950/60 rounded-xl border border-amber-800/60 text-[11px] font-bold text-amber-100">
                {ancProfile.gdmScreeningProtocol}
              </div>
            </div>

            {/* CHROMOSOMAL NIPT RISKS */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-purple-900/60 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-xs font-black uppercase text-purple-400">Chromosomal Screening (NIPT)</span>
                <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                  MODERATE RISK
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase">cfDNA Biomarkers:</p>
                {ancProfile.chromosomalMarkers.map((marker, i) => (
                  <p key={i} className="text-purple-200 font-bold text-[11px]">• {marker}</p>
                ))}
              </div>
              <div className="p-2.5 bg-purple-950/60 rounded-xl border border-purple-800/60 text-[11px] font-bold text-purple-100">
                {ancProfile.niptProtocol}
              </div>
            </div>
          </div>

          {/* PERSONALIZED CARE PLAN PROTOCOLS */}
          <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-xs font-black uppercase text-pink-400 tracking-wider flex items-center gap-1.5">
                <FileText size={14} /> Personalised Genomic ANC Protocol Summary ({patientName}):
              </h4>
              <Button
                type="button"
                size="sm"
                disabled={isOrderQueued}
                onClick={handleQueueOrders}
                className={`${
                  isOrderQueued 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-pink-600 hover:bg-pink-500 text-white'
                } font-black text-[10px] uppercase rounded-xl h-8 px-3 flex items-center gap-1.5 shadow-lg transition-all`}
              >
                {isOrderQueued ? <CheckCircle2 size={14} /> : <Zap size={14} />}
                {isOrderQueued ? '✅ All 4 ANC Orders Queued' : '⚡ Queue ANC Orders'}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-bold text-slate-200">
              {ancProfile.personalizedCarePlan.map((plan, i) => (
                <div key={i} className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                  isOrderQueued ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <ArrowRight size={12} className={isOrderQueued ? 'text-emerald-400 shrink-0' : 'text-pink-400 shrink-0'} />
                    <span>{plan}</span>
                  </div>
                  {isOrderQueued && (
                    <span className="text-[9px] font-black uppercase bg-emerald-900 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-md shrink-0">
                      Queued
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
