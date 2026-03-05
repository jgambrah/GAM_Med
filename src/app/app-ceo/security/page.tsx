'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useFirebaseApp, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { collection, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldAlert, ShieldCheck, UserSearch, RefreshCw, AlertTriangle, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Hospital = {
  id: string;
  name: string;
};

const userRoles = [
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'HR', label: 'HR Manager' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
];

export default function SecurityHubPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const [isRepairing, setIsRepairing] = useState(false);
  
  const [formState, setFormState] = useState({
    targetEmail: '',
    hospitalId: '',
    role: 'DIRECTOR'
  });

  const hospitalsQuery = useMemoFirebase(() => firestore ? collection(firestore, "hospitals") : null, [firestore]);
  const { data: hospitals, isLoading: areHospitalsLoading } = useCollection<Hospital>(hospitalsQuery);

  const handleRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.hospitalId) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a hospital.' });
        return;
    }
    setIsRepairing(true);
    
    if (!firebaseApp) {
        toast({ variant: 'destructive', title: 'Firebase App not available' });
        setIsRepairing(false);
        return;
    }
    const functions = getFunctions(firebaseApp);
    const repairTool = httpsCallable(functions, 'repairUserIdentity');

    try {
      const result: any = await repairTool(formState);
      if (result.data.success) {
        toast({ title: 'Success', description: result.data.message });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Critical Error', description: err.message });
    }
    setIsRepairing(false);
  };
  
  const isPageLoading = isAuthLoading || isProfileLoading;

  if (isPageLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!user || userProfile?.role !== 'SUPER_ADMIN') {
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="bg-red-600 p-3 rounded-xl shadow-lg shadow-red-200">
          <ShieldCheck className="text-white" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Security <span className="text-red-600">& Governance</span> Hub</h1>
          <p className="text-muted-foreground font-medium">Manage identity synchronization and multi-tenant isolation integrity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card rounded-2xl border p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-red-600">
            <UserSearch size={20} />
            <h3 className="font-black text-xs uppercase tracking-widest text-card-foreground">Identity Repair Tool (Re-Stamping)</h3>
          </div>

          <form onSubmit={handleRepair} className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-xl border">
              <div className="flex items-start gap-3 text-muted-foreground">
                <AlertTriangle size={32} className="text-amber-500 shrink-0" />
                <p className="text-[11px] font-bold leading-tight uppercase">
                  Warning: Using this tool will overwrite the user's existing "Badge" (Auth Token). The user must log out and log back in to see the changes.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">User Email Address</label>
                <Input 
                  type="email" required placeholder="Enter doctor or director email"
                  className="mt-1"
                  value={formState.targetEmail}
                  onChange={e => setFormState({...formState, targetEmail: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assign to Hospital</label>
                  <Select required onValueChange={value => setFormState({...formState, hospitalId: value})}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder={areHospitalsLoading ? 'Loading...' : 'Select Hospital'} />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals?.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assign Role</label>
                  <Select required defaultValue={formState.role} onValueChange={value => setFormState({...formState, role: value})}>
                     <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {userRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isRepairing}
              className="w-full bg-foreground hover:bg-red-600 text-background font-black py-6 rounded-xl transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest shadow-xl"
            >
              {isRepairing ? <RefreshCw className="animate-spin" /> : <Zap size={18} className="fill-current" />}
              Execute Identity Repair
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0f172a] p-6 rounded-2xl text-white shadow-xl">
            <h3 className="font-black text-xs uppercase tracking-widest mb-4 text-blue-400">Governance Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-[10px] font-bold text-slate-400">Auth Encryption</span>
                <span className="text-[10px] font-bold text-green-400">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-[10px] font-bold text-slate-400">Isolation Layer</span>
                <span className="text-[10px] font-bold text-green-400">VERIFIED</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400">CEO God-Mode</span>
                <span className="text-[10px] font-bold text-blue-400">DR. GAMBRAH</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
