'use client';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, increment, serverTimestamp, limit, getDocs, updateDoc } from 'firebase/firestore';
import { BedDouble, Loader2, ShieldAlert, Users, LayoutGrid, ArrowRight, UserPlus, ShieldCheck, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type Admission = {
  id: string;
  patientName: string;
  bedId: string;
  wardId: string;
  wardName?: string;
  patientId?: string;
  status?: string;
  admittedAt?: any;
};

type Ward = {
    id: string;
    name: string;
    prefix: string;
    capacity: number;
    occupancy: number;
};

function AdmitPatientToBedDialog({
  open,
  onOpenChange,
  bedId,
  wardId,
  wardName,
  hospitalId,
  admissions,
  user,
  firestore,
  toast,
}: any) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Fetch recent patients to select from
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !open) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/patients`), limit(50));
  }, [firestore, hospitalId, open]);
  const { data: patients, isLoading: patientsLoading } = useCollection<any>(patientsQuery);

  const availablePatients = useMemo(() => {
    if (!patients) return [];
    // Filter out patients who are already admitted
    return patients.filter((p: any) => {
      const isAlreadyAdmitted = admissions?.some((adm: any) => adm.patientId === p.id && adm.status === 'ADMITTED');
      if (isAlreadyAdmitted) return false;
      if (!search) return true;
      const term = search.toLowerCase();
      return `${p.firstName} ${p.lastName}`.toLowerCase().includes(term) || p.ehrNumber.toLowerCase().includes(term);
    });
  }, [patients, admissions, search]);

  const handleAdmit = async () => {
    if (!selectedPatient || !firestore || !user) return;
    setLoading(true);

    try {
      const admissionsRef = collection(firestore, `hospitals/${hospitalId}/admissions`);
      
      // Perform pre-admission double-occupancy check
      const activeAdmissionsQuery = query(
        admissionsRef,
        where('patientId', '==', selectedPatient.id),
        where('status', '==', 'ADMITTED')
      );
      const activeAdmissionsSnap = await getDocs(activeAdmissionsQuery);
      if (!activeAdmissionsSnap.empty) {
        toast({
          variant: 'destructive',
          title: 'Admission Failed',
          description: `${selectedPatient.firstName} ${selectedPatient.lastName} is already admitted to another bed.`,
        });
        setLoading(false);
        return;
      }

      const newAdmissionId = doc(admissionsRef).id;
      const bedDocRef = doc(firestore, `hospitals/${hospitalId}/wards/${wardId}/beds/${bedId}`);
      const wardDocRef = doc(firestore, `hospitals/${hospitalId}/wards/${wardId}`);

      addDocumentNonBlocking(admissionsRef, {
        admissionId: newAdmissionId,
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        hospitalId,
        wardId,
        wardName,
        bedId,
        bedName: bedId,
        admittedBy: user.uid,
        status: 'ADMITTED',
        admittedAt: serverTimestamp(),
      });

      updateDocumentNonBlocking(bedDocRef, {
        status: 'Occupied',
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        admittedAt: serverTimestamp(),
      });

      updateDocumentNonBlocking(wardDocRef, {
        occupancy: increment(1),
      });

      toast({
        title: 'Patient Admitted',
        description: `${selectedPatient.firstName} ${selectedPatient.lastName} has been assigned to bed ${bedId}.`,
      });

      onOpenChange(false);
      setSelectedPatient(null);
      setSearch('');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Admission Failed',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white text-black font-bold">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter">Admit Patient to Bed</DialogTitle>
          <DialogDescription className="font-medium text-slate-500">
            Assigning a patient to Bed {bedId} in {wardName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Search Patient</label>
            <input
              type="text"
              placeholder="Type patient name or EHR number..."
              className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all text-black"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 border p-2 rounded-2xl bg-slate-50">
            {patientsLoading && (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-primary" />
              </div>
            )}
            {!patientsLoading && availablePatients.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">No eligible patients found.</p>
            )}
            {!patientsLoading &&
              availablePatients.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${
                    selectedPatient?.id === p.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white bg-white hover:border-slate-200'
                  }`}
                >
                  <div>
                    <p className="text-xs font-black uppercase">{p.firstName} {p.lastName}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{p.ehrNumber}</p>
                  </div>
                  <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase">
                    Ready
                  </span>
                </div>
              ))}
          </div>

          <Button
            disabled={loading || !selectedPatient}
            onClick={handleAdmit}
            className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-wider"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Confirm Admission'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WardBedGrid({ wardId, wardName, hospitalId, admissions, firestore, onAdmitClick, toast }: any) {
  // Query beds directly for this ward (hierarchical read, bypassing collectionGroup permission barriers)
  const bedsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !wardId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/wards/${wardId}/beds`));
  }, [firestore, hospitalId, wardId]);
  const { data: beds, isLoading: bedsLoading } = useCollection<any>(bedsQuery);

  const sortedBeds = useMemo(() => {
    if (!beds) return [];
    return [...beds].sort((a, b) => a.bedId.localeCompare(b.bedId, undefined, { numeric: true, sensitivity: 'base' }));
  }, [beds]);

  if (bedsLoading) {
    return (
      <div className="col-span-full flex justify-center py-8">
        <Loader2 className="animate-spin text-primary animate-pulse" />
      </div>
    );
  }

  if (sortedBeds.length === 0) {
    return <p className="col-span-full text-center text-sm text-muted-foreground italic py-8">No beds configured for this ward.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {sortedBeds.map((bed: any) => {
        const isOccupied = bed.status === 'Occupied' && bed.patientId;
        const occupantAdmission = isOccupied 
          ? admissions?.find((adm: any) => adm.patientId === bed.patientId && adm.status === 'ADMITTED')
          : null;

        if (isOccupied && occupantAdmission) {
          return (
            <Link key={bed.id} href={`/wards/treatment/${occupantAdmission.id}`}>
              <div className="group bg-rose-50 border-2 border-rose-200 text-rose-950 rounded-2xl p-4 text-center cursor-pointer transition-all hover:bg-rose-600 hover:border-rose-600 hover:text-white hover:scale-105 shadow-sm">
                <BedDouble size={24} className="mx-auto mb-2 text-rose-600 group-hover:text-white animate-pulse" />
                <p className="text-[9px] font-black uppercase tracking-wider text-rose-500 group-hover:text-rose-200">{bed.bedId}</p>
                <p className="text-xs font-black truncate">{bed.patientName || occupantAdmission.patientName}</p>
                <span className="text-[8px] bg-rose-200/50 text-rose-800 px-2 py-0.5 rounded-full font-black uppercase tracking-widest mt-1.5 inline-block group-hover:bg-rose-700 group-hover:text-white">Occupied</span>
              </div>
            </Link>
          );
        }

        if (isOccupied) {
          return (
            <Link key={bed.id} href={`/patients/folder/${bed.patientId}`}>
              <div className="group bg-rose-50 border-2 border-rose-200 text-rose-950 rounded-2xl p-4 text-center cursor-pointer transition-all hover:bg-rose-600 hover:border-rose-600 hover:text-white hover:scale-105 shadow-sm">
                <BedDouble size={24} className="mx-auto mb-2 text-rose-600 group-hover:text-white animate-pulse" />
                <p className="text-[9px] font-black uppercase tracking-wider text-rose-500 group-hover:text-rose-200">{bed.bedId}</p>
                <p className="text-xs font-black truncate">{bed.patientName || 'Loading Patient...'}</p>
                <span className="text-[8px] bg-rose-200/50 text-rose-800 px-2 py-0.5 rounded-full font-black uppercase tracking-widest mt-1.5 inline-block group-hover:bg-rose-700 group-hover:text-white">Occupied</span>
              </div>
            </Link>
          );
        }

        return (
          <div 
            key={bed.id} 
            onClick={() => onAdmitClick({ bedId: bed.bedId, wardId, wardName })}
            className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-400 select-none cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-300 hover:scale-105 hover:text-slate-600"
          >
            <BedDouble size={24} className="mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-[9px] font-black uppercase tracking-wider">{bed.bedId}</p>
            <p className="text-xs font-medium italic mt-1 text-slate-400">Available</p>
          </div>
        );
      })}
    </div>
  );
}

export default function BedManagementPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [admitBed, setAdmitBed] = useState<any>(null);
  const [cleaningUp, setCleaningUp] = useState(false);

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

  const duplicatePatientIds = useMemo(() => {
    if (!admissions) return [];
    const patientCounts: Record<string, number> = {};
    admissions.forEach((adm) => {
      if (adm.patientId) {
        patientCounts[adm.patientId] = (patientCounts[adm.patientId] || 0) + 1;
      }
    });
    return Object.keys(patientCounts).filter((pid) => patientCounts[pid] > 1);
  }, [admissions]);

  const handleCleanupDuplicates = async () => {
    if (!firestore || !hospitalId || !admissions || !wards) return;
    setCleaningUp(true);
    try {
      let cleanedCount = 0;

      // 1. Group active admissions by patientId
      const groupedAdmissions: Record<string, Admission[]> = {};
      admissions.forEach((adm) => {
        if (adm.patientId) {
          if (!groupedAdmissions[adm.patientId]) {
            groupedAdmissions[adm.patientId] = [];
          }
          groupedAdmissions[adm.patientId].push(adm);
        }
      });

      // Keep track of which admission IDs we decide to keep
      const admissionsToKeep = new Set<string>();
      
      for (const patientId of Object.keys(groupedAdmissions)) {
        const patientAdms = groupedAdmissions[patientId];
        // Sort by admittedAt timestamp (earliest first)
        const sorted = [...patientAdms].sort((a: any, b: any) => {
          const timeA = a.admittedAt?.seconds || 0;
          const timeB = b.admittedAt?.seconds || 0;
          return timeA - timeB;
        });

        // Keep the earliest one
        admissionsToKeep.add(sorted[0].id);

        // Discharge the rest
        if (sorted.length > 1) {
          const duplicates = sorted.slice(1);
          for (const adm of duplicates) {
            const admRef = doc(firestore, `hospitals/${hospitalId}/admissions/${adm.id}`);
            await updateDoc(admRef, {
              status: 'DISCHARGED',
              dischargedAt: serverTimestamp(),
            });
            cleanedCount++;
          }
        }
      }

      // 2. Scan all beds across all wards to find orphaned occupancies or beds that were discharged
      for (const ward of wards) {
        const bedsRef = collection(firestore, `hospitals/${hospitalId}/wards/${ward.id}/beds`);
        const bedsSnap = await getDocs(bedsRef);
        
        let actualOccupancy = 0;
        
        for (const bedDoc of bedsSnap.docs) {
          const bed = bedDoc.data();
          const isOccupied = bed.status === 'Occupied' && bed.patientId;
          
          if (isOccupied) {
            // Find if there is a matching active admission that we kept
            const matchingAdm = admissions.find(
              (adm) => adm.patientId === bed.patientId && 
                       adm.wardId === ward.id && 
                       adm.bedId === bedDoc.id && 
                       adm.status === 'ADMITTED' &&
                       admissionsToKeep.has(adm.id)
            );
            
            if (!matchingAdm) {
              // No matching valid active admission! Free up the bed.
              const bedDocRef = doc(firestore, `hospitals/${hospitalId}/wards/${ward.id}/beds/${bedDoc.id}`);
              await updateDoc(bedDocRef, {
                status: 'Available',
                patientId: null,
                patientName: null,
                admittedAt: null,
              });
              cleanedCount++;
            } else {
              actualOccupancy++;
            }
          }
        }

        // Correct the ward occupancy count if it deviates from actualOccupancy or is negative
        if (ward.occupancy !== actualOccupancy || ward.occupancy < 0) {
          const wardRef = doc(firestore, `hospitals/${hospitalId}/wards/${ward.id}`);
          await updateDoc(wardRef, {
            occupancy: actualOccupancy
          });
        }
      }

      toast({
        title: 'System Self-Healed',
        description: `Cleaned up and synchronized ${cleanedCount} records. Ward occupancies have been re-calibrated.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Cleanup Failed',
        description: err.message,
      });
    } finally {
      setCleaningUp(false);
    }
  };

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);

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
        <div className="flex items-center gap-3">
          {(duplicatePatientIds.length > 0 || (wards && wards.some(w => w.occupancy < 0))) && (
            <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full font-black uppercase tracking-wider animate-pulse flex items-center gap-1.5">
              ⚠️ Inconsistencies Detected
            </span>
          )}
          <Button 
            onClick={handleCleanupDuplicates} 
            disabled={cleaningUp}
            variant="outline"
            className="border-2 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center gap-2 hover:bg-slate-50 transition-all text-slate-700 border-slate-200"
          >
            {cleaningUp ? <Loader2 className="animate-spin h-4 w-4" /> : <ShieldCheck className="h-4 w-4 text-emerald-600" />}
            Self-Heal Console
          </Button>
        </div>
      </div>
      
      {!wards || wards.length === 0 ? (
          <div className="text-center p-20 bg-card border-2 border-dashed rounded-2xl text-muted-foreground">
            <LayoutGrid className="h-12 w-12 mx-auto mb-2" />
            No wards have been configured for this hospital yet.
             <Button variant="link" onClick={() => router.push('/wards/setup')}>Go to Ward Setup</Button>
          </div>
      ) : (
        <div className="space-y-8">
            {wards.map(ward => (
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
                    
                    <WardBedGrid
                      wardId={ward.id}
                      wardName={ward.name}
                      hospitalId={hospitalId}
                      admissions={admissions}
                      firestore={firestore}
                      onAdmitClick={setAdmitBed}
                      toast={toast}
                    />
                </div>
            ))}
        </div>
      )}
      {admitBed && (
        <AdmitPatientToBedDialog
          open={!!admitBed}
          onOpenChange={(open: boolean) => !open && setAdmitBed(null)}
          bedId={admitBed.bedId}
          wardId={admitBed.wardId}
          wardName={admitBed.wardName}
          hospitalId={hospitalId}
          admissions={admissions}
          user={user}
          firestore={firestore}
          toast={toast}
        />
      )}
    </div>
  );
}
