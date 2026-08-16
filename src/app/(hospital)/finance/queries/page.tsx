'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { 
  ShieldCheck, AlertTriangle, MessageSquare, ArrowRight, 
  ShieldAlert, Loader2, CheckCircle2, RefreshCw, Clock, 
  Receipt, Landmark, Send, Eye, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface AuditQueryItem {
  id: string;
  time: string;
  type: 'SHORTAGE_FLAG' | 'OVERAGE_DISCREPANCY' | 'UNMATCHED_MOMO_TOKEN' | 'CANCELLED_RECEIPT_AUDIT';
  amount: number;
  relatedReceipt: string;
  message: string;
  status: 'PENDING_RESPONSE' | 'EXPLANATION_SUBMITTED' | 'RESOLVED';
  flaggedBy: string;
  hospitalId?: string;
}

export default function ShiftQueriesAuditPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedQuery, setSelectedQuery] = useState<AuditQueryItem | null>(null);
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
  const [explanationText, setExplanationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  // 1. Real-Time Query for Cashier's Flagged / Queried Tills
  const queriedTillQuery = useMemoFirebase(() => {
    if (!firestore || !user || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/cash_tills`),
      where("cashierId", "==", user.uid),
      where("status", "==", "QUERIED")
    );
  }, [firestore, user, hospitalId]);
  const { data: rawQueriedTills, isLoading: areTillsLoading } = useCollection<any>(queriedTillQuery);

  // 2. Real-Time Query for Dedicated Shift Queries Collection
  const shiftQueriesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/shift_queries`),
      where("cashierId", "==", user.uid),
      where("status", "==", "PENDING_RESPONSE")
    );
  }, [firestore, user, hospitalId]);
  const { data: rawShiftQueries, isLoading: areShiftQueriesLoading } = useCollection<any>(shiftQueriesQuery);

  const [selectedReasonCategory, setSelectedReasonCategory] = useState('UNRECORDED_FLOAT_DEPOSIT');
  const [supervisorWitness, setSupervisorWitness] = useState('');

  // Combined Mapped Live Queries (Deduplicated)
  const activeQueries: AuditQueryItem[] = useMemo(() => {
    const list: AuditQueryItem[] = [];
    const seenKeys = new Set<string>();

    if (rawShiftQueries && rawShiftQueries.length > 0) {
      rawShiftQueries.forEach((sq: any) => {
        const key = `${sq.type}_${Number(sq.varianceAmount || sq.amount || 0).toFixed(2)}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          list.push({
            id: sq.id,
            time: sq.createdAt?.toDate ? sq.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
            type: sq.type === 'CASH_OVERAGE' ? 'OVERAGE_DISCREPANCY' : 'SHORTAGE_FLAG',
            amount: Number(sq.varianceAmount || sq.amount || 0),
            relatedReceipt: sq.relatedReceipt || 'RCP-8821',
            message: sq.message || `System expected ₵${(sq.expectedCash || 0).toFixed(2)}, but you declared ₵${(sq.declaredCash || 0).toFixed(2)}. Please explain this variance.`,
            status: sq.status || 'PENDING_RESPONSE',
            flaggedBy: sq.flaggedBy || 'System Auto-Audit',
            hospitalId: hospitalId,
          });
        }
      });
    }

    if (rawQueriedTills && rawQueriedTills.length > 0) {
      rawQueriedTills.forEach((t: any) => {
        const key = `${t.varianceType || 'CASH_OVERAGE'}_${Number(t.varianceAmount || 50).toFixed(2)}`;
        if (!seenKeys.has(key) && !list.some(existing => existing.id === t.id)) {
          seenKeys.add(key);
          list.push({
            id: t.id,
            time: t.closedAt?.toDate ? t.closedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            type: t.varianceType === 'CASH_OVERAGE' ? 'OVERAGE_DISCREPANCY' : 'SHORTAGE_FLAG',
            amount: Number(t.varianceAmount || 50.00),
            relatedReceipt: t.relatedReceipt || 'RCP-8821',
            message: t.queryMessage || `Declared cash ₵${(t.declaredPhysicalCash || 0).toFixed(2)} differs from expected system cash ₵${(t.systemExpectedCash || 0).toFixed(2)}.`,
            status: t.status === 'QUERIED' ? 'PENDING_RESPONSE' : 'EXPLANATION_SUBMITTED',
            flaggedBy: t.flaggedBy || 'Finance Auto-Audit',
            hospitalId: hospitalId,
          });
        }
      });
    }

    return list;
  }, [rawShiftQueries, rawQueriedTills, hospitalId]);

  const handleOpenExplanationModal = (item: AuditQueryItem) => {
    setSelectedQuery(item);
    setExplanationText('');
    setSelectedReasonCategory('UNRECORDED_FLOAT_DEPOSIT');
    setSupervisorWitness('');
    setIsExplainModalOpen(true);
  };

  const handleSubmitExplanation = async () => {
    if (!selectedQuery || explanationText.trim().length < 10) {
      toast({
        variant: "destructive",
        title: "Detailed Explanation Required",
        description: "Please provide a comprehensive explanation note (minimum 10 characters).",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const hospitalClean = hospitalId || 'GAM-GAR-7578';
      const batch = writeBatch(firestore);

      // 1. Update Shift Query record
      const queryRef = doc(firestore, `hospitals/${hospitalClean}/shift_queries`, selectedQuery.id);
      batch.set(queryRef, {
        status: 'EXPLANATION_SUBMITTED',
        cashierExplanation: explanationText.trim(),
        reasonCategory: selectedReasonCategory,
        supervisorWitness: supervisorWitness.trim() || 'Self-Certified by Cashier',
        cashierExplanationAt: serverTimestamp(),
      }, { merge: true });

      // 2. Update Cash Till record
      const tillRef = doc(firestore, `hospitals/${hospitalClean}/cash_tills`, selectedQuery.id);
      batch.set(tillRef, {
        status: 'EXPLANATION_SUBMITTED',
        cashierExplanation: explanationText.trim(),
        reasonCategory: selectedReasonCategory,
        cashierExplanationAt: serverTimestamp(),
      }, { merge: true });

      await batch.commit();

      toast({
        title: "Variance Dossier Submitted to Finance Director",
        description: "Formal explanation recorded in Treasury Audit Trail. Awaiting Director sign-off.",
      });

      setIsExplainModalOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: err.message || "Failed to submit variance explanation.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || areTillsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-xs font-semibold">Loading shift audit and reconciliation status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      
      {/* 1. GAM MED SIGNATURE COMMAND BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Treasury Internal Controls
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Cashier Till Integrity & Audit Desk
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
              <RefreshCw className="w-7 h-7 text-emerald-400" />
              Shift Queries & Audit
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
              Till Reconciliation, Variance Reports, and Financial Audit Clarifications
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-right min-w-[140px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Active Queries</span>
              <span className={`text-2xl font-mono font-black ${activeQueries.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeQueries.length}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-right min-w-[140px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Till Variance</span>
              <span className="text-2xl font-mono font-black text-emerald-400">₵ 0.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: ALL CLEAR OR ACTIVE AUDIT DOSSIERS */}
      <div className="max-w-4xl mx-auto w-full pt-4">
        {activeQueries.length === 0 ? (
          
          /* ENTERPRISE "ALL CLEAR" REASSURING HERO CARD */
          <div className="flex flex-col items-center justify-center bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-12 text-center space-y-6">
            
            {/* Glowing Emerald Seal */}
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-8 border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <ShieldCheck className="w-12 h-12 text-emerald-400" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                No Active Audit Queries
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Your shift till records and physical cash deposits balance perfectly. There are zero outstanding variance flags or audit inquiries from the Finance Department.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link href="/finance/billing">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/20 gap-2 cursor-pointer">
                  <ArrowRight className="w-4 h-4" /> Return to Billing Console
                </Button>
              </Link>
            </div>
          </div>

        ) : (

          /* ACTIVE AUDIT DOSSIER MATRIX */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Immediate Audit Clarification Required
              </h3>
              <span className="text-[10px] text-slate-500 font-mono font-bold">SOX / Joint Commission Protocol</span>
            </div>

            <div className="space-y-4">
              {activeQueries.map((q) => (
                <div
                  key={q.id}
                  className="bg-slate-900 rounded-2xl border border-rose-500/40 shadow-xl overflow-hidden"
                >
                  <div className="bg-rose-950/40 p-4 border-b border-rose-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-rose-500/20 text-rose-300 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border border-rose-500/40">
                        {q.type.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-300">Ref #{q.id}</span>
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-rose-400" /> Flagged: {q.time}
                    </span>
                  </div>

                  <div className="p-6 space-y-5">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-mono font-bold mb-1">
                        Directive from {q.flaggedBy}:
                      </p>
                      <p className="text-sm font-semibold text-slate-100 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                        "{q.message}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Related Receipt #</span>
                        <span className="font-mono font-bold text-emerald-400">{q.relatedReceipt}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Variance Amount</span>
                        <span className="font-mono font-black text-rose-400 text-sm">₵ {q.amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Link href="/finance/reports">
                        <Button variant="ghost" className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider">
                          View Till History
                        </Button>
                      </Link>
                      <Button
                        onClick={() => handleOpenExplanationModal(q)}
                        className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" /> Submit Variance Explanation
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. VARIANCE EXPLANATION MODAL */}
      <Dialog open={isExplainModalOpen} onOpenChange={setIsExplainModalOpen}>
        <DialogContent className="max-w-xl bg-slate-950 border border-slate-800 text-slate-100 p-6 shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  Variance Response Protocol
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audit Query: <span className="font-bold text-white">Ref #{selectedQuery?.id}</span> (Variance ₵{selectedQuery?.amount.toFixed(2)})
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="bg-amber-950/30 border border-amber-800/40 p-3.5 rounded-xl text-amber-200">
              <p className="leading-relaxed">
                <strong>Cashier Compliance Notice:</strong> Your written explanation will be permanently recorded into the Treasury Audit Ledger and dispatched directly to the Finance Director and Lead Internal Auditor.
              </p>
            </div>

            {/* Reason Classification */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Variance Classification *
              </label>
              <select
                value={selectedReasonCategory}
                onChange={(e) => setSelectedReasonCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 font-bold"
              >
                <option value="UNRECORDED_FLOAT_DEPOSIT">Unrecorded Opening Float / Reserve Cash Deposit</option>
                <option value="MOMO_MANUAL_CASH_CONVERSION">Mobile Money Cash-Out Transferred to Till</option>
                <option value="PATIENT_UNCLAIMED_CHANGE">Patient Overpayment / Uncollected Change</option>
                <option value="TILL_COUNT_DATA_ENTRY_TYPO">End-of-Shift Denomination Counting / Keypad Error</option>
                <option value="OTHER_REASON">Other Verified Operational Discrepancy</option>
              </select>
            </div>

            {/* Explanation Note */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider font-mono">
                  Detailed Operational Justification *
                </label>
                <span className={`text-[10px] font-mono ${explanationText.trim().length >= 10 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  {explanationText.trim().length}/10 chars min
                </span>
              </div>
              <textarea
                rows={4}
                value={explanationText}
                onChange={(e) => setExplanationText(e.target.value)}
                placeholder="e.g. Extra ₵132.40 represents an unrecorded morning float replenishment authorized by supervisor, plus ₵2.40 patient coin rounding. All notes accounted for in safe drop #441..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-medium leading-relaxed"
              />
            </div>

            {/* Supervisor Sign-Off / Witness */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Supervisor / Senior Cashier Witness (Optional)
              </label>
              <input
                type="text"
                value={supervisorWitness}
                onChange={(e) => setSupervisorWitness(e.target.value)}
                placeholder="e.g. Lead Cashier Marcus Amosah / Shift Lead"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-800/80 pt-4 mt-4 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setIsExplainModalOpen(false)} disabled={isSubmitting} className="text-slate-400 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitExplanation}
              disabled={isSubmitting || explanationText.trim().length < 10}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit to Finance Director
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
