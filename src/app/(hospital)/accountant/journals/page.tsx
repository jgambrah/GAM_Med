
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp, increment, orderBy, limit } from 'firebase/firestore';
import { 
  Plus, Trash2, Save, AlertCircle, 
  CheckCircle2, Calculator, ArrowLeftRight, Loader2, ShieldAlert
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
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole || '');

  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: '', accountName: '', debit: 0, credit: 0 },
    { accountId: '', accountName: '', debit: 0, credit: 0 }
  ]);

  const coaQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "chart_of_accounts"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: coa, isLoading: isCoaLoading } = useCollection(coaQuery);

  const journalHistoryQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "journal_entries"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [firestore, hospitalId]);
  const { data: journalHistory, isLoading: isHistoryLoading } = useCollection(journalHistoryQuery);

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
      const account = coa?.find(a => a.id === value);
      line.accountId = value;
      line.accountName = account?.name || '';
    } else if (field === 'debit' || field === 'credit') {
        // @ts-ignore
      line[field] = value; // Keep as string for input, will be parsed to float on post
    }
    setLines(newLines);
  };
  
  const postJournal = async () => {
    if (!isBalanced) return toast({ variant: "destructive", title: "Journal is not balanced!" });
    if (!narration) return toast({ variant: "destructive", title: "Please enter a narration." });
    if (!firestore || !user || !hospitalId) return toast({ variant: "destructive", title: "System error." });

    setLoading(true);
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
        createdBy: user?.uid,
        createdByName: user?.displayName,
        status: 'PENDING_APPROVAL',
        createdAt: transactionDate,
      });

      await batch.commit();
      toast({ title: "Journal Sent for Approval", description: `Journal ${jvNumber} has been sent to the auditor for review.` });
      setLines([{ accountId: '', accountName: '', debit: 0, credit: 0 }, { accountId: '', accountName: '', debit: 0, credit: 0 }]);
      setNarration('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Post Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>
  }

  if (!isAuthorized) {
     return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Journal <span className="text-primary">Voucher</span></h1>
          <p className="text-muted-foreground font-bold text-xs uppercase italic">Manual Double-Entry Ledger Adjustments.</p>
        </div>
        <div className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest border-2 ${isBalanced ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600 animate-pulse'}`}>
          {isBalanced ? 'Status: Balanced' : `Out of Balance: GHS ${difference.toFixed(2)}`}
        </div>
      </div>

      <div className="bg-card rounded-[40px] border shadow-xl overflow-hidden">
        <div className="p-8 bg-muted/50 border-b">
           <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2">General Narration / Description</label>
           <Textarea 
             className="w-full p-4 border-2 rounded-2xl font-bold text-card-foreground outline-none focus:border-primary transition-all h-20"
             placeholder="Explain the reason for this entry..."
             value={narration} onChange={e => setNarration(e.target.value)}
           />
        </div>

        <table className="w-full text-left">
          <thead className="bg-foreground text-primary-foreground">
            <tr>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest border-r border-border">Account Ledger</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest border-r border-border text-right w-48">Debit (GHS)</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest border-r border-border text-right w-48">Credit (GHS)</th>
              <th className="p-4 text-center w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.map((line, idx) => (
              <tr key={idx} className="group hover:bg-muted/30 transition-all">
                <td className="p-2 border-r">
                   <SearchableAccountSelect 
                     value={line.accountId} 
                     onChange={val => handleUpdateLine(idx, 'accountId', val)} 
                     coa={coa} 
                     isCoaLoading={isCoaLoading} 
                   />
                </td>
                <td className="p-2 border-r bg-muted/50">
                   <input 
                     type="number" className="w-full p-3 bg-transparent text-right font-black text-primary outline-none"
                     placeholder="0.00" value={line.debit || ''} onChange={e => handleUpdateLine(idx, 'debit', e.target.value)}
                   />
                </td>
                <td className="p-2 border-r bg-muted/50">
                   <input 
                     type="number" className="w-full p-3 bg-transparent text-right font-black text-destructive outline-none"
                     placeholder="0.00" value={line.credit || ''} onChange={e => handleUpdateLine(idx, 'credit', e.target.value)}
                   />
                </td>
                <td className="p-2 text-center">
                   <button onClick={() => removeLine(idx)} className="p-2 text-muted-foreground/30 hover:text-destructive transition-all">
                      <Trash2 size={16} />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-foreground text-primary-foreground">
             <tr>
                <td className="p-6 text-right font-black text-[10px] uppercase tracking-widest">Journal Totals</td>
                <td className="p-6 text-right font-black text-lg border-x border-border">GHS {totalDebit.toFixed(2)}</td>
                <td className="p-6 text-right font-black text-lg border-r border-border">GHS {totalCredit.toFixed(2)}</td>
                <td></td>
             </tr>
          </tfoot>
        </table>

        <div className="p-8 bg-muted/50 flex justify-between items-center">
           <Button onClick={addLine} variant="ghost" className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest hover:text-foreground transition-all">
              <Plus size={16} /> Add Transaction Line
           </Button>
           <Button 
             disabled={!isBalanced || loading}
             onClick={postJournal}
             className="bg-primary text-primary-foreground px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3 hover:bg-foreground transition-all disabled:bg-muted disabled:shadow-none"
           >
              {loading ? <Calculator className="animate-spin" /> : <Save size={18} />}
              Send for Approval
           </Button>
        </div>
      </div>

      {/* JOURNAL HISTORY LIST */}
      <div className="bg-card rounded-[40px] border shadow-xl overflow-hidden p-8 space-y-6">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Journal Voucher History</h2>
          <p className="text-muted-foreground font-bold text-xs uppercase italic mt-0.5">Track status of manual ledger adjustments</p>
        </div>

        <div className="divide-y divide-border">
          {isHistoryLoading ? (
            <div className="p-10 text-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : !journalHistory || journalHistory.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground italic text-xs uppercase">No journals created yet.</div>
          ) : (
            journalHistory.map(jv => (
              <div key={jv.id} className="py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-muted/10 transition-all px-2 rounded-2xl">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sm text-foreground">{jv.jvNumber}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{jv.createdAt ? new Date(jv.createdAt.toDate()).toLocaleDateString() : 'N/A'}</span>
                    <span 
                      className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        jv.status === 'AUTHORIZED' 
                          ? 'bg-green-50 text-green-600 border border-green-200' 
                          : jv.status === 'QUERIED' 
                          ? 'bg-red-50 text-red-600 border border-red-200' 
                          : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                      }`}
                    >
                      {jv.status === 'AUTHORIZED' ? 'Approved & Posted' : jv.status === 'QUERIED' ? 'Rejected / Queried' : 'Awaiting Review'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-bold leading-normal truncate">{jv.narration}</p>
                  
                  {/* Show audit comment if queried */}
                  {jv.status === 'QUERIED' && jv.auditComment && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-700 leading-normal">
                      ⚠️ Auditor's Reason: "{jv.auditComment}"
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0 flex flex-col items-end">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Total Amount</p>
                  <p className="text-base font-black text-primary font-mono">GHS {jv.totalAmount?.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SearchableAccountSelect({ value, onChange, coa, isCoaLoading }: {
  value: string;
  onChange: (val: string) => void;
  coa: any[] | undefined;
  isCoaLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedAccount = useMemo(() => {
    return coa?.find(a => a.id === value);
  }, [coa, value]);

  const filteredCoa = useMemo(() => {
    if (!coa) return [];
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
        className="w-full p-3 bg-transparent font-bold text-card-foreground outline-none text-left rounded-xl hover:bg-muted/40 transition-all flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate max-w-[90%] block">
          {selectedAccount 
            ? `${selectedAccount.accountCode} - ${selectedAccount.name} (${selectedAccount.category})`
            : "Search Account..."}
        </span>
        <span className="text-[10px] text-muted-foreground font-black">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-full max-h-60 bg-card border-2 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col">
          <div className="p-2 border-b bg-muted/30">
            <input
              type="text"
              className="w-full p-2 border rounded-xl bg-card font-bold text-xs outline-none focus:border-primary"
              placeholder="Search by code, name, or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-border max-h-48">
            {isCoaLoading ? (
              <div className="p-3 text-muted-foreground text-xs italic">Loading...</div>
            ) : filteredCoa.length === 0 ? (
              <div className="p-3 text-muted-foreground text-xs italic">No accounts found</div>
            ) : (
              filteredCoa.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`w-full p-3 text-left hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-all flex items-center ${a.id === value ? 'bg-primary/10 text-primary' : 'text-card-foreground'}`}
                  onClick={() => {
                    onChange(a.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <span className="font-mono text-primary font-black mr-2 bg-primary/10 px-1.5 py-0.5 rounded text-[10px] group-hover:text-white shrink-0">{a.accountCode}</span>
                  <span className="truncate">{a.name}</span>
                  <span className="ml-auto opacity-60 text-[9px] font-bold shrink-0">({a.category})</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
