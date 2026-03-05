'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function BalanceSheetPage() {
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
  
  const { totalAssets, totalLiabilities, totalEquity, currentNetProfit, assets, liabilities, capital } = useMemo(() => {
    if (!accounts) return { totalAssets: 0, totalLiabilities: 0, totalEquity: 0, currentNetProfit: 0, assets: [], liabilities: [], capital: [] };
    
    const assetsData = accounts.filter(a => a.category === 'ASSETS');
    const liabilitiesData = accounts.filter(a => a.category === 'LIABILITIES');
    const capitalData = accounts.filter(a => a.category === 'CAPITAL');
    
    const revenue = accounts.filter(a => a.category === 'REVENUE').reduce((s, a) => s + a.currentBalance, 0);
    const expenses = accounts.filter(a => a.category === 'EXPENSES').reduce((s, a) => s + a.currentBalance, 0);
    const currentNetProfit = revenue - expenses;

    const totalAssets = assetsData.reduce((s, a) => s + a.currentBalance, 0);
    const totalLiabilities = liabilitiesData.reduce((s, a) => s + a.currentBalance, 0);
    const totalEquity = capitalData.reduce((s, a) => s + a.currentBalance, 0) + currentNetProfit;

    return { totalAssets, totalLiabilities, totalEquity, currentNetProfit, assets: assetsData, liabilities: liabilitiesData, capital: capitalData };
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
    <div className="p-10 max-w-5xl mx-auto space-y-12 text-black font-serif">
      <div className="text-center border-b-4 border-black pb-4">
         <h1 className="text-3xl font-black uppercase tracking-widest">Statement of Financial Position</h1>
         <p className="font-bold italic mt-1 uppercase">As At {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* LEFT: ASSETS */}
        <section className="space-y-6">
           <h3 className="font-black border-b-2 border-black uppercase text-xs">Employment of Capital (Assets)</h3>
           {assets.map((acc, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{acc.name}</span>
                <span className="font-bold">₵ {acc.currentBalance.toFixed(2)}</span>
              </div>
           ))}
           <div className="flex justify-between font-black text-xl border-t-4 border-double border-black pt-4">
              <span>Total Assets</span>
              <span>₵ {totalAssets.toFixed(2)}</span>
           </div>
        </section>

        {/* RIGHT: LIABILITIES & EQUITY */}
        <section className="space-y-6">
           <h3 className="font-black border-b-2 border-black uppercase text-xs">Financed By (Liabilities & Equity)</h3>
           {/* Liabilities */}
           {liabilities.map((acc, i) => (
              <div key={i} className="flex justify-between text-sm italic">
                <span>{acc.name}</span>
                <span>₵ {acc.currentBalance.toFixed(2)}</span>
              </div>
           ))}
           {/* Equity/Capital */}
           <div className="pt-4 space-y-2">
              {capital.map((acc, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{acc.name}</span>
                  <span className="font-bold">₵ {acc.currentBalance.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm text-blue-600 font-bold">
                 <span>Net Surplus (Current Period)</span>
                 <span>₵ {currentNetProfit.toFixed(2)}</span>
              </div>
           </div>
           <div className="flex justify-between font-black text-xl border-t-4 border-double border-black pt-4">
              <span>Total Equity & Liabilities</span>
              <span>₵ {(totalLiabilities + totalEquity).toFixed(2)}</span>
           </div>
        </section>
      </div>

      {/* BALANCE CHECK */}
      {Math.abs(totalAssets - (totalLiabilities + totalEquity)) > 0.01 && (
        <div className="p-4 bg-red-600 text-white text-center font-black uppercase animate-pulse">
           Balance Sheet Out of Sync: GHC {(totalAssets - (totalLiabilities + totalEquity)).toFixed(2)}
        </div>
      )}
    </div>
  );
}
