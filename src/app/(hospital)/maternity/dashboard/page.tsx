'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, orderBy } from 'firebase/firestore';
import { Baby, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { AncEncounterDialog } from '@/components/clinical/AncEncounterDialog';
import { DeliveryLogDialog } from '@/components/clinical/DeliveryLogDialog';

type MaternityProfile = {
  id: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  lmp: string;
  edd: string;
  createdAt: { toDate: () => Date };
};

const calculateGestationalAge = (lmp: string): string => {
    if (!lmp) return 'N/A';
    try {
        const lmpDate = new Date(lmp);
        const today = new Date();
        if (lmpDate > today) return 'Invalid';
        
        const diffTime = today.getTime() - lmpDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;
        
        return `${weeks}w, ${days}d`;
    } catch(e) {
        return 'N/A';
    }
};


export default function MaternityDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useMemo(() => {
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
  const isAuthorized = ['DIRECTOR', 'NURSE', 'DOCTOR', 'ADMIN'].includes(userRole);

  const profilesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collectionGroup(firestore, 'maternity_profiles'),
      where("hospitalId", "==", hospitalId),
      where("status", "==", "ACTIVE_PREGNANCY"),
      orderBy("edd", "asc")
    );
  }, [firestore, hospitalId]);
  
  const { data: profiles, isLoading: areProfilesLoading } = useCollection<MaternityProfile>(profilesQuery);

  const isLoading = isUserLoading || isClaimsLoading;
  
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
          <p className="text-muted-foreground">You are not authorized to view the maternity dashboard.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Antenatal <span className="text-pink-600">Dashboard</span></h1>
           <p className="text-muted-foreground font-medium">Live registry of all active pregnancies in your facility.</p>
        </div>
        <div className="bg-card px-4 py-2 rounded-lg border">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Profiles: {areProfilesLoading ? '...' : profiles?.length ?? 0}</span>
        </div>
      </div>
      
      {areProfilesLoading ? (
         <div className="text-center p-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            Fetching active maternity profiles...
         </div>
      ) : profiles?.length === 0 ? (
        <div className="text-center p-20 bg-card border-2 border-dashed rounded-2xl text-muted-foreground">
          <Baby className="h-12 w-12 mx-auto mb-2" />
          No active maternity profiles found. Enroll a new patient to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles?.map((profile) => (
            <div key={profile.id} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4 hover:border-pink-200 transition-all flex flex-col">
               <div className="flex justify-between items-start">
                 <div className="bg-pink-100 p-3 rounded-2xl text-pink-600">
                    <Baby size={24} />
                 </div>
                 <p className="text-[10px] font-bold text-muted-foreground text-right">
                    Booked {formatDistanceToNow(profile.createdAt.toDate(), { addSuffix: true })}
                </p>
              </div>

              <div className="flex-grow">
                <div className="flex justify-between items-start">
                    <p className="font-black text-card-foreground uppercase tracking-tight text-lg">{profile.patientName}</p>
                    <div className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest">GA</p>
                        <p className="text-sm font-black -mt-1">{calculateGestationalAge(profile.lmp)}</p>
                    </div>
                </div>
                <p className="text-xs font-bold text-muted-foreground mt-2">LMP: {format(new Date(profile.lmp), 'PPP')}</p>
                <p className="text-sm font-bold text-pink-600">EDD: {format(new Date(profile.edd), 'PPP')}</p>
              </div>
              
              <div className="flex gap-2">
                <AncEncounterDialog 
                    maternityProfileId={profile.id}
                    patientId={profile.patientId}
                    hospitalId={profile.hospitalId}
                    patientName={profile.patientName}
                />
                <DeliveryLogDialog
                    maternityProfileId={profile.id}
                    patientId={profile.patientId}
                    hospitalId={profile.hospitalId}
                    patientName={profile.patientName}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
