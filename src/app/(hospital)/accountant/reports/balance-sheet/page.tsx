'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Loader2, ShieldAlert, Scale } from 'lucide-react';
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
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole || '');

  const accountsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "chart_of_accounts"));
  }, [firestore, hospitalId]);
  const { data: accounts, isLoading: areAccountsLoading } = useCollection(accountsQuery);
  
  const fixedAssetsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'assets'));
  }, [firestore, hospitalId]);
  const { data: fixedAssets, isLoading: areAssetsLoading_2 } = useCollection(fixedAssetsQuery);

  const {
    totalAssets,
    totalLiabilities,
    totalEquity,
    currentNetProfit,
    capital,
    currentAssets,
    liabilities,
    netBookValue,
    totalFixedAssetsCost,
    totalAccumulatedDep,
    totalCurrentAssets
  } = useMemo(() => {
    if (!accounts || !fixedAssets) {
        return { 
            totalAssets: 0, totalLiabilities: 0, totalEquity: 0, currentNetProfit: 0, 
            capital: [], currentAssets: [], liabilities: [], netBookValue: 0, 
            totalFixedAssetsCost: 0, totalAccumulatedDep: 0, totalCurrentAssets: 0
        };
    }
    
    const totalFixedAssetsCost = fixedAssets.reduce((s, a) => s + (a.purchasePrice || 0), 0);
    const totalAccumulatedDep = fixedAssets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0);
    const netBookValue = totalFixedAssetsCost - totalAccumulatedDep;
    
    const currentAssetsData = accounts.filter(a => a.category === 'ASSETS');
    const totalCurrentAssets = currentAssetsData.reduce((s, a) => s + (a.currentBalance || 0), 0);

    const liabilitiesData = accounts.filter(a => a.category === 'LIABILITIES');
    const totalLiabilities = liabilitiesData.reduce((s, a) => s + (a.currentBalance || 0), 0);

    const capitalData = accounts.filter(a => a.category === 'CAPITAL');
    const totalCapital = capitalData.reduce((s, a) => s + (a.currentBalance || 0), 0);
    
    const revenue = accounts.filter(a => a.category === 'REVENUE').reduce((s, a) => s + (a.currentBalance || 0), 0);
    const expenses = accounts.filter(a => a.category === 'EXPENSES').reduce((s, a) => s + (a.currentBalance || 0), 0);
    const netProfit = revenue - expenses;
    
    const totalEquity = totalCapital + netProfit;
    const totalAssetsValue = netBookValue + totalCurrentAssets;

    return { 
        totalAssets: totalAssetsValue, 
        totalLiabilities, 
        totalEquity, 
        currentNetProfit: netProfit,
        capital: capitalData,
        currentAssets: currentAssetsData,
        liabilities: liabilitiesData,
        netBookValue,
        totalFixedAssetsCost,
        totalAccumulatedDep,
        totalCurrentAssets
    };
  }, [accounts, fixedAssets]);

  const isLoading = isUserLoading || isProfileLoading || areAccountsLoading || areAssetsLoading_2;
  const totalEquityAndLiabilities = totalLiabilities + totalEquity;

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
    <div className="p-10 max-w-5xl mx-auto space-y-12 text-black font-serif bg-white">
      <div className="text-center border-b-4 border-black pb-4 print:pb-2">
         <h1 className="text-3xl font-black uppercase tracking-widest">Statement of Financial Position</h1>
         <p className="font-bold italic mt-1 uppercase text-lg">{userProfile?.hospitalName}</p>
         <p className="text-sm font-bold uppercase mt-1">As At {new Date().toLocaleDateString('en-GB')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        
        <section className="space-y-8">
           <div>
              <h3 className="font-black border-b-2 border-black uppercase text-xs tracking-widest mb-4">Non-Current Assets</h3>
              <div className="space-y-2 text-sm">
                 <div className="flex justify-between font-bold">
                    <span>Fixed Assets (at Cost)</span>
                    <span>₵ {totalFixedAssetsCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                 </div>
                 <div className="flex justify-between text-red-600 italic">
                    <span>Less: Accumulated Depreciation</span>
                    <span>(₵ {totalAccumulatedDep.toLocaleString(undefined, {minimumFractionDigits: 2})})</span>
                 </div>
                 <div className="flex justify-between pt-2 border-t border-slate-200 font-black">
                    <span>Net Book Value</span>
                    <span>₵ {netBookValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                 </div>
              </div>
           </div>

           <div>
              <h3 className="font-black border-b-2 border-black uppercase text-xs tracking-widest mb-4">Current Assets</h3>
              <div className="space-y-2 text-sm">
                 {currentAssets.map((acc, i) => (
                    <div key={i} className="flex justify-between">
                       <span>{acc.name}</span>
                       <span className="font-bold">₵ {(acc.currentBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                 ))}
                 <div className="flex justify-between pt-2 border-t border-slate-200 font-black">
                    <span>Total Current Assets</span>
                    <span>₵ {totalCurrentAssets.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                 </div>
              </div>
           </div>

           <div className="bg-slate-900 text-white p-6 rounded-2xl flex justify-between items-center">
              <span className="text-sm font-black uppercase italic">Total Assets</span>
              <span className="text-2xl font-black underline decoration-double">₵ {totalAssets.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
           </div>
        </section>

        <section className="space-y-8">
           <div>
              <h3 className="font-black border-b-2 border-black uppercase text-xs tracking-widest mb-4">Equity & Reserves</h3>
              <div className="space-y-2 text-sm">
                 {capital.map((acc, i) => (
                    <div key={i} className="flex justify-between">
                        <span>{acc.name}</span>
                        <span className="font-bold">₵ {(acc.currentBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                 ))}
                 <div className="flex justify-between text-blue-600 font-bold">
                    <span>Retained Earnings (P&L)</span>
                    <span>₵ {currentNetProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                 </div>
                 <div className="flex justify-between pt-2 border-t border-slate-200 font-black">
                    <span>Total Equity</span>
                    <span>₵ {totalEquity.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                 </div>
              </div>
           </div>

           <div>
              <h3 className="font-black border-b-2 border-black uppercase text-xs tracking-widest mb-4">Current Liabilities</h3>
              <div className="space-y-2 text-sm">
                 {liabilities.map((acc, i) => (
                    <div key={i} className="flex justify-between italic">
                       <span>{acc.name}</span>
                       <span>₵ {(acc.currentBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                 ))}
                 <div className="flex justify-between pt-2 border-t border-slate-200 font-black not-italic">
                    <span>Total Liabilities</span>
                    <span>₵ {totalLiabilities.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                 </div>
              </div>
           </div>

           <div className="bg-blue-600 text-white p-6 rounded-2xl flex justify-between items-center">
              <span className="text-sm font-black uppercase italic">Total Equity & Liabilities</span>
              <span className="text-2xl font-black underline decoration-double">₵ {totalEquityAndLiabilities.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
           </div>
        </section>
      </div>

      {Math.abs(totalAssets - totalEquityAndLiabilities) > 0.1 && (
        <div className="p-6 bg-red-600 text-white rounded-[32px] flex items-center gap-4 animate-bounce">
           <Scale size={32} />
           <div>
              <p className="font-black uppercase text-xs">Integrity Alert: Balance Sheet Out of Sync</p>
              <p className="text-sm">Discrepancy: GHC {(totalAssets - totalEquityAndLiabilities).toFixed(2)}</p>
           </div>
        </div>
      )}

      <div className="pt-20 grid grid-cols-2 gap-20 print:pt-10">
         <div className="border-t-2 border-black pt-2 text-center">
            <p className="text-[10px] font-black uppercase">Chief Accountant</p>
            <p className="text-[10px] font-bold mt-2 italic">{user?.displayName}</p>
         </div>
         <div className="border-t-2 border-black pt-2 text-center">
            <p className="text-[10px] font-black uppercase">Medical Director / CEO</p>
         </div>
      </div>
    </div>
  );
}
