'use client';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { FlaskConical, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

type LabOrder = {
  id: string;
  testName: string;
  patientName: string;
  providerName: string;
  orderedAt: { toDate: () => Date };
};

export default function LabQueuePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
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
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'LAB_TECH' || userRole === 'ADMIN';

  const pendingLabsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/lab_orders`),
      where("status", "==", "PENDING"),
      orderBy("orderedAt", "desc")
    );
  }, [firestore, hospitalId]);
  
  const { data: individualOrders, isLoading: areOrdersLoading } = useCollection<LabOrder>(pendingLabsQuery);

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
          <p className="text-muted-foreground">You are not authorized to view the lab queue.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Diagnostic <span className="text-purple-600">Queue</span></h1>
           <p className="text-muted-foreground font-medium">Real-time feed of pending lab test requests.</p>
        </div>
        <div className="bg-card px-4 py-2 rounded-lg border">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pending Tests: {areOrdersLoading ? '...' : individualOrders?.length ?? 0}</span>
        </div>
      </div>
      
      {areOrdersLoading ? (
         <div className="text-center p-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            Fetching pending lab requests...
         </div>
      ) : individualOrders?.length === 0 ? (
        <div className="text-center p-20 bg-card border-2 border-dashed rounded-2xl text-muted-foreground">
          <FlaskConical className="h-12 w-12 mx-auto mb-2" />
          The laboratory queue is clear. No pending tests.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {individualOrders?.map((order) => (
            <div key={order.id} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4 hover:border-purple-200 transition-all">
               <div className="flex justify-between items-start">
                 <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
                    <FlaskConical size={24} />
                 </div>
                 <span className="text-[10px] font-black bg-amber-100/60 text-amber-800 px-3 py-1 rounded-full border border-amber-200">AWAITING SAMPLE</span>
              </div>

              <div>
                <p className="font-black text-card-foreground uppercase tracking-tight">{order.testName}</p>
                <p className="text-xs font-bold text-muted-foreground">Patient: {order.patientName}</p>
                <p className="text-[10px] font-bold text-muted-foreground">
                    Ordered By Dr. {order.providerName} • {formatDistanceToNow(order.orderedAt.toDate(), { addSuffix: true })}
                </p>
              </div>

              <Button 
                className="w-full bg-foreground hover:bg-purple-600 text-background font-black uppercase text-[10px] tracking-widest transition-all"
                onClick={() => router.push(`/lab/results/${order.id}`)}
              >
                Enter Results
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
