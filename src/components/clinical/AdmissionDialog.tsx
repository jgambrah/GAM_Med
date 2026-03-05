'use client';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, increment, getDocs } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Bed, Loader2, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface AdmissionDialogProps {
    patientId: string;
    patientName: string;
    hospitalId: string;
}

interface BedData {
    id: string;
    bedId: string;
    wardId: string;
    wardName: string;
}

interface WardData {
    id: string;
    // other ward fields if needed
}

export function AdmissionDialog({ patientId, patientName, hospitalId }: AdmissionDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<BedData | null>(null);

  const [availableBeds, setAvailableBeds] = useState<BedData[]>([]);
  const [bedsLoading, setBedsLoading] = useState(false);

  // 1. Fetch all wards for the hospital when the dialog is opened
  const wardsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !open) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/wards`));
  }, [firestore, hospitalId, open]);

  const { data: wards, isLoading: wardsLoading } = useCollection<WardData>(wardsQuery);

  // 2. When wards are loaded, fetch available beds from each ward
  useEffect(() => {
    if (!wards || !firestore || !open) {
        setAvailableBeds([]);
        return;
    }

    const fetchBeds = async () => {
        setBedsLoading(true);
        const allBeds: BedData[] = [];
        
        try {
            const bedPromises = wards.map(ward => {
                const bedsRef = collection(firestore, `hospitals/${hospitalId}/wards/${ward.id}/beds`);
                const q = query(bedsRef, where("status", "==", "Available"));
                return getDocs(q);
            });
            
            const bedSnapshots = await Promise.all(bedPromises);

            bedSnapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    allBeds.push({ id: doc.id, ...doc.data() } as BedData);
                });
            });
            
            setAvailableBeds(allBeds);
        } catch (error) {
            console.error("Error fetching available beds:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch available beds.' });
        } finally {
            setBedsLoading(false);
        }
    };

    fetchBeds();
  }, [wards, firestore, hospitalId, open, toast]);


  const handleAdmit = async () => {
    if (!selectedBed || !user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Bed not selected or system not ready.' });
        return;
    }
    setLoading(true);

    const admissionCollectionRef = collection(firestore, `hospitals/${hospitalId}/admissions`);
    const newAdmissionRef = doc(admissionCollectionRef); // Create a reference for the new admission
    const bedRef = doc(firestore, `hospitals/${hospitalId}/wards/${selectedBed.wardId}/beds/${selectedBed.id}`);
    const wardRef = doc(firestore, `hospitals/${hospitalId}/wards/${selectedBed.wardId}`);

    try {
      // These are non-blocking writes
      addDocumentNonBlocking(admissionCollectionRef, {
        admissionId: newAdmissionRef.id,
        patientId,
        patientName,
        hospitalId,
        wardId: selectedBed.wardId,
        bedId: selectedBed.id,
        admittedBy: user.uid,
        status: 'ADMITTED',
        admittedAt: serverTimestamp(),
      });

      updateDocumentNonBlocking(bedRef, {
        status: 'Occupied',
        patientId: patientId,
        patientName: patientName,
        admittedAt: serverTimestamp()
      });

      updateDocumentNonBlocking(wardRef, {
        occupancy: increment(1)
      });

      toast({
        title: "Patient Admitted Successfully",
        description: `${patientName} has been assigned to bed ${selectedBed.bedId}.`,
      });
      setOpen(false);
      setSelectedBed(null);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Admission Failed",
        description: e.message,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const isDataLoading = wardsLoading || bedsLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Bed size={16} /> Admit to Ward
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Clinical Admission</DialogTitle>
          <DialogDescription>Assigning {patientName} to an available bed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
           <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase">Select Available Bed</label>
              <div className="grid grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto p-1 bg-muted/50 rounded-lg">
                {isDataLoading && <div className="col-span-3 flex justify-center p-8"><Loader2 className="animate-spin" /></div>}
                {!isDataLoading && availableBeds && availableBeds.length === 0 && (
                    <div className="col-span-3 text-center text-sm text-muted-foreground italic py-8">
                        <AlertCircle className="mx-auto mb-2" />
                        No available beds found.
                    </div>
                )}
                {availableBeds?.map(bed => (
                  <div 
                    key={bed.id} 
                    onClick={() => setSelectedBed(bed)}
                    className={`p-3 border-2 rounded-xl text-center cursor-pointer transition-all ${selectedBed?.id === bed.id ? 'border-primary bg-primary/10 text-primary' : 'border-card text-muted-foreground bg-background hover:border-primary/50'}`}
                  >
                    <Bed size={18} className="mx-auto mb-1" />
                    <span className="text-[10px] font-black">{bed.bedId}</span>
                    <p className='text-[8px] truncate'>{bed.wardName}</p>
                  </div>
                ))}
              </div>
           </div>
           <Button 
             disabled={loading || !selectedBed}
             onClick={handleAdmit}
             className="w-full"
           >
             {loading ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Confirm Admission</>}
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
