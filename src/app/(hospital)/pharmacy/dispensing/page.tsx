'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collectionGroup, query, where, orderBy, doc } from 'firebase/firestore';
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
    items?: any[];
};

const parseDate = (createdAt: any): Date => {
  if (!createdAt) return new Date();
  if (typeof createdAt.toDate === 'function') return createdAt.toDate();
  if (createdAt instanceof Date) return createdAt;
  if (typeof createdAt === 'string' || typeof createdAt === 'number') return new Date(createdAt);
  if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
  return new Date();
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

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = claims?.hospitalId || userProfile?.hospitalId;
  const userRole = claims?.role || userProfile?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'PHARMACIST' || userRole === 'ADMIN';

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collectionGroup(firestore, "encounters"),
      where("hospitalId", "==", hospitalId)
    );
  }, [firestore, hospitalId]);
  
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = useMemo(() => {
    const seen = new Set();
    const uniqueOrders = (orders || []).filter((ord: any) => {
      if (!ord.id || seen.has(ord.id)) return false;
      seen.add(ord.id);
      return true;
    });

    const allOrders = uniqueOrders
      .filter((ord: any) => {
        const meds = ord.prescription || ord.items;
        return meds && meds.length > 0 && ord.isDispensed !== true;
      })
      .sort((a, b) => {
        const dateA = parseDate(a.createdAt);
        const dateB = parseDate(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
    const queryStr = searchQuery.toLowerCase().trim();
    if (!queryStr) return allOrders;
    
    return allOrders.filter(order => {
      const meds = order.prescription || order.items || [];
      return (
        order.patientName?.toLowerCase().includes(queryStr) ||
        order.providerName?.toLowerCase().includes(queryStr) ||
        meds.some((drug: any) => drug.name?.toLowerCase().includes(queryStr))
      );
    });
  }, [orders, searchQuery]);
  
  const isLoading = isUserLoading || isClaimsLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Synchronizing Credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md p-8 bg-card rounded-[40px] border shadow-2xl space-y-6">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-2" />
          <h1 className="text-2xl font-black text-card-foreground uppercase tracking-tight">Access Restricted</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase leading-relaxed">
            Your current account credentials do not authorize access to the pharmacy dispensing queue.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="w-full bg-foreground text-background font-black uppercase text-[10px] tracking-widest py-3 rounded-2xl">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter italic">Dispensing <span className="text-primary">Queue</span></h1>
           <p className="text-muted-foreground font-bold text-xs uppercase italic">Real-time feed of pending prescriptions from clinical encounters.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-2xl border font-bold text-xs">
           <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
           <span className="text-muted-foreground uppercase">Pending Orders:</span>
           <span className="text-card-foreground font-black">{filteredOrders.length}</span>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          type="text"
          placeholder="Search by patient, prescriber, or medication..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 py-6 rounded-[20px] bg-card border-2 border-slate-100 font-bold text-xs focus-visible:ring-primary shadow-sm text-black"
        />
      </div>

      {/* QUEUE CARDS */}
      {areOrdersLoading ? (
        <div className="text-center p-20"><Loader2 className="animate-spin text-primary mx-auto h-8 w-8" /></div>
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
                      By Dr. {order.providerName} • {formatDistanceToNow(parseDate(order.createdAt), { addSuffix: true })}
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
                {(order.prescription || order.items || [])?.map((drug: any, i: number) => (
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

    