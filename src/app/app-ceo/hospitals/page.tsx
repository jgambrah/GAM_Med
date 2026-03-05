'use client';

import { useUser, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, doc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, ShieldAlert, Building2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  mrnPrefix: string;
  subscriptionPlan: string;
  region: string;
  status: 'active' | 'suspended';
  trialExpiry?: Timestamp;
};

export default function HospitalRegisterPage() {
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

  // Data fetching
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

  // THE KILL-SWITCH LOGIC
  const toggleStatus = (hospital: Hospital) => {
    if (!firestore) return;
    const newStatus = hospital.status === 'active' ? 'suspended' : 'active';
    const action = () => {
      updateDocumentNonBlocking(doc(firestore, "hospitals", hospital.id), { status: newStatus });
      toast({
        title: `Facility ${newStatus === 'suspended' ? 'Suspended' : 'Reactivated'}`,
        description: `${hospital.name} has been ${newStatus}.`,
      });
    };
    openDialog(
        `Confirm ${newStatus === 'suspended' ? 'Suspension' : 'Reactivation'}`,
        `Are you sure you want to ${newStatus} this facility?`,
        `Confirm ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        action,
        newStatus === 'suspended' ? 'destructive' : 'default'
    );
  };

  // TRIAL EXTENSION LOGIC (+30 Days)
  const extendTrial = (hospital: Hospital) => {
    if (!firestore) return;
    const action = () => {
        const current = hospital.trialExpiry?.toDate() || new Date();
        const newExpiry = addDays(current, 30);
        updateDocumentNonBlocking(doc(firestore, "hospitals", hospital.id), { 
          trialExpiry: Timestamp.fromDate(newExpiry) 
        });
        toast({
          title: "Trial Extended",
          description: `Trial for ${hospital.name} extended by 30 days.`,
        });
    };
    openDialog(
        'Extend Trial',
        `This will extend the trial period for ${hospital.name} by 30 days. Confirm?`,
        'Extend by 30 Days',
        action
    );
  };
  
  const isOverallLoading = isUserAuthLoading || isClaimsLoading || areHospitalsLoading;

  if (isUserAuthLoading || isClaimsLoading) {
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
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Facility <span className="text-primary">Directory</span></h1>
          <p className="text-muted-foreground font-medium">Global management of all onboarded hospital tenants.</p>
        </div>
        <div className="bg-card px-4 py-2 rounded-lg border">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Live Facilities: {hospitals?.length ?? 0}</span>
        </div>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-0">
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hospital & ID</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Plan & Region</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Administrative Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areHospitalsLoading && (
                <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground">Loading facility registry...</p>
                    </TableCell>
                </TableRow>
            )}
            {hospitals?.map((h) => (
              <TableRow key={h.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${h.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-card-foreground">{h.name}</p>
                      <p className="text-[10px] font-mono font-bold text-primary/80 uppercase">{h.hospitalId} • EHR: {h.mrnPrefix}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="p-4">
                  <div>
                    <span className="text-xs font-bold text-card-foreground block">{h.subscriptionPlan || 'PRO TIER'}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">{h.region} REGION</span>
                  </div>
                </TableCell>
                <TableCell className="p-4">
                  {h.status === 'active' ? (
                    <div className="flex items-center gap-1 text-green-600 font-bold text-xs">
                      <ShieldCheck size={14} /> ACTIVE
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600 font-bold text-xs">
                      <ShieldAlert size={14} /> SUSPENDED
                    </div>
                  )}
                </TableCell>
                <TableCell className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      onClick={() => toggleStatus(h)}
                      variant="ghost"
                      size="sm"
                      className={`px-3 py-1.5 h-auto rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                        h.status === 'active' ? 'text-destructive hover:bg-destructive hover:text-destructive-foreground' : 'text-green-600 hover:bg-green-600 hover:text-white'
                      }`}
                    >
                      {h.status === 'active' ? 'Kill Switch' : 'Reactivate'}
                    </Button>
                    <Button
                      onClick={() => extendTrial(h)}
                      variant="ghost"
                      size="sm"
                      className="px-3 py-1.5 h-auto text-primary rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      +30 Days Trial
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
