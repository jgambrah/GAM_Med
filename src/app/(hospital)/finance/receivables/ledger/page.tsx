'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, Timestamp, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, AlertCircle, Calendar, 
  ArrowUpRight, Filter, Receipt, Search, Loader2, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ARLedgerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole);

  const receivablesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
        collection(firestore, `hospitals/${hospitalId}/receivables`),
        where("status", "==", "UNPAID"),
        orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);
  const { data: receivables, isLoading: areReceivablesLoading } = useCollection(receivablesQuery);

  const getAge = (createdAt: any) => {
      if(!createdAt) return 0;
      const diff = new Date().getTime() - createdAt?.toDate().getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
  };
  
  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) {
      return (
          <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
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
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Receivable <span className="text-destructive">Aging</span></h1>
          <p className="text-muted-foreground font-medium">Monitoring institutional debt and patient credit levels.</p>
        </div>
        <div className="bg-destructive/10 p-4 rounded-3xl border-2 border-destructive/20 flex items-center gap-4">
           <div>
              <p className="text-[10px] font-black uppercase text-destructive/70">Total Receivables</p>
              <p className="text-2xl font-black text-destructive">GHS {areReceivablesLoading ? '...' : (receivables?.reduce((a, b) => a + b.amount, 0) || 0).toLocaleString()}</p>
           </div>
           <AlertCircle className="text-destructive" size={32} />
        </div>
      </div>

      <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="p-6 text-[10px] font-black text-muted-foreground uppercase">Debtor / Patient Name</TableHead>
              <TableHead className="p-6 text-[10px] font-black text-muted-foreground uppercase">Payer Entity</TableHead>
              <TableHead className="p-6 text-[10px] font-black text-muted-foreground uppercase">Amount (GHS)</TableHead>
              <TableHead className="p-6 text-[10px] font-black text-muted-foreground uppercase">Age (Days)</TableHead>
              <TableHead className="p-6 text-[10px] font-black text-muted-foreground uppercase text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areReceivablesLoading && <TableRow><TableCell colSpan={5} className="text-center p-20"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>}
            {!areReceivablesLoading && receivables?.map(r => (
              <TableRow key={r.id} className="hover:bg-muted/50 transition-all font-bold">
                <TableCell className="p-6 uppercase text-sm text-card-foreground">
                   {r.patientName}
                   <p className="text-[9px] text-primary">REF: {r.id.slice(-6).toUpperCase()}</p>
                </TableCell>
                <TableCell className="p-6">
                   <span className="text-xs text-muted-foreground uppercase">{r.payerName || 'Individual / Cash-Debt'}</span>
                </TableCell>
                <TableCell className="p-6 text-lg font-black italic text-card-foreground">₵ {r.amount.toFixed(2)}</TableCell>
                <TableCell className="p-6">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getAge(r.createdAt) > 60 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {getAge(r.createdAt)} Days
                   </span>
                </TableCell>
                <TableCell className="p-6 text-right">
                   <Button variant="outline" size="sm" className="text-xs">
                      Reconcile
                   </Button>
                </TableCell>
              </TableRow>
            ))}
             {!areReceivablesLoading && receivables?.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center p-20 text-muted-foreground italic">No outstanding receivables.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
  