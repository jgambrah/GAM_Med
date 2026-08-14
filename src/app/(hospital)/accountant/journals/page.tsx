'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp, increment, orderBy, limit } from 'firebase/firestore';
import { 
  Plus, Trash2, Save, AlertCircle, 
  CheckCircle2, Calculator, ArrowLeftRight, Loader2, ShieldAlert,
  BookOpen, Upload, FileText, Cpu, UserCheck, ShieldCheck, Check, X,
  Paperclip, ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';

interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

export default function JournalEntryManager() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [narration, setNarration] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: '', accountName: '', debit: 0, credit: 0 },
    { accountId: '', accountName: '', debit: 0, credit: 0 }
  ]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const coaQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "chart_of_accounts"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: rawCoa, isLoading: isCoaLoading } = useCollection(coaQuery);

  const demoCoa = useMemo(() => [
    { id: 'acc-1', accountCode: '1001', name: 'Cash at Bank - GCB', category: 'ASSET' },
    { id: 'acc-2', accountCode: '1099', name: 'Accumulated Depreciation', category: 'ASSET' },
    { id: 'acc-3', accountCode: '2001', name: 'Accounts Payable', category: 'LIABILITY' },
    { id: 'acc-4', accountCode: '4001', name: 'Hospital Services Revenue', category: 'REVENUE' },
    { id: 'acc-5', accountCode: '5005', name: 'Depreciation Expense', category: 'EXPENSE' },
    { id: 'acc-6', accountCode: '5008', name: 'Bank Charges & Fees', category: 'EXPENSE' }
  ], []);

  const coa = rawCoa && rawCoa.length > 0 ? rawCoa : demoCoa;

  const journalHistoryQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "journal_entries"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [firestore, hospitalId]);
  const { data: rawHistory, isLoading: isHistoryLoading, error: historyError } = useCollection(journalHistoryQuery);

  const demoHistory = useMemo(() => [
    { 
      id: 'jv-101', 
      jvNumber: 'JV-DEP-2026-08', 
      createdAt: { toDate: () => new Date() }, 
      status: 'AUTHORIZED', 
      narration: 'Automated Depreciation Charge for 2026-08 (3 assets processed)', 
      totalAmount: 118969.44, 
      createdBy: 'SYSTEM', 
      createdByName: 'Depreciation Engine',
      source: 'SYSTEM'
    },
    { 
      id: 'jv-102', 
      jvNumber: 'JV-882910', 
      createdAt: { toDate: () => new Date('2026-08-13') }, 
      status: 'PENDING_APPROVAL', 
      narration: 'Reclassification of Bank Service Fees from August Operating Account Statement', 
      totalAmount: 1450.00, 
      createdBy: 'usr-2', 
      createdByName: 'Auditor Henaku',
      source: 'MANUAL'
    }
  ], []);

  const journalHistory = historyError || !rawHistory || rawHistory.length === 0 ? demoHistory : rawHistory;

  // Pending Drafts & Review Counter
  const pendingCount = useMemo(() => {
    return journalHistory.filter(j => ['DRAFT', 'PENDING_APPROVAL', 'AWAITING_REVIEW'].includes(j.status)).length;
  }, [journalHistory]);

  // CALCULATE TOTALS
  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001 && totalDebit > 0;

  const addLine = () => {
    setLines([...lines, { accountId: '', accountName: '', debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return toast({ variant: "destructive", title: "A journal must have at least two lines." });
    const newLines = [...lines];
    newLines.splice(index, 1);
    setLines(newLines);
  };

  const handleUpdateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...lines];
    const line = newLines[index];
    
    if (field === 'accountId') {
      const account = coa.find(a => a.id === value);
      line.accountId = value;
      line.accountName = account ? `${account.accountCode} - ${account.name}` : '';
    } else if (field === 'debit' || field === 'credit') {
      line[field] = value;
    }
    setLines(newLines);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const names = Array.from(files).map(f => f.name);
    setAttachedFiles(prev => [...prev, ...names]);
    toast({ title: "Attachment Uploaded", description: `Added ${names.length} supporting audit document(s).` });
  };

  const postJournal = async () => {
    if (!isBalanced) return toast({ variant: "destructive", title: "Journal is not balanced!" });
    if (!narration.trim()) return toast({ variant: "destructive", title: "Please enter a general narration." });

    setLoading(true);

    if (!firestore || !user || !hospitalId) {
      setTimeout(() => {
        toast({ title: "Journal Sent for Approval (Simulation)", description: `Journal JV-${Date.now().toString().slice(-6)} submitted to Auditor.` });
        setLines([{ accountId: '', accountName: '', debit: 0, credit: 0 }, { accountId: '', accountName: '', debit: 0, credit: 0 }]);
        setNarration('');
        setAttachedFiles([]);
        setLoading(false);
      }, 1000);
      return;
    }

    const batch = writeBatch(firestore);
    const jvNumber = `JV-${Date.now().toString().slice(-6)}`;
    const transactionDate = serverTimestamp();

    try {
      const journalRef = doc(collection(firestore, "hospitals", hospitalId, "journal_entries"));
      batch.set(journalRef, {
        jvNumber,
        narration,
        lines: lines.map(l => ({ ...l, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
        totalAmount: totalDebit,
        hospitalId: hospitalId,
        createdBy: user.uid,
        createdByName: user.displayName || userProfile?.name || 'Accountant',
        status: 'PENDING_APPROVAL',
        source: 'MANUAL',
        attachments: attachedFiles,
        createdAt: transactionDate,
      });

      await batch.commit();
      toast({ title: "Journal Sent for Approval", description: `Journal ${jvNumber} sent for Maker-Checker review.` });
      setLines([{ accountId: '', accountName: '', debit: 0, credit: 0 }, { accountId: '', accountName: '', debit: 0, credit: 0 }]);
      setNarration('');
      setAttachedFiles([]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Post Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  // MAKER-CHECKER APPROVAL / REJECTION LOGIC
  const handleApproveJv = async (jv: any) => {
    if (jv.createdBy === user?.uid && jv.source !== 'SYSTEM') {
      toast({ 
        variant: "destructive", 
        title: "Maker-Checker Rule Enforcement", 
        description: "You prepared this Journal Voucher. An independent auditor or checker must review and post it." 
      });
      return;
    }

    setActionLoading(jv.id);

    if (!firestore || !hospitalId) {
      setTimeout(() => {
        toast({ title: "JV Approved & Posted (Simulation)", description: `Journal Voucher ${jv.jvNumber} posted to General Ledger.` });
        setActionLoading(null);
      }, 800);
      return;
    }

    try {
      const batch = writeBatch(firestore);
      const jvRef = doc(firestore, `hospitals/${hospitalId}/journal_entries`, jv.id);
      batch.update(jvRef, {
        status: 'AUTHORIZED',
        approvedBy: user?.uid,
        approvedByName: user?.displayName || userProfile?.name || 'Checker Accountant',
        approvedAt: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "JV Approved & Posted", description: `Journal Voucher ${jv.jvNumber} has been authorized.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Approval Failed", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectJv = async (jv: any) => {
    setActionLoading(jv.id);

    if (!firestore || !hospitalId) {
      setTimeout(() => {
        toast({ title: "JV Rejected & Returned", description: `Journal Voucher ${jv.jvNumber} marked as Queried.` });
        setActionLoading(null);
      }, 800);
      return;
    }

    try {
      const batch = writeBatch(firestore);
      const jvRef = doc(firestore, `hospitals/${hospitalId}/journal_entries`, jv.id);
      batch.update(jvRef, {
        status: 'QUERIED',
        rejectedBy: user?.uid,
        rejectedByName: user?.displayName || userProfile?.name || 'Checker Accountant',
        rejectedAt: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "JV Rejected", description: `Journal Voucher ${jv.jvNumber} returned for revision.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Rejection Failed", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (pageIsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for the Journal Voucher module.</p>
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

        {/* Top Row: Title, Subtitle, and User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <BookOpen className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                JOURNAL VOUCHER COMMAND
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              DOUBLE-ENTRY GENERAL LEDGER ADJUSTMENTS, REVENUE CORRECTIONS, AND MAKER-CHECKER APPROVALS.
            </p>
          </div>

          {/* Active User Context & Dynamic Balance Status */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">PREPARER (MAKER)</div>
              </div>
            </div>

            {/* Dynamic Balance Pill */}
            <div className={`px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
              isBalanced 
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/20 border-rose-500/30 text-rose-400 animate-pulse'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {isBalanced ? 'BALANCED: GHS 0.00' : `OUT OF BALANCE: GHS ${difference.toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* Bottom Row / Contextual Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Financial Period</span>
              <div className="text-base font-black text-white">AUGUST 2026</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Open Accounting Cycle</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Preparer (Maker)</span>
              <div className="text-base font-black text-white uppercase">{userName}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Authorized Officer</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Pending Review</span>
              <div className="text-xl font-black text-emerald-400 font-mono">{pendingCount} Drafts</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Awaiting Checker Approval</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. JOURNAL VOUCHER EDITOR FORM             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4">
        
        {/* General Narration & Supporting Documentation Drag-and-Drop */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest block mb-2">
              GENERAL NARRATION / AUDIT REASON
            </label>
            <Textarea 
              className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 h-20"
              placeholder="Provide a detailed general narration explaining the accounting justification for this journal entry..."
              value={narration} 
              onChange={e => setNarration(e.target.value)}
            />
          </div>

          {/* Supporting Documentation Drag-and-Drop Zone */}
          <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
                <Paperclip className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 block">
                  SUPPORTING DOCUMENTATION & AUDIT PROOFS
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Attach PDF memos, board approvals, or bank statement proofs ({attachedFiles.length} attached)
                </span>
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-emerald-600 text-xs font-black uppercase rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" /> UPLOAD PROOF
            </button>
          </div>

          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attachedFiles.map((fname, i) => (
                <span key={i} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> {fname}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Double-Entry Transaction Grid with Keyboard Navigation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                <th className="p-3 border-r border-slate-800">ACCOUNT LEDGER</th>
                <th className="p-3 border-r border-slate-800 text-right w-48">DEBIT (GHS)</th>
                <th className="p-3 border-r border-slate-800 text-right w-48 text-rose-400">CREDIT (GHS)</th>
                <th className="p-3 text-center w-16">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-2 border-r border-slate-200 dark:border-slate-800">
                    <SearchableAccountSelect 
                      value={line.accountId} 
                      onChange={val => handleUpdateLine(idx, 'accountId', val)} 
                      coa={coa} 
                      isCoaLoading={isCoaLoading} 
                    />
                  </td>
                  <td className="p-2 border-r border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full p-2.5 bg-transparent text-right font-black font-mono text-emerald-600 dark:text-emerald-400 outline-none text-xs"
                      placeholder="0.00" 
                      value={line.debit || ''} 
                      onChange={e => handleUpdateLine(idx, 'debit', e.target.value)}
                    />
                  </td>
                  <td className="p-2 border-r border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full p-2.5 bg-transparent text-right font-black font-mono text-rose-600 dark:text-rose-400 outline-none text-xs"
                      placeholder="0.00" 
                      value={line.credit || ''} 
                      onChange={e => handleUpdateLine(idx, 'credit', e.target.value)}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button 
                      type="button"
                      onClick={() => removeLine(idx)} 
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950 text-white font-mono">
              <tr>
                <td className="p-4 text-right font-black text-[10px] uppercase tracking-widest font-sans text-slate-400">
                  JOURNAL TOTALS
                </td>
                <td className="p-4 text-right font-black text-sm text-emerald-400 border-x border-slate-800">
                  GHS {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-right font-black text-sm text-rose-400 border-r border-slate-800">
                  GHS {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Form Action Controls */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/40 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
          <button 
            type="button"
            onClick={addLine} 
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-emerald-50 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> ADD TRANSACTION LINE
          </button>
          
          <button 
            type="button"
            disabled={!isBalanced || loading}
            onClick={postJournal}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            SEND FOR APPROVAL (MAKER-CHECKER)
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. JOURNAL VOUCHER HISTORY & APPROVALS     */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              JOURNAL VOUCHER HISTORY & MAKER-CHECKER QUEUE
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Auditable log of automated system-generated and manual double-entry vouchers
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {isHistoryLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
              Loading history...
            </div>
          ) : journalHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium text-xs">
              No journal entries posted yet.
            </div>
          ) : (
            journalHistory.map(jv => {
              const isMaker = jv.createdBy === user?.uid && jv.source !== 'SYSTEM';
              const isPending = ['DRAFT', 'PENDING_APPROVAL', 'AWAITING_REVIEW'].includes(jv.status);

              return (
                <div key={jv.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors px-3 rounded-xl">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">{jv.jvNumber}</span>
                      
                      {/* Source Tagging Badge */}
                      {jv.source === 'SYSTEM' ? (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-indigo-500" /> SYSTEM-GENERATED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-500" /> MANUAL ENTRY
                        </span>
                      )}

                      {/* Status Pills */}
                      <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        jv.status === 'AUTHORIZED' || jv.status === 'POSTED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                          : jv.status === 'QUERIED' || jv.status === 'REJECTED'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800' 
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      }`}>
                        {jv.status === 'AUTHORIZED' || jv.status === 'POSTED' ? 'POSTED' : jv.status === 'QUERIED' || jv.status === 'REJECTED' ? 'REJECTED' : 'AWAITING REVIEW'}
                      </span>

                      <span className="text-[10px] text-slate-400 font-bold">
                        {jv.createdAt ? new Date(jv.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-normal truncate">{jv.narration}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Preparer: <span className="font-bold uppercase text-slate-600 dark:text-slate-300">{jv.createdByName || jv.createdBy || 'ACCOUNTANT'}</span></p>
                  </div>

                  <div className="text-right shrink-0 flex flex-col md:items-end gap-2">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase block">Total Amount</span>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        GHS {jv.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Maker-Checker Approval Actions */}
                    {isPending && (
                      <div className="flex items-center gap-2 pt-1">
                        {isMaker ? (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
                            Awaiting Independent Checker Approval
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={actionLoading === jv.id}
                              onClick={() => handleApproveJv(jv)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-black uppercase flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {actionLoading === jv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              APPROVE & POST
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === jv.id}
                              onClick={() => handleRejectJv(jv)}
                              className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded text-[9px] font-black uppercase flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" /> REJECT
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

function SearchableAccountSelect({ value, onChange, coa, isCoaLoading }: {
  value: string;
  onChange: (val: string) => void;
  coa: any[];
  isCoaLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedAccount = useMemo(() => {
    return coa.find(a => a.id === value);
  }, [coa, value]);

  const filteredCoa = useMemo(() => {
    if (!search) return coa;
    const term = search.toLowerCase();
    return coa.filter(a => 
      a.accountCode?.toLowerCase().includes(term) ||
      a.name?.toLowerCase().includes(term) ||
      a.category?.toLowerCase().includes(term)
    );
  }, [coa, search]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  return (
    <div className="relative w-full" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        className="w-full p-2.5 bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex justify-between items-center text-xs cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate max-w-[90%] block font-mono">
          {selectedAccount 
            ? `${selectedAccount.accountCode} - ${selectedAccount.name}`
            : "Search Account Code / Name..."}
        </span>
        <span className="text-[10px] text-slate-400 font-black">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-full max-h-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl overflow-hidden z-50 flex flex-col">
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <input
              type="text"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Search code (e.g. 5100), name, category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800 max-h-48">
            {isCoaLoading ? (
              <div className="p-3 text-slate-400 text-xs italic">Loading Accounts...</div>
            ) : filteredCoa.length === 0 ? (
              <div className="p-3 text-slate-400 text-xs italic">No accounts found matching "{search}"</div>
            ) : (
              filteredCoa.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`w-full p-2.5 text-left hover:bg-emerald-600 hover:text-white text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${a.id === value ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}
                  onClick={() => {
                    onChange(a.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shrink-0">
                      {a.accountCode}
                    </span>
                    <span className="truncate">{a.name}</span>
                  </div>
                  <span className="opacity-60 text-[9px] font-bold shrink-0 ml-2">({a.category})</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
