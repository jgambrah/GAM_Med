'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp, increment, getDocs } from 'firebase/firestore';
import { 
  Landmark, ShieldCheck, CheckCircle2, 
  Banknote, Smartphone,
  Loader2, ShieldAlert, History, AlertTriangle, XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function DiscrepancyDialog({ open, onOpenChange, till, onConfirm, processing }: any) {
    const [physicalCount, setPhysicalCount] = useState(0);
    const [reason, setReason] = useState('');

    if (!till) return null;
    const shortage = till.totalCollected - physicalCount;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive" /> Report Till Discrepancy
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        For Till Ref: {till.id.slice(-6)}. Expected Total: GHC {till.totalCollected.toFixed(2)}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <label className="text-xs font-bold">Physically Counted Amount (GHS)</label>
                        <Input type="number" value={physicalCount || ''} onChange={e => setPhysicalCount(Number(e.target.value))} />
                    </div>
                     {shortage > 0 && (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-lg font-bold">
                            Shortage Detected: GHC {shortage.toFixed(2)}
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-bold">Reason for Discrepancy</label>
                        <Textarea placeholder="e.g. Mismatched entries, counterfeit note detected, etc." value={reason} onChange={e => setReason(e.target.value)} />
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={processing || shortage <= 0 || !reason}
                        onClick={() => onConfirm(till, physicalCount, reason)}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {processing ? <Loader2 className="animate-spin" /> : 'Log Shortage & Alert'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function TillVerificationPortal() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [discrepancyTill, setDiscrepancyTill] = useState<any | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userProfile?.role || '');

  // 1. Listen for tills awaiting verification (CLOSED or QUERIED)
  const closedTillsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/cash_tills`),
      where("status", "in", ["CLOSED", "QUERIED"])
    );
  }, [firestore, hospitalId]);
  const { data: closedTills, isLoading: areTillsLoading } = useCollection(closedTillsQuery);
  
  // 2. Fetch available Bank accounts from COA
  const bankAccountsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), 
      where("category", "==", "ASSETS")
    );
  }, [firestore, hospitalId]);
  const { data: bankAccounts, isLoading: areBanksLoading } = useCollection(bankAccountsQuery);
  
  const verifyAndBank = async (till: any, targetBankId: string) => {
    if (!targetBankId) return toast({ variant: "destructive", title: "Please select a target Bank Ledger." });
    
    setProcessingId(till.id);
    const batch = writeBatch(firestore);

    try {
      if (!user || !userProfile || !firestore || !hospitalId) throw new Error("Authentication error.");
      
      batch.update(doc(firestore, `hospitals/${hospitalId}/cash_tills`, till.id), { 
        status: 'VERIFIED', 
        verifiedBy: user.uid, 
        verifiedByName: userProfile.fullName,
        verifiedAt: serverTimestamp(),
        targetBankId 
      });

      const bankRef = doc(firestore, `hospitals/${hospitalId}/chart_of_accounts`, targetBankId);
      batch.update(bankRef, {
        currentBalance: increment(till.totalCollected)
      });
      
      const auditRef = doc(collection(firestore, "global_audit_logs"));
      batch.set(auditRef, {
        type: 'FINANCIAL',
        action: 'TILL_VERIFIED_AND_BANKED',
        hospitalId: hospitalId,
        actorId: user.uid,
        actorName: userProfile.fullName,
        details: `Verified Till #${till.id.slice(-5)}: GHC ${till.totalCollected.toFixed(2)} moved to Bank Ledger.`,
        timestamp: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Till Verified. General Ledger Updated." });
    } catch (e: any) {
      toast({ variant: 'destructive', title: e.message });
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleReportDiscrepancy = async (till: any, physicalCount: number, reason: string) => {
    const shortage = till.totalCollected - physicalCount;
    if (shortage <= 0) {
      toast({ variant: 'destructive', title: "Invalid Input", description: "Physical count must be less than the expected digital total to report a shortage." });
      return;
    }
    if (!reason.trim()) {
        toast({ variant: 'destructive', title: "Reason Required", description: "You must provide a reason for the discrepancy." });
        return;
    }
    if (!firestore || !user || !userProfile || !hospitalId) {
      toast({ variant: 'destructive', title: 'System not ready.' });
      return;
    }

    setProcessingId(till.id);
    const batch = writeBatch(firestore);

    try {
        const tillRef = doc(firestore, `hospitals/${hospitalId}/cash_tills`, till.id);
        batch.update(tillRef, {
            status: 'QUERIED',
            shortageAmount: shortage,
            physicalCount,
            accountantComment: reason,
            verifiedBy: user.uid,
            verifiedByName: userProfile.fullName,
            verifiedAt: serverTimestamp()
        });
        
        const lossAccountQuery = query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), where("accountCode", "==", "5008"));
        const lossAccountSnap = await getDocs(lossAccountQuery);
        
        if (lossAccountSnap.empty) {
            throw new Error("Critical Error: 'Loss on Cash Shortage' account (Code: 5008) not found. Please create it in the Chart of Accounts.");
        }
        
        const lossAccRef = lossAccountSnap.docs[0].ref;
        batch.update(lossAccRef, { currentBalance: increment(shortage) });

        const auditRef = doc(collection(firestore, "global_audit_logs"));
        batch.set(auditRef, {
            type: 'SECURITY',
            action: 'TILL_SHORTAGE_DETECTED',
            hospitalId: hospitalId,
            actorId: user.uid,
            actorName: userProfile.fullName,
            details: `Cashier ${till.cashierName} submitted a till with ₵${shortage.toFixed(2)} shortage. Reason: ${reason}`,
            timestamp: serverTimestamp()
        });

        await batch.commit();
        toast({
            variant: "destructive",
            title: `Shortage of ₵${shortage.toFixed(2)} Recorded`,
            description: "The ledger has been adjusted for the loss. A disciplinary query may be required."
        });
        setDiscrepancyTill(null);
    } catch (e: any) {
        toast({ variant: 'destructive', title: e.message });
    } finally {
        setProcessingId(null);
    }
  };

  
  const isLoading = isUserLoading || isProfileLoading;
  
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>
  }

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

  return (
    <>
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      <div className="flex justify-between items-end border-b-8 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Till <span className="text-blue-600">Verification</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Revenue Assurance: Matching Physical Cash to Digital Records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {areTillsLoading && <div className="p-20 text-center"><Loader2 className="animate-spin" /></div>}
        {!areTillsLoading && closedTills?.length === 0 ? (
          <div className="p-20 bg-slate-50 rounded-[40px] border-2 border-dashed text-center text-slate-300 italic uppercase font-black">All cashier tills are reconciled.</div>
        ) : closedTills?.map(till => (
          <div key={till.id} className={`p-8 rounded-[40px] border-4 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] flex flex-col lg:flex-row justify-between gap-8 ${till.status === 'QUERIED' ? 'bg-red-50 border-red-900 shadow-red-500/10' : 'bg-white border-slate-900'}`}>
             
             <div className="flex items-center gap-6">
                <div className={`${till.status === 'QUERIED' ? 'bg-red-900' : 'bg-slate-900'} text-white p-5 rounded-3xl`}>
                   <ShieldCheck size={32} className={`${till.status === 'QUERIED' ? 'text-red-400' : 'text-blue-400'}`} />
                </div>
                <div>
                   <p className={`text-[10px] font-black ${till.status === 'QUERIED' ? 'text-red-600' : 'text-blue-600'} uppercase tracking-widest`}>Till Ref: {till.id.slice(-6).toUpperCase()}</p>
                   <h3 className="text-2xl font-black uppercase text-black">Cashier: {till.cashierName}</h3>
                   <p className="text-xs text-slate-400 uppercase italic">Closed on: {new Date(till.closedAt?.toDate()).toLocaleString()}</p>
                </div>
             </div>

             <div className="flex gap-8 border-x-0 lg:border-x-2 border-slate-100 px-0 lg:px-8">
                <div className="text-center">
                   <div className="flex items-center gap-2 text-green-600 mb-1">
                      <Banknote size={16}/> <span className="text-[9px] uppercase font-black">Cash-in-Hand</span>
                   </div>
                   <p className="text-xl font-black italic">₵ {till.cashSales?.toFixed(2)}</p>
                </div>
                <div className="text-center">
                   <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Smartphone size={16}/> <span className="text-[9px] uppercase font-black">MoMo Sales</span>
                   </div>
                   <p className="text-xl font-black italic">₵ {till.momoSales?.toFixed(2)}</p>
                </div>
             </div>

             {till.status === 'QUERIED' ? (
                <div className="bg-red-100 p-4 rounded-xl text-red-800">
                    <p className="text-xs font-bold uppercase">Shortage: ₵ {till.shortageAmount?.toFixed(2)}</p>
                    <p className="text-xs italic">"{till.accountantComment}"</p>
                </div>
             ) : (
             <div className="flex flex-col gap-3 min-w-[300px]">
                <label className="text-[9px] font-black text-slate-400 uppercase">Deposit into Bank Ledger</label>
                <div className="flex gap-2">
                    <select 
                        id={`bank-select-${till.id}`}
                        className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-bold uppercase italic outline-none focus:ring-2 focus:ring-blue-600"
                    >
                        <option value="">Select Target Account...</option>
                        {areBanksLoading ? <option>Loading banks...</option> : bankAccounts?.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (₵{acc.currentBalance.toLocaleString()})</option>)}
                    </select>
                     <button 
                        onClick={() => setDiscrepancyTill(till)}
                        className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                        title="Flag Discrepancy"
                    >
                        <AlertTriangle size={20} />
                    </button>
                </div>
                <Button 
                  disabled={processingId === till.id}
                  onClick={() => {
                    const bankId = (document.getElementById(`bank-select-${till.id}`) as HTMLSelectElement).value;
                    verifyAndBank(till, bankId);
                  }}
                  className="bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-black transition-all"
                >
                   {processingId === till.id ? <Loader2 className="animate-spin"/> : <Landmark size={14} />}
                   Verify & Move to Bank
                </Button>
             </div>
             )}
          </div>
        ))}
      </div>
    </div>

    <DiscrepancyDialog 
        open={!!discrepancyTill}
        onOpenChange={() => setDiscrepancyTill(null)}
        till={discrepancyTill}
        onConfirm={handleReportDiscrepancy}
        processing={!!processingId}
    />
    </>
  );
}
