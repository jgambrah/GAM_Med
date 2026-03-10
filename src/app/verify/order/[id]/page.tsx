'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ShieldCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function PublicOrderVerification() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [hospital, setHospital] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore || !id) {
        if (!id) setStatus('invalid');
        return;
    };

    const verify = async () => {
      try {
        const snap = await getDoc(doc(firestore, "external_orders", id as string));
        if (snap.exists()) {
          const data = snap.data();
          setOrder(data);
          const hSnap = await getDoc(doc(firestore, "hospitals", data.hospitalId));
          setHospital(hSnap.exists() ? hSnap.data() : { name: "Unknown Facility" });
          setStatus('valid');
        } else {
          setStatus('invalid');
        }
      } catch(e) {
        console.error("Verification failed:", e);
        setStatus('invalid');
      }
    };
    verify();
  }, [id, firestore]);

  if (status === 'loading') return (
    <div className="h-screen flex items-center justify-center font-black animate-pulse">
        <Loader2 className="animate-spin h-8 w-8 mr-4 text-primary"/>
        VERIFYING CLINICAL HASH...
    </div>
  );

  if (status === 'invalid') return (
    <div className="h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
       <XCircle size={64} className="text-red-600 mb-4" />
       <h1 className="text-2xl font-black text-red-900 uppercase">Invalid Document</h1>
       <p className="text-red-700 mt-2">This clinical order reference does not exist in the GamMed Cloud.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 space-y-6">
      <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-slate-900 shadow-2xl overflow-hidden">
        {/* STATUS HEADER */}
        <div className="bg-green-600 p-8 text-white text-center">
           <CheckCircle2 size={48} className="mx-auto mb-2" />
           <h2 className="text-2xl font-black uppercase tracking-tighter">Verified Order</h2>
           <p className="text-[10px] font-bold uppercase opacity-80">Authenticated by {hospital.name}</p>
        </div>

        <div className="p-8 space-y-6">
           {/* CLINICIAN INFO */}
           <div className="border-b pb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase">Issuing Medical Officer</p>
              <p className="text-lg font-black text-black uppercase">Dr. {order.doctorName}</p>
              <p className="text-xs font-bold text-blue-600 uppercase">MDC No: {order.doctorMDC}</p>
           </div>

           {/* PATIENT MASKED INFO (Privacy Protection) */}
           <div className="border-b pb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase">Patient Name (Masked)</p>
              <p className="text-sm font-black uppercase text-black">
                 {order.patientName.split(' ')[0]} {order.patientName.split(' ')[1]?.[0]}***
              </p>
           </div>

           {/* PRESCRIBED ITEMS */}
           <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase">Authenticated Items</p>
              {order.items.map((item: any, i: number) => (
                <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                   <span className="text-xs font-black uppercase">{item.name}</span>
                   <span className="text-[10px] font-bold text-blue-600">{item.dosage}</span>
                </div>
              ))}
           </div>
        </div>

        {/* SECURITY FOOTER */}
        <div className="p-6 bg-[#0f172a] text-white flex items-center gap-3">
           <ShieldCheck size={20} className="text-blue-400" />
           <p className="text-[8px] font-black uppercase tracking-widest leading-tight">
              Secure digital signature. Document integrity is cryptographically protected by GamMed.
           </p>
        </div>
      </div>
      
      <p className="text-[9px] font-bold text-slate-400 uppercase italic">© 2026 Gam IT Solutions. All rights reserved.</p>
    </div>
  );
}
