'use client';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { BedDouble, Loader2, ShieldAlert, Users, LayoutGrid, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Admission = {
  id: string;
  patientName: string;
  bedId: string;
  wardId: string;
  wardName?: string; // This might not be on the admission doc, I might need to fetch wards separately
};

type Ward = {
    id: string;
    name: string;
    prefix: string;
    capacity: number;
    occupancy: number;
}

export default function BedManagementPage() {
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
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'ADMIN' || userRole === 'NURSE' || userRole === 'DOCTOR';

  // 1. Fetch all wards
  const wardsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/wards`), orderBy('name', 'asc'));
  }, [firestore, hospitalId]);
  const { data: wards, isLoading: areWardsLoading } = useCollection<Ward>(wardsQuery);

  // 2. Fetch all active admissions
  const admissionsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/admissions`), where('status', '==', 'ADMITTED'));
  }, [firestore, hospitalId]);
  const { data: admissions, isLoading: areAdmissionsLoading } = useCollection<Admission>(admissionsQuery);
  
  // 3. Group admissions by ward
  const wardsWithAdmissions = useMemo(() => {
    if (!wards) return [];
    // If admissions are still loading, return wards with empty patient lists
    if (areAdmissionsLoading) return wards.map(ward => ({...ward, admittedPatients: []}));
    
    return wards.map(ward => ({
        ...ward,
        admittedPatients: admissions?.filter(admission => admission.wardId === ward.id) || []
    }))
  }, [wards, admissions, areAdmissionsLoading]);

  const isLoading = isUserLoading || isClaimsLoading || areWardsLoading;

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
          <p className="text-muted-foreground">You are not authorized to view the bed management console.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Bed Management <span className="text-primary">Console</span></h1>
           <p className="text-muted-foreground font-medium">Real-time heatmap of all inpatient beds and their occupants.</p>
        </div>
      </div>
      
      {wardsWithAdmissions.length === 0 ? (
          <div className="text-center p-20 bg-card border-2 border-dashed rounded-2xl text-muted-foreground">
            <LayoutGrid className="h-12 w-12 mx-auto mb-2" />
            No wards have been configured for this hospital yet.
             <Button variant="link" onClick={() => router.push('/wards/setup')}>Go to Ward Setup</Button>
          </div>
      ) : (
        <div className="space-y-8">
            {wardsWithAdmissions.map(ward => (
                <div key={ward.id} className="bg-card p-6 rounded-[32px] border shadow-sm">
                    <div className="flex justify-between items-center border-b pb-4 mb-6">
                        <div>
                            <h2 className="text-xl font-black uppercase text-foreground">{ward.name}</h2>
                            <p className="text-xs font-bold text-primary">{ward.occupancy} / {ward.capacity} Beds Occupied</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                            <span>{Math.round((ward.occupancy / ward.capacity) * 100) || 0}%</span>
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="bg-primary h-full" style={{ width: `${(ward.occupancy / ward.capacity) * 100}%`}}></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {areAdmissionsLoading ? <Loader2 className="animate-spin" /> :
                        ward.admittedPatients.length === 0 ? <p className="col-span-full text-center text-sm text-muted-foreground italic py-8">All beds in this ward are available.</p> :
                        ward.admittedPatients.map(admission => (
                            <Link key={admission.id} href={`/wards/treatment/${admission.id}`}>
                                <div className="group bg-primary/10 border-2 border-primary/20 rounded-2xl p-4 text-center cursor-pointer transition-all hover:bg-primary hover:text-primary-foreground hover:scale-105">
                                    <BedDouble size={24} className="mx-auto mb-2 text-primary group-hover:text-white" />
                                    <p className="text-[10px] font-black uppercase text-primary group-hover:text-white">{admission.bedId}</p>
                                    <p className="text-xs font-bold text-foreground group-hover:text-white truncate">{admission.patientName}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
