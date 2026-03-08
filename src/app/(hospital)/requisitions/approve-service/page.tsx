'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
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

export default function ApproveServiceRequisitionsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN'].includes(userProfile?.role || '');

  const pendingQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, 'hospitals', hospitalId, 'service_requisitions'),
      where('status', '==', 'PENDING_APPROVAL'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId]);
  const { data: pendingRequisitions, isLoading: areReqsLoading } = useCollection(pendingQuery);

  const handleDecision = (reqId: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!firestore || !hospitalId || !user) return;
    const reqRef = doc(firestore, 'hospitals', hospitalId, 'service_requisitions', reqId);
    updateDocumentNonBlocking(reqRef, {
      status: decision,
      approvedBy: user.uid,
      approvedAt: serverTimestamp()
    });
  };
  
  const pageIsLoading = isUserLoading || isProfileLoading;
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
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Approve <span className="text-primary">Services</span></h1>
           <p className="text-muted-foreground font-medium">Authorize external service contracts.</p>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
         {areReqsLoading && <div className="p-10 text-center"><Loader2 className="animate-spin"/></div>}
         {pendingRequisitions?.length === 0 && <div className="p-20 bg-card rounded-2xl text-center italic text-muted-foreground">No pending service requisitions to approve.</div>}
         {pendingRequisitions?.map(req => (
            <AccordionItem value={req.id} key={req.id} className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                <AccordionTrigger className="p-6 text-sm font-bold uppercase hover:no-underline">
                    <span>{req.serviceTitle} (From: {req.requestingDept})</span>
                </AccordionTrigger>
                <AccordionContent className="p-6 bg-muted/50 border-t">
                    <div className="space-y-4 mb-6">
                        <div>
                            <p className="text-xs text-muted-foreground font-bold">Justification</p>
                            <p className="text-sm italic">"{req.justification}"</p>
                        </div>
                        <div className="flex justify-between">
                            <p>Est. Cost: <span className="font-mono">GHS {req.estimatedCost}</span></p>
                            <p>Priority: <span className={`font-mono px-2 py-1 rounded text-xs ${req.priority === 'URGENT' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200'}`}>{req.priority}</span></p>
                        </div>
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
