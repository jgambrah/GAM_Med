
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

interface LedgerEntry {
  id: string;
  createdAt: Timestamp;
  reference: string;
  narration: string;
  debit: number;
  credit: number;
}

export default function GeneralLedgerReport() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole || '');

  const coaQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), orderBy('accountCode'));
  }, [firestore, hospitalId]);
  const { data: coa, isLoading: isCoaLoading } = useCollection(coaQuery);

  const ledgerEntriesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !selectedAccountId) return null;
    return query(
        collection(firestore, `hospitals/${hospitalId}/ledger_entries`), 
        where("accountId", "==", selectedAccountId),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId, selectedAccountId]);
  const { data: ledgerEntries, isLoading: areEntriesLoading } = useCollection<LedgerEntry>(ledgerEntriesQuery);

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

      {selectedAccount ? (
        <div className="bg-card border-4 border-foreground p-10 shadow-sm print:border-0 print:shadow-none font-sans">
           <div className="text-center border-b-2 border-foreground pb-4 mb-8">
              <h2 className="text-2xl font-black uppercase">{selectedAccount.name}</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Account Code: {selectedAccount.accountCode} • {selectedAccount.category}</p>
           </div>
            
           {areEntriesLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin"/></div> :
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
                {ledgerEntries?.map(entry => (
                    <TableRow key={entry.id}>
                        <TableCell>{entry.createdAt ? format(entry.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                        <TableCell className="font-mono">{entry.reference}</TableCell>
                        <TableCell className="italic text-muted-foreground">{entry.narration}</TableCell>
                        <TableCell className="text-right font-mono text-primary font-bold">{entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</TableCell>
                        <TableCell className="text-right font-mono text-destructive font-bold">{entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</TableCell>
                    </TableRow>
                ))}
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
      ) : (
        <div className="p-20 bg-card border-2 border-dashed text-center text-muted-foreground italic rounded-2xl">
            Please select an account from the dropdown above to view its transaction history.
        </div>
      )}
    </div>
  );
}
