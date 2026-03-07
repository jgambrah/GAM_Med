
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
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
                   <select 
                     className="w-full p-3 bg-transparent font-bold text-card-foreground outline-none focus:bg-card rounded-xl"
                     value={line.accountId} onChange={e => handleUpdateLine(idx, 'accountId', e.target.value)}>
                     <option value="">Search Account...</option>
                     {isCoaLoading ? <option>Loading...</option> : coa?.map(a => <option key={a.id} value={a.id}>{a.accountCode} - {a.name} ({a.category})</option>)}
                   </select>
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
    </div>
  );
}
