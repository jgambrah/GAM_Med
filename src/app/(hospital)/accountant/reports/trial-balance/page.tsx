'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import {
  Scale, Printer, FileText, CheckCircle2,
  AlertTriangle, Landmark, ShieldCheck, Download, Loader2, ShieldAlert
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function TrialBalanceReport() {
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

  const hospitalRef = useMemoFirebase(() => hospitalId ? doc(firestore, 'hospitals', hospitalId) : null, [firestore, hospitalId]);
  const { data: hospitalData } = useDoc(hospitalRef);

  const accountsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`),
      orderBy("accountCode", "asc")
    );
  }, [firestore, hospitalId]);

  const { data: accounts, isLoading: areAccountsLoading } = useCollection(accountsQuery);

  const totalDebit = useMemo(() => accounts?.reduce((sum, a) =>
    sum + (['ASSETS', 'EXPENSES'].includes(a.category) ? (a.currentBalance || 0) : 0), 0) || 0, [accounts]);
  
  const totalCredit = useMemo(() => accounts?.reduce((sum, a) =>
    sum + (['LIABILITIES', 'REVENUE', 'CAPITAL'].includes(a.category) ? (a.currentBalance || 0) : 0), 0) || 0, [accounts]);

  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;

  const isLoading = isUserLoading || isProfileLoading || areAccountsLoading;

  if (isLoading) return <div className="p-20 flex items-center justify-center font-black italic animate-pulse text-blue-600 uppercase"><Loader2 className="mr-2 animate-spin" /> Synchronizing Ledgers...</div>;
  
  if (!isAuthorized && !isLoading) {
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
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-black font-bold">
      {/* --- HEADER (Hidden on Print) --- */}
      <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6 print:hidden">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Trial <span className="text-blue-600">Balance</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Consolidated verification of all ledger balances.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:bg-blue-600 transition-all">
              <Printer size={18} /> Print Certified Report
           </button>
        </div>
      </div>

      {/* --- BALANCE STATUS ALERT --- */}
      {!isBalanced && (
        <div className="bg-red-600 p-6 rounded-[32px] text-white flex items-center justify-between shadow-2xl animate-bounce print:hidden">
           <div className="flex items-center gap-4">
              <AlertTriangle size={32} />
              <div>
                 <p className="text-xs font-black uppercase tracking-widest">Accounting Alert</p>
                 <p className="text-xl font-black italic">Books are out of balance by ₵ {difference.toFixed(2)}</p>
              </div>
           </div>
           <p className="text-[10px] font-bold uppercase w-48 leading-tight opacity-80">Check recent manual Journal Entries for discrepancies.</p>
        </div>
      )}

      {/* --- THE FORMAL REPORT --- */}
      <div className="bg-white border-4 border-slate-900 p-10 rounded-[40px] shadow-2xl font-serif">
         <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
            <h2 className="text-3xl font-black uppercase tracking-widest">{hospitalData?.name || 'Facility Report'}</h2>
            <p className="text-lg font-bold uppercase mt-1 italic">Trial Balance Statement</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
               As at {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
         </div>

         <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
               <tr>
                  <th className="p-4 border-r border-slate-700">Account Code & Description</th>
                  <th className="p-4 text-right border-r border-slate-700 w-48">Debit (₵)</th>
                  <th className="p-4 text-right w-48">Credit (₵)</th>
               </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
               {accounts?.map((acc) => (
                  <tr key={acc.id} className={`hover:bg-slate-50 transition-all ${acc.accountCode === '2100' ? 'bg-blue-50/50' : ''}`}>
                     <td className="p-4 flex items-center gap-4">
                        <span className="text-[10px] font-black text-blue-600 w-12">{acc.accountCode}</span>
                        <span className="uppercase text-sm font-bold text-black">{acc.name}</span>
                        {acc.accountCode === '2100' && <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded font-black italic">TAX</span>}
                     </td>
                     <td className="p-4 text-right font-black text-sm border-r">
                        {['ASSETS', 'EXPENSES'].includes(acc.category) ? (acc.currentBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                     </td>
                     <td className="p-4 text-right font-black text-sm">
                        {['LIABILITIES', 'REVENUE', 'CAPITAL'].includes(acc.category) ? (acc.currentBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                     </td>
                  </tr>
               ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white">
               <tr className="text-lg font-black italic">
                  <td className="p-6 text-right uppercase text-xs tracking-[0.2em]">Statement Totals</td>
                  <td className="p-6 text-right border-x border-slate-700">₵ {totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="p-6 text-right">₵ {totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
               </tr>
            </tfoot>
         </table>

         {/* GOVERNANCE FOOTER */}
         <div className="mt-16 flex justify-between items-center opacity-40 grayscale print:opacity-100">
            <div className="flex items-center gap-3">
               <ShieldCheck size={24}/>
               <div>
                  <p className="text-[8px] font-black uppercase tracking-widest">Digitally Verified</p>
                  <p className="text-[8px] font-bold italic">GamMed ERP Core v2.0</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-[8px] font-black uppercase">Certified by Accountant</p>
               <div className="h-6 border-b border-slate-900 w-32 ml-auto mt-2"></div>
            </div>
         </div>
      </div>
    </div>
  );
}
