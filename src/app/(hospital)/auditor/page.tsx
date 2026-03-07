
'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp, increment, getDocs } from 'firebase/firestore';
import { 
  ShieldCheck, AlertCircle, FileText, CheckCircle2, 
  XCircle, Printer, Eye, Landmark, ArrowRightLeft, Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function AuditorPortal() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'AUDITOR'].includes(userRole || '');

  // 1. Listen for PVs awaiting Audit
  const pvQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payment_vouchers`),
      where("status", "==", "PENDING_APPROVAL")
    );
  }, [firestore, hospitalId]);
  const { data: pendingPVs, isLoading: pvsLoading } = useCollection(pvQuery);

  // 2. Listen for Journals awaiting Audit
  const jvQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/journal_entries`),
      where("status", "==", "PENDING_APPROVAL")
    );
  }, [firestore, hospitalId]);
  const { data: pendingJVs, isLoading: jvsLoading } = useCollection(jvQuery);

  const authorizePV = async (pv: any) => {
    if (!user || !hospitalId || !firestore) return;

    const confirmAudit = confirm(`Authorize Payment of GHS ${pv.netAmount.toFixed(2)} to ${pv.payee}?`);
    if (!confirmAudit) return;

    const batch = writeBatch(firestore);
    try {
      // 1. Update PV Status to AUTHORIZED (or whatever the next step is)
      const pvRef = doc(firestore, `hospitals/${hospitalId}/payment_vouchers`, pv.id);
      batch.update(pvRef, { 
        status: 'AUTHORIZED', // Or 'PENDING_DIRECTOR_APPROVAL' if there's another step
        auditedBy: user.uid, 
        auditedByName: user.displayName,
        auditedAt: serverTimestamp() 
      });
      
      // Since the Accountant no longer does this, the Auditor does.
      // 2. EXECUTE LEDGER POSTING
      const creditAccRef = doc(firestore, `hospitals/${hospitalId}/chart_of_accounts`, pv.creditAccountId);
      batch.update(creditAccRef, { currentBalance: increment(-pv.netAmount) });

      const debitAccRef = doc(firestore, `hospitals/${hospitalId}/chart_of_accounts`, pv.debitAccountId);
      batch.update(debitAccRef, { currentBalance: increment(pv.grossAmount) });

      // Handle WHT dynamically
      if (pv.whtAmount > 0) {
        const whtQuery = query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), where("accountCode", "==", "2100"));
        const whtSnap = await getDocs(whtQuery);
        if (whtSnap.empty) {
            throw new Error("Withholding Tax Payable account (2100) not found.");
        }
        const whtAccRef = whtSnap.docs[0].ref;
        batch.update(whtAccRef, { currentBalance: increment(pv.whtAmount) });
      }

      await batch.commit();
      toast({ title: `PV ${pv.pvNumber} Authorized & Posted to Ledger` });
    } catch (e: any) { 
        toast({ variant: 'destructive', title: 'Authorization Failed', description: e.message });
    }
  };
  
  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>;

  if (!isAuthorized) {
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

  const dataIsLoading = pvsLoading || jvsLoading;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b-8 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-black">Internal <span className="text-primary">Audit</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Financial Governance & Pre-Audit Verification.</p>
        </div>
        <div className="bg-[#0f172a] text-white p-4 rounded-3xl flex items-center gap-4 shadow-xl">
           <ShieldCheck className="text-primary" size={24} />
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Review</p>
              <p className="text-xl font-black italic">{dataIsLoading ? '...' : (pendingPVs?.length || 0) + (pendingJVs?.length || 0)} Documents</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        <div className="space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <Landmark size={16} className="text-primary" /> Vouchers Awaiting Authorization
           </h3>
           
           <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden divide-y">
              {dataIsLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin"/></div> :
              pendingPVs?.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground italic uppercase text-xs">No pending payment vouchers.</div>
              ) : pendingPVs?.map(pv => (
                <div key={pv.id} className="p-8 flex flex-col md:flex-row justify-between items-center gap-6 group hover:bg-muted/50 transition-all">
                   <div className="flex items-center gap-6">
                      <div className="bg-primary/10 p-4 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        <FileText size={24} />
                      </div>
                      <div>
                         <p className="text-primary font-black text-sm">{pv.pvNumber}</p>
                         <p className="text-xl font-black uppercase text-card-foreground leading-tight">{pv.payee}</p>
                         <p className="text-[10px] text-muted-foreground mt-1 uppercase italic">Narration: {pv.narration.substring(0, 60)}...</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-8 w-full md:w-auto justify-between border-t md:border-0 pt-4 md:pt-0">
                      <div className="text-right">
                         <p className="text-[9px] font-black text-muted-foreground uppercase">Net Amount</p>
                         <p className="text-2xl font-black text-card-foreground italic">₵ {pv.netAmount.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                         <Button onClick={() => authorizePV(pv)} variant="default" className="bg-green-600 hover:bg-green-700 text-white shadow-lg">
                            Approve
                         </Button>
                         <Button variant="ghost" className="text-destructive"><XCircle size={20} /></Button>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
