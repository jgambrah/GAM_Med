
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Landmark, ArrowRight, FileText, Loader2, ShieldAlert, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

type Payable = {
    id: string;
    supplierName: string;
    grnNumber: string;
    amountOwed: number;
    createdAt: { toDate: () => Date };
    isService?: boolean;
}

export default function AccountsPayablePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole);

  const payablesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/accounts_payable`),
      where("status", "==", "UNPAID"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);

  const { data: payables, isLoading: arePayablesLoading } = useCollection<Payable>(payablesQuery);
  const [activeTab, setActiveTab] = useState<'outstanding' | 'aging'>('outstanding');
  
  const agingBuckets = useMemo(() => {
    const buckets = {
      current: { label: '0-30 Days', total: 0, items: [] as Payable[] },
      thirtyToSixty: { label: '31-60 Days', total: 0, items: [] as Payable[] },
      sixtyToNinety: { label: '61-90 Days', total: 0, items: [] as Payable[] },
      overNinety: { label: '90+ Days', total: 0, items: [] as Payable[] },
    };

    if (!payables) return buckets;

    const now = new Date();

    payables.forEach(p => {
      if (!p.createdAt) {
        buckets.current.total += p.amountOwed;
        buckets.current.items.push(p);
        return;
      }
      const createdDate = p.createdAt.toDate();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        buckets.current.total += p.amountOwed;
        buckets.current.items.push(p);
      } else if (diffDays <= 60) {
        buckets.thirtyToSixty.total += p.amountOwed;
        buckets.thirtyToSixty.items.push(p);
      } else if (diffDays <= 90) {
        buckets.sixtyToNinety.total += p.amountOwed;
        buckets.sixtyToNinety.items.push(p);
      } else {
        buckets.overNinety.total += p.amountOwed;
        buckets.overNinety.items.push(p);
      }
    });

    return buckets;
  }, [payables]);

  const isLoading = isUserLoading || isProfileLoading;
  
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
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-6 gap-4">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Accounts <span className="text-destructive">Payable</span></h1>
           <p className="text-muted-foreground font-bold text-xs uppercase italic mt-0.5">Manage and settle outstanding liabilities to suppliers.</p>
        </div>
        
        {/* Tab Selection */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex border-2 gap-1 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('outstanding')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all ${activeTab === 'outstanding' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Outstanding Ledger
          </button>
          <button 
            onClick={() => setActiveTab('aging')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all ${activeTab === 'aging' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-600'}`}
          >
            AP Aging Analysis
          </button>
        </div>
      </div>

      {activeTab === 'outstanding' ? (
        <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Supplier & Ref</TableHead>
                <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Date Recorded</TableHead>
                <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Amount Owed (GHS)</TableHead>
                <TableHead className="p-6 text-[10px] font-black uppercase tracking-widest text-right text-slate-500">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arePayablesLoading && <TableRow><TableCell colSpan={4} className="text-center p-12"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>}
              {!arePayablesLoading && payables?.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center p-20 text-muted-foreground italic">
                      <Wallet size={32} className="mx-auto mb-2 text-slate-300" />
                      No outstanding payables. All supplier accounts are settled.
                  </TableCell></TableRow>
              )}
              {payables?.map(p => (
                <TableRow key={p.id} className="font-bold text-slate-800">
                  <TableCell className="p-6">
                     <p className="font-black uppercase text-slate-900">{p.supplierName}</p>
                     <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${p.isService ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                           {p.isService ? 'Service (JCC)' : 'Goods (GRN)'}
                        </span>
                        <p className="text-[8px] text-slate-400 font-black uppercase font-mono">REF: {p.grnNumber}</p>
                     </div>
                  </TableCell>
                  <TableCell className="p-6 text-sm text-slate-500 font-bold">{p.createdAt ? format(p.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="p-6 text-destructive font-black text-lg">GHS {p.amountOwed.toFixed(2)}</TableCell>
                  <TableCell className="p-6 text-right">
                     <Button asChild className="rounded-xl font-black uppercase text-[10px] tracking-wider py-2.5 h-auto">
                       <Link href={`/accountant/payments?payee=${encodeURIComponent(p.supplierName)}&amount=${p.amountOwed}&apId=${p.id}&grnNumber=${p.grnNumber}`}>
                          <FileText size={14} className="mr-1.5" /> Generate PV
                       </Link>
                     </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        // AP AGING TAB
        <div className="space-y-8">
          {/* AP Aging Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <AgingCard title="0-30 Days" amount={agingBuckets.current.total} count={agingBuckets.current.items.length} color="bg-green-50/50 border-green-200/60 text-green-700" />
            <AgingCard title="31-60 Days" amount={agingBuckets.thirtyToSixty.total} count={agingBuckets.thirtyToSixty.items.length} color="bg-blue-50/50 border-blue-200/60 text-blue-700" />
            <AgingCard title="61-90 Days" amount={agingBuckets.sixtyToNinety.total} count={agingBuckets.sixtyToNinety.items.length} color="bg-yellow-50/50 border-yellow-200/60 text-yellow-700" />
            <AgingCard title="90+ Days" amount={agingBuckets.overNinety.total} count={agingBuckets.overNinety.items.length} color="bg-red-50/50 border-red-200/60 text-red-700" />
          </div>

          {/* Aging Details List */}
          <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden p-8 space-y-6">
             <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">AP Aging Breakdown</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Supplier invoices structured by outstanding aging bracket</p>
             </div>

             <div className="space-y-8">
                {([
                  { key: 'current', label: '0 - 30 Days (Current)', color: 'text-green-600 border-green-200 bg-green-50/20' },
                  { key: 'thirtyToSixty', label: '31 - 60 Days (Outstanding)', color: 'text-blue-600 border-blue-200 bg-blue-50/20' },
                  { key: 'sixtyToNinety', label: '61 - 90 Days (Overdue)', color: 'text-yellow-600 border-yellow-200 bg-yellow-50/20' },
                  { key: 'overNinety', label: '90+ Days (Critical)', color: 'text-red-600 border-red-200 bg-red-50/20' },
                ] as const).map(bucket => {
                  const bData = agingBuckets[bucket.key];
                  if (bData.items.length === 0) return null;

                  return (
                    <div key={bucket.key} className="space-y-4">
                      <div className={`p-4 rounded-2xl border-2 flex justify-between items-center ${bucket.color}`}>
                         <span className="text-xs font-black uppercase tracking-wider">{bucket.label}</span>
                         <span className="text-sm font-black font-mono">Total: GHS {bData.total.toFixed(2)}</span>
                      </div>

                      <div className="bg-white rounded-3xl border divide-y overflow-hidden shadow-sm">
                        {bData.items.map(p => (
                          <div key={p.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition-all font-bold text-slate-800">
                            <div>
                               <p className="font-black uppercase text-slate-900">{p.supplierName}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${p.isService ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                     {p.isService ? 'Service (JCC)' : 'Goods (GRN)'}
                                  </span>
                                  <p className="text-[8px] text-slate-400 font-mono">REF: {p.grnNumber}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-6 w-full md:w-auto justify-between border-t md:border-none pt-3 md:pt-0">
                               <div className="text-right">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Balance Owed</p>
                                  <p className="text-lg font-black text-destructive font-mono">GHS {p.amountOwed.toFixed(2)}</p>
                               </div>
                               <Button asChild size="sm" className="rounded-xl font-black uppercase text-[9px] tracking-wider py-2.5 h-auto">
                                 <Link href={`/accountant/payments?payee=${encodeURIComponent(p.supplierName)}&amount=${p.amountOwed}&apId=${p.id}&grnNumber=${p.grnNumber}`}>
                                    <FileText size={14} className="mr-1.5" /> Generate PV
                                 </Link>
                               </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {payables?.length === 0 && (
                  <div className="p-10 text-center text-muted-foreground italic uppercase text-xs">No outstanding bills to analyze.</div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgingCard({ title, amount, count, color }: any) {
  return (
    <div className={`p-6 rounded-[30px] border-2 shadow-sm flex flex-col justify-between ${color}`}>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{title}</p>
        <p className="text-2xl font-black mt-1.5 font-mono">₵ {amount.toFixed(2)}</p>
      </div>
      <p className="text-[9px] font-black uppercase tracking-wider mt-4 opacity-80">{count} Accrued Bills</p>
    </div>
  );
}

