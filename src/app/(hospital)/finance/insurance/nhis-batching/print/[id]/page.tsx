
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Printer, ShieldCheck, ArrowLeft, Landmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function NHISBatchPrintView() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  const hospitalId = userProfile?.hospitalId;

  const batchRef = useMemoFirebase(() => {
      if (!firestore || !id) return null;
      return doc(firestore, `nhis_batches`, id as string);
  }, [firestore, id]);
  const { data: batch, isLoading: isBatchLoading } = useDoc(batchRef);

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const isLoading = isBatchLoading || isHospitalLoading;
  
  if (isLoading) {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  if (!batch) return <div className="p-20 text-center font-black">Batch not found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black">
      {/* SCREEN ONLY NAV */}
      <div className="print:hidden flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-all">
          <ArrowLeft size={14}/> Back
        </button>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:bg-black transition-all">
          <Printer size={16}/> Print Official Summary
        </button>
      </div>

      {/* --- THE CERTIFICATE (PRINT VIEW) --- */}
      <div className="bg-white border-[10px] border-double border-slate-900 p-12 shadow-sm font-serif">
         <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
            <h1 className="text-3xl font-black uppercase tracking-tighter">{hospital?.name}</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1">{hospital?.region} REGION • GHANA</p>
            <div className="bg-slate-900 text-white inline-block px-10 py-1 mt-4 rounded-full text-sm font-bold uppercase tracking-[0.3em]">
               NHIS BATCH SUBMISSION
            </div>
         </div>

         <div className="grid grid-cols-2 gap-10 mb-10 text-sm">
            <div>
               <p className="font-bold">Batch Number: <span className="underline ml-2">{batch.batchNumber}</span></p>
               <p className="font-bold">Date Prepared: <span className="underline ml-2">{batch.createdAt ? new Date(batch.createdAt?.toDate()).toLocaleDateString('en-GB') : 'N/A'}</span></p>
            </div>
            <div className="text-right">
               <p className="font-bold">Claims Count: <span className="underline ml-2">{batch.claimCount}</span></p>
               <p className="font-bold">Facility Code: <span className="underline ml-2">{hospitalId}</span></p>
            </div>
         </div>

         <div className="space-y-6">
            <p className="text-sm leading-relaxed italic">
               This document serves as the official summary for the electronic claims batch submitted to the National Health Insurance Authority for the period specified. The claims herein have been vetted and approved by the facility's internal auditor.
            </p>

            <div className="p-8 bg-blue-50 border-2 border-blue-200 rounded-3xl text-center">
               <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Total Value of Batched Claims</p>
               <p className="text-5xl font-black text-blue-900 tracking-tighter">₵ {batch.totalValue?.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
         </div>

         {/* SIGNATURE BLOCKS */}
         <div className="grid grid-cols-3 gap-8 mt-24">
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Prepared By (Claims Officer)</p>
               <p className="text-[11px] font-bold mt-2 italic">{batch.createdByName}</p>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Internal Auditor</p>
               <div className="h-10"></div>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Medical Director</p>
               <div className="h-10"></div>
            </div>
         </div>

         <div className="mt-20 flex justify-between items-center opacity-30 border-t pt-4">
            <div className="flex items-center gap-2">
               <ShieldCheck size={16}/>
               <span className="text-[8px] font-black uppercase tracking-widest">Digitally Audited via GamMed ERP</span>
            </div>
            <p className="text-[8px] font-bold italic">Batch ID: {batch.id}</p>
         </div>
      </div>
    </div>
  );
}

    