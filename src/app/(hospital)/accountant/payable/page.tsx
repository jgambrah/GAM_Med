'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Landmark, ArrowRight, FileText, Loader2, ShieldAlert, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

type Payable = {
    id: string;
    supplierName: string;
    grnNumber: string;
    amountOwed: number;
    createdAt: { toDate: () => Date };
}

export default function AccountsPayablePage() {
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

  const payablesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/accounts_payable`),
      where("status", "==", "UNPAID"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);

  const { data: payables, isLoading: arePayablesLoading } = useCollection<Payable>(payablesQuery);
  
  const isLoading = isUserLoading || isProfileLoading;
  
  if (isLoading) {
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
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Accounts <span className="text-destructive">Payable</span></h1>
           <p className="text-muted-foreground font-medium">Manage and settle outstanding liabilities to suppliers.</p>
        </div>
      </div>
      
      <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest">Supplier & GRN Ref</TableHead>
              <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest">Date Recorded</TableHead>
              <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest">Amount Owed (GHS)</TableHead>
              <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arePayablesLoading && <TableRow><TableCell colSpan={4} className="text-center p-12"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>}
            {!arePayablesLoading && payables?.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center p-20 text-muted-foreground italic">
                    <Wallet size={32} className="mx-auto mb-2" />
                    No outstanding payables. All supplier accounts are settled.
                </TableCell></TableRow>
            )}
            {payables?.map(p => (
              <TableRow key={p.id}>
                <TableCell className="p-6">
                   <p className="font-bold uppercase text-card-foreground">{p.supplierName}</p>
                   <p className="text-[9px] text-primary font-black">REF: {p.grnNumber}</p>
                </TableCell>
                <TableCell className="p-6 text-sm text-muted-foreground font-bold">{format(p.createdAt.toDate(), 'PPP')}</TableCell>
                <TableCell className="p-6 text-destructive font-black text-lg">GHS {p.amountOwed.toFixed(2)}</TableCell>
                <TableCell className="p-6 text-right">
                   <Button asChild>
                     <Link href={`/accountant/payments?payee=${encodeURIComponent(p.supplierName)}&amount=${p.amountOwed}&apId=${p.id}&grnNumber=${p.grnNumber}`}>
                        <FileText size={16}/> Generate PV
                     </Link>
                   </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
    
