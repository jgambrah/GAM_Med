'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { CheckCircle2, XCircle, Loader2, ShieldAlert, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function ApproveRequisitionsPage() {
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
  const isAuthorized = ['DIRECTOR', 'ADMIN'].includes(userRole);

  const pendingQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, 'hospitals', hospitalId, 'requisitions'),
      where('status', '==', 'PENDING'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId]);
  const { data: pendingRequisitions, isLoading: areReqsLoading } = useCollection(pendingQuery);

  const handleDecision = (reqId: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!firestore || !hospitalId || !user) return;
    const reqRef = doc(firestore, 'hospitals', hospitalId, 'requisitions', reqId);
    updateDocumentNonBlocking(reqRef, {
      status: decision,
      approvedBy: user.uid,
      approvedAt: serverTimestamp()
    });
  };
  
  const pageIsLoading = isUserLoading || isClaimsLoading;
  if (pageIsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">This module is for Directors or Admins.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Approve <span className="text-primary">Requisitions</span></h1>
           <p className="text-muted-foreground font-medium">Authorize internal stock movements.</p>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
         {areReqsLoading && <div className="p-10 text-center"><Loader2 className="animate-spin"/></div>}
         {pendingRequisitions?.length === 0 && <div className="p-20 bg-card rounded-2xl text-center italic text-muted-foreground">No pending requisitions to approve.</div>}
         {pendingRequisitions?.map(req => (
            <AccordionItem value={req.id} key={req.id} className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                <AccordionTrigger className="p-6 text-sm font-bold uppercase hover:no-underline">
                    Requisition from {req.requestedByName} ({req.requestingDept}) - {req.items.length} items
                </AccordionTrigger>
                <AccordionContent className="p-6 bg-muted/50 border-t">
                    <div className="space-y-2 mb-6">
                        {req.items.map((item:any) => (
                           <div key={item.itemId} className="flex justify-between">
                              <p>{item.name}</p>
                              <p className="font-bold">{item.quantityRequested} units</p>
                           </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="destructive" size="sm" onClick={() => handleDecision(req.id, 'REJECTED')}><XCircle size={16}/> Reject</Button>
                        <Button variant="default" size="sm" onClick={() => handleDecision(req.id, 'APPROVED')}><CheckCircle2 size={16}/> Approve</Button>
                    </div>
                </AccordionContent>
            </AccordionItem>
         ))}
      </Accordion>
    </div>
  );
}
