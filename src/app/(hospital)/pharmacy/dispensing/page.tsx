'use client';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collectionGroup, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { ClipboardList, CheckCircle, Clock, User, ShieldAlert, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

type Order = {
    id: string;
    hospitalId: string;
    patientId: string;
    providerName: string;
    createdAt: { toDate: () => Date };
    prescription: any[];
};

export default function DispensingQueue() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);

  const hospitalId = claims?.hospitalId;
  const userRole = claims?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'PHARMACIST' || userRole === 'ADMIN';

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collectionGroup(firestore, "encounters"),
      where("hospitalId", "==", hospitalId),
      where("isDispensed", "==", false)
    );
  }, [firestore, hospitalId]);
  
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const dispenseOrder = (order: Order) => {
    if (!firestore || !user) return;
    try {
      const encounterRef = doc(firestore, `hospitals/${order.hospitalId}/patients/${order.patientId}/encounters/${order.id}`);
      
      updateDocumentNonBlocking(encounterRef, {
        isDispensed: true,
        dispensedAt: serverTimestamp(),
        pharmacistId: user.uid,
        pharmacistName: user.displayName,
      });

      // Here you would also loop through order.prescription and decrement stock
      // This requires a transaction for safety, which is a more advanced topic.
      // For now, we just mark as dispensed.

      toast({
        title: "Order Dispensed",
        description: "Patient's prescription has been marked as completed."
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Dispensing Failed",
        description: e.message
      });
    }
  };
  
  const isLoading = isUserLoading || isClaimsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to access the dispensing queue.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Dispensing <span className="text-primary">Queue</span></h1>
           <p className="text-muted-foreground font-medium">Real-time feed of pending prescriptions from clinical encounters.</p>
        </div>
        <div className="bg-card px-4 py-2 rounded-lg border">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pending Orders: {areOrdersLoading ? '...' : orders?.length ?? 0}</span>
        </div>
      </div>
      
      {areOrdersLoading ? (
         <div className="text-center p-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            Fetching pending prescriptions...
         </div>
      ) : orders && orders.length === 0 ? (
        <div className="text-center p-20 bg-card border-2 border-dashed rounded-2xl text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-2" />
          The dispensing queue is clear. No pending prescriptions.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {orders?.map(order => (
            <div key={order.id} className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl"><User size={20}/></div>
                  <div>
                    <p className="font-bold text-card-foreground">Patient Prescription</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      By Dr. {order.providerName} • {formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button onClick={() => dispenseOrder(order)} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle size={14}/> Complete
                </Button>
              </div>

              <div className="bg-muted/50 p-4 rounded-xl space-y-2">
                {order.prescription?.map((drug: any, i: number) => (
                  <div key={i} className="flex justify-between items-center border-b last:border-b-0 pb-2 mb-2 last:pb-0 last:mb-0">
                    <div>
                      <p className="text-sm font-bold text-card-foreground uppercase">{drug.name} ({drug.strength})</p>
                      <p className="text-xs text-muted-foreground font-mono">{drug.dosage} • {drug.frequency} • {drug.duration}</p>
                    </div>
                    <p className="text-xs font-mono text-primary font-bold">{drug.instructions}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

    