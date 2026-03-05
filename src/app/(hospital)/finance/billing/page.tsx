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

  // For this step, we assume any patient in the directory could have a pending bill.
  // A more advanced system would track billing status on the patient or encounter document.
  const pendingBillsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "patients"),
      orderBy('createdAt', 'desc'),
      limit(100) // Limit initial load
    );
  }, [firestore, hospitalId]);
  
  const { data: patients, isLoading: arePatientsLoading } = useCollection<Patient>(pendingBillsQuery);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    if (!searchTerm) return patients;
    const lowercasedTerm = searchTerm.toLowerCase();
    return patients.filter(p => 
      (p.firstName?.toLowerCase().includes(lowercasedTerm)) ||
      (p.lastName?.toLowerCase().includes(lowercasedTerm)) ||
      (p.ehrNumber?.toLowerCase().includes(lowercasedTerm))
    );
  }, [patients, searchTerm]);

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
          placeholder="Search Patient Name or EHR Number..."
          className="w-full pl-12 pr-4 py-5 rounded-2xl border-2 bg-card"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Patient / EHR Number</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Last Activity</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arePatientsLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center h-24">Loading billing queue...</TableCell></TableRow>
            ) : (
              filteredPatients.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/50 transition-all">
                  <TableCell className="p-4">
                     <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary"><UserIcon size={20}/></div>
                        <div>
                           <p className="font-bold uppercase tracking-tight text-card-foreground">{p.firstName} {p.lastName}</p>
                           <p className="text-[10px] text-primary font-black tracking-widest">{p.ehrNumber}</p>
                        </div>
                     </div>
                  </TableCell>
                  <TableCell className="p-4 text-xs text-muted-foreground font-bold uppercase">
                     <div className="flex items-center gap-1"><Clock size={12}/> Checked-in Today</div>
                  </TableCell>
                  <TableCell className="p-4 text-right">
                     <Button asChild size="sm" className="bg-foreground hover:bg-primary text-background font-bold uppercase text-[10px] tracking-widest">
                         <Link href={`/finance/billing/invoice/${p.id}`}>
                            Generate Bill <ArrowRight size={14} />
                         </Link>
                     </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!arePatientsLoading && filteredPatients.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
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
