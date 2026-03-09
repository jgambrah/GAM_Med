'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2, Save, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function CrossmatchDialog({ pint, hospitalId, open, onOpenChange }: any) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/patients`));
  }, [firestore, hospitalId]);
  const { data: patients, isLoading: patientsLoading } = useCollection(patientsQuery);

  // Filter patients client-side as the user types
  const filtered = useMemo(() => {
    if (!patients) return [];
    const term = search.toLowerCase().trim();
    if (!term) return patients;
    return patients.filter((p: any) =>
      `${p.firstName} ${p.lastName} ${p.ehrNumber}`.toLowerCase().includes(term)
    );
  }, [patients, search]);

  // Focus search box the moment the dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [dropdownOpen]);

  // Close dropdown on outside click — use capture phase so we win over the Dialog overlay
  useEffect(() => {
    if (!dropdownOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [dropdownOpen]);

  // Reset everything when the Dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedPatient(null);
      setSearch('');
      setDropdownOpen(false);
    }
  }, [open]);

  const handleSelect = (p: any) => {
    setSelectedPatient(p);
    setDropdownOpen(false);
    setSearch('');
  };

  const handleCrossmatch = async () => {
    if (!selectedPatient) {
      toast({ variant: 'destructive', title: 'Please select a patient.' });
      return;
    }
    setLoading(true);
    try {
      const pintRef = doc(firestore, `hospitals/${hospitalId}/blood_pints`, pint.id);
      updateDocumentNonBlocking(pintRef, {
        status: 'CROSSMATCHED',
        crossmatchedForPatientId: selectedPatient.id,
        crossmatchedForPatientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        crossmatchedAt: serverTimestamp(),
      });
      toast({
        title: 'Cross-match Complete',
        description: `Pint ${pint.pintId} is now reserved for ${selectedPatient.firstName}.`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Stop the Dialog itself from closing when the user interacts
        // with the dropdown list (which sits inside the Dialog DOM tree
        // but Radix can still misclassify as "outside")
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Cross-match Blood Pint</DialogTitle>
          <DialogDescription>
            Reserve pint #{pint.pintId} ({pint.bloodGroup}) for a specific patient.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/*
            WHY we dropped Radix Popover + Command:
            Radix Popover renders into its own portal *outside* the Dialog DOM
            node. The Dialog's focus-trap and overlay then treat any click on
            the portal-rendered list as "outside", firing PointerDownOutside
            and dismissing the dropdown before onSelect can run.

            Solution: a plain inline <div> dropdown that lives *inside* the
            Dialog DOM tree. No portals, no competing focus-traps, no event
            interception. Search filtering is done client-side with useMemo.
          */}
          <div ref={containerRef} className="relative w-full">

            {/* Trigger */}
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className={cn(
                'w-full flex items-center justify-between rounded-md border border-input',
                'bg-background px-3 py-2 text-sm shadow-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                dropdownOpen && 'ring-2 ring-ring ring-offset-2'
              )}
            >
              <span className={cn('truncate', !selectedPatient && 'text-muted-foreground')}>
                {patientsLoading
                  ? 'Loading patients...'
                  : selectedPatient
                  ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.ehrNumber})`
                  : 'Select Patient...'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>

            {/* Inline dropdown — no portal, no Radix Popover */}
            {dropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg">

                {/* Search row */}
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or EHR number..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    // Prevent Dialog from intercepting keypresses (e.g. Escape closing Dialog instead of clearing search)
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Escape') setDropdownOpen(false);
                    }}
                  />
                </div>

                {/* Results */}
                <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
                  {filtered.length === 0 ? (
                    <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No patient found.
                    </li>
                  ) : (
                    filtered.map((p: any) => (
                      <li
                        key={p.id}
                        role="option"
                        aria-selected={selectedPatient?.id === p.id}
                        // onMouseDown fires BEFORE the input loses focus (onBlur),
                        // so the dropdown stays open long enough to register the click.
                        // e.preventDefault() stops the input from blurring at all.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelect(p);
                        }}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer select-none',
                          'hover:bg-accent hover:text-accent-foreground',
                          selectedPatient?.id === p.id && 'bg-accent/60 font-medium'
                        )}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0 text-primary',
                            selectedPatient?.id === p.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span>
                          {p.firstName} {p.lastName}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {p.ehrNumber}
                          </span>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCrossmatch} disabled={loading || !selectedPatient}>
            {loading ? <Loader2 className="animate-spin" /> : <Save />}
            Confirm &amp; Reserve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
