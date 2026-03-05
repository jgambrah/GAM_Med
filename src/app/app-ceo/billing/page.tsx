'use client';

import { useUser, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, doc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, ShieldAlert, Building2, ShieldCheck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addDays } from 'date-fns';

type Hospital = {
  id: string;
  name: string;
  hospitalId: string;
  status: 'active' | 'suspended';
  subscriptionStatus: 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED';
  nextBillingDate?: Timestamp;
  trialExpiry?: Timestamp;
  bypassPaymentControl?: boolean;
};

export default function CEOBillingManager() {
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [dialogAction, setDialogAction] = useState<(() => void) | null>(null);
  const [dialogState, setDialogState] = useState<{ open: boolean; title: string; description: string; confirmText: string; variant: 'default' | 'destructive' }>({ open: false, title: '', description: '', confirmText: '', variant: 'default' });

  useEffect(() => {
    if (user) {
      setIsClaimsLoading(true);
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserAuthLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserAuthLoading]);
  
  const isSuperAdmin = claims?.role === 'SUPER_ADMIN';

  const hospitalsQuery = useMemoFirebase(() => isSuperAdmin && firestore ? query(collection(firestore, 'hospitals'), orderBy('createdAt', 'desc')) : null, [firestore, isSuperAdmin]);
  const { data: hospitals, isLoading: areHospitalsLoading } = useCollection<Omit<Hospital, 'id'>>(hospitalsQuery);


  const openDialog = (title: string, description: string, confirmText: string, action: () => void, variant: 'destructive' | 'default' = 'default') => {
      setDialogAction(() => action);
      setDialogState({ open: true, title, description, confirmText, variant });
  };
  
  const closeDialog = () => {
      setDialogState(prev => ({ ...prev, open: false }));
      setDialogAction(null);
  };

  const handleConfirm = () => {
      if (dialogAction) {
          dialogAction();
      }
      closeDialog();
  };
  
  const toggleBypass = (hospital: Hospital) => {
    if (!firestore) return;
    const currentBypassStatus = hospital.bypassPaymentControl || false;
    const action = () => {
        updateDocumentNonBlocking(doc(firestore, "hospitals", hospital.id), { 
            bypassPaymentControl: !currentBypassStatus,
            ...( !currentBypassStatus && { status: 'active', subscriptionStatus: 'ACTIVE' } )
        });
        toast({
            title: `Bypass ${!currentBypassStatus ? 'Activated' : 'Removed'}`,
            description: `Autopilot billing is now ${!currentBypassStatus ? 'disabled' : 'enabled'} for ${hospital.name}.`
        });
    };
     openDialog(
        `Confirm CEO Bypass ${!currentBypassStatus ? 'Activation' : 'Removal'}`,
        `Are you sure you want to ${!currentBypassStatus ? 'ACTIVATE' : 'REMOVE'} the billing bypass for ${hospital.name}?`,
        `${!currentBypassStatus ? 'Activate' : 'Remove'} Bypass`,
        action,
        'destructive'
    );
  };
  
  const grantExtension = (hospital: Hospital) => {
    if (!firestore) return;
    const action = () => {
        const newExpiry = addDays(new Date(), 5);
        updateDocumentNonBlocking(doc(firestore, "hospitals", hospital.id), {
            gracePeriodExpiry: Timestamp.fromDate(newExpiry),
            status: 'active',
            subscriptionStatus: 'PAST_DUE'
        });
        toast({
            title: "Emergency Extension Granted",
            description: `${hospital.name} has been given a 5-day grace period.`
        });
    };
     openDialog(
        'Grant 5-Day Extension',
        `This will reset the grace period for ${hospital.name} for 5 days from today. Confirm?`,
        'Grant Extension',
        action
    );
  };
  
  const isOverallLoading = isUserAuthLoading || isClaimsLoading || areHospitalsLoading;

  if (isOverallLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
     return (
         <div className="flex flex-1 items-center justify-center bg-background p-4">
            <div className="text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have SUPER_ADMIN privileges.</p>
                 <Button onClick={() => router.push('/')} className="mt-4">Return to Login</Button>
            </div>
         </div>
    );
  }

  return (
    <>
      <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
        <div className="flex justify-between items-end border-b-8 border-slate-900 pb-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">Subscription <span className="text-blue-600">Revenue Guard</span></h1>
            <p className="text-slate-500 font-bold text-xs uppercase italic">Gam IT Solutions Master Billing Control & Autopilot.</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] border-4 border-slate-900 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="p-6">Hospital Facility</th>
                <th className="p-6">Billing Status</th>
                <th className="p-6">Next Due Date</th>
                <th className="p-6">CEO Control</th>
                <th className="p-6 text-right">Emergency Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-slate-50">
              {hospitals?.map((h) => (
                <tr key={h.id} className="hover:bg-blue-50/30 transition-all">
                  <td className="p-6">
                    <p className="uppercase text-sm">{h.name}</p>
                    <p className="text-[9px] text-blue-600 font-black tracking-widest">{h.hospitalId}</p>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase italic ${
                      h.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                      h.subscriptionStatus === 'PAST_DUE' ? 'bg-amber-100 text-amber-700' :
                      h.subscriptionStatus === 'SUSPENDED' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-500'
                    }`}>
                        {h.subscriptionStatus || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="p-6">
                    <p className="text-xs font-black">{h.nextBillingDate ? new Date(h.nextBillingDate?.toDate()).toLocaleDateString('en-GB') : 'N/A'}</p>
                  </td>
                  <td className="p-6">
                    <button
                      onClick={() => toggleBypass(h)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                        h.bypassPaymentControl ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                        <ShieldCheck size={14} /> {h.bypassPaymentControl ? 'Bypass Active' : 'Enforce Rules'}
                    </button>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2">
                        <button
                          onClick={() => grantExtension(h)}
                          className="bg-white border-2 border-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all"
                        >
                          +5 Day Extension
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Dialog open={dialogState.open} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{dialogState.title}</DialogTitle>
                  <DialogDescription>{dialogState.description}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                  <Button variant={dialogState.variant} onClick={handleConfirm}>
                      {dialogState.confirmText}
                  </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  );
}
