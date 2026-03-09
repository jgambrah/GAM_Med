
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Landmark, ArrowUpRight, Lock, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function TillManagement() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'CASHIER'].includes(userProfile?.role || '');

  const startOfToday = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payments`),
      where("createdAt", ">=", Timestamp.fromDate(startOfToday))
    );
  }, [firestore, hospitalId, startOfToday]);
  
  const { data: todayPayments, isLoading: arePaymentsLoading } = useCollection(paymentsQuery);

  const tillTotals = useMemo(() => {
    if (!todayPayments) return { cash: 0, momo: 0 };
    return todayPayments.reduce((acc, p) => {
      if (p.paymentMode === 'Cash') {
        acc.cash += p.totalAmount;
      } else if (p.paymentMode === 'MoMo') {
        acc.momo += p.totalAmount;
      }
      return acc;
    }, { cash: 0, momo: 0 });
  }, [todayPayments]);

  const isLoading = isUserLoading || isProfileLoading || arePaymentsLoading;
  
  if (isLoading) {
    return <div className="p-20 text-center"><Loader2 className="animate-spin text-primary" /></div>;
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
    <div className="p-8 space-y-8 max-w-4xl mx-auto text-black font-bold">
      <h1 className="text-3xl font-black uppercase italic">Till <span className="text-blue-600">Closure</span></h1>
      
      <div className="bg-white p-10 rounded-[50px] border-4 border-slate-900 shadow-2xl space-y-8">
        <div className="grid grid-cols-2 gap-8 border-b pb-8">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Physical Cash in Hand</p>
              <p className="text-4xl font-black italic">₵ {tillTotals.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Electronic MoMo Total</p>
              <p className="text-4xl font-black italic text-blue-600">₵ {tillTotals.momo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
           </div>
        </div>

        <div className="space-y-4">
           <h3 className="text-xs font-black uppercase text-slate-400">Submission Pathway</h3>
           <div className="p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex justify-between items-center">
              <span className="text-sm uppercase">Forward to Bank Deposit Queue?</span>
              <input type="checkbox" className="w-6 h-6 rounded accent-blue-600" />
           </div>
        </div>

        <button className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
           <Lock size={20} /> Close Till & Submit to Accountant
        </button>
      </div>
    </div>
  );
}
