'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { 
  ShieldCheck, FileSearch, Loader2, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function InsuranceVettingQueue() {
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

  const claimsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/billing_items`),
      where("billingType", "==", "INSURANCE_CLAIM"),
      where("status", "==", "UNPAID")
    );
  }, [firestore, hospitalId]);

  const { data: pendingClaims, isLoading: areClaimsLoading } = useCollection(claimsQuery);

  const isLoading = isUserLoading || isProfileLoading;
  
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for Claims Vetting.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b-8 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Claims <span className="text-blue-600">Vetting Room</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Reviewing clinical orders for Insurance/NHIS compliance.</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-3xl border-2 border-blue-200 flex items-center gap-3">
           <ShieldCheck className="text-blue-600" size={24} />
           <span className="text-[10px] font-black uppercase text-blue-900">Queue: {areClaimsLoading ? '...' : pendingClaims?.length ?? 0} Cases</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {areClaimsLoading ? <div className="p-20 text-center"><Loader2 className="animate-spin text-primary"/></div> : 
        pendingClaims?.length === 0 ? (
          <div className="p-20 bg-slate-50 rounded-[40px] border-2 border-dashed text-center text-slate-300 italic uppercase font-black">
             All clinical claims have been vetted.
          </div>
        ) : pendingClaims.map((claim) => (
          <div key={claim.id} className="bg-white p-8 rounded-[40px] border-4 border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 hover:border-blue-600 transition-all group">
             <div className="flex items-center gap-6">
                <div className="bg-slate-900 text-white p-4 rounded-2xl">
                   <FileSearch size={24} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Payer: {claim.payerName || 'NHIS'}</p>
                   <h3 className="text-xl font-black uppercase text-black">{claim.patientName}</h3>
                   <p className="text-xs text-slate-400 italic">Item: {claim.description} • Qty: {claim.qty || 1}</p>
                </div>
             </div>

             <div className="flex items-center gap-8 w-full md:w-auto justify-between border-t md:border-0 pt-4 md:pt-0">
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Claim Value</p>
                   <p className="text-2xl font-black text-black italic">₵ {claim.total?.toFixed(2)}</p>
                </div>
                <Link href={`/finance/insurance/vetting/${claim.id}`} passHref>
                   <Button className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-black transition-all flex items-center gap-2">
                      Review & Authorize
                   </Button>
                </Link>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}