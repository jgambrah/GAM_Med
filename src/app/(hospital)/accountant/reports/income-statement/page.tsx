'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Printer, TrendingUp, TrendingDown, Landmark, Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function IncomeStatement() {
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

  const { revenueAccounts, expenseAccounts, totalRevenue, totalExpenses, netSurplus } = useMemo(() => {
    if (!accounts) return { revenueAccounts: [], expenseAccounts: [], totalRevenue: 0, totalExpenses: 0, netSurplus: 0 };
    
    const revenueAccounts = accounts.filter(a => a.category === 'REVENUE');
    const expenseAccounts = accounts.filter(a => a.category === 'EXPENSES');

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    const netSurplus = totalRevenue - totalExpenses;

    return { revenueAccounts, expenseAccounts, totalRevenue, totalExpenses, netSurplus };
  }, [accounts]);

  const isLoading = isUserLoading || isProfileLoading || areAccountsLoading;

  if (isLoading) {
    return <div className="p-20 text-center font-black animate-pulse"><Loader2 className="mx-auto animate-spin" /> Calculating Surplus...</div>;
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
    <div className="p-10 max-w-4xl mx-auto space-y-10 text-black font-serif">
      <div className="text-center border-b-4 border-black pb-6 print:pb-4">
         <h1 className="text-3xl font-black uppercase tracking-tighter">Income Statement</h1>
         <p className="text-sm font-bold uppercase mt-1 italic">For the Period Ended {new Date().toLocaleDateString('en-GB')}</p>
         <p className="text-[10px] font-bold uppercase text-slate-400 mt-2">Hospital ID: {hospitalId}</p>
      </div>

      <div className="space-y-8">
        {/* REVENUE SECTION */}
        <section>
          <h3 className="font-black border-b-2 border-black pb-1 mb-4 uppercase text-sm tracking-widest">Revenue (Income)</h3>
          <div className="space-y-2">
            {revenueAccounts.map((acc, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{acc.name}</span>
                <span className="font-bold">₵ {acc.currentBalance.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-4 border-t border-slate-200 font-black text-lg">
               <span>Total Revenue</span>
               <span className="border-b-4 border-double border-black">₵ {totalRevenue.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* EXPENSE SECTION */}
        <section>
          <h3 className="font-black border-b-2 border-black pb-1 mb-4 uppercase text-sm tracking-widest">Operating Expenses</h3>
          <div className="space-y-2 italic">
            {expenseAccounts.map((acc, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{acc.name}</span>
                <span>(₵ {acc.currentBalance.toFixed(2)})</span>
              </div>
            ))}
            <div className="flex justify-between pt-4 border-t border-slate-200 font-black text-lg text-red-600 not-italic">
               <span className="text-black uppercase">Total Operating Expenses</span>
               <span className="border-b-2 border-black">₵ {totalExpenses.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* BOTTOM LINE */}
        <div className={`p-8 rounded-3xl border-4 flex justify-between items-center ${netSurplus >= 0 ? 'bg-green-50 border-green-600' : 'bg-red-50 border-red-600'}`}>
           <div className="flex items-center gap-4">
              {netSurplus >= 0 ? <TrendingUp size={32} className="text-green-600" /> : <TrendingDown size={32} className="text-red-600" />}
              <span className="text-xl font-black uppercase italic tracking-tighter">
                Net {netSurplus >= 0 ? 'Surplus' : 'Deficit'} for Period
              </span>
           </div>
           <span className="text-4xl font-black underline decoration-double">₵ {netSurplus.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
      </div>

      <button onClick={() => window.print()} className="print:hidden w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all">
        Print Certified Statement
      </button>
    </div>
  );
}
