'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function CashFlowStatementPage() {
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

  const { operating, investing, financing, netChange } = useMemo(() => {
    if (!accounts) return { operating: 0, investing: 0, financing: 0, netChange: 0 };
    
    const revenue = accounts.filter(a => a.category === 'REVENUE').reduce((s, a) => s + a.currentBalance, 0);
    const expenses = accounts.filter(a => a.category === 'EXPENSES').reduce((s, a) => s + a.currentBalance, 0);
    const operating = revenue - expenses;

    // This is a simplification. A true cash flow statement requires analyzing changes over a period.
    const investing = -accounts.filter(a => a.category === 'ASSETS' && (a.name.includes('Equipment') || a.name.includes('Vehicle'))).reduce((s, a) => s + a.currentBalance, 0);
    const financing = accounts.filter(a => a.category === 'CAPITAL').reduce((s, a) => s + a.currentBalance, 0) - accounts.filter(a => a.category === 'LIABILITIES' && a.name.toLowerCase().includes('loan')).reduce((s, a) => s + a.currentBalance, 0);

    const netChange = operating + investing + financing;

    return { operating, investing, financing, netChange };
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
    <div className="p-10 max-w-4xl mx-auto space-y-10 font-serif text-black">
       <div className="text-center border-b-4 border-black pb-4">
          <h1 className="text-3xl font-black uppercase">Statement of Cash Flows</h1>
          <p className="font-bold italic mt-1 uppercase text-sm">For the Period Ended {new Date().toLocaleDateString('en-GB')}</p>
       </div>
       <div className="space-y-10">
          <CashFlowSection title="Net Cash from Operating Activities" value={operating.toFixed(2)} isNegative={operating < 0} />
          <CashFlowSection title="Net Cash from Investing Activities" value={investing.toFixed(2)} isNegative={investing < 0} />
          <CashFlowSection title="Net Cash from Financing Activities" value={financing.toFixed(2)} isNegative={financing < 0} />
          
          <div className="bg-slate-900 text-white p-8 rounded-3xl flex justify-between items-center">
             <span className="text-xl font-black uppercase italic">Net Increase in Cash</span>
             <span className="text-3xl font-black italic">₵ {netChange.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
       </div>
    </div>
  );
}

function CashFlowSection({title, value, isNegative}: {title: string, value: string, isNegative?: boolean}) {
    const displayValue = isNegative ? `(${Math.abs(parseFloat(value)).toLocaleString(undefined, {minimumFractionDigits: 2})})` : `₵ ${parseFloat(value).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    return (
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-sm font-bold uppercase">{title}</span>
            <span className={`text-lg font-black ${isNegative ? 'text-red-600' : 'text-black'}`}>{displayValue}</span>
        </div>
    );
}
