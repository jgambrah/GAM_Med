'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { AlertCircle, MessageSquare, Edit3, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function AuditorQueryLog() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userProfile?.role || '');

  const queriedPVsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payment_vouchers`),
      where("status", "==", "QUERIED")
    );
  }, [firestore, hospitalId]);

  const { data: queriedPVs, isLoading: arePvsLoading } = useCollection(queriedPVsQuery);

  const pageIsLoading = isUserLoading || isProfileLoading;
  if(pageIsLoading) {
     return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b-4 border-red-600 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Audit <span className="text-red-600">Query Log</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Vouchers returned for clinical or financial clarification.</p>
        </div>
        <div className="bg-red-50 text-red-600 px-6 py-2 rounded-2xl border-2 border-red-200 flex items-center gap-3 shadow-sm">
           <AlertCircle size={20} className="animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-widest">{arePvsLoading ? '...' : queriedPVs?.length} Action Required</span>
        </div>
      </div>

      <div className="space-y-4">
        {arePvsLoading ? <div className="p-20 text-center"><Loader2 className="animate-spin" /></div> :
        queriedPVs?.length === 0 ? (
          <div className="p-20 bg-slate-50 rounded-[40px] border-2 border-dashed text-center text-slate-300 italic uppercase font-black">
             All clear. No outstanding audit queries.
          </div>
        ) : queriedPVs.map(pv => (
          <div key={pv.id} className="bg-white rounded-[40px] border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(220,38,38,0.1)] overflow-hidden">
             <div className="bg-red-600 p-4 text-white flex justify-between items-center px-8">
                <span className="text-[10px] font-black uppercase tracking-widest italic">Voucher Rejected by Auditor</span>
                <span className="text-xs font-black">{pv.pvNumber}</span>
             </div>
             
             <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4 border-r border-slate-100 pr-8">
                   <div className="flex items-start gap-4">
                      <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><MessageSquare size={20}/></div>
                      <div>
                         <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Reason for Query</p>
                         <p className="text-sm font-bold italic text-slate-700 leading-relaxed">"{pv.auditComment}"</p>
                      </div>
                   </div>
                   <div className="pt-4 space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Original Narration</p>
                      <p className="text-xs font-medium uppercase">{pv.narration}</p>
                   </div>
                </div>

                <div className="flex flex-col justify-between">
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Value</p>
                      <p className="text-3xl font-black text-black italic">₵ {pv.netAmount.toFixed(2)}</p>
                   </div>
                   <Link href={`/accountant/payments/edit/${pv.id}`} className="w-full">
                      <button className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-xl mt-4">
                         <Edit3 size={16} /> Rectify & Resubmit
                      </button>
                   </Link>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
