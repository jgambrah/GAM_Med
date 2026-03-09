'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, writeBatch, serverTimestamp, collection, increment } from 'firebase/firestore';
import { 
  AlertCircle, CheckCircle2, XCircle, 
  Landmark, User, Loader2, ArrowLeftRight, ArrowLeft 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClaimDetailVetting() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  const hospitalId = userProfile?.hospitalId;

  const itemRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !id) return null;
    return doc(firestore, `hospitals/${hospitalId}/billing_items`, id as string);
  }, [firestore, hospitalId, id]);

  const { data: item, isLoading: isItemLoading } = useDoc(itemRef);

  const handleAuthorizeClaim = async () => {
    if (!item || !user || !firestore || !hospitalId) return;
    setLoading(true);

    try {
      const batch = writeBatch(firestore);

      // 1. Mark the original billing item as 'PAID' (by insurance)
      batch.update(itemRef!, { status: 'PAID', billingType: 'INSURANCE_CLAIM_VETTED' });

      // 2. Create the Receivable Entry for the Insurance Company
      const arRef = doc(collection(firestore, `hospitals/${hospitalId}/receivables`));
      batch.set(arRef, {
        patientName: item.patientName,
        patientId: item.patientId,
        payerId: item.payerId,
        payerName: item.payerName,
        amount: item.total,
        status: 'UNPAID',
        hospitalId: hospitalId,
        createdAt: serverTimestamp(),
        vettedBy: user.uid,
        vettedByName: user.displayName,
      });
      
      // 3. Increment the payer's balance
      const payerRef = doc(firestore, `hospitals/${hospitalId}/payers`, item.payerId);
      batch.update(payerRef, { currentBalance: increment(item.total) });

      await batch.commit();

      toast({ title: "Claim Authorized", description: `A receivable of GHS ${item.total.toFixed(2)} has been created for ${item.payerName}.` });
      router.push('/finance/insurance/vetting');
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Authorization Failed', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReRouteToCash = async () => {
    if (!itemRef) return;
    setLoading(true);
    try {
      const batch = writeBatch(firestore);
      batch.update(itemRef, {
        billingType: 'CASH_PAYMENT',
        description: `${item.description} (Co-payment / Not Covered)`,
        payerId: null,
        payerName: 'Self-Pay'
      });
      await batch.commit();
      toast({ variant: 'default', title: 'Item Re-routed to Patient Bill' });
      router.push('/finance/insurance/vetting');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Re-routing Failed', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (isItemLoading) {
    return <div className="p-20 text-center font-black animate-pulse">Vetting Clinical Data...</div>;
  }

  if (!item) {
    return <div className="p-20 text-center font-black text-destructive">Claim item not found.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black font-bold">
       <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold text-xs uppercase transition-all">
          <ArrowLeft size={16} /> Back to Vetting Queue
        </Button>

      <div className="bg-white p-10 rounded-[50px] border-4 border-slate-900 shadow-2xl space-y-8">
        <div className="flex justify-between items-start border-b pb-6">
           <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Claim <span className="text-blue-600">Verification</span></h2>
              <p className="text-xs text-slate-400 uppercase mt-1">Payer Entity: {item.payerName}</p>
           </div>
           <div className="bg-slate-100 p-4 rounded-3xl"><Landmark size={32} /></div>
        </div>

        <div className="grid grid-cols-2 gap-8">
           <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase">Item Description</p>
              <p className="text-xl font-black uppercase">{item.description}</p>
           </div>
           <div className="text-right space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase">Calculated Value</p>
              <p className="text-3xl font-black italic">₵ {item.total?.toFixed(2)}</p>
           </div>
        </div>

        <div className="p-6 bg-amber-50 rounded-3xl border-2 border-dashed border-amber-200 flex items-start gap-4">
           <AlertCircle className="text-amber-600 shrink-0" size={24} />
           <p className="text-xs font-medium text-amber-800 leading-relaxed uppercase">
              Vetting Protocol: Please confirm that this service is covered under the <strong>{item.payerName}</strong> medicine/service list. If not covered, use the "Re-route" tool below to charge the patient directly.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Button 
             onClick={handleReRouteToCash}
             disabled={loading}
             className="w-full bg-white border-4 border-slate-900 text-black py-5 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all"
           >
              <ArrowLeftRight size={18} /> Re-route to Cashier
           </Button>
           <Button 
             onClick={handleAuthorizeClaim}
             disabled={loading}
             className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 flex items-center justify-center gap-3 hover:bg-black transition-all"
           >
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
              Authorize as Insurance Claim
           </Button>
        </div>
      </div>
    </div>
  );
}