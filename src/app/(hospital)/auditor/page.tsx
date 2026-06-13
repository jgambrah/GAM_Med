'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp, increment, getDocs } from 'firebase/firestore';
import { 
  ShieldCheck, AlertCircle, FileText, CheckCircle2, 
  XCircle, Printer, Eye, Landmark, ArrowRightLeft, Loader2, ShieldAlert, Calculator
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [auditLoading, setAuditLoading] = useState(false);

  const handleAuditJournal = async (jv: any, decision: 'AUTHORIZED' | 'QUERIED') => {
    if (!firestore || !hospitalId || !user) return;

    setAuditLoading(true);
    const batch = writeBatch(firestore);

    try {
      const jvRef = doc(firestore, `hospitals/${hospitalId}/journal_entries`, jv.id);

      if (decision === 'AUTHORIZED') {
        // 1. Update status
        batch.update(jvRef, {
          status: 'AUTHORIZED',
          auditedBy: user.uid,
          auditedByName: userProfile?.fullName || user.displayName || 'Unknown Auditor',
          auditedAt: serverTimestamp(),
        });

        // 2. Post each line to the Chart of Accounts
        for (const line of jv.lines) {
          const accRef = doc(firestore, `hospitals/${hospitalId}/chart_of_accounts`, line.accountId);
          const amountChange = (line.debit || 0) - (line.credit || 0);
          batch.update(accRef, {
            currentBalance: increment(amountChange)
          });
        }

        await batch.commit();
        toast({ title: "Journal Entry Approved", description: `Journal ${jv.jvNumber} has been successfully posted to the general ledger.` });
      } else {
        batch.update(jvRef, {
          status: 'QUERIED',
          auditComment: "Returned by Auditor for clarification."
        });
        await batch.commit();
        toast({ variant: 'destructive', title: "Journal Entry Rejected", description: `Journal ${jv.jvNumber} was returned with a query.` });
      }
    } catch (e: any) {
      console.error("JV Audit error:", e);
      toast({ variant: 'destructive', title: "Audit Failed", description: e.message });
    } finally {
      setAuditLoading(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <FileText size={16} className="text-primary" /> Pending Journal Vouchers
           </h3>
           <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {jvsLoading ? (
                <div className="p-10 text-center"><Loader2 className="animate-spin text-primary"/></div>
              ) : pendingJVs?.length === 0 ? (
                <div className="p-10 bg-card rounded-[40px] border-2 border-dashed text-center text-muted-foreground italic uppercase text-xs">
                  No journals pending audit.
                </div>
              ) : (
                pendingJVs?.map(jv => (
                  <div key={jv.id} className="p-6 bg-card rounded-[32px] border-2 shadow-sm space-y-4 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">{jv.jvNumber}</span>
                        <p className="text-xs text-muted-foreground font-medium mt-1">Prepared by: {jv.createdByName || 'Unknown'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-muted-foreground uppercase">Total Amount</p>
                        <p className="text-base font-black">GHS {jv.totalAmount?.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted/50 rounded-2xl text-[11px] font-bold text-slate-700 leading-normal italic">
                      Narration: {jv.narration}
                    </div>

                    {/* Lines preview */}
                    <div className="border rounded-2xl overflow-hidden text-[10px]">
                      <div className="bg-slate-900 text-white p-2 font-black uppercase flex justify-between">
                        <span>Account Ledger</span>
                        <div className="flex gap-4">
                          <span className="w-16 text-right font-black text-white">Debit</span>
                          <span className="w-16 text-right font-black text-white">Credit</span>
                        </div>
                      </div>
                      <div className="divide-y divide-border">
                        {jv.lines?.map((line: any, idx: number) => (
                          <div key={idx} className="p-2 flex justify-between font-bold bg-white text-slate-800">
                            <span className="truncate max-w-[150px]">{line.accountName || line.accountId}</span>
                            <div className="flex gap-4 font-mono shrink-0">
                              <span className="w-16 text-right text-primary">{line.debit > 0 ? `₵ ${line.debit.toFixed(2)}` : '-'}</span>
                              <span className="w-16 text-right text-destructive">{line.credit > 0 ? `₵ ${line.credit.toFixed(2)}` : '-'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button 
                        size="sm"
                        variant="outline"
                        disabled={auditLoading}
                        className="flex-1 rounded-xl text-[9px] font-black uppercase tracking-wider h-auto py-2.5 text-destructive border-destructive/20 hover:bg-destructive/10"
                        onClick={() => handleAuditJournal(jv, 'QUERIED')}
                      >
                        Reject
                      </Button>
                      <Button 
                        size="sm"
                        disabled={auditLoading}
                        className="flex-[2] rounded-xl text-[9px] font-black uppercase tracking-wider h-auto py-2.5 bg-primary text-white hover:bg-black"
                        onClick={() => handleAuditJournal(jv, 'AUTHORIZED')}
                      >
                        {auditLoading ? <Loader2 className="animate-spin h-3 w-3" /> : 'Authorize & Post'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>
        <div className="space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <FileText size={16} className="text-destructive" /> Pending Payment Vouchers
           </h3>
           
           <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden divide-y">
              {pvsLoading ? <div className="p-10 text-center"><Loader2 className="animate-spin"/></div> :
              pendingPVs?.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground italic uppercase text-xs">All vouchers are audited.</div>
              ) : pendingPVs?.map(pv => (
                <div key={pv.id} className="p-8 flex flex-col md:flex-row justify-between items-center gap-6 group hover:bg-muted/50 transition-all">
                   <div className="flex items-center gap-6">
                      <div className="bg-destructive/10 p-4 rounded-2xl text-destructive group-hover:bg-destructive group-hover:text-white transition-all">
                        <FileText size={24} />
                      </div>
                      <div>
                         <p className="text-destructive font-black text-sm">{pv.pvNumber}</p>
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
                         <Button asChild size="sm" className="bg-slate-100 text-slate-400 group-hover:bg-destructive group-hover:text-white font-black uppercase text-[9px]">
                            <Link href={`/auditor/review/${pv.id}`}>
                                Pre-Audit
                            </Link>
                         </Button>
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
