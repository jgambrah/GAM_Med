'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { 
  Landmark, FileText, CheckCircle2, AlertTriangle, Send, Filter, 
  Loader2, ShieldAlert, Check, X, Stethoscope
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type ClaimItem = {
  id: string;
  patientName: string;
  nhisNumber?: string;
  memberNumber?: string;
  policyNumber?: string;
  totalAmount?: number;
  totalInsuranceClaim?: number;
  amount?: number;
  total?: number;
  icd10Code?: string;
  diagnosis?: string;
  claimStatus?: 'PENDING_VETTING' | 'READY_FOR_BATCHING' | 'QUERIED' | 'SUBMITTED';
  status?: string;
  vettingRemarks?: string;
  insuranceDetails?: {
    memberNumber?: string;
    providerId?: string;
  };
  totals?: {
    totalInsuranceClaim?: number;
  };
  createdAt?: { toDate: () => Date } | any;
};

export default function InsuranceClaimsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'PENDING_VETTING' | 'READY_FOR_BATCHING' | 'QUERIED'>('PENDING_VETTING');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || '');

  // Real-time Firestore Claims Query
  const claimsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payments`),
      where("paymentMode", "==", "NHIS")
    );
  }, [firestore, hospitalId]);
  const { data: rawClaims, isLoading: areClaimsLoading } = useCollection<ClaimItem>(claimsQuery);

  // Demodata Fallback for Immediate Vetting Workspace Demonstration
  const demoClaims: ClaimItem[] = useMemo(() => [
    {
      id: 'clm-001',
      patientName: 'Kofi Owusu',
      nhisNumber: 'NHIS-88291029',
      icd10Code: 'J45.901',
      diagnosis: 'Acute Severe Asthma Exacerbation',
      totalAmount: 480.00,
      claimStatus: 'PENDING_VETTING',
      insuranceDetails: { memberNumber: 'NHIS-88291029', providerId: 'NHIS' },
      totals: { totalInsuranceClaim: 480.00 }
    },
    {
      id: 'clm-002',
      patientName: 'Abena Mensah',
      nhisNumber: 'NHIS-99120412',
      icd10Code: undefined, // Missing ICD-10
      diagnosis: 'Unspecified Abdominal Pain',
      totalAmount: 820.00,
      claimStatus: 'PENDING_VETTING',
      insuranceDetails: { memberNumber: 'NHIS-99120412', providerId: 'NHIS' },
      totals: { totalInsuranceClaim: 820.00 }
    },
    {
      id: 'clm-003',
      patientName: 'Emmanuel Appiah',
      nhisNumber: 'NHIS-77102934',
      icd10Code: 'E11.9',
      diagnosis: 'Type 2 Diabetes Mellitus',
      totalAmount: 350.00,
      claimStatus: 'READY_FOR_BATCHING',
      insuranceDetails: { memberNumber: 'NHIS-77102934', providerId: 'NHIS' },
      totals: { totalInsuranceClaim: 350.00 }
    },
    {
      id: 'clm-004',
      patientName: 'Grace Addo',
      nhisNumber: 'NHIS-33920194',
      icd10Code: 'B50.9',
      diagnosis: 'Plasmodium Falciparum Malaria',
      totalAmount: 290.00,
      claimStatus: 'QUERIED',
      vettingRemarks: 'Missing mandatory Pre-Authorization code for emergency IV Artesunate admission.',
      insuranceDetails: { memberNumber: 'NHIS-33920194', providerId: 'NHIS' },
      totals: { totalInsuranceClaim: 290.00 }
    }
  ], []);

  const [claimsList, setClaimsList] = useState<ClaimItem[]>(() => {
    const list = rawClaims && rawClaims.length > 0 ? rawClaims : demoClaims;
    return list.map(c => ({
      ...c,
      claimStatus: c.claimStatus || (c.status === 'SUBMITTED' ? 'READY_FOR_BATCHING' : 'PENDING_VETTING')
    }));
  });

  const filteredClaims = useMemo(() => {
    return claimsList.filter(c => c.claimStatus === activeTab);
  }, [claimsList, activeTab]);

  const totalRecovery = useMemo(() => {
    return claimsList
      .filter(c => c.claimStatus === 'PENDING_VETTING' || c.claimStatus === 'READY_FOR_BATCHING')
      .reduce((sum, c) => sum + Number(c.totalAmount || c.totals?.totalInsuranceClaim || c.amount || 0), 0);
  }, [claimsList]);

  const handleApprove = async (claimId: string) => {
    setProcessingId(claimId);
    try {
      if (firestore && hospitalId) {
        const claimRef = doc(firestore, `hospitals/${hospitalId}/payments`, claimId);
        await updateDoc(claimRef, {
          claimStatus: 'READY_FOR_BATCHING',
          vettedBy: user?.uid || 'ACCOUNTANT',
          vettedAt: serverTimestamp()
        });
      }

      setClaimsList(prev => prev.map(c => c.id === claimId ? { ...c, claimStatus: 'READY_FOR_BATCHING' } : c));

      toast({
        title: "Claim Approved",
        description: "Claim verified and routed to the NHIS / Corporate Batching Queue."
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Approval Failed", description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuery = async (claimId: string) => {
    const reason = prompt("Enter query reason (e.g. Missing ICD-10 Code):");
    if (!reason?.trim()) return;

    setProcessingId(claimId);
    try {
      if (firestore && hospitalId) {
        const claimRef = doc(firestore, `hospitals/${hospitalId}/payments`, claimId);
        await updateDoc(claimRef, {
          claimStatus: 'QUERIED',
          vettingRemarks: reason,
          queriedBy: user?.uid || 'ACCOUNTANT',
          queriedAt: serverTimestamp()
        });
      }

      setClaimsList(prev => prev.map(c => c.id === claimId ? { ...c, claimStatus: 'QUERIED', vettingRemarks: reason } : c));

      toast({
        title: "Claim Queried & Returned",
        description: `Routed back to clinician portal with note: "${reason}"`
      });
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
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Landmark className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                CLAIMS VETTING WORKSPACE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CLINICAL VETTING, ICD-10 AUDITING, AND REVENUE RECOVERY BEFORE PAYER BATCH TRANSMISSION.
            </p>
          </div>

          {/* Pending Recovery Counter Pill */}
          <div className="bg-slate-900/90 border border-slate-800 px-6 py-3 rounded-2xl text-right self-start xl:self-auto ring-1 ring-emerald-500/20 shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Pending Recovery</p>
            <p className="text-xl font-mono text-emerald-400 font-black">
              GHS {totalRecovery.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. ACTIONABLE STATUS NAVIGATION TABS       */}
      {/* ========================================== */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        {['PENDING_VETTING', 'READY_FOR_BATCHING', 'QUERIED'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {tab.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* ========================================== */}
      {/* 3. HIGH-SPEED CLAIMS DATA GRID             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {areClaimsLoading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading claims pipeline...</span>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-16 text-center text-slate-400 italic">
            No claims currently in this queue.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Patient & NHIS Number</th>
                <th className="p-4">ICD-10 / Diagnosis</th>
                <th className="p-4 text-right">Amount (GHS)</th>
                <th className="p-4 text-center">Vetting Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredClaims.map((claim) => {
                const amt = Number(claim.totalAmount || claim.totals?.totalInsuranceClaim || claim.amount || 0);

                return (
                  <tr key={claim.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                    <td className="p-4">
                      <p className="font-black text-slate-900 dark:text-slate-100 uppercase">{claim.patientName}</p>
                      <p className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {claim.nhisNumber || claim.memberNumber || claim.insuranceDetails?.memberNumber || 'N/A'}
                      </p>
                    </td>

                    <td className="p-4">
                      {claim.icd10Code ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-black font-mono rounded-lg">
                            {claim.icd10Code}
                          </span>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                            {claim.diagnosis}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-[10px] font-black rounded-lg inline-flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-500" /> MISSING
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                      ₵ {amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-center">
                      {activeTab === 'PENDING_VETTING' && (
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(claim.id)}
                            disabled={processingId === claim.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-lg shadow cursor-pointer transition-all"
                          >
                            APPROVE
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuery(claim.id)}
                            disabled={processingId === claim.id}
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
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-black text-[9px] uppercase rounded-md truncate max-w-[200px] block mx-auto">
                          {claim.vettingRemarks || 'QUERIED'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
