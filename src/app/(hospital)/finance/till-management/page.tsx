'use client';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, Timestamp, doc, serverTimestamp } from 'firebase/firestore';
import { Landmark, ArrowUpRight, Lock, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function TillManagement() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'CASHIER'].includes(userProfile?.role || '');

  const startOfToday = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // Find payments processed by the current cashier today
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !user?.uid) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payments`),
      where("processedBy", "==", user.uid),
      where("createdAt", ">=", Timestamp.fromDate(startOfToday))
    );
  }, [firestore, hospitalId, user?.uid, startOfToday]);
  
  const { data: todayPayments, isLoading: arePaymentsLoading } = useCollection(paymentsQuery);

  const tillTotals = useMemo(() => {
    if (!todayPayments) return { cash: 0, momo: 0, total: 0 };
    const totals = todayPayments.reduce((acc, p) => {
      if (p.paymentMode === 'Cash') {
        acc.cash += p.totalAmount;
      } else if (p.paymentMode === 'MoMo') {
        acc.momo += p.totalAmount;
      }
      acc.total += p.totalAmount;
      return acc;
    }, { cash: 0, momo: 0, total: 0 });
    return totals;
  }, [todayPayments]);

  const handleCloseTill = async () => {
    if (!firestore || !user || !userProfile || tillTotals.total <= 0) {
      toast({ variant: 'destructive', title: 'Cannot close an empty till.'});
      return;
    }
    setLoading(true);
    try {
      if (!hospitalId) throw new Error("Hospital ID not found");
      
      const tillsCollection = collection(firestore, `hospitals/${hospitalId}/cash_tills`);
      await addDocumentNonBlocking(tillsCollection, {
        hospitalId: hospitalId,
        cashierId: user.uid,
        cashierName: userProfile.fullName,
        cashSales: tillTotals.cash,
        momoSales: tillTotals.momo,
        totalCollected: tillTotals.total,
        status: 'CLOSED', // Initial status
        closedAt: serverTimestamp(),
        dateString: new Date().toISOString().split('T')[0], // YYYY-MM-DD for querying
      });
      toast({ title: 'Till Closed Successfully', description: 'Your end-of-day report has been sent to the Accountant.' });
      router.push('/finance/billing'); // Redirect after closing
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error closing till", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || arePaymentsLoading;
  
  if (isLoading) {
    return <div className="p-20 text-center"><Loader2 className="animate-spin text-primary" /></div>;
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

  // A Director or Accountant won't have a till, so show a helpful message.
  if (!arePaymentsLoading && (!todayPayments || todayPayments.length === 0) && userProfile?.role !== 'CASHIER') {
    return (
        <div className="p-8 space-y-8 max-w-4xl mx-auto text-black font-bold">
            <h1 className="text-3xl font-black uppercase italic">Till <span className="text-blue-600">Closure</span></h1>
            <div className="p-20 bg-card rounded-[40px] text-center border-2 border-dashed">
                <p className="font-bold text-lg">This Page is for Active Cashiers</p>
                <p className="text-sm text-muted-foreground mt-2">
                    As a {userProfile?.role}, you do not have a personal till to close. <br/>
                    Please use the "Till Verification" console to review cashier submissions.
                </p>
                 <Button className="mt-6" onClick={() => router.back()}>Go Back</Button>
            </div>
        </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto text-black font-bold">
      <h1 className="text-3xl font-black uppercase italic">Till <span className="text-blue-600">Closure</span></h1>
      
      <div className="bg-white p-10 rounded-[50px] border-4 border-slate-900 shadow-2xl space-y-8">
        <div className="grid grid-cols-2 gap-8 border-b pb-8">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Physical Cash in Hand</p>
              <p className="text-4xl font-black italic">₵ {tillTotals.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Electronic MoMo Total</p>
              <p className="text-4xl font-black italic text-blue-600">₵ {tillTotals.momo.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
           </div>
        </div>

        <button 
            onClick={handleCloseTill}
            disabled={loading || tillTotals.total === 0}
            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
           {loading ? <Loader2 className="animate-spin" /> : <Lock size={20} />}
           Close Till & Submit to Accountant
        </button>
      </div>
    </div>
  );
}
