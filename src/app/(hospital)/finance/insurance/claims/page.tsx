'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { FileText, CheckCircle, AlertCircle, Send, Landmark, Filter, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict } from 'date-fns';

type Claim = {
  id: string;
  patientName: string;
  nhisNumber?: string;
  totalAmount: number;
  claimStatus?: 'PENDING_VETTING' | 'SUBMITTED' | 'QUERIED' | 'PAID';
  createdAt: { toDate: () => Date };
}

export default function ClaimsTrackerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole);
  
  const claimsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
        collection(firestore, `hospitals/${hospitalId}/payments`), 
        where("paymentMode", "==", "NHIS"),
        orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);
  
  const { data: claims, isLoading: areClaimsLoading } = useCollection<Claim>(claimsQuery);

  const submitToScheme = (claimId: string) => {
    if (!firestore || !hospitalId) return;
    const claimRef = doc(firestore, `hospitals/${hospitalId}/payments`, claimId);
    updateDocumentNonBlocking(claimRef, {
      claimStatus: 'SUBMITTED',
      submittedAt: serverTimestamp()
    });
    toast({ title: "Claim Batch Transmitted Successfully" });
  };
  
  const totalPending = useMemo(() => {
      if (!claims) return 0;
      return claims
        .filter(c => c.claimStatus !== 'SUBMITTED' && c.claimStatus !== 'PAID')
        .reduce((acc, claim) => acc + claim.totalAmount, 0);
  }, [claims]);

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
          <p className="text-muted-foreground">You are not authorized to view the claims console.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Insurance <span className="text-primary">Claims</span></h1>
          <p className="text-muted-foreground font-medium">Managing NHIS & Private Insurance Reimbursements.</p>
        </div>
        <div className="bg-foreground text-background px-6 py-2 rounded-2xl flex items-center gap-3">
           <Landmark size={18} className="text-primary" />
           <span className="text-[10px] font-black uppercase tracking-widest">GHS {totalPending.toFixed(2)} Pending Recovery</span>
        </div>
      </div>

      <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Patient & NHIS Number</TableHead>
              <TableHead className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount (GHS)</TableHead>
              <TableHead className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</TableHead>
              <TableHead className="p-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areClaimsLoading ? (
                 <TableRow><TableCell colSpan={4} className="text-center h-48"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : claims?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center p-20 text-muted-foreground italic">No NHIS claims found.</TableCell></TableRow>
            ) : (
                claims?.map(claim => (
                  <TableRow key={claim.id} className="hover:bg-muted/50 transition-all">
                    <TableCell className="p-6">
                       <p className="font-bold uppercase tracking-tight">{claim.patientName}</p>
                       <p className="text-[9px] text-primary font-black">NHIS ID: {claim.nhisNumber || 'NOT CAPTURED'}</p>
                    </TableCell>
                    <TableCell className="p-6 font-mono text-sm">GHS {claim.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="p-6">
                       <Badge variant={claim.claimStatus === 'SUBMITTED' ? 'default' : 'secondary'} className={claim.claimStatus === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                          {claim.claimStatus || 'PENDING VETTING'}
                       </Badge>
                    </TableCell>
                    <TableCell className="p-6 text-right">
                       {claim.claimStatus !== 'SUBMITTED' && (
                         <Button 
                            onClick={() => submitToScheme(claim.id)}
                            size="sm"
                            className="bg-foreground hover:bg-primary text-background font-bold uppercase text-[10px] tracking-widest"
                         >
                            <Send size={14}/> Submit Claim
                         </Button>
                       )}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
