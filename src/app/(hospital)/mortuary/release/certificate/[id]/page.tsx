
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

  const primaryColor = useMemo(() => hospital?.primaryColor || '#0f172a', [hospital]);
  const secondaryColor = useMemo(() => hospital?.secondaryColor || '#2563eb', [hospital]);

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
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-all outline-none"
        >
          <ArrowLeft size={14}/> Back to Archive
        </button>
        <button 
          onClick={() => window.print()} 
          className="text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl border-none transition-all hover:opacity-90"
          style={{ backgroundColor: secondaryColor }}
        >
          <Printer size={16}/> Print Official Certificate
        </button>
      </div>

      {/* --- THE CERTIFICATE (PRINT VIEW) --- */}
      <div 
        className="bg-white p-12 shadow-sm font-serif border-[12px] border-double transition-all"
        style={{ borderColor: primaryColor }}
      >
         {/* Letterhead section with dynamic profile branding */}
         <div 
           className="text-center pb-6 mb-8 border-b-4"
           style={{ borderBottomColor: primaryColor }}
         >
            {hospital?.logoUrl && (
              <img 
                src={hospital.logoUrl} 
                alt="Hospital Logo" 
                className="h-16 mx-auto mb-3 object-contain"
              />
            )}
            <h1 
              className="text-3xl font-black uppercase tracking-tighter leading-none"
              style={{ color: primaryColor }}
            >
              {hospital?.name || 'GAM_MED CLINICAL HUB'}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1.5 text-slate-500">
               {hospital?.address && `${hospital.address} • `} 
               {hospital?.location && `${hospital.location} • `} 
               {hospital?.region && `${hospital.region} Region`}
            </p>
            <p className="text-[9px] font-semibold text-slate-400 mt-0.5 lowercase tracking-wider">
               phone: {hospital?.phone || 'N/A'} • email: {hospital?.email || 'N/A'} • web: {hospital?.website || 'N/A'}
            </p>

            <div 
              className="text-white inline-block px-10 py-1.5 mt-5 rounded-full text-sm font-black uppercase tracking-[0.3em]"
              style={{ backgroundColor: primaryColor }}
            >
               Body Release Certificate
            </div>
         </div>

         <div className="grid grid-cols-2 gap-10 mb-10 text-sm">
            <div>
               <p className="font-bold text-slate-600">Record ID: <span className="font-mono text-slate-900 font-black underline ml-2">{record.bodyId}</span></p>
                <p className="font-bold text-slate-600">Date Released: <span className="text-slate-900 font-black underline ml-2">
                  {record.releasedAt ? (
                    (() => {
                      const d = typeof record.releasedAt.toDate === 'function' 
                        ? record.releasedAt.toDate() 
                        : (record.releasedAt.seconds ? new Date(record.releasedAt.seconds * 1000) : new Date(record.releasedAt));
                      return d.toLocaleDateString('en-GB');
                    })()
                  ) : 'N/A'}
                </span></p>
            </div>
         </div>

         <div className="space-y-6">
            <p className="text-sm leading-relaxed italic text-slate-800">
               This is to certify that the remains of the deceased, <strong>{record.bodyName}</strong> (Ref: {record.bodyId}), have been formally released from this facility.
            </p>

            <div 
              className="bg-slate-50 p-8 rounded-3xl border-2 space-y-6"
              style={{ borderColor: primaryColor }}
            >
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Released To (Family Representative)</p>
                  <p className="font-black uppercase text-lg text-slate-900">{record.releasedToName}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">ID Verification (Ghana Card)</p>
                  <p className="font-mono font-bold text-lg text-slate-900">{record.releasedToID}</p>
               </div>
            </div>
         </div>

         {/* SIGNATURE BLOCKS */}
         <div className="grid grid-cols-2 gap-20 mt-24">
            <div 
              className="border-t-2 pt-2 text-center"
              style={{ borderTopColor: primaryColor }}
            >
               <p className="text-[10px] font-black uppercase text-slate-500">Mortuary Attendant</p>
               <p className="text-[11px] font-bold mt-2 italic text-slate-800">{user?.displayName}</p>
            </div>
            <div 
              className="border-t-2 pt-2 text-center"
              style={{ borderTopColor: primaryColor }}
            >
               <p className="text-[10px] font-black uppercase text-slate-500">Family Representative</p>
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
