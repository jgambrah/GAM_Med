
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Printer, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function BodyReleaseCertificate() {
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

  const recordRef = useMemoFirebase(() => {
      if (!firestore || !hospitalId || !id) return null;
      return doc(firestore, `hospitals/${hospitalId}/mortuary_records`, id as string);
  }, [firestore, hospitalId, id]);
  const { data: record, isLoading: isRecordLoading } = useDoc(recordRef);

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const isLoading = isRecordLoading || isHospitalLoading;
  
  if (isLoading) {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  if (!record) return <div className="p-20 text-center font-black">Release Certificate Not Found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black">
      {/* SCREEN ONLY NAV */}
      <div className="print:hidden flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-all">
          <ArrowLeft size={14}/> Back to Archive
        </button>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:bg-black transition-all">
          <Printer size={16}/> Print Official Certificate
        </button>
      </div>

      {/* --- THE CERTIFICATE (PRINT VIEW) --- */}
      <div className="bg-white border-[10px] border-double border-slate-900 p-12 shadow-sm font-serif">
         <div className="text-center border-b-4 border-black pb-6 mb-8">
            <h1 className="text-3xl font-black uppercase tracking-tighter">{hospital?.name}</h1>
            <p className="text-sm font-bold uppercase tracking-widest mt-1">{hospital?.region} REGION • MORTUARY DEPARTMENT</p>
            <div className="bg-black text-white inline-block px-10 py-1 mt-4 rounded-full text-sm font-bold uppercase tracking-[0.3em]">
               Body Release Certificate
            </div>
         </div>

         <div className="grid grid-cols-2 gap-10 mb-10 text-sm">
            <div>
               <p className="font-bold">Record ID: <span className="underline ml-2">{record.bodyId}</span></p>
               <p className="font-bold">Date Released: <span className="underline ml-2">{record.releasedAt ? new Date(record.releasedAt?.toDate()).toLocaleDateString('en-GB') : 'N/A'}</span></p>
            </div>
         </div>

         <div className="space-y-6">
            <p className="text-sm leading-relaxed italic">
               This is to certify that the remains of the deceased, <strong>{record.bodyName}</strong> (Ref: {record.bodyId}), have been formally released from this facility.
            </p>

            <div className="bg-slate-50 p-8 rounded-3xl border-2 border-black space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Released To (Family Representative)</p>
                  <p className="font-black uppercase text-lg">{record.releasedToName}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">ID Verification (Ghana Card)</p>
                  <p className="font-mono font-bold text-lg">{record.releasedToID}</p>
               </div>
            </div>
         </div>

         {/* SIGNATURE BLOCKS */}
         <div className="grid grid-cols-2 gap-20 mt-24">
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Mortuary Attendant</p>
               <p className="text-[11px] font-bold mt-2 italic">{user?.displayName}</p>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Family Representative</p>
               <div className="h-10"></div>
            </div>
         </div>

         <div className="mt-20 flex justify-between items-center opacity-30 border-t pt-4">
            <div className="flex items-center gap-2">
               <ShieldCheck size={16}/>
               <span className="text-[8px] font-black uppercase tracking-widest">Digitally Audited by GamMed ERP</span>
            </div>
            <p className="text-[8px] font-bold italic">Generated on {new Date().toLocaleString()}</p>
         </div>
      </div>
    </div>
  );
}
