
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Printer, ShieldCheck, ArrowLeft, Landmark, Loader2, Stethoscope, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { QRCodeSVG } from 'qrcode.react';

export default function ExternalOrderPrint() {
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
  
  const orderRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    // Assuming external_orders is a top-level collection
    return doc(firestore, `external_orders`, id as string);
  }, [firestore, id]);
  const { data: order, isLoading: isOrderLoading } = useDoc(orderRef);
  
  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const isLoading = isOrderLoading || isHospitalLoading;
  
  if (isLoading) {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-[800px] w-full" />
        </div>
    );
  }

  if (!order) return <div className="p-20 text-center font-black">Order not found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto text-black font-serif">
      <div className="print:hidden flex justify-end mb-6">
         <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl">
            <Printer size={18} /> Print Official Request
         </button>
      </div>

      <div className="bg-white border-[1px] border-slate-200 p-12 shadow-sm min-h-[1000px] flex flex-col">
         <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
            <div className="space-y-1">
               <h1 className="text-3xl font-black uppercase tracking-tighter">{hospital?.name}</h1>
               <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                  <MapPin size={12}/> {hospital?.region} Region, Ghana
               </div>
            </div>
            <div className="text-right">
               <div className="bg-slate-900 text-white px-6 py-1 text-sm font-black uppercase tracking-widest">
                  Clinical Order
               </div>
               <p className="text-[10px] font-bold mt-2 text-slate-400">REF: {(id as string).slice(0, 10).toUpperCase()}</p>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-10 mb-10 text-sm">
            <div className="space-y-1">
               <p className="text-[9px] font-black text-slate-400 uppercase">Patient Name</p>
               <p className="font-black uppercase text-lg">{order.patientName}</p>
               <p className="text-xs">EHR: {order.ehrNumber || 'N/A'}</p>
            </div>
            <div className="text-right space-y-1">
               <p className="text-[9px] font-black text-slate-400 uppercase">Date of Issue</p>
               <p className="font-black">{order.createdAt ? new Date(order.createdAt?.toDate()).toLocaleDateString('en-GB') : 'N/A'}</p>
            </div>
         </div>

         <div className="flex-1 space-y-8">
            <div className="space-y-4">
               <h3 className="text-sm font-black uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">
                  {order.type === 'PRESCRIPTION' ? 'Rx: Medication Orders' : 
                   order.type === 'LABORATORY' ? 'Dx: Laboratory Requests' :
                   'Dx: Imaging Requests'}
               </h3>
               
               <div className="space-y-6 pt-4">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex flex-col border-l-4 border-blue-600 pl-6">
                       <p className="text-xl font-black uppercase italic">{item.name}</p>
                       {order.type === 'PRESCRIPTION' ? (
                          <>
                           <p className="text-sm font-medium text-slate-600 mt-1">
                              {item.dosage} {item.frequency} for {item.duration}
                           </p>
                           <p className="text-xs italic text-slate-400 mt-1">Note: {item.instructions || 'As directed.'}</p>
                          </>
                       ) : (
                           <p className="text-sm italic text-slate-500 mt-1">{item.indication || 'For Clinical Evaluation'}</p>
                       )}
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="pt-20 grid grid-cols-2 gap-20">
            {/* LEFT: DOCTOR SIGNATURE */}
            <div className="space-y-2">
               <div className="border-b-2 border-slate-900 w-full h-12"></div>
               <p className="text-xs font-black uppercase">Dr. {order.doctorName}</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase italic">MDC: {order.doctorMDC || 'N/A'}</p>
            </div>

            {/* RIGHT: THE QR VERIFICATION GATE */}
            <div className="flex flex-col items-center justify-center border-2 border-slate-900 rounded-3xl p-4 bg-slate-50">
               <QRCodeSVG 
                 value={`https://gam-med.vercel.app/verify/order/${id}`} 
                 size={80}
                 level={"H"}
                 includeMargin={true}
               />
               <p className="text-[8px] font-black text-slate-900 uppercase mt-2 tracking-tighter">
                  Scan to Verify Authenticity
               </p>
            </div>
         </div>

         <div className="mt-20 pt-4 border-t flex justify-between items-center opacity-30">
            <div className="flex items-center gap-2">
               <ShieldCheck size={16}/>
               <span className="text-[8px] font-black uppercase tracking-widest">Authenticity Verified via GamMed Cloud</span>
            </div>
            <p className="text-[8px] font-bold italic">Generated by Dr. James Gambrah's GamMed ERP</p>
         </div>
      </div>
    </div>
  );
}
