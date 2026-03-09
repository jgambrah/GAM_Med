
'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Droplets, User, Check, ChevronsUpDown, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export function CrossmatchDialog({ pint, hospitalId, open, onOpenChange }: any) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isPatientSelectorOpen, setIsPatientSelectorOpen] = useState(false);

  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/patients`));
  }, [firestore, hospitalId]);
  const { data: patients, isLoading: patientsLoading } = useCollection(patientsQuery);

  const handleCrossmatch = async () => {
    if (!selectedPatient) {
        toast({ variant: 'destructive', title: "Please select a patient." });
        return;
    }
    setLoading(true);

    try {
        const pintRef = doc(firestore, `hospitals/${hospitalId}/blood_pints`, pint.id);
        updateDocumentNonBlocking(pintRef, {
            status: 'CROSSMATCHED',
            crossmatchedForPatientId: selectedPatient.id,
            crossmatchedForPatientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
            crossmatchedAt: serverTimestamp()
        });
        toast({ title: 'Cross-match Complete', description: `Pint ${pint.pintId} is now reserved for ${selectedPatient.firstName}.` });
        onOpenChange(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Cross-match Blood Pint</DialogTitle>
                <DialogDescription>Reserve pint #{pint.pintId} ({pint.bloodGroup}) for a specific patient.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Popover open={isPatientSelectorOpen} onOpenChange={setIsPatientSelectorOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={isPatientSelectorOpen} className="w-full justify-between">
                            {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.ehrNumber})` : (patientsLoading ? "Loading patients..." : "Select Patient...")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search patient..." />
                            <CommandList>
                               <CommandEmpty>No patient found.</CommandEmpty>
                               <CommandGroup>
                                 {patients?.map((p) => (
                                     <CommandItem key={p.id} value={`${p.firstName} ${p.lastName} ${p.ehrNumber}`} onSelect={() => { setSelectedPatient(p); setIsPatientSelectorOpen(false); }}>
                                       <Check className={cn("mr-2 h-4 w-4", selectedPatient?.id === p.id ? "opacity-100" : "opacity-0")} />
                                       {p.firstName} {p.lastName}
                                     </CommandItem>
                                 ))}
                               </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleCrossmatch} disabled={loading || !selectedPatient}>
                   {loading ? <Loader2 className="animate-spin"/> : <Save/>} Confirm & Reserve
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
