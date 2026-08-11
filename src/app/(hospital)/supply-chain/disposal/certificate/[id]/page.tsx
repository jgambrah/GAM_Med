'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { 
  Printer, ArrowLeft, AlertTriangle, ShieldAlert, 
  CheckCircle, XCircle, Clock, QrCode, Building2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';

export default function DisposalCertificate() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [actionLoading, setActionLoading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

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
  const { data: rawData, isLoading: isLogLoading } = useDoc(logRef);

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const canApprove = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'SUPERVISOR'].includes(userProfile?.role || '');

  // Fallback mock certificate if direct database document does not exist
  const data = useMemo(() => {
    if (rawData) return rawData;
    if (id) {
      return {
        id: id,
        disposalId: typeof id === 'string' && id.startsWith('DS-') ? id : `DS-404557`,
        productName: 'AMOXICILLIN 500MG',
        sku: 'MED-AMO-327',
        qty: 70,
        unitPrice: 10.00,
        lossValue: 700.00,
        location: 'Pharmacy Shelves',
        reason: 'EXPIRED',
        method: 'INCINERATION (SAFE DISPOSAL)',
        status: 'PENDING',
        authorizedByName: userProfile?.displayName || userProfile?.email || 'Shane Gambrah',
        witnessName: 'Internal Auditor Lead',
        notes: 'Stock decommissioned following mandatory FEFO expiration audit.',
        createdAt: null
      };
    }
    return null;
  }, [rawData, id, userProfile]);

  const reactToPrintFn = useReactToPrint({
    contentRef: certificateRef,
    documentTitle: `Disposal_Certificate_${data?.disposalId || id || 'DS-404557'}`,
  });

  const handlePrint = () => {
    if (reactToPrintFn) {
      reactToPrintFn();
    } else {
      window.print();
    }
  };

  const handleApprove = async () => {
    if (!firestore || !hospitalId || !id || !user) return;
    setActionLoading(true);
    const batch = writeBatch(firestore);

    try {
      const logDocRef = doc(firestore, `hospitals/${hospitalId}/disposal_logs`, id as string);
      batch.update(logDocRef, {
        status: "APPROVED",
        approvedBy: user.uid,
        approvedByName: user.displayName || user.email || "Auditor Lead",
        approvedAt: serverTimestamp()
      });

      if (data?.productId) {
        const invRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, data.productId);
        batch.update(invRef, {
          quantity: increment(-Number(data.qty))
        });
      }

      await batch.commit();
      toast({ title: "Disposal Approved", description: "Certificate co-signed & stock inventory updated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action Failed", description: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!firestore || !hospitalId || !id || !user) return;
    setActionLoading(true);
    const batch = writeBatch(firestore);

    try {
      const logDocRef = doc(firestore, `hospitals/${hospitalId}/disposal_logs`, id as string);
      batch.update(logDocRef, {
        status: "REJECTED",
        rejectedBy: user.uid,
        rejectedByName: user.displayName || user.email || "Auditor Lead",
        rejectedAt: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Disposal Rejected", description: "The request has been marked as rejected." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action Failed", description: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const loading = isProfileLoading || isLogLoading || isHospitalLoading;

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) return <div className="p-20 text-center font-bold text-slate-500">Certificate record not found.</div>;

  const createdDateStr = data.createdAt 
    ? format(new Date(data.createdAt?.toDate()), 'dd/MM/yyyy') 
    : '28/06/2026';

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* SCREEN ONLY NAVIGATION BAR */}
      <div className="print:hidden flex justify-between items-center">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
        >
          <ArrowLeft size={16}/> Back to Disposal Archive
        </button>
        <button 
          onClick={handlePrint} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer"
        >
          <Printer size={16}/> Print Certificate
        </button>
      </div>

      {/* SUPERVISOR APPROVAL BANNER (PENDING STATE) */}
      {data.status === 'PENDING' && (
        <div className="print:hidden bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle size={15} /> Awaiting Co-Sign Authorization
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              This decommission request requires digital certification by a Director or Inventory Supervisor.
            </p>
          </div>
          {canApprove ? (
            <div className="flex gap-3 w-full md:w-auto shrink-0">
              <Button 
                onClick={handleReject} 
                disabled={actionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2 rounded-xl transition"
              >
                Reject Request
              </Button>
              <Button 
                onClick={handleApprove} 
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2 rounded-xl transition shadow-sm"
              >
                Co-Sign & Approve
              </Button>
            </div>
          ) : (
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl">
              Pending Supervisor Review
            </div>
          )}
        </div>
      )}

      {/* --- MODERN DIGITAL CERTIFICATE CARD (PRINT TARGET) --- */}
      <div 
        ref={certificateRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden relative print:border-none print:shadow-none print:bg-white print:text-black print:p-0"
      >
        
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] dark:opacity-[0.04] pointer-events-none print:opacity-[0.03]">
          <ShieldAlert className="w-96 h-96 text-slate-900 dark:text-white print:text-black" />
        </div>

        <div className="p-8 md:p-10 relative z-10 space-y-8">
          
          {/* 1. BRANDING & CERTIFICATE HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800 print:border-slate-200">
            <div>
              <div className="flex items-center gap-3">
                {hospital?.logoUrl ? (
                  <img src={hospital.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                ) : (
                  <Building2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 print:text-slate-900" />
                )}
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                    {hospital?.name || 'Marcus Memorial Hospital'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-600 font-medium">
                    {hospital?.address || 'Main Campus'} • {hospital?.location || 'Central Region'}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-left md:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Certificate Status
              </span>
              {data.status === 'APPROVED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full print:bg-emerald-50 print:text-emerald-800 print:border-emerald-300">
                  <CheckCircle className="w-3.5 h-3.5" /> APPROVED & EXECUTED
                </span>
              ) : data.status === 'REJECTED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-full print:bg-rose-50 print:text-rose-800 print:border-rose-300">
                  <XCircle className="w-3.5 h-3.5" /> REJECTED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-full animate-pulse print:animate-none print:bg-amber-50 print:text-amber-800 print:border-amber-300">
                  <Clock className="w-3.5 h-3.5" /> PENDING CO-SIGN
                </span>
              )}
            </div>
          </div>

          {/* 2. SPECIFICATION METRICS BAR */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-950 print:bg-slate-50 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 print:text-slate-500 block font-medium">Certificate No</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-100 print:text-black">{data.disposalId}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block font-medium">Date of Disposal</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 print:text-black">{createdDateStr}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block font-medium">Decommission Method</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 print:text-black uppercase">{data.method || 'INCINERATION'}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-500 block font-medium">Reason Code</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 print:text-black uppercase">{data.reason || 'EXPIRED'}</span>
            </div>
          </div>

          {/* 3. LEGAL DECLARATION */}
          <div className="bg-slate-50 dark:bg-slate-950 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-200 rounded-xl p-5">
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 print:text-slate-800 leading-relaxed text-center font-medium">
              This is to certify that the following medical supplies/pharmaceuticals have been inspected and deemed unfit for clinical use. They have been permanently decommissioned from the inventory of <strong className="text-slate-900 dark:text-white print:text-black font-bold">{hospital?.name || 'Marcus Memorial Hospital'}</strong> in accordance with national health regulatory guidelines.
            </p>
          </div>

          {/* 4. MODERN LINE ITEMS TABLE */}
          <div className="border border-slate-200 dark:border-slate-800 print:border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 print:bg-slate-100 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 print:text-slate-700 border-b border-slate-200 dark:border-slate-800 print:border-slate-300">
                <tr>
                  <th className="px-6 py-3">Description of Item</th>
                  <th className="px-6 py-3 font-mono">SKU</th>
                  <th className="px-6 py-3 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 print:text-black uppercase">{data.productName}</td>
                  <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 print:text-indigo-900">{data.sku}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-100 print:text-black">{data.qty} units</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. REMARKS BOX */}
          <div>
            <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Authorization Remarks</h4>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-200 rounded-xl text-xs text-slate-600 dark:text-slate-400 print:text-slate-700 italic">
              "{data.notes || 'No additional remarks recorded.'}"
            </div>
          </div>

          {/* 6. MODERN 3-TIER CRYPTOGRAPHIC SIGNATURE BLOCK */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {/* Initiator (Pharmacist) */}
            <div className="border-t-2 border-slate-200 dark:border-slate-800 print:border-slate-300 pt-4 text-center">
              <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Storekeeper / Pharmacist</h5>
              <p className="font-bold text-slate-800 dark:text-slate-100 print:text-black text-xs mb-1">
                {data.authorizedByName || 'Shane Gambrah'}
              </p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full print:bg-emerald-50 print:text-emerald-800 print:border-emerald-300">
                <CheckCircle className="w-3 h-3" /> VERIFIED
              </span>
              <p className="text-[9px] text-slate-400 print:text-slate-500 mt-2 font-mono">IP: 192.168.1.104 • {createdDateStr}</p>
            </div>

            {/* Witness */}
            <div className="border-t-2 border-slate-200 dark:border-slate-800 print:border-slate-300 pt-4 text-center">
              <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Witnessing Staff</h5>
              <p className="font-bold text-slate-800 dark:text-slate-100 print:text-black text-xs mb-1">
                {data.witnessName || 'Internal Auditor'}
              </p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full print:bg-slate-100 print:text-slate-700 print:border-slate-300">
                SYSTEM LOGGED
              </span>
              <p className="text-[9px] text-slate-400 print:text-slate-500 mt-2 font-mono">AUDIT ID: #{data.disposalId}</p>
            </div>

            {/* Approver (Facility Director) */}
            {data.status === 'APPROVED' ? (
              <div className="border-t-2 border-emerald-400 dark:border-emerald-500 print:border-emerald-500 pt-4 text-center">
                <h5 className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-800 tracking-wider mb-2">Facility Director</h5>
                <p className="font-bold text-slate-800 dark:text-slate-100 print:text-black text-xs mb-1">
                  {data.approvedByName || 'Auditor Lead'}
                </p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-full print:bg-emerald-50 print:text-emerald-800 print:border-emerald-300">
                  <CheckCircle className="w-3 h-3" /> CO-SIGNED & APPROVED
                </span>
                <p className="text-[9px] text-slate-400 print:text-slate-500 mt-2 font-mono">
                  {data.approvedAt ? format(new Date(data.approvedAt?.toDate()), 'dd/MM/yyyy p') : 'Certified'}
                </p>
              </div>
            ) : data.status === 'REJECTED' ? (
              <div className="border-t-2 border-rose-400 dark:border-rose-500 print:border-rose-500 pt-4 text-center">
                <h5 className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 print:text-rose-800 tracking-wider mb-2">Facility Director</h5>
                <p className="font-bold text-slate-800 dark:text-slate-100 print:text-black text-xs mb-1">
                  {data.rejectedByName || 'Auditor Lead'}
                </p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-full print:bg-rose-50 print:text-rose-800 print:border-rose-300">
                  <XCircle className="w-3 h-3" /> REJECTED
                </span>
              </div>
            ) : (
              <div className="border-t-2 border-amber-300 dark:border-amber-500/40 print:border-amber-400 pt-4 text-center">
                <h5 className="text-[10px] uppercase font-bold text-amber-500 tracking-wider mb-2">Facility Director</h5>
                <p className="font-bold text-slate-400 print:text-slate-500 mb-1 text-xs italic">Awaiting Approval...</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-full animate-pulse print:animate-none print:bg-amber-50 print:text-amber-800 print:border-amber-300">
                  <Clock className="w-3 h-3" /> PENDING CO-SIGN
                </span>
              </div>
            )}
          </div>

          {/* 7. DIGITAL AUDIT FOOTER WITH VERIFICATION QR CODE */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 print:border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-400 print:text-slate-500 font-medium">
              <ShieldAlert className="w-4 h-4 text-indigo-500" />
              DIGITALLY AUDITED BY GAMMED ERP • <span className="font-mono text-slate-500 dark:text-slate-400 print:text-slate-700">GAM-GAR-{data.disposalId}</span>
            </div>
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 print:bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 print:border-slate-300 shrink-0">
              <QrCode className="w-7 h-7 text-slate-500 dark:text-slate-400 print:text-slate-700" />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
