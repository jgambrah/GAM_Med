'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, Search, User as UserIcon, Receipt, 
  Clock, ArrowRight, Loader2, ShieldAlert 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  ehrNumber: string;
}

export default function BillingQueuePage() {
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
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'CASHIER'].includes(userRole);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch all unpaid billing items in the facility
  const unpaidBillsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "billing_items"),
      where('status', '==', 'UNPAID')
    );
  }, [firestore, hospitalId]);
  
  const { data: unpaidItems, isLoading: isUnpaidLoading } = useCollection(unpaidBillsQuery);

  const groupedBills = useMemo(() => {
    if (!unpaidItems) return [];
    const groups: { [key: string]: { patientId: string; patientName: string; totalAmount: number; lastActivity: Date | null } } = {};
    
    unpaidItems.forEach(item => {
      const pid = item.patientId;
      if (!pid) return;
      
      const itemDate = item.createdAt ? item.createdAt.toDate() : null;
      
      if (!groups[pid]) {
        groups[pid] = {
          patientId: pid,
          patientName: item.patientName || 'Unknown Patient/Account',
          totalAmount: 0,
          lastActivity: itemDate
        };
      }
      groups[pid].totalAmount += item.total || 0;
      if (itemDate && (!groups[pid].lastActivity || itemDate > groups[pid].lastActivity)) {
        groups[pid].lastActivity = itemDate;
      }
    });
    
    // Sort so that the newest active bill is shown first
    return Object.values(groups).sort((a, b) => (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0));
  }, [unpaidItems]);

  const filteredBills = useMemo(() => {
    if (!groupedBills) return [];
    if (!searchTerm) return groupedBills;
    const lowercasedTerm = searchTerm.toLowerCase();
    return groupedBills.filter(b => 
      b.patientName.toLowerCase().includes(lowercasedTerm) ||
      b.patientId.toLowerCase().includes(lowercasedTerm)
    );
  }, [groupedBills, searchTerm]);

  const isLoading = isUserLoading || isProfileLoading || isUnpaidLoading;
  
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
          <p className="text-muted-foreground">You are not authorized to view the billing console.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Billing <span className="text-primary">Console</span></h1>
        <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 flex items-center gap-2">
           <CreditCard size={18} className="text-primary" />
           <span className="text-[10px] font-black uppercase text-primary tracking-widest">Revenue Port Active</span>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input 
          placeholder="Search Patient Name or Account Reference..."
          className="w-full pl-12 pr-4 py-5 rounded-2xl border-2 bg-card"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Patient / Account Name</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Outstanding Amount</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Last Billing Activity</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isUnpaidLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center h-24">Loading billing queue...</TableCell></TableRow>
            ) : (
              filteredBills.map(b => (
                <TableRow key={b.patientId} className="hover:bg-muted/50 transition-all">
                  <TableCell className="p-4">
                     <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary"><UserIcon size={20}/></div>
                        <div>
                           <p className="font-bold uppercase tracking-tight text-card-foreground">{b.patientName}</p>
                           <p className="text-[10px] text-primary font-black tracking-widest">ID: {b.patientId}</p>
                        </div>
                     </div>
                  </TableCell>
                  <TableCell className="p-4 font-mono font-bold text-sm">
                     GHS {b.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="p-4 text-xs text-muted-foreground font-bold uppercase">
                     <div className="flex items-center gap-1"><Clock size={12}/> {b.lastActivity ? b.lastActivity.toLocaleString('en-GB') : 'N/A'}</div>
                  </TableCell>
                  <TableCell className="p-4 text-right">
                     <Button asChild size="sm" className="bg-foreground hover:bg-primary text-background font-bold uppercase text-[10px] tracking-widest">
                          <Link href={`/finance/billing/invoice/${b.patientId}`}>
                             Collect Payment <ArrowRight size={14} />
                          </Link>
                     </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!isUnpaidLoading && filteredBills.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground font-medium italic">
                        No pending bills found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
