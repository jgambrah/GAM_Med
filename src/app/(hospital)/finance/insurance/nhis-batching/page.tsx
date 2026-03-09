
'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp, increment, getDoc, runTransaction } from 'firebase/firestore';
import { 
  Library, Box, Send, FileJson, 
  CheckCircle2, Printer, Loader2, Landmark, 
  Layers, AlertCircle, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type ReceivableClaim = {
    id: string;
    patientName: string;
    amount: number;
    createdAt: { toDate: () => Date };
};

export default function NHISBatchingPortal() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [processing, setProcessing] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userProfile?.role || '');
  
  // 1. Fetch all items that are VETTED and UNPAID but NOT yet batched
  const vettedClaimsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/receivables`),
      where("payerName", "==", "NHIS"),
      where("status", "==", "UNPAID"),
    );
  }, [firestore, hospitalId]);
  const { data: vettedClaims, isLoading: areClaimsLoading } = useCollection<ReceivableClaim>(vettedClaimsQuery);

  const totalValue = useMemo(() => {
    if (!vettedClaims) return 0;
    return vettedClaims.reduce((acc, curr) => acc + curr.amount, 0);
  }, [vettedClaims]);

  const handleCreateBatch = async () => {
    if (!vettedClaims || vettedClaims.length === 0 || !hospitalId || !user || !firestore) {
        toast({ variant: 'destructive', title: 'No claims to batch.' });
        return;
    }
    setProcessing(true);

    try {
        await runTransaction(firestore, async (transaction) => {
            const hRef = doc(firestore, "hospitals", hospitalId);
            const hSnap = await transaction.get(hRef);
            if (!hSnap.exists()) throw new Error("Hospital document not found.");

            const hData = hSnap.data();
            const nextBatchNum = (hData.nhisBatchCounter || 0) + 1;
            const year = new Date().getFullYear().toString().slice(-2);
            const batchNumber = `${hData.mrnPrefix}/NHIS/${year}/${String(nextBatchNum).padStart(3, '0')}`;

            const batchRef = doc(collection(firestore, "nhis_batches"));
            
            transaction.set(batchRef, {
                batchNumber, hospitalId,
                claimCount: vettedClaims.length,
                totalValue,
                status: 'BATCHED_PENDING_SUBMISSION',
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                createdByName: user.displayName,
            });

            vettedClaims.forEach(claim => {
                const claimRef = doc(firestore, `hospitals/${hospitalId}/receivables`, claim.id);
                transaction.update(claimRef, { 
                    batchId: batchRef.id, 
                    batchNumber,
                    status: 'SUBMITTED_TO_NHIA' 
                });
            });

            transaction.update(hRef, { nhisBatchCounter: increment(1) });
        });
        toast({ title: "NHIS Batch Created Successfully", description: "Claims are now ready for digital and physical submission." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Batch Creation Failed", description: e.message });
    } finally {
      setProcessing(false);
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading;
  if(isLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>

  if(!isAuthorized && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      <div className="flex flex-col md:flex-row justify-between items-end border-b-8 border-slate-900 pb-8 gap-6">
        <div>
           <div className="flex items-center gap-3 text-blue-600 mb-2">
              <Landmark size={32} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">NHIA Compliance Module</span>
           </div>
           <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">NHIS Bulk <span className="text-blue-600">Batching</span></h1>
        </div>
        
        <div className="bg-blue-600 text-white p-6 rounded-[32px] shadow-2xl flex items-center gap-6 border-b-8 border-blue-900">
           <div className="text-right">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Ready for Batching</p>
              <p className="text-2xl font-black italic">₵ {areClaimsLoading ? '...' : totalValue.toLocaleString()}</p>
           </div>
           <div className="bg-white/20 p-3 rounded-2xl"><Layers size={24}/></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Box size={16} className="text-blue-600" /> Vetted Unbatched Claims
           </h3>
           <div className="bg-white rounded-[40px] border-4 border-slate-900 overflow-hidden shadow-xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b-2 border-slate-100">
                   <tr>
                      <th className="p-4 text-[10px] uppercase">Patient & Visit</th>
                      <th className="p-4 text-[10px] uppercase text-right">Claim Value (₵)</th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   {areClaimsLoading && <tr><td colSpan={2} className="p-20 text-center"><Loader2 className="animate-spin" /></td></tr>}
                   {!areClaimsLoading && vettedClaims?.length === 0 ? (
                     <tr><td colSpan={2} className="p-20 text-center text-slate-300 italic">No vetted claims ready for batching.</td></tr>
                   ) : vettedClaims?.map(claim => (
                     <tr key={claim.id} className="hover:bg-blue-50/50 transition-all font-bold">
                        <td className="p-4 uppercase text-xs">
                           {claim.patientName}
                           <p className="text-[8px] text-slate-400">VETTED ON: {new Date(claim.createdAt?.toDate()).toLocaleDateString()}</p>
                        </td>
                        <td className="p-4 text-right">₵ {claim.amount.toFixed(2)}</td>
                     </tr>
                   ))}
                </tbody>
              </table>
           </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Execute Submission</h3>
           <div className="bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl space-y-8">
              <div className="space-y-4">
                 <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-[10px] text-slate-400 uppercase">Total Count</span>
                    <span className="text-xl font-black">{vettedClaims?.length || 0} Claims</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-[10px] text-slate-400 uppercase">Total Value</span>
                    <span className="text-xl font-black text-blue-400">₵ {totalValue.toFixed(2)}</span>
                 </div>
              </div>

              <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-start gap-3">
                 <AlertCircle size={20} className="text-blue-400 shrink-0" />
                 <p className="text-[9px] font-medium text-blue-200 leading-relaxed uppercase">
                    By generating this batch, you are locking these claims for NHIA submission. They will move to 'Accounts Receivable - Pending NHIA Settlement'.
                 </p>
              </div>

              <button 
                onClick={handleCreateBatch}
                disabled={!vettedClaims || vettedClaims.length === 0 || processing}
                className="w-full bg-blue-600 hover:bg-white hover:text-black text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 disabled:bg-slate-800"
              >
                 {processing ? <Loader2 className="animate-spin" /> : <Library size={18}/>}
                 Seal & Generate NHIS Batch
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

    