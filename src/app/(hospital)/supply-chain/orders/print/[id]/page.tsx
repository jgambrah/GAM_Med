'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Printer, ArrowLeft, ShieldCheck, Landmark, Loader2 } from 'lucide-react';

export default function PurchaseOrderPrint() {
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

  const poRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !id) return null;
    return doc(firestore, `hospitals/${hospitalId}/purchase_orders`, id as string);
  }, [firestore, hospitalId, id]);
  const { data: po, isLoading: isPoLoading } = useDoc(poRef);

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const supplierRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !po?.supplierId) return null;
    return doc(firestore, `hospitals/${hospitalId}/suppliers`, po.supplierId);
  }, [firestore, hospitalId, po]);
  const { data: supplier, isLoading: isSupplierLoading } = useDoc(supplierRef);

  const isLoading = isPoLoading || isHospitalLoading || isSupplierLoading;
  
  const totalValue = useMemo(() => {
    if (!po?.items) return 0;
    return po.items.reduce((acc: number, item: any) => acc + ((item.quantityOrdered || 1) * (item.price || 0)), 0);
  }, [po]);

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black uppercase"><Loader2 className="mx-auto animate-spin" /> Generating Legal Document...</div>;
  if (!po) return <div className="p-20 text-center font-black">Purchase Order not found.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-black">
      {/* SCREEN NAVIGATION */}
      <div className="print:hidden flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-black transition-all">
          <ArrowLeft size={14}/> Back to Orders
        </button>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:bg-black transition-all">
          <Printer size={16}/> Print & Sign PO
        </button>
      </div>

      {/* --- FORMAL PO DOCUMENT (PRINT VIEW) --- */}
      <div className="bg-white border-[1px] border-slate-300 p-12 shadow-sm font-serif">
         {/* HEADER */}
         <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-10">
            <div className="space-y-1">
               <h1 className="text-4xl font-black uppercase tracking-tighter text-black">{hospital?.name}</h1>
               <p className="text-sm font-bold uppercase">{hospital?.region} REGION, GHANA</p>
               <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Type: {po.poType || 'GOODS'} Purchase Order</p>
            </div>
            <div className="text-right space-y-2">
               <div className="bg-slate-900 text-white px-8 py-2 text-xl font-black uppercase tracking-[0.2em]">
                 {po.poType === 'GOODS' ? 'Purchase Order' : 'Service Contract PO'}
               </div>
               <p className="text-lg font-black italic text-blue-600">{po.poNumber}</p>
            </div>
         </div>

         {/* VENDOR & SHIP TO */}
         <div className="grid grid-cols-2 gap-16 mb-12">
            <div className="space-y-3">
               <h3 className="bg-slate-100 px-4 py-1 text-[10px] font-black uppercase tracking-widest border-l-4 border-slate-900">Supplier Information</h3>
               <div className="px-4">
                  <p className="text-lg font-black uppercase">{po.supplierName}</p>
                  <p className="text-sm">TIN: {supplier?.tin || 'N/A'}</p>
                  <p className="text-sm">{supplier?.address || 'Ghana'}</p>
                  <p className="text-sm">Phone: {supplier?.phone}</p>
               </div>
            </div>
            <div className="space-y-3">
               <h3 className="bg-slate-100 px-4 py-1 text-[10px] font-black uppercase tracking-widest border-l-4 border-slate-900">Ship To / Billing Address</h3>
               <div className="px-4">
                  <p className="text-lg font-black uppercase">{hospital?.name}</p>
                  <p className="text-sm">Attention: Procurement Department</p>
                  <p className="text-sm">{hospital?.location || 'Main Facility'}</p>
               </div>
            </div>
         </div>

         {/* --- DYNAMIC ITEMS TABLE --- */}
         <table className="w-full border-4 border-slate-900 mb-10 text-sm">
            <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest">
               <tr>
                  <th className="p-4 text-left border-r border-slate-700">
                    {po.poType === 'GOODS' ? 'Item Description / SKU' : 'Scope of Work / Deliverables'}
                  </th>
                  
                  {po.poType === 'GOODS' && (
                    <th className="p-4 text-center border-r border-slate-700 w-24">Qty</th>
                  )}
                  
                  <th className="p-4 text-right border-r border-slate-700 w-40">
                    {po.poType === 'GOODS' ? 'Unit Price (₵)' : 'Milestone Value (₵)'}
                  </th>
                  
                  <th className="p-4 text-right w-40">Total (₵)</th>
               </tr>
            </thead>
            <tbody className="font-bold">
               {po.items.map((item: any, i: number) => (
                  <tr key={i} className="border-b-2 border-slate-200">
                     <td className="p-4 uppercase font-black italic text-xs">
                        {item.name}
                        {po.poType === 'GOODS' && <span className="block text-[8px] text-blue-600 mt-1">SKU: {item.sku}</span>}
                     </td>
                     
                     {po.poType === 'GOODS' && (
                        <td className="p-4 text-center">{item.quantityOrdered}</td>
                     )}
                     
                     <td className="p-4 text-right">
                        {(item.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                     </td>
                     
                     <td className="p-4 text-right font-black">
                        {po.poType === 'GOODS' 
                          ? (item.quantityOrdered * item.price).toLocaleString(undefined, {minimumFractionDigits: 2})
                          : item.price.toLocaleString(undefined, {minimumFractionDigits: 2})
                        }
                     </td>
                  </tr>
               ))}
               
               {/* TOTALS BLOCK */}
               <tr className="bg-slate-50">
                  <td colSpan={po.poType === 'GOODS' ? 3 : 2} className="p-6 text-right font-black uppercase text-xs border-r-4 border-slate-900">
                     Authorized Contract Sum (Total)
                  </td>
                   <td className="p-6 text-right font-black text-2xl">
                     ₵ {totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                   </td>
               </tr>
            </tbody>
         </table>

         {/* --- SPECIAL SERVICE CLAUSE --- */}
         {po.poType !== 'GOODS' && (
           <div className="mb-10 p-6 bg-blue-50 border-2 border-blue-100 rounded-3xl">
              <h4 className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-2 mb-2">
                 <ShieldCheck size={14}/> Performance Obligation
              </h4>
              <p className="text-[9px] leading-relaxed text-blue-800 italic">
                 This Service Purchase Order is subject to the issuance of a <strong>Job Completion Certificate (JCC)</strong> by the designated Head of Department. Payments will be processed net of 7.5% Withholding Tax as per the Ghana Income Tax Act.
              </p>
           </div>
         )}

         {/* SIGNATURE SECTION */}
         <div className="grid grid-cols-3 gap-8 mt-24">
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Procurement Officer</p>
               <p className="text-[9px] font-bold mt-1 uppercase italic">{po.orderedByName}</p>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Medical Director</p>
               <div className="h-10"></div>
               <p className="text-[8px] italic">Official Stamp Required</p>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Supplier Acceptance</p>
               <div className="h-10"></div>
               <p className="text-[8px] italic">Signature & Date</p>
            </div>
         </div>

         {/* FOOTER */}
         <div className="mt-20 flex justify-between items-center opacity-30 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
               <Landmark size={16}/>
               <span className="text-[8px] font-black uppercase tracking-widest">Digitally Audited via GamMed ERP</span>
            </div>
            <p className="text-[8px] font-bold italic">Generated on {new Date().toLocaleString()}</p>
         </div>
      </div>
    </div>
  );
}
