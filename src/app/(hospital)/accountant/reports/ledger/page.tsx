'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, doc } from 'firebase/firestore';
import { Printer, Search, FileText, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  createdAt: Timestamp;
  jvNumber: string;
  narration: string;
  lines: JournalLine[];
  totalAmount: number;
}

export default function GeneralLedgerReport() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole);

  const coaQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), orderBy('accountCode'));
  }, [firestore, hospitalId]);
  const { data: coa, isLoading: isCoaLoading } = useCollection(coaQuery);

  const journalEntriesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/journal_entries`), orderBy('createdAt', 'desc'));
  }, [firestore, hospitalId]);
  const { data: allJournalEntries, isLoading: areJournalsLoading } = useCollection<JournalEntry>(journalEntriesQuery);

  const filteredEntries = useMemo(() => {
    if (!selectedAccountId || !allJournalEntries) return [];
    return allJournalEntries.filter(entry => 
      entry.lines.some(line => line.accountId === selectedAccountId)
    );
  }, [selectedAccountId, allJournalEntries]);
  
  const selectedAccount = useMemo(() => {
      if (!selectedAccountId || !coa) return null;
      return coa.find(a => a.id === selectedAccountId);
  }, [selectedAccountId, coa]);

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
    <div className="space-y-8">
      <div className="flex justify-between items-center print:hidden border-b pb-6">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">General <span className="text-primary">Ledger</span></h1>
        <div className="flex gap-4">
           <Select onValueChange={(value) => setSelectedAccountId(value)}>
                <SelectTrigger className="w-[350px]">
                    <SelectValue placeholder={isCoaLoading ? "Loading accounts..." : "Select Ledger Account..."} />
                </SelectTrigger>
                <SelectContent>
                    {coa?.map(a => <SelectItem key={a.id} value={a.id}>{a.accountCode} - {a.name}</SelectItem>)}
                </SelectContent>
           </Select>
           <Button onClick={() => window.print()} variant="outline"><Printer size={16}/></Button>
        </div>
      </div>

      {selectedAccount && (
        <div className="bg-card border-4 border-foreground p-10 shadow-sm print:border-0 print:shadow-none font-sans">
           <div className="text-center border-b-2 border-foreground pb-4 mb-8">
              <h2 className="text-2xl font-black uppercase">{selectedAccount.name}</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Account Code: {selectedAccount.accountCode} • {selectedAccount.category}</p>
           </div>
            
           {areJournalsLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin"/></div> :
           <Table>
              <TableHeader>
                 <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Debit (₵)</TableHead>
                    <TableHead className="text-right">Credit (₵)</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map(entry => {
                    const relevantLine = entry.lines.find(l => l.accountId === selectedAccountId);
                    return (
                        <TableRow key={entry.id}>
                            <TableCell>{format(entry.createdAt.toDate(), 'PPP')}</TableCell>
                            <TableCell className="font-mono">{entry.jvNumber}</TableCell>
                            <TableCell className="italic text-muted-foreground">{entry.narration}</TableCell>
                            <TableCell className="text-right font-mono text-primary font-bold">{relevantLine?.debit > 0 ? relevantLine.debit.toFixed(2) : '-'}</TableCell>
                            <TableCell className="text-right font-mono text-destructive font-bold">{relevantLine?.credit > 0 ? relevantLine.credit.toFixed(2) : '-'}</TableCell>
                        </TableRow>
                    )
                })}
                 <TableRow className="bg-muted/50">
                    <TableCell colSpan={4} className="text-right font-black">Current Balance</TableCell>
                    <TableCell className="text-right font-black text-lg">
                        GHS {selectedAccount.currentBalance.toFixed(2)}
                    </TableCell>
                 </TableRow>
              </TableBody>
           </Table>
           }
        </div>
      )}
    </div>
  );
}
