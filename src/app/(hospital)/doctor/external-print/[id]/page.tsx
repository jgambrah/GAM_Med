'use client';
import { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Printer, FileText, Smartphone, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { QRCodeSVG } from 'qrcode.react';

export default function ExternalOrderPrint() {
  const { id: encounterId } = useParams();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const [printFormat, setPrintFormat] = useState<'A4' | 'POS'>('A4');
  
  const hospitalId = searchParams.get('hospitalId');
  const patientId = searchParams.get('patientId');

  const encounterRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !patientId || !encounterId) return null;
    return doc(firestore, `hospitals/${hospitalId}/patients/${patientId}/encounters`, encounterId as string);
  }, [firestore, hospitalId, patientId, encounterId]);
  const { data: order, isLoading: isOrderLoading } = useDoc(encounterRef);
  
  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  if (isOrderLoading || isHospitalLoading) {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-[800px] w-full" />
        </div>
    );
  }

  if (!order) return <div className="p-20 text-center font-black">Order not found.</div>;

  // SOLID FIX: Combine all items into one array to prevent 'undefined' error
  const clinicalItems = [
    ...(order.prescription || []),
    ...(order.labOrders || []),
    ...(order.radiologyOrders || []),
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      {/* --- FORMAT SELECTOR (Hidden on Print) --- */}
      <div className="max-w-4xl mx-auto mb-8 print:hidden bg-white p-6 rounded-[32px] shadow-xl border-4 border-slate-900 flex justify-between items-center font-bold">
        <div className="flex gap-4">
           <button onClick={() => setPrintFormat('A4')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all ${printFormat === 'A4' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
              <FileText size={18}/> A4 Standard
           </button>
           <button onClick={() => setPrintFormat('POS')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all ${printFormat === 'POS' ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
              <Smartphone size={18}/> POS Paper
           </button>
        </div>
        <button onClick={() => window.print()} className="bg-slate-900 text-white px-10 py-3 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-600 transition-all">
           Execute Print
        </button>
      </div>

      <div className="flex justify-center">
        {printFormat === 'A4' ? (
          /* --- A4 PROFESSIONAL LAYOUT --- */}
          <div className="w-[210mm] bg-white p-16 shadow-sm border font-serif min-h-[297mm] text-black">
             <div className="text-center border-b-4 border-black pb-6 mb-10">
                <h1 className="text-4xl font-black uppercase tracking-tighter">{hospital?.name}</h1>
                <p className="text-sm uppercase font-bold">{hospital?.region} Region, Ghana</p>
                <div className="bg-black text-white px-10 py-1 mt-4 inline-block text-sm font-black uppercase tracking-[0.3em]">
                   Official Medical Order
                </div>
             </div>
             
             <div className="space-y-10">
                <div className="flex justify-between text-sm">
                  <p className="font-bold uppercase">Patient: <span className="underline ml-2">{order.patientName}</span></p>
                  <p className="font-bold">Date: {order.createdAt ? new Date(order.createdAt?.toDate()).toLocaleDateString('en-GB') : 'N/A'}</p>
                </div>
                
                <div className="space-y-8">
                   {clinicalItems.map((item: any, i: number) => (
                      <div key={i} className="border-l-8 border-blue-600 pl-6 py-2">
                         <p className="font-black text-2xl uppercase italic">
                            {item.name} 
                            {/* SOLID FIX 2: Only show brackets if strength is NOT empty and NOT just a space */}
                            {item.strength && item.strength.trim().length > 0 ? ` (${item.strength})` : ''} 
                         </p>
                         {(item.instruction || item.dosage || item.indication) && (
                            <p className="text-lg font-medium text-slate-700 mt-2 uppercase tracking-wide">
                               👉 {item.instruction || item.dosage || item.indication}
                            </p>
                         )}
                      </div>
                   ))}
                </div>
             </div>

             <div className="mt-auto pt-32 flex justify-between items-end">
                <div className="space-y-2">
                   <div className="w-64 border-b-4 border-black"></div>
                   <p className="text-sm font-black uppercase">Dr. {order.providerName}</p>
                   <p className="text-[10px] font-bold text-slate-400">Medical Officer (GamMed Authenticated)</p>
                </div>
                <div className="text-center">
                   <QRCodeSVG value={`https://gam-med.vercel.app/verify/order/${order.id}`} size={100} />
                   <p className="text-[8px] font-black uppercase mt-2">Scan to Verify</p>
                </div>
             </div>
          </div>
        ) : (
          /* --- POS THERMAL LAYOUT --- */}
          <div className="w-[80mm] bg-white p-6 shadow-sm border-2 border-slate-200 font-mono text-black">
             <div className="text-center border-b-2 border-black pb-4 mb-4">
                <h2 className="text-lg font-black uppercase leading-tight">{hospital?.name}</h2>
                <p className="text-[10px] uppercase font-bold">{hospital?.region}</p>
                <p className="text-[10px] mt-2 font-black border-2 border-black inline-block px-2 tracking-widest">OFFICIAL ORDER</p>
             </div>
             <div className="text-[11px] mb-6 space-y-1 font-bold">
                <p>DATE: {order.createdAt ? new Date(order.createdAt?.toDate()).toLocaleDateString() : 'N/A'}</p>
                <p>PATIENT: {order.patientName?.toUpperCase()}</p>
                <p>REF: {order.id?.slice(0,8).toUpperCase()}</p>
             </div>
             <div className="border-y-2 border-black py-4 space-y-5">
                {clinicalItems.map((item: any, i: number) => (
                   <div key={i} className="space-y-1">
                      <p className="font-black text-sm uppercase"># {item.name} {item.strength && item.strength.trim().length > 0 ? `(${item.strength})` : ''}</p>
                      {(item.instruction || item.dosage || item.indication) && (
                         <p className="text-[11px] italic pl-4">>> {item.instruction || item.dosage || item.indication}</p>
                      )}
                   </div>
                ))}
             </div>
             <div className="mt-6 text-center space-y-6">
                <p className="text-[11px] font-black italic">SIGNED: DR. {order.providerName?.toUpperCase()}</p>
                <div className="flex justify-center bg-slate-50 p-4 rounded-2xl">
                   <QRCodeSVG value={`https://gam-med.vercel.app/verify/order/${order.id}`} size={120} />
                </div>
                <p className="text-[8px] font-black uppercase tracking-widest">Verify authenticity via QR Code</p>
                <div className="border-t border-dashed pt-4">
                   <p className="text-[9px] italic uppercase opacity-50">GamMed Digital EHR System</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
