'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Printer, ShieldCheck, ArrowLeft, Skull } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DisposalCertificate() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const [claims, setClaims] = useState<any>(null);

  const [data, setData] = useState<any>(null);
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
        user.getIdTokenResult(true).then((token) => {
            setClaims(token.claims);
        });
    }
  }, [user]);

  useEffect(() => {
    const hospitalId = claims?.hospitalId;
    if (!firestore || !id || !hospitalId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const logRef = doc(firestore, `hospitals/${hospitalId}/disposal_logs`, id as string);
        const logSnap = await getDoc(logRef);

        if (logSnap.exists()) {
          const logData = logSnap.data();
          setData(logData);
          const hSnap = await getDoc(doc(firestore, "hospitals", logData.hospitalId));
          if (hSnap.exists()) {
            setHospital(hSnap.data());
          }
        }
      } catch (error) {
        console.error("Failed to fetch certificate data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, firestore, claims]);

  if (loading) {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  if (!data) return <div className="p-20 text-center font-black">Certificate not found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black">
      {/* SCREEN ONLY NAV */}
      <div className="print:hidden flex justify-between items-center">
        <button onClick={() => router.push('/supply-chain/disposal')} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-all">
          <ArrowLeft size={14}/> Back to Disposal
        </button>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl">
          <Printer size={16}/> Print Certificate
        </button>
      </div>

      {/* --- THE CERTIFICATE (PRINT VIEW) --- */}
      <div className="bg-white border-[10px] border-double border-slate-900 p-12 shadow-sm font-serif">
         <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
            <h1 className="text-3xl font-black uppercase tracking-tighter">{hospital?.name}</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1">{hospital?.region} REGION • GHANA</p>
            <div className="bg-slate-900 text-white inline-block px-10 py-1 mt-4 rounded-full text-sm font-bold uppercase tracking-[0.3em]">
               Disposal Certificate
            </div>
         </div>

         <div className="grid grid-cols-2 gap-10 mb-10 text-sm">
            <div>
               <p className="font-bold">Certificate No: <span className="underline ml-2">{data.disposalId}</span></p>
               <p className="font-bold">Date of Disposal: <span className="underline ml-2">{data.createdAt ? new Date(data.createdAt?.toDate()).toLocaleDateString('en-GB') : 'N/A'}</span></p>
            </div>
            <div className="text-right">
               <p className="font-bold">Method: <span className="underline ml-2">{data.method}</span></p>
               <p className="font-bold">Reason: <span className="underline ml-2">{data.reason}</span></p>
            </div>
         </div>

         <div className="space-y-6">
            <p className="text-sm leading-relaxed italic">
               This is to certify that the following medical supplies/pharmaceuticals have been inspected and deemed unfit for clinical use. They have been permanently decommissioned from the inventory of <strong>{hospital?.name}</strong> in accordance with national health regulatory guidelines.
            </p>

            <table className="w-full border-2 border-slate-900 text-sm">
               <thead className="bg-slate-100">
                  <tr>
                     <th className="border border-slate-900 p-3 text-left">Description of Item</th>
                     <th className="border border-slate-900 p-3 text-center">SKU</th>
                     <th className="border border-slate-900 p-3 text-right">Quantity</th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td className="border border-slate-900 p-4 font-bold uppercase">{data.productName}</td>
                     <td className="border border-slate-900 p-4 text-center font-mono">{data.sku}</td>
                     <td className="border border-slate-900 p-4 text-right font-black">{data.qty} units</td>
                  </tr>
               </tbody>
            </table>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Authorization Notes</p>
               <p className="text-xs italic font-medium">"{data.notes || 'No additional remarks recorded.'}"</p>
            </div>
         </div>

         {/* SIGNATURE BLOCKS */}
         <div className="grid grid-cols-3 gap-8 mt-24">
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Storekeeper / Pharmacist</p>
               <p className="text-[11px] font-bold mt-2 italic">{data.authorizedByName}</p>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Witnessing Staff</p>
               <p className="text-[11px] font-bold mt-2 italic">{data.witnessName}</p>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Facility Director</p>
               <div className="h-10"></div>
            </div>
         </div>

         <div className="mt-20 flex justify-between items-center opacity-30 border-t pt-4">
            <div className="flex items-center gap-2">
               <ShieldCheck size={16}/>
               <span className="text-[8px] font-black uppercase tracking-widest">Digitally Audited by GamMed ERP</span>
            </div>
            <span className="text-[8px] font-bold uppercase">{data.hospitalId}</span>
         </div>
      </div>
    </div>
  );
}
