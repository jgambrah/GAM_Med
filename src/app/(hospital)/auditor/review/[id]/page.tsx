'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, writeBatch, increment, collection, query, where, getDocs } from 'firebase/firestore';

import {
  ShieldCheck, AlertCircle, CheckCircle2,
  XCircle, FileText, Landmark, Fingerprint,
  ClipboardList, Scale, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function DetailedAuditReview() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [pv, setPv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [checks, setChecks] = useState({
    payeeVerified: false,
    taxesAccurate: false,
    budgetAvailable: false,
    documentationAttached: false
  });
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  useEffect(() => {
    if (!firestore || !id || !hospitalId) return;

    const fetchPV = async () => {
      setLoading(true);
      const snap = await getDoc(doc(firestore, `hospitals/${hospitalId}/payment_vouchers`, id as string));
      if (snap.exists()) {
        setPv(snap.data());
      } else {
        toast({ variant: 'destructive', title: 'Not Found', description: 'Payment voucher could not be found.'});
        router.push('/auditor');
      }
      setLoading(false);
    };
    fetchPV();
  }, [id, firestore, hospitalId, router, toast]);

  const handleAuditFinalization = async (decision: 'AUTHORIZED' | 'QUERIED') => {
    if (decision === 'AUTHORIZED' && !Object.values(checks).every(v => v)) {
      return toast({ variant: "destructive", title: "Pre-Audit incomplete. All vetting boxes must be ticked." });
    }
    if (!firestore || !user || !hospitalId || !pv) return;

    setProcessing(true);
    const batch = writeBatch(firestore);

    try {
      const pvRef = doc(firestore, `hospitals/${hospitalId}/payment_vouchers`, id as string);
      
      if (decision === 'AUTHORIZED') {
        // 1. UPDATE STATUS
        batch.update(pvRef, {
          status: 'AUTHORIZED', // This should probably be 'AUTHORIZED' to move to cashier, not 'PAID'
          auditedBy: user.uid,
          auditedByName: userProfile?.fullName,
          auditedAt: serverTimestamp(),
          auditChecklist: checks
        });

        // 2. THE ACCOUNTING HANDSHAKE (The money only moves NOW)
        const creditAccRef = doc(firestore, `hospitals/${hospitalId}/chart_of_accounts`, pv.creditAccountId);
        const debitAccRef = doc(firestore, `hospitals/${hospitalId}/chart_of_accounts`, pv.debitAccountId);
        
        batch.update(creditAccRef, { currentBalance: increment(-pv.netAmount) });
        batch.update(debitAccRef, { currentBalance: increment(pv.grossAmount) });

        if (pv.whtAmount > 0) {
            const whtQuery = query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), where("accountCode", "==", "2100"));
            const whtSnap = await getDocs(whtQuery);
            if (whtSnap.empty) throw new Error("Withholding Tax Payable account (2100) not found.");
            const whtAccRef = whtSnap.docs[0].ref;
            batch.update(whtAccRef, { currentBalance: increment(pv.whtAmount) });
        }
        
        toast({ title: "Voucher Authorized & Ledger Posted", description: `PV ${pv.pvNumber} is now ready for payment by the cashier.` });
      } else {
        batch.update(pvRef, { status: 'QUERIED', auditComment: "Returned by Auditor for clarification." });
        toast({ variant: 'destructive', title: "Voucher Returned with Query" });
      }

      await batch.commit();
      router.push('/auditor');
    } catch (e: any) { 
        console.error("Audit Finalization Error:", e);
        toast({ variant: 'destructive', title: 'Audit Error', description: e.message }); 
    }
    setProcessing(false);
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse">Vetting Document...</div>;
  if (!pv) return <div className="p-20 text-center font-black text-destructive">Document not found or access denied.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-black font-bold">
      {/* HEADER */}
      <div className="bg-[#0f172a] p-10 rounded-[50px] text-white shadow-2xl flex justify-between items-center border-b-8 border-blue-600">
        <div className="flex items-center gap-6">
           <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-500/20">
              <Scale size={32} />
           </div>
           <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">Pre-Audit <span className="text-blue-400">Verification</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Ref: {pv.pvNumber}</p>
           </div>
        </div>
        <div className="text-right">
           <p className="text-[10px] font-black text-blue-400 uppercase">Gross Amount</p>
           <p className="text-3xl font-black italic">₵ {pv.grossAmount?.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* LEFT: VOUCHER DETAILS */}
        <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-2">Voucher Particulars</h3>
           <DetailRow label="Payee" value={pv.payee} />
           <DetailRow label="Narration" value={pv.narration} isItalic />
           <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <DetailRow label="VAT (21.9%)" value={`₵ ${pv.vatAmount?.toFixed(2)}`} />
              <DetailRow label="WHT Deducted" value={`₵ ${pv.whtAmount?.toFixed(2)}`} color="text-red-600" />
           </div>
           <div className="p-6 bg-slate-900 rounded-3xl text-white flex justify-between items-center">
              <span className="text-[10px] font-black uppercase">Net Payable</span>
              <span className="text-2xl font-black">₵ {pv.netAmount?.toFixed(2)}</span>
           </div>
        </div>

        {/* RIGHT: AUDITOR'S CHECKLIST */}
        <div className="bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-xl space-y-8">
           <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 border-b pb-2 flex items-center gap-2">
              <ClipboardList size={16} /> Auditor's Vetting Checklist
           </h3>
           
           <div className="space-y-4">
              <CheckItem label="Verify Payee Identity & TIN" checked={checks.payeeVerified} onChange={() => setChecks({...checks, payeeVerified: !checks.payeeVerified})} />
              <CheckItem label="Verify Tax Calculations (VAT/WHT)" checked={checks.taxesAccurate} onChange={() => setChecks({...checks, taxesAccurate: !checks.taxesAccurate})} />
              <CheckItem label="Confirm Budgetary Head Availability" checked={checks.budgetAvailable} onChange={() => setChecks({...checks, budgetAvailable: !checks.budgetAvailable})} />
              <CheckItem label="Cross-check Supporting Documents" checked={checks.documentationAttached} onChange={() => setChecks({...checks, documentationAttached: !checks.documentationAttached})} />
           </div>

           <div className="flex gap-4 pt-6 border-t">
              <button 
                onClick={() => handleAuditFinalization('QUERIED')}
                className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all"
              >
                 Issue Query
              </button>
              <button 
                onClick={() => handleAuditFinalization('AUTHORIZED')}
                disabled={processing}
                className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="animate-spin" /> : <Fingerprint size={18} />}
                Authorize & Post
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, isItalic = false, color = "text-black" }: any) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
      <p className={`text-sm font-bold uppercase mt-0.5 ${color} ${isItalic ? 'italic' : ''}`}>{value}</p>
    </div>
  );
}

function CheckItem({ label, checked, onChange }: any) {
  return (
    <div 
      onClick={onChange}
      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${checked ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}
    >
       <span className={`text-[11px] font-black uppercase ${checked ? 'text-green-700' : 'text-slate-400'}`}>{label}</span>
       {checked ? <CheckCircle2 className="text-green-600" size={20}/> : <div className="w-5 h-5 rounded-full border-2 border-slate-200"/>}
    </div>
  );
}
