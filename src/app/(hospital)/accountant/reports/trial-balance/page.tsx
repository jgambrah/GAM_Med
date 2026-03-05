'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function TrialBalance() {
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

  const accountsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "chart_of_accounts"));
  }, [firestore, hospitalId]);
  const { data: accounts, isLoading: areAccountsLoading } = useCollection(accountsQuery);

  const { totalDebit, totalCredit } = useMemo(() => {
    if (!accounts) return { totalDebit: 0, totalCredit: 0 };
    
    const totalDebit = accounts.reduce((sum, a) => sum + (['ASSETS', 'EXPENSES'].includes(a.category) ? a.currentBalance : 0), 0);
    const totalCredit = accounts.reduce((sum, a) => sum + (['LIABILITIES', 'REVENUE', 'CAPITAL'].includes(a.category) ? a.currentBalance : 0), 0);

    return { totalDebit, totalCredit };
  }, [accounts]);

  const isLoading = isUserLoading || isProfileLoading || areAccountsLoading;

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
    <div className="p-10 max-w-5xl mx-auto space-y-10">
      <div className="text-center border-b-4 border-foreground pb-6">
         <h1 className="text-4xl font-black uppercase tracking-tighter italic">Trial <span className="text-primary">Balance</span></h1>
         <p className="font-bold text-xs uppercase text-muted-foreground mt-2">As at {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      <div className="bg-card border-4 border-foreground overflow-hidden shadow-[12px_12px_0px_0px_hsl(var(--foreground))]">
        <table className="w-full text-left font-bold text-card-foreground">
          <thead className="bg-foreground text-primary-foreground uppercase text-[10px] tracking-widest">
            <tr>
              <th className="p-6">Account Description</th>
              <th className="p-6 text-right">Debit (₵)</th>
              <th className="p-6 text-right">Credit (₵)</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-border">
            {accounts?.sort((a,b) => a.accountCode.localeCompare(b.accountCode)).map((acc, i) => (
              <tr key={i}>
                <td className="p-5 uppercase text-sm">{acc.accountCode} - {acc.name}</td>
                <td className="p-5 text-right font-mono">{['ASSETS', 'EXPENSES'].includes(acc.category) ? acc.currentBalance.toFixed(2) : '-'}</td>
                <td className="p-5 text-right font-mono">{['LIABILITIES', 'REVENUE', 'CAPITAL'].includes(acc.category) ? acc.currentBalance.toFixed(2) : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-foreground text-primary-foreground text-lg font-black italic">
            <tr>
              <td className="p-6 text-right uppercase text-xs">Total Balance</td>
              <td className="p-6 text-right border-l border-border/50">₵ {totalDebit.toFixed(2)}</td>
              <td className="p-6 text-right border-l border-border/50">₵ {totalCredit.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {Math.abs(totalDebit - totalCredit) > 0.01 && (
        <div className="bg-destructive p-4 rounded-2xl text-destructive-foreground text-center font-black uppercase animate-pulse">
           ⚠️ Accounting Error: System Out of Balance by ₵ {(totalDebit - totalCredit).toFixed(2)}
        </div>
      )}
    </div>
  );
}
