'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Printer, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function JCCPrintView() {
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

  const jccRef = useMemoFirebase(() => {
      if (!firestore || !hospitalId || !id) return null;
      return doc(firestore, `hospitals/${hospitalId}/jcc_logs`, id as string);
  }, [firestore, hospitalId, id]);
  const { data: jcc, isLoading: isJccLoading } = useDoc(jccRef);

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const isLoading = isJccLoading || isHospitalLoading;
  
  if (isLoading) {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  if (!jcc) return <div className="p-20 text-center font-black">Certificate not found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black">
      {/* SCREEN ONLY NAV */}
      <div className="print:hidden flex justify-between items-center">
        <button onClick={() => router.push('/supply-chain/services/certify')} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-all">
          <ArrowLeft size={14}/> Back to Certification Queue
        </button>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:bg-black transition-all">
          <Printer size={16}/> Print Certificate
        </button>
      </div>

      {/* --- THE OFFICIAL JCC (PRINT VIEW) --- */}
      <div className="bg-white border-[10px] border-double border-slate-900 p-12 shadow-sm font-serif relative overflow-hidden">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] -rotate-45 pointer-events-none">
            <h1 className="text-9xl font-black uppercase">CERTIFIED</h1>
         </div>

         <div className="text-center border-b-4 border-slate-900 pb-8 mb-10">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black">{hospital?.name}</h1>
            <p className="text-sm font-bold uppercase tracking-widest">{hospital?.region} REGION • GHANA</p>
            <div className="bg-blue-600 text-white inline-block px-12 py-2 mt-6 rounded-full text-sm font-black uppercase tracking-[0.3em]">
               Job Completion Certificate
            </div>
         </div>

         <div className="grid grid-cols-2 gap-12 mb-12 text-sm uppercase">
            <div className="space-y-2">
               <p className="font-black">JCC Number: <span className="underline ml-2">{jcc.jccNumber}</span></p>
               <p className="font-black">Related PO: <span className="underline ml-2">{jcc.poNumber}</span></p>
               <p className="font-black">Service Provider: <span className="underline ml-2">{jcc.supplierName}</span></p>
            </div>
            <div className="text-right space-y-2">
               <p className="font-black">Date of Certification: <span className="underline ml-2">{jcc.createdAt ? new Date(jcc.createdAt?.toDate()).toLocaleDateString('en-GB') : 'N/A'}</span></p>
               <p className="font-black">Department: <span className="underline ml-2">{jcc.requestingDept || 'Technical Services'}</span></p>
            </div>
         </div>

         <div className="space-y-6">
            <h3 className="bg-slate-900 text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest inline-block">Scope of Work Rendered</h3>
            <div className="p-8 border-2 border-slate-900 rounded-3xl min-h-[200px] italic leading-relaxed text-lg">
               {jcc.narration || "Certification of works/services as specified in the original Purchase Order. All deliverables have been inspected and confirmed as satisfactory according to hospital standards."}
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Certified Value</span>
                  <span className="text-2xl font-black text-black">₵ {jcc.totalValue?.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
               </div>
               <p className="text-[9px] font-bold text-blue-600 mt-2 italic uppercase">
                  Note: This value has been moved to Accounts Payable. 7.5% WHT applies to this transaction.
               </p>
            </div>
         </div>

         <div className="grid grid-cols-3 gap-8 mt-24">
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Certified By (HOD)</p>
               <p className="text-[11px] font-bold mt-1 uppercase italic">{jcc.hODName}</p>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Internal Auditor</p>
               <div className="h-10"></div>
               <p className="text-[8px] italic">Pre-Audit Verification</p>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Hospital Director</p>
               <div className="h-10"></div>
               <p className="text-[8px] italic">Authorization Stamp</p>
            </div>
         </div>

         <div className="mt-20 flex justify-between items-center opacity-30 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
               <ShieldCheck size={16}/>
               <span className="text-[8px] font-black uppercase tracking-widest">Digitally Audited via GamMed ERP</span>
            </div>
            <p className="text-[8px] font-bold italic">Verification Hash: {jcc.hospitalId}</p>
         </div>
      </div>
    </div>
  );
}