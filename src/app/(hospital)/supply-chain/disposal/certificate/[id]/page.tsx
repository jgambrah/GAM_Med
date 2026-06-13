'use client';
import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Printer, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function DisposalCertificate() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  const hospitalId = userProfile?.hospitalId;

  const logRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !id) return null;
    return doc(firestore, `hospitals/${hospitalId}/disposal_logs`, id as string);
  }, [firestore, hospitalId, id]);
  const { data, isLoading: isLogLoading } = useDoc(logRef);

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const primaryColor = useMemo(() => hospital?.primaryColor || '#0f172a', [hospital]);
  const secondaryColor = useMemo(() => hospital?.secondaryColor || '#2563eb', [hospital]);

  const loading = isProfileLoading || isLogLoading || isHospitalLoading;

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
        <button 
          onClick={() => router.push('/supply-chain/disposal')} 
          className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-all outline-none"
        >
          <ArrowLeft size={14}/> Back to Disposal
        </button>
        <button 
          onClick={() => window.print()} 
          className="text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl border-none transition-all hover:opacity-90"
          style={{ backgroundColor: secondaryColor }}
        >
          <Printer size={16}/> Print Certificate
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
               Disposal Certificate
            </div>
         </div>

         {/* Meta specifications */}
         <div className="grid grid-cols-2 gap-10 mb-10 text-sm">
            <div>
               <p className="font-bold text-slate-600">Certificate No: <span className="font-mono text-slate-900 font-black underline ml-2">{data.disposalId}</span></p>
               <p className="font-bold text-slate-600">Date of Disposal: <span className="text-slate-900 font-black underline ml-2">{data.createdAt ? format(new Date(data.createdAt?.toDate()), 'dd/MM/yyyy') : 'N/A'}</span></p>
            </div>
            <div className="text-right">
               <p className="font-bold text-slate-600">Method: <span className="text-slate-900 font-black underline ml-2 uppercase">{data.method}</span></p>
               <p className="font-bold text-slate-600">Reason: <span className="text-slate-900 font-black underline ml-2 uppercase">{data.reason}</span></p>
            </div>
         </div>

         <div className="space-y-6">
            <p className="text-sm leading-relaxed italic text-slate-800">
               This is to certify that the following medical supplies/pharmaceuticals have been inspected and deemed unfit for clinical use. They have been permanently decommissioned from the inventory of <strong>{hospital?.name || 'the Hospital'}</strong> in accordance with national health regulatory guidelines.
            </p>

            <table 
              className="w-full text-sm border-2"
              style={{ borderColor: primaryColor }}
            >
               <thead 
                 className="border-b-2"
                 style={{ borderBottomColor: primaryColor, backgroundColor: `${primaryColor}0a` }}
               >
                  <tr>
                     <th className="p-3 text-left font-black uppercase text-[10px] tracking-wider text-slate-700 border-r border-slate-200">Description of Item</th>
                     <th className="p-3 text-center font-black uppercase text-[10px] tracking-wider text-slate-700 border-r border-slate-200">SKU</th>
                     <th className="p-3 text-right font-black uppercase text-[10px] tracking-wider text-slate-700">Quantity</th>
                   </tr>
               </thead>
               <tbody>
                  <tr className="font-bold text-slate-900">
                     <td className="p-4 uppercase border-r border-slate-200">{data.productName}</td>
                     <td className="p-4 text-center font-mono border-r border-slate-200">{data.sku}</td>
                     <td className="p-4 text-right font-black">{data.qty} units</td>
                  </tr>
               </tbody>
            </table>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Authorization Remarks</p>
               <p className="text-xs italic font-medium">"{data.notes || 'No additional remarks recorded.'}"</p>
            </div>
         </div>

         {/* SIGNATURE BLOCKS */}
         <div className="grid grid-cols-3 gap-8 mt-24">
            <div 
              className="border-t-2 pt-2 text-center"
              style={{ borderTopColor: primaryColor }}
            >
               <p className="text-[10px] font-black uppercase text-slate-500">Storekeeper / Pharmacist</p>
               <p className="text-xs font-black mt-2 italic text-slate-850">{data.authorizedByName}</p>
            </div>
            <div 
              className="border-t-2 pt-2 text-center"
              style={{ borderTopColor: primaryColor }}
            >
               <p className="text-[10px] font-black uppercase text-slate-500">Witnessing Staff</p>
               <p className="text-xs font-black mt-2 italic text-slate-850">{data.witnessName}</p>
            </div>
            <div 
              className="border-t-2 pt-2 text-center"
              style={{ borderTopColor: primaryColor }}
            >
               <p className="text-[10px] font-black uppercase text-slate-500">Facility Director</p>
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
