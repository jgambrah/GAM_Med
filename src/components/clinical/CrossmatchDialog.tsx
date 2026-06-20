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
import { areBloodGroupsCompatible } from '@/lib/blood-compatibility';

export function CrossmatchDialog({ pint, hospitalId, open, onOpenChange }: any) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [manualVerifyChecked, setManualVerifyChecked] = useState(false);
  const [emergencyOverrideChecked, setEmergencyOverrideChecked] = useState(false);

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
      setManualVerifyChecked(false);
      setEmergencyOverrideChecked(false);
    }
  }, [open]);

  // Reset verify states when patient selection changes
  useEffect(() => {
    setManualVerifyChecked(false);
    setEmergencyOverrideChecked(false);
  }, [selectedPatient]);

  const handleSelect = (p: any) => {
    setSelectedPatient(p);
    setDropdownOpen(false);
    setSearch('');
  };

  const compatibility = useMemo(() => {
    if (!selectedPatient) return { isCompatible: true, isDocumented: false };
    const patientBg = selectedPatient.bloodGroup;
    if (!patientBg || patientBg === 'N/A') return { isCompatible: false, isDocumented: false };
    return {
      isCompatible: areBloodGroupsCompatible(pint.bloodGroup, patientBg),
      isDocumented: true,
      patientBg
    };
  }, [selectedPatient, pint.bloodGroup]);

  const isConfirmDisabled = useMemo(() => {
    if (loading || !selectedPatient) return true;
    if (!compatibility.isDocumented) return !manualVerifyChecked;
    if (!compatibility.isCompatible) return !emergencyOverrideChecked;
    return false;
  }, [loading, selectedPatient, compatibility, manualVerifyChecked, emergencyOverrideChecked]);

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
        compatibilityStatus: compatibility.isCompatible ? 'COMPATIBLE' : 'OVERRIDDEN',
        overrideReason: !compatibility.isDocumented ? 'Manual Verification' : !compatibility.isCompatible ? 'Emergency Override' : null,
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
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Cross-match Blood Pint</DialogTitle>
          <DialogDescription>
            Reserve pint #{pint.pintId} ({pint.bloodGroup}) for a specific patient.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
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
                  ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.ehrNumber})${selectedPatient.bloodGroup ? ` - Group ${selectedPatient.bloodGroup}` : ''}`
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
                        <span className="flex items-center justify-between w-full">
                          <span>
                            {p.firstName} {p.lastName}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {p.ehrNumber}
                            </span>
                          </span>
                          {p.bloodGroup && (
                            <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-700 rounded-full font-bold">
                              {p.bloodGroup}
                            </span>
                          )}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Compatibility Warn/Info Banners */}
          {selectedPatient && !compatibility.isDocumented && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 space-y-3">
              <p className="text-xs font-bold uppercase">⚠️ Patient Blood Group Unknown</p>
              <p className="text-xs">
                This patient does not have a documented blood group. Please manually verify compatibility before reserving this pint.
              </p>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={manualVerifyChecked} 
                  onChange={(e) => setManualVerifyChecked(e.target.checked)} 
                  className="rounded border-amber-300"
                />
                I have manually verified the patient's blood group is compatible.
              </label>
            </div>
          )}

          {selectedPatient && compatibility.isDocumented && !compatibility.isCompatible && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 space-y-3">
              <p className="text-xs font-black uppercase flex items-center gap-2">
                🚨 Critical Mismatch Detected
              </p>
              <p className="text-xs font-semibold">
                Donor Group ({pint.bloodGroup}) is NOT compatible with Patient Group ({compatibility.patientBg}).
              </p>
              <label className="flex items-center gap-2 text-xs font-black cursor-pointer text-red-900 bg-red-100 p-2.5 rounded-lg border border-red-300">
                <input 
                  type="checkbox" 
                  checked={emergencyOverrideChecked} 
                  onChange={(e) => setEmergencyOverrideChecked(e.target.checked)} 
                  className="rounded border-red-400"
                />
                Emergency Clinical Override (Authorize matching manually)
              </label>
            </div>
          )}

          {selectedPatient && compatibility.isDocumented && compatibility.isCompatible && (
            <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-800">
              <p className="text-xs font-bold uppercase">✓ Compatible Blood Group</p>
              <p className="text-xs">
                Donor Group {pint.bloodGroup} is compatible with Patient Group {compatibility.patientBg}.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCrossmatch} disabled={isConfirmDisabled}>
            {loading ? <Loader2 className="animate-spin" /> : <Save />}
            Confirm &amp; Reserve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
