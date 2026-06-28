'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, orderBy } from 'firebase/firestore';
import { ClipboardList, CheckCircle, Clock, User, ShieldAlert, Loader2, ChevronRight, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

type Order = {
    id: string;
    hospitalId: string;
    patientId: string;
    patientName: string;
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
      where("isDispensed", "==", false),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);
  
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = useMemo(() => {
    const allOrders = (orders || []).filter(order => order.prescription && order.prescription.length > 0);
    const queryStr = searchQuery.toLowerCase().trim();
    if (!queryStr) return allOrders;
    
    return allOrders.filter(order => 
      order.patientName?.toLowerCase().includes(queryStr) ||
      order.providerName?.toLowerCase().includes(queryStr) ||
      order.prescription?.some((drug: any) => drug.name?.toLowerCase().includes(queryStr))
    );
  }, [orders, searchQuery]);
  
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
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pending Orders: {areOrdersLoading ? '...' : filteredOrders.length}</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="max-w-md relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
        <Input 
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by patient, prescriber, or medication..."
          className="pl-11 bg-slate-50 border rounded-2xl font-bold h-11 text-black placeholder:text-slate-400"
        />
      </div>
      
      {areOrdersLoading ? (
         <div className="text-center p-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            Fetching pending prescriptions...
         </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center p-20 bg-card border-2 border-dashed rounded-[32px] text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-primary/50" />
          The dispensing queue is clear. No pending prescriptions.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4 hover:border-primary/20 transition-all flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl"><User size={20}/></div>
                  <div>
                    <p className="font-black text-card-foreground uppercase text-sm">Patient Prescription</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                      By Dr. {order.providerName} • {formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Link href={`/pharmacy/dispensing/${order.id}?patientId=${order.patientId}&hospitalId=${order.hospitalId}`}>
                   <Button size="sm" className="bg-primary hover:bg-foreground text-primary-foreground font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5 shadow-md transition-all rounded-xl py-4">
                      Dispense Now <ChevronRight size={12} />
                   </Button>
                </Link>
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

    