'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  FileSearch, ShieldCheck, AlertTriangle, Loader2, ShieldAlert, 
  CheckCircle2, XCircle, ArrowRight, CornerDownRight, FileText,
  UserCheck, Pill, Stethoscope, Eye, ExternalLink, Filter, HelpCircle,
  AlertOctagon, RefreshCw, DollarSign, Send, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type ClaimLineItem = {
  id: string;
  itemType: 'CONSULTATION' | 'PROCEDURE' | 'DRUG' | 'LAB' | 'RADIOLOGY';
  description: string;
  code?: string;
  amount: number;
  isZeroValue?: boolean;
  tariffPrice?: number;
  status?: 'OK' | 'UNPRICED' | 'MISSING_CODE';
};

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
  lineItems?: ClaimLineItem[];
};

export default function InsuranceVettingQueue() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'PENDING_VETTING' | 'READY_FOR_BATCHING' | 'QUERIED'>('PENDING_VETTING');
  const [selectedClaim, setSelectedClaim] = useState<VettingClaim | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [queryReason, setQueryReason] = useState<string>('Missing ICD-10 Code');

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

  // Demodata Fallback: Patient Encounter Level Dossiers with Nested Line Items
  const demoClaims: VettingClaim[] = useMemo(() => [
    {
      id: 'clm-v-001',
      patientName: 'Janet Bonah',
      policyNumber: 'NHIS-88291029',
      encounterDate: '2026-08-14',
      payerName: 'NHIS National Claims',
      providerId: 'NHIS',
      icd10Code: 'J45.901',
      diagnosis: 'Acute Severe Asthma Exacerbation & GERD',
      description: 'Emergency Specialist Review + Nebulization + Antacid',
      totalAmount: 480.00,
      claimStatus: 'PENDING_VETTING',
      preAuthCode: 'PA-NHIA-99201',
      prescribedDrugs: ['Salbutamol Inhaler 100mcg', 'IV Hydrocortisone 100mg', 'Nugel-O Antacid 200ml'],
      doctorNotes: 'Patient presented with acute severe wheezing and epigastric burning sensation. Responded well to nebulization.',
      createdAt: { toDate: () => new Date('2026-08-14T09:30:00') },
      lineItems: [
        { id: 'li-01', itemType: 'CONSULTATION', description: 'Emergency Specialist Clinical Consultation', code: 'CON-01', amount: 180.00, status: 'OK' },
        { id: 'li-02', itemType: 'PROCEDURE', description: 'Acute Emergency Nebulization Therapy', code: 'PROC-NEB', amount: 120.00, status: 'OK' },
        { id: 'li-03', itemType: 'DRUG', description: 'Salbutamol Inhaler 100mcg + IV Hydrocortisone', code: 'MED-SAL-01', amount: 180.00, status: 'OK' },
        { id: 'li-04', itemType: 'DRUG', description: 'Nugel-O Antacid Suspension 200ml', code: 'DRG-NUG-01', amount: 0.00, isZeroValue: true, tariffPrice: 45.00, status: 'UNPRICED' }
      ]
    },
    {
      id: 'clm-v-002',
      patientName: 'Kofi Mensah',
      policyNumber: 'NHIS-11029384',
      encounterDate: '2026-08-14',
      payerName: 'NHIS National Claims',
      providerId: 'NHIS',
      icd10Code: 'E54',
      diagnosis: 'Ascorbic Acid Nutritional Deficiency',
      description: 'Pediatric Clinical Review & Nutritional Supplementation',
      totalAmount: 60.00,
      claimStatus: 'PENDING_VETTING',
      preAuthCode: undefined,
      prescribedDrugs: ['Vita C Syrup 100ml Bottle'],
      doctorNotes: 'Pediatric general health check and nutritional supplementation.',
      createdAt: { toDate: () => new Date('2026-08-14T11:00:00') },
      lineItems: [
        { id: 'li-05', itemType: 'CONSULTATION', description: 'General Outpatient Clinical Consultation', code: 'CON-OPD', amount: 60.00, status: 'OK' },
        { id: 'li-06', itemType: 'DRUG', description: 'Vita C Syrup 100ml Bottle', code: 'DRG-VIT-01', amount: 0.00, isZeroValue: true, tariffPrice: 25.00, status: 'UNPRICED' }
      ]
    },
    {
      id: 'clm-v-003',
      patientName: 'Abena Mensah',
      policyNumber: 'GLC-991204',
      encounterDate: '2026-08-14',
      payerName: 'GLICO Healthcare Ltd',
      providerId: 'GLICO',
      icd10Code: undefined, // Missing ICD-10 Code
      diagnosis: 'Unspecified Acute Abdominal Pain',
      description: 'Abdominal Ultrasound Scan & Full Blood Count',
      totalAmount: 820.00,
      claimStatus: 'PENDING_VETTING',
      preAuthCode: undefined,
      prescribedDrugs: ['Buscopan 10mg Tabs', 'Omeprazole 20mg Caps'],
      doctorNotes: 'Severe epigastric tenderness. Ultrasound ordered to rule out acute cholecystitis.',
      createdAt: { toDate: () => new Date('2026-08-14T11:15:00') },
      lineItems: [
        { id: 'li-07', itemType: 'RADIOLOGY', description: 'Abdominal & Pelvic Ultrasound Scan', code: 'RAD-US-01', amount: 520.00, status: 'OK' },
        { id: 'li-08', itemType: 'LAB', description: 'Full Blood Count (FBC) Hematology Panel', code: 'LAB-FBC-01', amount: 180.00, status: 'OK' },
        { id: 'li-09', itemType: 'DRUG', description: 'Buscopan 10mg + Omeprazole 20mg Caps', code: 'MED-BUS-01', amount: 120.00, status: 'OK' }
      ]
    },
    {
      id: 'clm-v-004',
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
      createdAt: { toDate: () => new Date('2026-08-13T14:00:00') },
      lineItems: [
        { id: 'li-10', itemType: 'CONSULTATION', description: 'Endocrinology Specialist Review', code: 'CON-SPEC', amount: 150.00, status: 'OK' },
        { id: 'li-11', itemType: 'LAB', description: 'Glycated Hemoglobin (HbA1c) Panel', code: 'LAB-HBA1C', amount: 120.00, status: 'OK' },
        { id: 'li-12', itemType: 'DRUG', description: 'Metformin 500mg + Glibenclamide 5mg', code: 'MED-DIAB', amount: 80.00, status: 'OK' }
      ]
    },
    {
      id: 'clm-v-005',
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
      createdAt: { toDate: () => new Date('2026-08-12T16:45:00') },
      lineItems: [
        { id: 'li-13', itemType: 'LAB', description: 'Malaria Rapid Diagnostic Test (RDT)', code: 'LAB-MAL', amount: 50.00, status: 'OK' },
        { id: 'li-14', itemType: 'PROCEDURE', description: 'Emergency IV Infusion Administration', code: 'PROC-INF', amount: 90.00, status: 'OK' },
        { id: 'li-15', itemType: 'DRUG', description: 'IV Artesunate 60mg + Coartem 80/480mg', code: 'MED-ART', amount: 150.00, status: 'OK' }
      ]
    }
  ], []);

  const [claimsList, setClaimsList] = useState<VettingClaim[]>(() => {
    const list = rawClaims && rawClaims.length > 0 ? rawClaims : demoClaims;
    return list.map(c => ({
      ...c,
      totalAmount: c.totalAmount !== undefined ? c.totalAmount : (c.total || c.amount || 0),
      claimStatus: c.claimStatus || (c.status === 'SUBMITTED' ? 'READY_FOR_BATCHING' : 'PENDING_VETTING')
    }));
  });

  const filteredClaims = useMemo(() => {
    return claimsList.filter(c => c.claimStatus === activeTab);
  }, [claimsList, activeTab]);

  // Telemetry Counts
  const pendingCount = useMemo(() => claimsList.filter(c => c.claimStatus === 'PENDING_VETTING').length, [claimsList]);
  const batchingCount = useMemo(() => claimsList.filter(c => c.claimStatus === 'READY_FOR_BATCHING').length, [claimsList]);
  const queriedCount = useMemo(() => claimsList.filter(c => c.claimStatus === 'QUERIED').length, [claimsList]);

  const activeQueueValue = useMemo(() => {
    return filteredClaims.reduce((acc, c) => acc + Number(c.totalAmount || c.total || c.amount || 0), 0);
  }, [filteredClaims]);

  const targetPercentage = useMemo(() => {
    const target = 50;
    const processed = batchingCount + queriedCount;
    return Math.min(100, Math.round((processed / target) * 100));
  }, [batchingCount, queriedCount]);

  const handleApproveAndNext = async (claimId: string) => {
    setProcessingId(claimId);
    try {
      const claimItem = claimsList.find(c => c.id === claimId);

      if (firestore && hospitalId) {
        try {
          const claimRef = doc(firestore, `hospitals/${hospitalId}/billing_items`, claimId);
          await setDoc(claimRef, {
            ...(claimItem || {}),
            id: claimId,
            hospitalId,
            claimStatus: 'READY_FOR_BATCHING',
            vettedBy: user?.uid || 'ACCOUNTANT',
            vettedByName: userProfile?.fullName || userProfile?.name || user?.displayName || 'Samuel Korsah',
            vettedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (dbErr) {
          console.warn('Firestore update bypassed for demo/custom claim:', dbErr);
        }
      }

      setClaimsList(prev => prev.map(c => c.id === claimId ? { ...c, claimStatus: 'READY_FOR_BATCHING' } : c));

      toast({
        title: "Claim Authorized & Sent to Batching",
        description: "Status updated to READY_FOR_BATCHING for electronic filing."
      });

      // Auto-advance to next claim in queue
      const currentIndex = filteredClaims.findIndex(c => c.id === claimId);
      const nextClaim = filteredClaims[currentIndex + 1] || filteredClaims[0] || null;
      if (nextClaim && nextClaim.id !== claimId) {
        setSelectedClaim(nextClaim);
      } else {
        setSelectedClaim(null);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Authorization Note", description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleQueryClinician = async (claimId: string) => {
    if (!queryReason) return;
    setProcessingId(claimId);

    try {
      const claimItem = claimsList.find(c => c.id === claimId);

      if (firestore && hospitalId) {
        try {
          const claimRef = doc(firestore, `hospitals/${hospitalId}/billing_items`, claimId);
          await setDoc(claimRef, {
            ...(claimItem || {}),
            id: claimId,
            hospitalId,
            claimStatus: 'QUERIED',
            vettingRemarks: queryReason,
            queriedBy: user?.uid || 'ACCOUNTANT',
            queriedByName: userProfile?.fullName || userProfile?.name || user?.displayName || 'Samuel Korsah',
            queriedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (dbErr) {
          console.warn('Firestore query update bypassed for demo/custom claim:', dbErr);
        }
      }

      setClaimsList(prev => prev.map(c => c.id === claimId ? { ...c, claimStatus: 'QUERIED', vettingRemarks: queryReason } : c));

      toast({
        title: "Claim Queried & Returned",
        description: `Routed back to clinician portal with note: "${queryReason}"`
      });

      setSelectedClaim(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Query Note", description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolveZeroValueTariff = (claimId: string, lineItemId?: string) => {
    setClaimsList(prev => prev.map(c => {
      if (c.id !== claimId) return c;
      const updatedLines = (c.lineItems || []).map(li => {
        if (lineItemId ? li.id === lineItemId : li.isZeroValue) {
          const price = li.tariffPrice || 45.00;
          return { ...li, amount: price, isZeroValue: false, status: 'OK' as const };
        }
        return li;
      });
      const newTotal = updatedLines.length > 0
        ? updatedLines.reduce((sum, item) => sum + item.amount, 0)
        : (c.totalAmount || 0) + 45.00;

      return {
        ...c,
        totalAmount: newTotal,
        lineItems: updatedLines
      };
    }));

    if (selectedClaim?.id === claimId) {
      setSelectedClaim(prev => {
        if (!prev) return null;
        const updatedLines = (prev.lineItems || []).map(li => {
          if (lineItemId ? li.id === lineItemId : li.isZeroValue) {
            const price = li.tariffPrice || 45.00;
            return { ...li, amount: price, isZeroValue: false, status: 'OK' as const };
          }
          return li;
        });
        const newTotal = updatedLines.length > 0
          ? updatedLines.reduce((sum, item) => sum + item.amount, 0)
          : (prev.totalAmount || 0) + 45.00;

        return {
          ...prev,
          totalAmount: newTotal,
          lineItems: updatedLines
        };
      });
    }

    toast({
      title: "Tariff Master Applied",
      description: "Priced dispensary item and updated claim total."
    });
  };

  const handleRouteToOutofPocketCash = (claimId: string, lineItemId?: string) => {
    setClaimsList(prev => prev.map(c => {
      if (c.id !== claimId) return c;
      const updatedLines = (c.lineItems || []).filter(li => lineItemId ? li.id !== lineItemId : !li.isZeroValue);
      return {
        ...c,
        lineItems: updatedLines
      };
    }));

    if (selectedClaim?.id === claimId) {
      setSelectedClaim(prev => {
        if (!prev) return null;
        const updatedLines = (prev.lineItems || []).filter(li => lineItemId ? li.id !== lineItemId : !li.isZeroValue);
        return {
          ...prev,
          lineItems: updatedLines
        };
      });
    }

    toast({
      title: "Item Routed to Patient Bill",
      description: "Non-covered medication moved to patient direct out-of-pocket cash receipt."
    });
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
                CLAIMS VETTING ROOM & ANOMALY DETECTOR
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              SPLIT-PANE CLINICAL DOSSIER, ZERO-VALUE LEAKAGE ALERTS, AND ATOMIC AUTHORIZATION ENGINE.
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
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Queue</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {pendingCount} Cases
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Awaiting Authorization</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <FileSearch className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Pipeline Value</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {activeQueueValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Dynamic Active Sum</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-sky-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-sky-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block mb-1">Daily Target Reached</span>
              <div className="text-2xl font-black text-sky-400 font-mono">{targetPercentage}%</div>
              <span className="text-[10px] font-bold text-sky-400 mt-0.5 block">Shift Benchmark Progress</span>
            </div>
            <div className="p-3 bg-sky-500/20 border border-sky-500/30 text-sky-400 rounded-xl">
              <RefreshCw className="w-6 h-6" />
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
          onClick={() => { setActiveTab('PENDING_VETTING'); setSelectedClaim(null); }}
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
          onClick={() => { setActiveTab('READY_FOR_BATCHING'); setSelectedClaim(null); }}
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
          onClick={() => { setActiveTab('QUERIED'); setSelectedClaim(null); }}
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
      {/* 3. MASTER-DETAIL SPLIT-PANE DOSSIER WORKSPACE */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Master Column (Left Panel: Compact Scrollable Case List) */}
        <div className={`space-y-3 ${selectedClaim ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          {areClaimsLoading ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading vetting queue...</span>
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
                All clinical encounter claims for this category have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {filteredClaims.map(c => {
                const amt = Number(c.totalAmount || c.total || c.amount || 0);
                const isZeroValue = amt === 0;
                const isSelected = selectedClaim?.id === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClaim(c)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : isZeroValue
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">
                            {c.patientName}
                          </h4>
                          {isZeroValue && (
                            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded animate-pulse">
                              ZERO VALUE ALERT
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                          {c.payerName || c.providerId || 'NHIS'} • Policy: {c.policyNumber || 'NHIS-882910'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`text-base font-black font-mono ${isZeroValue ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-900 dark:text-slate-100'}`}>
                          ₵ {amt.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-bold">
                          {c.encounterDate || 'Today'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        {c.icd10Code ? (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-black font-mono rounded">
                            ICD: {c.icd10Code}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[9px] font-black rounded">
                            NO ICD-10
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <span>Review Details</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Column (Right Panel: Expanded Clinical Dossier) */}
        {selectedClaim && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900 dark:text-slate-100">
                    Clinical Encounter Dossier
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Claim Ref: {selectedClaim.id}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Close Dossier
              </button>
            </div>

            {/* Zero Value Leakage Alert Banner */}
            {Number(selectedClaim.totalAmount || selectedClaim.total || selectedClaim.amount || 0) === 0 && (
              <div className="bg-amber-500/10 border-2 border-amber-500 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                  <AlertOctagon className="w-6 h-6 flex-shrink-0 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">ZERO VALUE LEAKAGE ALERT</h4>
                    <p className="text-xs font-medium mt-0.5">
                      This item is recorded as ₵ 0.00. Resolve revenue leakage before authorization.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleResolveZeroValueTariff(selectedClaim.id)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase rounded-xl transition-all shadow flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Pull NHIA Tariff Price (₵ 45.00)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRouteToOutofPocketCash(selectedClaim.id)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Route to Patient Out-of-Pocket Cash</span>
                  </button>
                </div>
              </div>
            )}

            {/* Patient & Encounter Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Patient Name</span>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">{selectedClaim.patientName}</p>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                  Policy: {selectedClaim.policyNumber}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Insurance Provider</span>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">{selectedClaim.payerName || selectedClaim.providerId}</p>
                <span className="text-xs font-bold text-slate-500 block mt-0.5">Encounter: {selectedClaim.encounterDate || '2026-08-14'}</span>
              </div>
            </div>

            {/* ICD-10 & Diagnosis */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 block">ICD-10 Clinical Diagnosis</span>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase">{selectedClaim.diagnosis || 'Unspecified Clinical Diagnosis'}</h4>
                  <p className="text-xs text-slate-500 font-medium italic mt-1">{selectedClaim.description}</p>
                </div>

                {selectedClaim.icd10Code ? (
                  <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-black font-mono rounded-xl">
                    {selectedClaim.icd10Code}
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-black rounded-xl">
                    MISSING ICD-10
                  </span>
                )}
              </div>
            </div>

            {/* Pre-Authorization Code Status */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Pre-Authorization Code</span>
              {selectedClaim.preAuthCode ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-xl font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Code: {selectedClaim.preAuthCode}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>No Pre-Auth Required for Standard Consultation</span>
                </div>
              )}
            </div>

            {/* Doctor's Notes */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Attending Clinician Notes</span>
              <p className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-medium italic text-slate-700 dark:text-slate-300 leading-relaxed">
                "{selectedClaim.doctorNotes || 'No specific encounter notes recorded.'}"
              </p>
            </div>

            {/* Prescribed Services, Diagnostics & Pharmacy Line Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 block flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-emerald-500" />
                  Encounter Services, Lab Panels & Pharmacy Breakdown
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {selectedClaim.lineItems?.length || 0} Billed Line Items
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-500">
                    <tr>
                      <th className="p-3">Service / Drug Item</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedClaim.lineItems && selectedClaim.lineItems.length > 0 ? (
                      selectedClaim.lineItems.map((item) => {
                        const isZero = item.isZeroValue || item.amount === 0;
                        return (
                          <tr key={item.id} className={isZero ? 'bg-amber-500/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}>
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-slate-100">{item.description}</div>
                              {item.code && (
                                <span className="text-[10px] font-mono text-slate-400 font-medium">Code: {item.code}</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                item.itemType === 'DRUG' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                                item.itemType === 'LAB' ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300' :
                                item.itemType === 'RADIOLOGY' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                {item.itemType}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold">
                              {isZero ? (
                                <span className="text-rose-600 dark:text-rose-400 font-black">₵ 0.00</span>
                              ) : (
                                <span className="text-slate-900 dark:text-slate-100">₵ {item.amount.toFixed(2)}</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {isZero ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleResolveZeroValueTariff(selectedClaim.id, item.id)}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9px] font-black uppercase rounded shadow transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <RefreshCw className="w-2.5 h-2.5" />
                                    <span>PULL TARIFF (₵ {item.tariffPrice || 45.00})</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRouteToOutofPocketCash(selectedClaim.id, item.id)}
                                    className="p-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-[9px] font-bold uppercase rounded transition-all cursor-pointer"
                                    title="Route to Patient Cash"
                                  >
                                    <DollarSign className="w-3 h-3 text-emerald-500" />
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3" /> Audited
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-xs text-slate-400 italic">
                          Standard Consultation & Care Package
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Atomic Action Triggers */}
            {activeTab === 'PENDING_VETTING' && (() => {
              const hasZeroItems = (selectedClaim.lineItems || []).some(li => li.isZeroValue || li.amount === 0);
              const isClaimZero = Number(selectedClaim.totalAmount || selectedClaim.total || selectedClaim.amount || 0) === 0;
              const isBlocked = hasZeroItems || isClaimZero;

              return (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {hasZeroItems && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Resolve unpriced medication lines above before submitting this claim dossier.</span>
                    </div>
                  )}

                  {/* Rejection Reason Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-rose-500 block">Rejection Reason for Querying Clinician</label>
                    <select
                      value={queryReason}
                      onChange={(e) => setQueryReason(e.target.value)}
                      className="w-full p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-xl text-xs font-bold text-rose-900 dark:text-rose-200 outline-none"
                    >
                      <option value="Missing ICD-10 Code">Missing ICD-10 Code</option>
                      <option value="Missing Mandatory Pre-Authorization Code">Missing Mandatory Pre-Authorization Code</option>
                      <option value="Unjustified High-Cost Drug Prescription">Unjustified High-Cost Drug Prescription</option>
                      <option value="Service Not Covered by Policy">Service Not Covered by Policy</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleQueryClinician(selectedClaim.id)}
                      disabled={processingId === selectedClaim.id}
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>QUERY CLINICIAN</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApproveAndNext(selectedClaim.id)}
                      disabled={processingId === selectedClaim.id || isBlocked}
                      className={`flex-1 py-3 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2 ${
                        isBlocked
                          ? 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed opacity-60'
                          : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                      }`}
                    >
                      {processingId === selectedClaim.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>AUTHORIZE & SEND TO BATCHING</span>
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

      </div>

    </div>
  );
}