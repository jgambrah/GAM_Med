'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { Calendar, CheckCircle, XCircle, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LeaveManagementPage() {
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
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER'].includes(userProfile?.role);

  const leaveRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/leave_requests`));
  }, [firestore, hospitalId]);
  
  const { data: requests, isLoading: areRequestsLoading } = useCollection(leaveRequestsQuery);
  
  const updateStatus = (reqId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!firestore || !hospitalId || !userProfile) return;
    
    const requestDocRef = doc(firestore, `hospitals/${hospitalId}/leave_requests`, reqId);
    
    updateDocumentNonBlocking(requestDocRef, {
      status,
      reviewedBy: userProfile.uid,
      reviewedByName: userProfile.fullName,
      updatedAt: serverTimestamp()
    });

    toast({ title: `Leave request ${status.toLowerCase()}` });
  };
  
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-foreground">Leave <span className="text-primary">Administration</span></h1>
          <p className="text-muted-foreground font-bold text-xs uppercase italic">Manage staff absence and annual entitlements.</p>
        </div>
        <div className="bg-primary/10 text-primary px-6 py-2 rounded-2xl border-2 border-primary/20 flex items-center gap-2">
           <Calendar size={18} />
           <span className="text-[10px] font-black uppercase">Staff on Leave: {areRequestsLoading ? '...' : requests?.filter(r => r.status === 'APPROVED').length ?? 0}</span>
        </div>
      </div>

      <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-foreground text-primary-foreground hover:bg-foreground">
              <TableHead className="p-6 text-[10px] uppercase font-black tracking-widest">Employee</TableHead>
              <TableHead className="p-6 text-[10px] uppercase font-black tracking-widest">Type & Dates</TableHead>
              <TableHead className="p-6 text-[10px] uppercase font-black tracking-widest">Duration</TableHead>
              <TableHead className="p-6 text-[10px] uppercase font-black tracking-widest">Status</TableHead>
              <TableHead className="p-6 text-right text-[10px] uppercase font-black tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {areRequestsLoading && <TableRow><TableCell colSpan={5} className="text-center p-12"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>}
            {requests?.map(req => (
              <TableRow key={req.id} className="hover:bg-muted/50 transition-all font-bold">
                <TableCell className="p-6">
                   <p className="uppercase text-sm text-card-foreground">{req.staffName}</p>
                   <p className="text-[9px] text-primary font-black">{req.role}</p>
                </TableCell>
                <TableCell className="p-6">
                   <p className="text-xs uppercase text-card-foreground">{req.leaveType}</p>
                   <p className="text-[10px] text-muted-foreground">
                    {req.startDate ? format(new Date(req.startDate), 'PPP') : ''} to {req.endDate ? format(new Date(req.endDate), 'PPP') : ''}
                   </p>
                </TableCell>
                <TableCell className="p-6 text-sm text-muted-foreground">{req.daysRequested} Days</TableCell>
                <TableCell className="p-6">
                   <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase italic ${
                     req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                     req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                   }`}>
                      {req.status}
                   </span>
                </TableCell>
                <TableCell className="p-6 text-right">
                   {req.status === 'PENDING' && (
                     <div className="flex justify-end gap-2">
                        <Button onClick={() => updateStatus(req.id, 'APPROVED')} variant="ghost" size="icon" className="text-green-600 hover:bg-green-100 hover:text-green-700"><CheckCircle size={20}/></Button>
                        <Button onClick={() => updateStatus(req.id, 'REJECTED')} variant="ghost" size="icon" className="text-red-600 hover:bg-red-100 hover:text-red-700"><XCircle size={20}/></Button>
                     </div>
                   )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
