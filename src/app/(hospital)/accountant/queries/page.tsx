'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  AlertCircle, MessageSquare, Edit3, Loader2, ShieldAlert,
  Send, Paperclip, ChevronDown, ChevronUp, CheckCircle2, Clock,
  FileText, ExternalLink, ShieldCheck, ArrowRight, CornerDownRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type AuditQueryItem = {
  id: string;
  sourceDocumentId: string;
  pvNumber?: string;
  sourceType?: 'PAYMENT_VOUCHER' | 'NHIS_BATCH' | 'JOURNAL_VOUCHER';
  raisedBy?: string;
  raisedByName?: string;
  category?: 'Missing Documentation' | 'Budget Exceeded' | 'Tax Calculation Error' | 'Unspecified';
  auditComment?: string;
  narration?: string;
  netAmount?: number;
  grossAmount?: number;
  status: 'ACTION_REQUIRED' | 'CLARIFICATION_SUBMITTED' | 'RESOLVED' | 'QUERIED';
  createdAt?: { toDate: () => Date } | any;
};

export default function AuditorQueryLog() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [proofUrl, setProofUrl] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  // Fetch Payment Vouchers in QUERIED status
  const queriedPVsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payment_vouchers`),
      where("status", "==", "QUERIED")
    );
  }, [firestore, hospitalId]);
  const { data: rawQueriedPVs, isLoading: arePvsLoading } = useCollection<AuditQueryItem>(queriedPVsQuery);

  // Demodata Fallback for Immediate Demonstration
  const demoQueries: AuditQueryItem[] = useMemo(() => [
    {
      id: 'pv-query-001',
      sourceDocumentId: 'pv-001',
      pvNumber: 'MMH/PV/2026/0842',
      sourceType: 'PAYMENT_VOUCHER',
      raisedByName: 'Dr. Evelyn Baidoo (Director)',
      category: 'Missing Documentation',
      auditComment: 'Please attach the GRA Tax Clearance Certificate for Korle-Bu Distributors before authorization.',
      narration: 'Payment for Emergency Antimalarial & ICU Antibiotics Stock',
      netAmount: 35070.00,
      grossAmount: 30000.00,
      status: 'ACTION_REQUIRED',
      createdAt: { toDate: () => new Date('2026-08-14T10:15:00') }
    }
  ], []);

  const queriedPVs = rawQueriedPVs && rawQueriedPVs.length > 0 ? rawQueriedPVs : demoQueries;

  const handleSubmitClarification = async (pv: AuditQueryItem) => {
    const text = responseText[pv.id]?.trim();
    if (!text) {
      toast({ variant: "destructive", title: "Clarification Required", description: "Please enter your response before submitting." });
      return;
    }

    setSubmittingId(pv.id);
    try {
      if (firestore && hospitalId) {
        // 1. Update Payment Voucher status back to AWAITING_FINANCE_APPROVAL
        const pvRef = doc(firestore, `hospitals/${hospitalId}/payment_vouchers`, pv.id);
        await updateDoc(pvRef, {
          status: 'AWAITING_FINANCE_APPROVAL',
          hasPendingClarification: true,
          auditClarified: true,
          lastClarificationText: text,
          updatedAt: serverTimestamp()
        });

        // 2. Log Query Document in audit_queries collection
        const queryRef = doc(firestore, `hospitals/${hospitalId}/audit_queries`, pv.id);
        await setDoc(queryRef, {
          sourceDocumentId: pv.pvNumber || pv.id,
          sourceType: 'PAYMENT_VOUCHER',
          status: 'CLARIFICATION_SUBMITTED',
          respondedBy: user?.uid || 'ACCOUNTANT',
          respondedByName: userProfile?.name || 'Marcus Amosah Henaku',
          financeResponse: text,
          attachedFileUrl: proofUrl[pv.id] || '',
          respondedAt: serverTimestamp()
        }, { merge: true });
      }

      toast({
        title: "Clarification Submitted",
        description: `Voucher ${pv.pvNumber || pv.id} has been routed back to the Medical Director approval queue.`
      });

      setExpandedId(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Submission Failed", description: e.message });
    } finally {
      setSubmittingId(null);
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to view the Audit Query Log.</p>
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
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                AUDIT QUERY LOG & TRIAGE WORKSPACE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              MONITOR REJECTED VOUCHERS, SUBMIT CLARIFICATIONS, AND ROUTE DOCUMENTS BACK TO EXECUTIVE APPROVAL.
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

        {/* Bottom Row / Contextual Compliance Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Action Required</span>
              <div className="text-2xl font-black text-rose-400 font-mono">
                {queriedPVs.length} {queriedPVs.length === 1 ? 'Query' : 'Queries'}
              </div>
              <span className="text-[10px] font-bold text-rose-400 mt-0.5 block">Requires Response</span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Avg. Resolution Speed</span>
              <div className="text-2xl font-black text-sky-400 font-mono">4.2 Hours</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Turnaround Benchmark</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Queries Resolved YTD</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">47 Cleared</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">100% Audit Compliance</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. TRIAGE INBOX WORKSPACE                  */}
      {/* ========================================== */}
      <div className="space-y-4">
        {arePvsLoading ? (
          <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading audit queries...</span>
          </div>
        ) : !queriedPVs || queriedPVs.length === 0 ? (
          <div className="p-16 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              ALL CLEAR. NO OUTSTANDING AUDIT QUERIES.
            </h3>
            <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
              All payment vouchers have passed statutory pre-audit without objections.
            </p>
          </div>
        ) : (
          queriedPVs.map(pv => {
            const isExpanded = expandedId === pv.id;
            const netVal = Number(pv.netAmount || pv.grossAmount || 0);

            return (
              <div 
                key={pv.id} 
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
              >
                {/* Query Header Strip */}
                <div className="bg-rose-600 text-white p-4 px-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-white/20 rounded-md">
                      {pv.category || 'Missing Documentation'}
                    </span>
                    <span className="font-mono font-black text-sm">{pv.pvNumber || pv.id}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span>Flagged by: <strong className="text-white uppercase">{pv.raisedByName || 'Internal Auditor / Medical Director'}</strong></span>
                    <span className="font-mono text-white text-base font-black">
                      ₵ {netVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Query Details */}
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-3">
                      <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50">
                        <MessageSquare className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">
                            Auditor Remarks / Objection
                          </p>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 italic leading-relaxed">
                            "{pv.auditComment || 'Please provide required documentation before authorization.'}"
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <strong className="text-slate-700 dark:text-slate-300 uppercase text-[10px] block mb-0.5">Original Narration:</strong>
                        <p>{pv.narration || 'No narration details provided.'}</p>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end border-l border-slate-100 dark:border-slate-800 pl-6 space-y-4">
                      <div className="text-right">
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Source Document</span>
                        <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                          <span>{pv.pvNumber || pv.id}</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : pv.id)}
                        className="w-full px-4 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-emerald-400 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                        <span>{isExpanded ? 'Hide Workspace' : 'Respond & Clarify'}</span>
                      </button>
                    </div>
                  </div>

                  {/* ========================================== */}
                  {/* 3. RESOLUTION WORKSPACE (EXPANDED FORM)    */}
                  {/* ========================================== */}
                  {isExpanded && (
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-800 dark:text-slate-100">
                        <CornerDownRight className="w-4 h-4 text-emerald-500" />
                        <span>Finance Officer Clarification Loop</span>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
                          Response & Clarification Details
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Provide detailed explanation addressing auditor's concerns..."
                          value={responseText[pv.id] || ''}
                          onChange={(e) => setResponseText(prev => ({ ...prev, [pv.id]: e.target.value }))}
                          className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5" /> Attach Supporting Document URL (GRA Tax Clearance / Invoice PDF)
                        </label>
                        <input
                          type="text"
                          placeholder="https://firebasestorage.googleapis.com/... (optional)"
                          value={proofUrl[pv.id] || ''}
                          onChange={(e) => setProofUrl(prev => ({ ...prev, [pv.id]: e.target.value }))}
                          className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setExpandedId(null)}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSubmitClarification(pv)}
                          disabled={submittingId === pv.id}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                        >
                          {submittingId === pv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          <span>SUBMIT CLARIFICATION & ROUTE BACK TO DIRECTOR</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
