'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';
import { ClipboardCheck, ShieldCheck, FileText, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function JobCompletionCertification() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const [loading, setLoading] = useState(false);
  
  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PHARMACIST'].includes(userProfile?.role || '');

  const pendingServicesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "purchase_orders"),
      where("poType", "in", ["SERVICE", "WORKS"]),
      where("status", "==", "PENDING_DELIVERY")
    );
  }, [firestore, hospitalId]);
  const { data: pendingServices, isLoading: areServicesLoading } = useCollection(pendingServicesQuery);

  const certifyService = async (po: any) => {
    const confirmCert = confirm(`Certify that the service '${po.items[0].name}' has been fully rendered to ${hospitalId}?`);
    if (!confirmCert) return;

    if (!firestore || !user) return toast({ variant: "destructive", title: "System not ready." });
    setLoading(true);

    const jccNumber = `JCC-${po.poNumber.split('/')[2]}-${po.poNumber.split('/')[3]}`;
    const totalValue = po.items.reduce((sum: number, item: any) => sum + (item.price * item.quantityOrdered), 0);

    try {
        await runTransaction(firestore, async (transaction) => {
            const poRef = doc(firestore, `hospitals/${hospitalId}/purchase_orders`, po.id);
            const jccRef = doc(collection(firestore, `hospitals/${hospitalId}/jcc_logs`));
            const apRef = doc(collection(firestore, `hospitals/${hospitalId}/accounts_payable`));

            // 1. Mark PO as COMPLETED
            transaction.update(poRef, { 
                status: 'COMPLETED', 
                certifiedAt: serverTimestamp(),
                certifiedBy: user.uid 
            });

            // 2. Create the Job Completion Certificate Log
            transaction.set(jccRef, {
                jccNumber,
                poNumber: po.poNumber,
                supplierName: po.supplierName,
                totalValue: totalValue,
                hospitalId: hospitalId,
                hODName: user?.displayName,
                certifiedBy: user?.uid,
                createdAt: serverTimestamp()
            });

            // 3. FINANCIAL HANDSHAKE: Move to Accounts Payable
            transaction.set(apRef, {
                supplierName: po.supplierName,
                supplierId: po.supplierId,
                amountOwed: totalValue,
                grnNumber: jccNumber,
                status: 'UNPAID',
                isService: true,
                hospitalId: hospitalId,
                createdAt: serverTimestamp()
            });
        });

      toast.success("Job Completion Certified. Liability moved to Accounts Payable.");
    } catch (e: any) { 
        toast.error(e.message); 
    }
    setLoading(false);
  };
  
  const pageIsLoading = isUserLoading || isProfileLoading;
  if(pageIsLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;

  if(!isAuthorized) {
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <h1 className="text-4xl font-black uppercase tracking-tighter italic">Job <span className="text-blue-600">Completion</span></h1>
      <p className="text-slate-500 font-bold text-xs uppercase italic">Certifying clinical and infrastructure services rendered.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {areServicesLoading && <div className="p-10"><Loader2 className="animate-spin"/></div>}
        {pendingServices?.map(po => {
            const totalValue = po.items.reduce((sum: number, item: any) => sum + (item.price * item.quantityOrdered), 0);
            return (
                <div key={po.id} className="bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-2xl space-y-6">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase italic">{po.poType}</span>
                        <p className="text-xs font-black text-blue-600">{po.poNumber}</p>
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase text-black leading-tight">{po.supplierName}</h3>
                        <p className="text-sm font-bold text-slate-500 mt-2 italic">{po.items[0].name}</p>
                    </div>
                    <div className="pt-6 border-t flex justify-between items-center">
                        <p className="text-xl font-black">₵ {totalValue.toLocaleString()}</p>
                        <button 
                        onClick={() => certifyService(po)}
                        className="bg-black text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2"
                        >
                        <CheckCircle2 size={16}/> Certify Completion
                        </button>
                    </div>
                </div>
            )
        })}
        {!areServicesLoading && pendingServices?.length === 0 && (
            <div className="md:col-span-2 text-center p-20 bg-card rounded-2xl border-2 border-dashed">
                <p className="font-bold text-muted-foreground">No pending services to certify.</p>
            </div>
        )}
      </div>
    </div>
  );
}
