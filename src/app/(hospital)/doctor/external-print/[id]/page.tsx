'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Printer, FileText, Smartphone, ArrowLeft, ShieldCheck, Landmark, Loader2, Stethoscope, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { QRCodeSVG } from 'qrcode.react';

export default function ExternalOrderPrint() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const [printFormat, setPrintFormat] = useState<'A4' | 'POS'>('A4');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  
  const orderRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, `external_orders`, id as string);
  }, [firestore, id]);
  const { data: order, isLoading: isOrderLoading } = useDoc(orderRef);
  
  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !order?.hospitalId) return null;
    return doc(firestore, "hospitals", order.hospitalId);
  }, [firestore, order]);
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
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto mb-8 print:hidden bg-white p-6 rounded-[32px] shadow-xl border-4 border-slate-900 flex justify-between items-center">
        <div className="flex gap-4">
           <button 
             onClick={() => setPrintFormat('A4')}
             className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all ${printFormat === 'A4' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
           >
              <FileText size={18}/> A4 Standard
           </button>
           <button 
             onClick={() => setPrintFormat('POS')}
             className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all ${printFormat === 'POS' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-400'}`}
           >
              <Smartphone size={18}/> POS Receipt
           </button>
        </div>
        <button onClick={() => window.print()} className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-600">
           Execute Print
        </button>
      </div>

      <div className="flex justify-center">
        {printFormat === 'A4' ? (
          <div className="w-[210mm] bg-white p-12 shadow-sm border font-serif min-h-[297mm]">
             <div className="text-center border-b-4 border-black pb-4 mb-8">
                <h1 className="text-3xl font-black uppercase">{hospital?.name}</h1>
                <p className="text-xs uppercase font-bold">{hospital?.region} Region, Ghana</p>
                <div className="bg-black text-white px-8 py-1 mt-4 inline-block text-sm font-black uppercase tracking-widest">Medical Order / Prescription</div>
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
             
             <div className="space-y-6">
                <p className="text-sm font-bold uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">
                  {order.type === 'PRESCRIPTION' ? 'Rx: Medication Orders' : 
                   order.type === 'LABORATORY' ? 'Dx: Laboratory Requests' :
                   'Dx: Imaging Requests'}
                </p>
                <div className="space-y-4">
                   {order.items?.map((item: any, i: number) => (
                      <div key={i} className="border-l-4 border-blue-600 pl-4 py-1">
                         <p className="font-black text-lg uppercase italic">{item.name}</p>
                         <p className="text-sm font-medium">{item.instruction || item.dosage}</p>
                      </div>
                   ))}
                </div>
             </div>

             <div className="mt-20 flex justify-between items-end">
                <div>
                   <div className="w-48 border-b-2 border-black mb-2"></div>
                   <p className="text-xs font-black">Dr. {order.doctorName}</p>
                </div>
                <QRCodeSVG value={`https://gam-med.vercel.app/verify/order/${id}`} size={80} />
             </div>
          </div>
        ) : (
          <div className="w-[80mm] bg-white p-4 shadow-sm border font-mono text-black">
             <div className="text-center border-b border-black pb-2 mb-4">
                <h2 className="text-lg font-black uppercase">{hospital?.name}</h2>
                <p className="text-[10px] uppercase font-bold">{hospital?.region}</p>
                <p className="text-[10px] mt-1">PRESCRIPTION / ORDER</p>
             </div>
             <div className="text-[11px] mb-4 space-y-1">
                <p>DATE: {order.createdAt ? new Date(order.createdAt?.toDate()).toLocaleDateString() : 'N/A'}</p>
                <p>PATIENT: {order.patientName}</p>
                <p>ID: {(id as string)?.slice(0,8).toUpperCase()}</p>
             </div>
             <div className="border-y border-black py-2 space-y-3">
                {order.items?.map((item: any, i: number) => (
                   <div key={i} className="space-y-1">
                      <p className="font-black text-xs uppercase">* {item.name}</p>
                      <p className="text-[10px] italic pl-3">{item.instruction || item.dosage}</p>
                   </div>
                ))}
             </div>
             <div className="mt-4 text-center space-y-4">
                <p className="text-[10px] font-bold">DR. {order.doctorName.toUpperCase()}</p>
                <div className="flex justify-center">
                   <QRCodeSVG value={`https://gam-med.vercel.app/verify/order/${id}`} size={100} />
                </div>
                <p className="text-[8px] uppercase">Scan to Verify Authenticity</p>
                <p className="text-[8px] mt-4 border-t pt-2 italic">GamMed ERP - Digital Health</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
