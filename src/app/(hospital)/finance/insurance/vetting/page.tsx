'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  FileSearch, ShieldCheck, AlertTriangle, Loader2, ShieldAlert, 
  CheckCircle2, XCircle, ArrowRight, CornerDownRight, FileText,
  UserCheck, Pill, Stethoscope, Eye, ExternalLink, Filter, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type VettingClaim = {
  id: string;
  patientName: string;
  policyNumber?: string;
  encounterDate?: string;
  payerName?: string;
  providerId?: string;
  icd10Code?: string;
  diagnosis?: string;
  description?: string;
  total?: number;
  totalAmount?: number;
  amount?: number;
  claimStatus?: 'PENDING_VETTING' | 'READY_FOR_BATCHING' | 'QUERIED';
  status?: string;
  vettingRemarks?: string;
  preAuthCode?: string;
  prescribedDrugs?: string[];
  doctorNotes?: string;
  createdAt?: { toDate: () => Date } | any;
};

export default function InsuranceVettingQueue() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'PENDING_VETTING' | 'READY_FOR_BATCHING' | 'QUERIED'>('PENDING_VETTING');
  const [selectedClaim, setSelectedClaim] = useState<VettingClaim | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  // Fetch claims in billing_items collection
  const claimsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/billing_items`),
      where("billingType", "==", "INSURANCE_CLAIM")
    );
  }, [firestore, hospitalId]);
  const { data: rawClaims, isLoading: areClaimsLoading } = useCollection<VettingClaim>(claimsQuery);

  // Demodata Fallback for Immediate Vetting Assurance Demonstration
  const demoClaims: VettingClaim[] = useMemo(() => [
    {
      id: 'clm-v-001',
      patientName: 'Kofi Owusu',
      policyNumber: 'NHIS-88291029',
      encounterDate: '2026-08-14',
      payerName: 'NHIS National Claims',
      providerId: 'NHIS',
      icd10Code: 'J45.901',
      diagnosis: 'Acute Severe Asthma Exacerbation',
      description: 'Consultation + Nebulization + Salbutamol & IV Hydrocortisone',
      totalAmount: 480.00,
      claimStatus: 'PENDING_VETTING',
      preAuthCode: 'PA-NHIA-99201',
      prescribedDrugs: ['Salbutamol Inhaler 100mcg', 'IV Hydrocortisone 100mg', 'Nebulizer Solution'],
      doctorNotes: 'Patient presented with acute dyspnea, wheezing, and chest tightness. Responded well to nebulization.',
      createdAt: { toDate: () => new Date('2026-08-14T09:30:00') }
    },
    {
      id: 'clm-v-002',
      patientName: 'Abena Mensah',
      policyNumber: 'GLC-991204',
      encounterDate: '2026-08-14',
      payerName: 'GLICO Healthcare Ltd',
      providerId: 'GLICO',
      icd10Code: undefined, // Missing ICD-10 Code to trigger warning badge
      diagnosis: 'Unspecified Abdominal Pain',
      description: 'Abdominal Ultrasound Scan & Full Blood Count',
      totalAmount: 820.00,
      claimStatus: 'PENDING_VETTING',
      preAuthCode: undefined,
      prescribedDrugs: ['Buscopan 10mg Tabs', 'Omeprazole 20mg Caps'],
      doctorNotes: 'Severe epigastric tenderness. Ultrasound ordered to rule out cholecystitis.',
      createdAt: { toDate: () => new Date('2026-08-14T11:15:00') }
    },
    {
      id: 'clm-v-003',
      patientName: 'Emmanuel Appiah',
      policyNumber: 'ACA-771029',
      encounterDate: '2026-08-13',
      payerName: 'Acacia Health Insurance',
      providerId: 'ACACIA',
      icd10Code: 'E11.9',
      diagnosis: 'Type 2 Diabetes Mellitus without complications',
      description: 'Routine Endocrine Review + HbA1c Lab Panel + Metformin',
      totalAmount: 350.00,
      claimStatus: 'READY_FOR_BATCHING',
      preAuthCode: 'PA-ACA-44102',
      prescribedDrugs: ['Metformin 500mg Tabs x 60', 'Glibenclamide 5mg Tabs'],
      doctorNotes: 'Routine quarterly glycemic monitoring. Fasting blood glucose 6.8 mmol/L.',
      createdAt: { toDate: () => new Date('2026-08-13T14:00:00') }
    },
    {
      id: 'clm-v-004',
      patientName: 'Grace Addo',
      policyNumber: 'NHIS-33920194',
      encounterDate: '2026-08-12',
      payerName: 'NHIS National Claims',
      providerId: 'NHIS',
      icd10Code: 'B50.9',
      diagnosis: 'Plasmodium falciparum malaria, unspecified',
      description: 'Malaria RDT + IV Artesunate + Oral Coartem',
      totalAmount: 290.00,
      claimStatus: 'QUERIED',
      vettingRemarks: 'Doctor forgot mandatory Pre-Authorization Code for emergency IV Artesunate admission.',
      preAuthCode: undefined,
      prescribedDrugs: ['IV Artesunate 60mg', 'Coartem 80/480mg Tabs'],
      doctorNotes: 'High grade fever (39.2C), severe chills, positive Malaria RDT.',
      createdAt: { toDate: () => new Date('2026-08-12T16:45:00') }
    }
  ], []);

  const claims = useMemo(() => {
    const list = rawClaims && rawClaims.length > 0 ? rawClaims : demoClaims;
    return list.map(c => ({
      ...c,
      claimStatus: c.claimStatus || (c.status === 'READY_FOR_BATCHING' ? 'READY_FOR_BATCHING' : c.status === 'QUERIED' ? 'QUERIED' : 'PENDING_VETTING')
    }));
  }, [rawClaims, demoClaims]);

  const filteredClaims = useMemo(() => {
    return claims.filter(c => c.claimStatus === activeTab);
  }, [claims, activeTab]);

  // Telemetry Counts
  const pendingCount = useMemo(() => claims.filter(c => c.claimStatus === 'PENDING_VETTING').length, [claims]);
  const batchingCount = useMemo(() => claims.filter(c => c.claimStatus === 'READY_FOR_BATCHING').length, [claims]);
  const queriedCount = useMemo(() => claims.filter(c => c.claimStatus === 'QUERIED').length, [claims]);

  const totalPipelineValue = useMemo(() => {
    return claims.reduce((acc, c) => acc + Number(c.totalAmount || c.total || c.amount || 0), 0);
  }, [claims]);

  const handleApproveClaim = async (claimId: string) => {
    setProcessingId(claimId);
    try {
      if (firestore && hospitalId) {
        const claimRef = doc(firestore, `hospitals/${hospitalId}/billing_items`, claimId);
        await updateDoc(claimRef, {
          claimStatus: 'READY_FOR_BATCHING',
          vettedBy: user?.uid || 'ACCOUNTANT',
          vettedByName: userProfile?.fullName || 'Marcus Amosah Henaku',
          vettedAt: serverTimestamp()
        });
      }

      toast({
        title: "Claim Approved",
        description: "Claim verified and pushed to the NHIS / Corporate Batching Queue."
      });

      if (selectedClaim?.id === claimId) setSelectedClaim(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Approval Failed", description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleQueryClaim = async (claimId: string) => {
    const reason = prompt("Enter specific reason for querying this claim (e.g. Missing ICD-10 or Pre-Auth Code):");
    if (!reason?.trim()) return;

    setProcessingId(claimId);
    try {
      if (firestore && hospitalId) {
        const claimRef = doc(firestore, `hospitals/${hospitalId}/billing_items`, claimId);
        await updateDoc(claimRef, {
          claimStatus: 'QUERIED',
          vettingRemarks: reason,
          queriedBy: user?.uid || 'ACCOUNTANT',
          queriedAt: serverTimestamp()
        });
      }

      toast({
        title: "Claim Queried & Returned",
        description: `Routed back to doctor dashboard with note: "${reason}"`
      });

      if (selectedClaim?.id === claimId) setSelectedClaim(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Query Failed", description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (pageIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Claims Vetting.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <FileSearch className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                CLAIMS VETTING & COMPLIANCE TRIAGE WORKSPACE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CLINICAL & FINANCIAL AUDIT GATEKEEPER BEFORE BATCHING & GOVERNMENT/CORPORATE PAYER SUBMISSION.
            </p>
          </div>

          {/* User Context */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Contextual Vetting Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Awaiting Vetting</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {pendingCount} Claims
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Pre-Flight Audit Queue</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <FileSearch className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Value in Pipeline</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {totalPipelineValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Total Unbatched Revenue</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-rose-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Queried / Rejected</span>
              <div className="text-2xl font-black text-rose-400 font-mono">{queriedCount} Claims</div>
              <span className="text-[10px] font-bold text-rose-400 mt-0.5 block">Returned to Clinicians</span>
            </div>
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. ACTIONABLE STATUS TABS NAVIGATION       */}
      {/* ========================================== */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('PENDING_VETTING')}
          className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'PENDING_VETTING'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <FileSearch className="w-4 h-4" />
          <span>PENDING VETTING ({pendingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('READY_FOR_BATCHING')}
          className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'READY_FOR_BATCHING'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>READY FOR BATCHING ({batchingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('QUERIED')}
          className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'QUERIED'
              ? 'bg-rose-600 text-white shadow-lg'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>QUERIED / REJECTED ({queriedCount})</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* 3. VETTING DATA GRID & SPLIT PANELS        */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Claims Table */}
        <div className={`space-y-4 ${selectedClaim ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {areClaimsLoading ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading claims queue...</span>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="p-16 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                NO CLAIMS IN THIS QUEUE.
              </h3>
              <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
                All clinical encounter claims for this filter category have been processed.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
                  <tr>
                    <th className="p-4">Patient & Encounter</th>
                    <th className="p-4">Payer / Provider</th>
                    <th className="p-4">Diagnosis (ICD-10)</th>
                    <th className="p-4 text-right">Claim Value (₵)</th>
                    <th className="p-4 text-center">Vetting Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredClaims.map(c => {
                    const amt = Number(c.totalAmount || c.total || c.amount || 0);
                    const isSelected = selectedClaim?.id === c.id;

                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => setSelectedClaim(c)}
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="p-4">
                          <p className="font-black text-slate-900 dark:text-slate-100 uppercase">{c.patientName}</p>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                            Policy: {c.policyNumber || 'NHIS-882910'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-600 dark:text-slate-300 uppercase">
                          {c.payerName || c.providerId || 'NHIS'}
                        </td>
                        <td className="p-4">
                          {c.icd10Code ? (
                            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-black font-mono rounded-lg">
                              {c.icd10Code}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-[10px] font-black rounded-lg flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-rose-500" /> MISSING
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                          ₵ {amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center">
                          {activeTab === 'PENDING_VETTING' && (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveClaim(c.id);
                                }}
                                disabled={processingId === c.id}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-lg shadow cursor-pointer transition-all"
                              >
                                APPROVE
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQueryClaim(c.id);
                                }}
                                disabled={processingId === c.id}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase rounded-lg shadow cursor-pointer transition-all"
                              >
                                QUERY
                              </button>
                            </div>
                          )}

                          {activeTab === 'READY_FOR_BATCHING' && (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase rounded-md">
                              READY FOR BATCH
                            </span>
                          )}

                          {activeTab === 'QUERIED' && (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-black text-[9px] uppercase rounded-md truncate max-w-[120px] block">
                              {c.vettingRemarks || 'QUERIED'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Split-Pane Clinical Dossier Panel */}
        {selectedClaim && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 self-start">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-100">
                  Clinical Encounter Dossier
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Close Panel
              </button>
            </div>

            {/* Patient Header */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">
                {selectedClaim.payerName || 'NHIS'}
              </span>
              <h4 className="text-base font-black uppercase text-slate-900 dark:text-slate-100">
                {selectedClaim.patientName}
              </h4>
              <p className="text-xs font-mono text-slate-500">Policy: {selectedClaim.policyNumber}</p>
            </div>

            {/* Pre-Authorization Code Status */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Payer Pre-Authorization Code</span>
              {selectedClaim.preAuthCode ? (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-xl font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>{selectedClaim.preAuthCode}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              ) : (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Missing Pre-Authorization Code</span>
                </div>
              )}
            </div>

            {/* Doctor's Notes */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Attending Clinician Notes</span>
              <p className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium italic text-slate-700 dark:text-slate-300 leading-relaxed">
                "{selectedClaim.doctorNotes || 'No specific clinical encounter notes provided.'}"
              </p>
            </div>

            {/* Dispensed Pharmacy Items */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 block flex items-center gap-1">
                <Pill className="w-3.5 h-3.5 text-emerald-500" /> Dispensed Drugs & Medical Supplies
              </span>
              <ul className="space-y-1">
                {selectedClaim.prescribedDrugs && selectedClaim.prescribedDrugs.length > 0 ? (
                  selectedClaim.prescribedDrugs.map((drug, i) => (
                    <li key={i} className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                      • {drug}
                    </li>
                  ))
                ) : (
                  <li className="text-xs italic text-slate-400">Standard Consultation & Diagnostic Order</li>
                )}
              </ul>
            </div>

            {/* Action Triggers in Panel */}
            {activeTab === 'PENDING_VETTING' && (
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleQueryClaim(selectedClaim.id)}
                  disabled={processingId === selectedClaim.id}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase rounded-xl transition-all shadow"
                >
                  QUERY CLAIM
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveClaim(selectedClaim.id)}
                  disabled={processingId === selectedClaim.id}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl transition-all shadow"
                >
                  APPROVE CLAIM
                </button>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}