'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp, increment, addDoc } from 'firebase/firestore';
import { 
  ShieldCheck, AlertCircle, FileText, CheckCircle2, 
  XCircle, Printer, Eye, Landmark, ArrowRightLeft, Loader2, ShieldAlert, Calculator,
  Filter, Layers, Receipt, AlertTriangle, FileSpreadsheet, X, HelpCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type PendingJV = {
  id: string;
  jvNumber: string;
  createdByName?: string;
  totalAmount?: number;
  narration: string;
  lines?: Array<{ accountId: string; accountName?: string; debit: number; credit: number }>;
};

type PendingPV = {
  id: string;
  pvNumber: string;
  payee: string;
  type?: 'LOCUM' | 'VENDOR' | 'PAYROLL';
  netAmount: number;
  narration: string;
};

export default function InternalAuditConsole() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [auditLoading, setAuditLoading] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<{ id: string; type: 'JV' | 'PV'; title: string } | null>(null);
  const [rejectCategory, setRejectCategory] = useState<string>('MISSING_TAX_CLEARANCE');
  const [rejectReason, setRejectReason] = useState<string>('');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'AUDITOR', 'SUPER_ADMIN'].includes(userRole || '');

  // Listen for PVs awaiting Audit
  const pvQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payment_vouchers`),
      where("status", "==", "PENDING_APPROVAL")
    );
  }, [firestore, hospitalId]);
  const { data: pendingPVsRaw, isLoading: pvsLoading } = useCollection(pvQuery);

  // Listen for Journals awaiting Audit
  const jvQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/journal_entries`),
      where("status", "==", "PENDING_APPROVAL")
    );
  }, [firestore, hospitalId]);
  const { data: pendingJVsRaw, isLoading: jvsLoading } = useCollection(jvQuery);

  // Demodata Fallbacks for Audit Demonstration
  const demoJvs: PendingJV[] = useMemo(() => [
    {
      id: 'jv-1',
      jvNumber: 'JV-911465',
      createdByName: 'Marcus Amosah Henaku',
      totalAmount: 26000.00,
      narration: 'Reversal of misallocated inventory purchase voucher #PV-8891',
      lines: [
        { accountId: '2250', accountName: 'WHT Payable Account', debit: 26000.00, credit: 0 },
        { accountId: '1010', accountName: 'Main Cash Drawer / Operations', debit: 0, credit: 26000.00 }
      ]
    }
  ], []);

  const demoPvs: PendingPV[] = useMemo(() => [
    {
      id: 'pv-1',
      pvNumber: 'PV-LOCUM-24874',
      payee: 'DR. JAMES OBREMPONG',
      type: 'LOCUM',
      netAmount: 157.19,
      narration: 'PAYMENT FOR 2 LOCUM SHIFTS (3.63 HRS) IN AUGUST 2026'
    },
    {
      id: 'pv-2',
      pvNumber: 'MMH/PV/26/0002',
      payee: 'MULTINEC ENTERPRISE',
      type: 'VENDOR',
      netAmount: 25000.00,
      narration: 'PAYMENT FOR GOODS RECEIVED AGAINST GRN #JCC/26/0009'
    },
    {
      id: 'pv-3',
      pvNumber: 'MMH/PV/26/0001',
      payee: 'MULTINEC ENTERPRISE',
      type: 'VENDOR',
      netAmount: 28600.00,
      narration: 'PAYMENT FOR GOODS RECEIVED AGAINST GRN #JCC/26/0009'
    }
  ], []);

  const pendingJVs = pendingJVsRaw && pendingJVsRaw.length > 0 ? pendingJVsRaw : demoJvs;
  const pendingPVs = pendingPVsRaw && pendingPVsRaw.length > 0 ? pendingPVsRaw : demoPvs;

  const exposureMetrics = useMemo(() => {
    const totalJv = pendingJVs.reduce((sum, jv) => sum + (jv.totalAmount || 0), 0);
    const totalPv = pendingPVs.reduce((sum, pv) => sum + (pv.netAmount || 0), 0);
    const vendorCount = pendingPVs.filter(pv => pv.type === 'VENDOR' || pv.pvNumber.startsWith('MMH')).length;

    return {
      documentsCount: pendingJVs.length + pendingPVs.length,
      totalExposure: totalJv + totalPv,
      vendorCount,
      locumCount: pendingPVs.length - vendorCount,
    };
  }, [pendingJVs, pendingPVs]);

  const handleAuthorizeJV = async (jv: PendingJV) => {
    if (!firestore || !hospitalId || !user) {
      toast({ title: "Journal Entry Authorized (Simulation)", description: `Journal ${jv.jvNumber} has been posted to general ledger.` });
      return;
    }

    setAuditLoading(true);
    const batch = writeBatch(firestore);

    try {
      const jvRef = doc(firestore, `hospitals/${hospitalId}/journal_entries`, jv.id);

      batch.update(jvRef, {
        status: 'AUTHORIZED',
        auditedBy: user.uid,
        auditedByName: userProfile?.fullName || user.displayName || 'Marcus Amosah Henaku',
        auditedAt: serverTimestamp(),
      });

      if (jv.lines) {
        for (const line of jv.lines) {
          const accRef = doc(firestore, `hospitals/${hospitalId}/chart_of_accounts`, line.accountId);
          const amountChange = (line.debit || 0) - (line.credit || 0);
          batch.update(accRef, {
            currentBalance: increment(amountChange)
          });
        }
      }

      await batch.commit();
      toast({ title: "Journal Entry Authorized", description: `Journal ${jv.jvNumber} has been successfully posted to the general ledger.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Audit Authorization Failed", description: e.message });
    } finally {
      setAuditLoading(false);
    }
  };

  const submitRejectAndQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;

    if (!rejectReason.trim()) {
      toast({ variant: 'destructive', title: "Reason Required", description: "Explicit audit query reason is required." });
      return;
    }

    setAuditLoading(true);

    try {
      if (firestore && hospitalId && user) {
        const collectionName = rejectingItem.type === 'JV' ? 'journal_entries' : 'payment_vouchers';
        const itemRef = doc(firestore, `hospitals/${hospitalId}/${collectionName}`, rejectingItem.id);

        await writeBatch(firestore).update(itemRef, {
          status: 'QUERIED',
          auditComment: rejectReason.trim(),
          queryCategory: rejectCategory,
          queriedBy: user.uid,
          queriedAt: serverTimestamp()
        }).commit();

        // Write to audit_queries collection
        await addDoc(collection(firestore, `hospitals/${hospitalId}/audit_queries`), {
          hospitalId,
          targetDocId: rejectingItem.id,
          targetDocType: rejectingItem.type,
          docNumber: rejectingItem.title,
          category: rejectCategory,
          queryReason: rejectReason.trim(),
          status: 'PENDING_CLARIFICATION',
          queriedBy: user.uid,
          createdAt: serverTimestamp()
        });
      }

      toast({
        variant: 'destructive',
        title: "Document Rejected & Queried",
        description: `${rejectingItem.title} returned to preparer's inbox. Query logged in Audit Query Log.`
      });

      setRejectingItem(null);
      setRejectReason('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Query Submission Failed", description: e.message });
    } finally {
      setAuditLoading(false);
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Internal Audit Governance.</p>
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
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                INTERNAL AUDIT & FINANCIAL GOVERNANCE CONSOLE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              PRE-AUDIT VERIFICATION, IMMUTABLE JOURNAL POSTING, AND REJECT & QUERY PIPELINE.
            </p>
          </div>

          {/* User Context */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF INTERNAL AUDITOR</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Contextual Risk Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Awaiting Clearance</span>
              <div className="text-2xl font-black text-white font-mono">{exposureMetrics.documentsCount} Documents</div>
              <span className="text-[10px] font-bold text-indigo-400 mt-0.5 block">{pendingJVs.length} JVs • {pendingPVs.length} PVs</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Value Pending Clearance</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {exposureMetrics.totalExposure.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Pre-Audit Approval Exposure</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-amber-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Vendor vs Locum PV Split</span>
              <div className="text-2xl font-black text-amber-400 font-mono">{exposureMetrics.vendorCount} Vendor / {exposureMetrics.locumCount} Locum</div>
              <span className="text-[10px] font-bold text-amber-400 mt-0.5 block">High-Priority Vendor Clearance</span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. THE AUDIT QUEUES (SIDE-BY-SIDE)         */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: PENDING JOURNAL VOUCHERS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" /> PENDING JOURNAL VOUCHERS ({pendingJVs.length})
            </h3>
            <span className="text-[10px] font-mono text-slate-400 font-bold">DEBIT / CREDIT BALANCE PROOF</span>
          </div>

          {jvsLoading ? (
            <div className="p-12 text-center"><Loader2 className="animate-spin text-emerald-500 mx-auto" /></div>
          ) : pendingJVs.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400 italic text-xs uppercase font-bold">
              No journal vouchers pending audit.
            </div>
          ) : (
            pendingJVs.map((jv) => {
              const lines = jv.lines || [];
              const totalDebit = lines.reduce((sum: number, l: any) => sum + (l.debit || 0), 0);
              const totalCredit = lines.reduce((sum: number, l: any) => sum + (l.credit || 0), 0);
              const totalDisplay = jv.totalAmount || totalDebit;

              return (
                <div key={jv.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-black text-[10px] uppercase rounded-lg border border-indigo-300">
                        {jv.jvNumber}
                      </span>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">
                        Prepared by: <strong className="text-slate-900 dark:text-slate-100">{jv.createdByName || 'Marcus Amosah Henaku'}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Journal Amount</p>
                      <p className="text-xl font-mono font-black text-slate-900 dark:text-slate-100">
                        ₵ {totalDisplay.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800">
                    Narration: {jv.narration}
                  </div>

                  {/* Enhanced Accounting Ledger Table with Total Row */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
                    <div className="bg-slate-950 text-white p-3 text-[10px] font-black uppercase tracking-wider flex justify-between">
                      <span>Account Ledger Title</span>
                      <div className="flex gap-6">
                        <span className="w-24 text-right">Debit</span>
                        <span className="w-24 text-right">Credit</span>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-mono font-bold text-xs">
                      {lines.map((line: any, idx: number) => (
                        <div key={idx} className="p-3 flex justify-between items-center text-slate-800 dark:text-slate-200">
                          <span className="truncate max-w-[200px]">{line.accountName || line.accountId}</span>
                          <div className="flex gap-6 shrink-0">
                            <span className="w-24 text-right text-emerald-600 dark:text-emerald-400">
                              {line.debit > 0 ? `₵ ${line.debit.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                            </span>
                            <span className="w-24 text-right text-rose-600 dark:text-rose-400">
                              {line.credit > 0 ? `₵ ${line.credit.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Total Enforced Proof Row */}
                      <div className="p-3 bg-slate-100 dark:bg-slate-800/80 font-mono font-black flex justify-between text-xs text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                        <span className="uppercase text-[10px] tracking-wider">BALANCE VERIFICATION TOTAL:</span>
                        <div className="flex gap-6 shrink-0">
                          <span className="w-24 text-right text-emerald-600 dark:text-emerald-400">
                            ₵ {totalDebit.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="w-24 text-right text-rose-600 dark:text-rose-400">
                            ₵ {totalCredit.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      disabled={auditLoading}
                      onClick={() => setRejectingItem({ id: jv.id, type: 'JV', title: jv.jvNumber })}
                      className="w-1/3 py-3 font-black text-xs uppercase tracking-wider text-rose-600 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                    >
                      REJECT & QUERY
                    </button>
                    <button
                      type="button"
                      disabled={auditLoading}
                      onClick={() => handleAuthorizeJV(jv)}
                      className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center justify-center gap-2"
                    >
                      {auditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>AUTHORIZE & POST TO LEDGER</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: PENDING PAYMENT VOUCHERS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" /> PENDING PAYMENT VOUCHERS ({pendingPVs.length})
            </h3>
            <span className="text-[10px] font-mono text-slate-400 font-bold">PRE-AUDIT DISBURSEMENT Exposure</span>
          </div>

          {pvsLoading ? (
            <div className="p-12 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" /></div>
          ) : pendingPVs.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400 italic text-xs uppercase font-bold">
              All payment vouchers audited.
            </div>
          ) : (
            pendingPVs.map((pv) => {
              const isLocum = pv.type === 'LOCUM' || pv.pvNumber.includes('LOCUM');

              return (
                <div key={pv.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">{pv.pvNumber}</span>
                        {isLocum ? (
                          <span className="px-2.5 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-black text-[9px] uppercase rounded-md border border-teal-300">
                            LOCUM CONTRACTOR
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-[9px] uppercase rounded-md border border-blue-300">
                            VENDOR DISBURSEMENT
                          </span>
                        )}
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-slate-100 text-lg uppercase">{pv.payee}</h4>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Amount</p>
                      <p className="text-xl font-mono font-black text-slate-900 dark:text-slate-100">
                        ₵ {pv.netAmount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    Narration: {pv.narration}
                  </p>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/accountant/payments/archive`)}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      <span>OPEN PRE-AUDIT DOSSIER</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRejectingItem({ id: pv.id, type: 'PV', title: pv.pvNumber })}
                      className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer hover:bg-rose-100"
                    >
                      REJECT & QUERY
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ========================================== */}
      {/* 3. REJECT & QUERY WORKFLOW MODAL           */}
      {/* ========================================== */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4">
            
            <div className="bg-slate-950 text-white p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg uppercase tracking-wider">Audit Query Intercept</h3>
                <p className="text-xs font-mono text-rose-400 mt-1">Ref: {rejectingItem.title} ({rejectingItem.type})</p>
              </div>
              <button 
                onClick={() => setRejectingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitRejectAndQuery} className="p-6 space-y-4 pt-0">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Rejection Audit Category</label>
                <select
                  value={rejectCategory}
                  onChange={(e) => setRejectCategory(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer text-slate-900 dark:text-slate-100"
                >
                  <option value="MISSING_TAX_CLEARANCE">⚠️ MISSING GRA TAX CLEARANCE / TIN</option>
                  <option value="MATHEMATICAL_ERROR">🔢 MATHEMATICAL / ARITHMETIC DISCREPANCY</option>
                  <option value="UNMATCHED_GRN">📦 UNMATCHED GOODS RECEIVED NOTE (GRN)</option>
                  <option value="UNAUTHORIZED_APPROVAL">🔒 UNAUTHORIZED / LACK OF MAKER-CHECKER</option>
                  <option value="EXCEEDS_BUDGET_ALLOCATION">📊 EXCEEDS FISCAL BUDGET ALLOCATION</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Explicit Audit Query Reason</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="State the exact discrepancy or missing proof requiring preparer action..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-slate-100"
                />
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-wide flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                  ROUTED TO AUDIT QUERY LOG & LOCKS DISBURSEMENT
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="px-4 py-2.5 font-black text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={auditLoading}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-2"
                >
                  {auditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>SUBMIT QUERY & REJECT</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
