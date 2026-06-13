'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { Calendar, Clock, User, Scissors, CheckCircle2, Loader2, ShieldAlert, ChevronsUpDown, Check, Search, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Surgery = {
  id: string;
  theaterName: string;
  scheduledTime: string;
  procedureName: string;
  procedurePrice?: number;
  patientName: string;
  surgeonName: string;
  patientId: string;
};

export default function TheaterSchedule() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'].includes(userProfile?.role || '');

  const surgeriesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/surgeries`),
      where("status", "==", "SCHEDULED"),
      orderBy("scheduledDate", "asc")
    );
  }, [firestore, hospitalId]);

  const { data: surgeries, isLoading: areSurgeriesLoading } = useCollection<Surgery>(surgeriesQuery);

  // Fetch patients and theaters for scheduling dialog
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/patients`));
  }, [firestore, hospitalId]);
  const { data: patients, isLoading: patientsLoading } = useCollection<any>(patientsQuery);

  const theatersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/theaters`));
  }, [firestore, hospitalId]);
  const { data: theaters, isLoading: theatersLoading } = useCollection<any>(theatersQuery);

  const doctorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, 'users'),
      where('hospitalId', '==', hospitalId),
      where('role', '==', 'DOCTOR'),
      where('is_active', '==', true)
    );
  }, [firestore, hospitalId]);
  const { data: doctors, isLoading: doctorsLoading } = useCollection<any>(doctorsQuery);

  const proceduresQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/procedure_menu`));
  }, [firestore, hospitalId]);
  const { data: procedures, isLoading: proceduresLoading } = useCollection<any>(proceduresQuery);

  // Scheduling dialog states
  const [isNewSurgeryOpen, setIsNewSurgeryOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [procedureName, setProcedureName] = useState('');
  const [procedurePrice, setProcedurePrice] = useState<number | null>(null);
  const [surgeonName, setSurgeonName] = useState('');
  const [selectedTheater, setSelectedTheater] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Dropdowns opens & search values
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

  const [surgeonDropdownOpen, setSurgeonDropdownOpen] = useState(false);
  const [surgeonSearch, setSurgeonSearch] = useState('');

  const [procedureDropdownOpen, setProcedureDropdownOpen] = useState(false);
  const [procedureSearch, setProcedureSearch] = useState('');

  // Refs
  const patientSearchInputRef = useRef<HTMLInputElement>(null);
  const patientDropdownContainerRef = useRef<HTMLDivElement>(null);

  const surgeonSearchInputRef = useRef<HTMLInputElement>(null);
  const surgeonDropdownContainerRef = useRef<HTMLDivElement>(null);

  const procedureSearchInputRef = useRef<HTMLInputElement>(null);
  const procedureDropdownContainerRef = useRef<HTMLDivElement>(null);

  // Filter patients client-side
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const term = patientSearch.toLowerCase().trim();
    if (!term) return patients;
    return patients.filter((p: any) =>
      `${p.firstName} ${p.lastName} ${p.ehrNumber}`.toLowerCase().includes(term)
    );
  }, [patients, patientSearch]);

  // Filter doctors client-side
  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];
    const term = surgeonSearch.toLowerCase().trim();
    if (!term) return doctors;
    return doctors.filter((d: any) =>
      d.fullName.toLowerCase().includes(term)
    );
  }, [doctors, surgeonSearch]);

  // Filter procedures client-side
  const filteredProcedures = useMemo(() => {
    if (!procedures) return [];
    const term = procedureSearch.toLowerCase().trim();
    if (!term) return procedures;
    return procedures.filter((p: any) =>
      p.name.toLowerCase().includes(term)
    );
  }, [procedures, procedureSearch]);

  // Focus search box on dropdown open
  useEffect(() => {
    if (patientDropdownOpen) setTimeout(() => patientSearchInputRef.current?.focus(), 50);
  }, [patientDropdownOpen]);

  useEffect(() => {
    if (surgeonDropdownOpen) setTimeout(() => surgeonSearchInputRef.current?.focus(), 50);
  }, [surgeonDropdownOpen]);

  useEffect(() => {
    if (procedureDropdownOpen) setTimeout(() => procedureSearchInputRef.current?.focus(), 50);
  }, [procedureDropdownOpen]);

  // Handle outside click to close dropdowns
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (patientDropdownOpen && patientDropdownContainerRef.current && !patientDropdownContainerRef.current.contains(target)) {
        setPatientDropdownOpen(false);
      }
      if (surgeonDropdownOpen && surgeonDropdownContainerRef.current && !surgeonDropdownContainerRef.current.contains(target)) {
        setSurgeonDropdownOpen(false);
      }
      if (procedureDropdownOpen && procedureDropdownContainerRef.current && !procedureDropdownContainerRef.current.contains(target)) {
        setProcedureDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [patientDropdownOpen, surgeonDropdownOpen, procedureDropdownOpen]);

  // Reset form states on close
  useEffect(() => {
    if (!isNewSurgeryOpen) {
      setSelectedPatient(null);
      setProcedureName('');
      setProcedurePrice(null);
      setSurgeonName('');
      setSelectedTheater('');
      setScheduledDate('');
      setScheduledTime('');
      setPatientSearch('');
      setPatientDropdownOpen(false);
      setSurgeonSearch('');
      setSurgeonDropdownOpen(false);
      setProcedureSearch('');
      setProcedureDropdownOpen(false);
    }
  }, [isNewSurgeryOpen]);

  // Format HTML 24h time input to 12-hour text (e.g. 14:30 -> 02:30 PM)
  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [hoursStr, minutesStr] = time24.split(':');
    const hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${minutesStr} ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !hospitalId) return;

    if (!selectedPatient) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a patient.' });
      return;
    }
    if (!procedureName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a clinical procedure.' });
      return;
    }
    if (!surgeonName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a surgeon.' });
      return;
    }
    if (!selectedTheater) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an operating theater.' });
      return;
    }
    if (!scheduledDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a scheduled date.' });
      return;
    }
    if (!scheduledTime) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a scheduled time.' });
      return;
    }

    setLoading(true);
    try {
      const formattedTime = formatTime12Hour(scheduledTime);
      const surgeryData = {
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        procedureName,
        procedurePrice: procedurePrice ?? 1500,
        surgeonName: surgeonName.trim(),
        theaterName: selectedTheater,
        scheduledDate,
        scheduledTime: formattedTime,
        status: 'SCHEDULED',
        createdAt: serverTimestamp(),
      };

      await addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/surgeries`), surgeryData);

      toast({
        title: 'Surgery Scheduled',
        description: `${procedureName} scheduled for ${selectedPatient.firstName} ${selectedPatient.lastName} in ${selectedTheater}.`,
      });
      setIsNewSurgeryOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Scheduling Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading;
  
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this high-security module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 text-black font-bold">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
           <h1 className="text-3xl font-black uppercase tracking-tighter italic text-black">OT <span className="text-primary">Schedule</span></h1>
           <p className="text-muted-foreground font-medium">Live surgical board for all scheduled operations.</p>
        </div>
        <Button onClick={() => setIsNewSurgeryOpen(true)}>New Surgery</Button>
      </div>
      
      {areSurgeriesLoading ? (
        <div className="text-center p-20"><Loader2 className="animate-spin text-primary" /></div>
      ) : surgeries?.length === 0 ? (
        <div className="text-center p-20 bg-card rounded-2xl border-2 border-dashed">
            <p className="font-bold text-muted-foreground">No surgeries scheduled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surgeries?.map(s => (
            <div key={s.id} className="bg-card p-6 rounded-[32px] border-4 border-foreground shadow-[8px_8px_0px_0px_hsl(var(--foreground))] space-y-4">
              <div className="flex justify-between items-start">
                 <span className="text-[9px] font-black bg-primary text-primary-foreground px-3 py-1 rounded-full uppercase italic">{s.theaterName}</span>
                 <span className="text-[10px] text-muted-foreground uppercase font-bold">{s.scheduledTime}</span>
              </div>
              <div>
                 <p className="text-sm font-black uppercase">{s.procedureName}</p>
                 <p className="text-[10px] text-primary mt-1 uppercase">Patient: {s.patientName}</p>
              </div>
              <div className="pt-4 border-t flex justify-between items-center">
                 <p className="text-[9px] text-muted-foreground font-bold uppercase italic">Surgeon: Dr. {s.surgeonName}</p>
                 <Link href={`/theater/log/${s.id}`} className="bg-foreground text-background p-2 rounded-xl hover:bg-primary transition-all"><Scissors size={14}/></Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Surgery Scheduling Dialog */}
      <Dialog open={isNewSurgeryOpen} onOpenChange={setIsNewSurgeryOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="sm:max-w-md bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-2xl font-bold text-black"
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic text-black">
              Schedule <span className="text-primary">Surgery</span>
            </DialogTitle>
            <p className="text-muted-foreground font-medium text-xs">Book an Operating Theater and Surgeon.</p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-black">
            {/* Patient selection (Searchable) */}
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Select Patient</label>
              <div ref={patientDropdownContainerRef} className="relative w-full">
                <button
                  type="button"
                  onClick={() => setPatientDropdownOpen((o) => !o)}
                  className={cn(
                    'w-full flex items-center justify-between rounded-xl border border-input',
                    'bg-slate-50 px-3 py-2 text-sm shadow-sm transition-all',
                    'hover:bg-slate-100',
                    'focus:outline-none focus:ring-2 focus:ring-slate-900',
                    patientDropdownOpen && 'ring-2 ring-slate-900'
                  )}
                >
                  <span className={cn('truncate', !selectedPatient && 'text-muted-foreground font-medium')}>
                    {patientsLoading
                      ? 'Loading patients...'
                      : selectedPatient
                      ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.ehrNumber})`
                      : 'Select Patient...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>

                {patientDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border-2 border-slate-900 bg-white text-black shadow-lg">
                    {/* Search input */}
                    <div className="flex items-center gap-2 border-b border-slate-900 px-3 py-2">
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input
                        ref={patientSearchInputRef}
                        type="text"
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        placeholder="Search by name or EHR number..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-bold"
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Escape') setPatientDropdownOpen(false);
                        }}
                      />
                    </div>

                    {/* Patients list */}
                    <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
                      {filteredPatients.length === 0 ? (
                        <li className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                          No patient found.
                        </li>
                      ) : (
                        filteredPatients.map((p: any) => (
                          <li
                            key={p.id}
                            role="option"
                            aria-selected={selectedPatient?.id === p.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedPatient(p);
                              setPatientDropdownOpen(false);
                              setPatientSearch('');
                            }}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 text-xs cursor-pointer select-none font-bold',
                              'hover:bg-slate-100 hover:text-black',
                              selectedPatient?.id === p.id && 'bg-slate-200'
                            )}
                          >
                            <Check
                              className={cn(
                                'h-3 w-3 shrink-0 text-primary',
                                selectedPatient?.id === p.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span>
                              {p.firstName} {p.lastName}
                              <span className="ml-2 text-[10px] text-muted-foreground">
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

            {/* Operating Theater select */}
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Operating Room</label>
              <Select onValueChange={setSelectedTheater} value={selectedTheater}>
                <SelectTrigger className="w-full bg-slate-50 border rounded-xl mt-1 font-bold">
                  <SelectValue placeholder={theatersLoading ? "Loading theaters..." : "Select Operating Room"} />
                </SelectTrigger>
                <SelectContent className="font-bold">
                  {theaters?.map(t => (
                    <SelectItem key={t.id} value={t.name}>{t.name} ({t.type})</SelectItem>
                  ))}
                  {!theatersLoading && (!theaters || theaters.length === 0) && (
                    <div className="p-2 text-xs text-muted-foreground italic text-center">No operating rooms configured.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Procedure Selection (Searchable) */}
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Select Procedure (Tariff)</label>
              <div ref={procedureDropdownContainerRef} className="relative w-full">
                <button
                  type="button"
                  onClick={() => setProcedureDropdownOpen((o) => !o)}
                  className={cn(
                    'w-full flex items-center justify-between rounded-xl border border-input',
                    'bg-slate-50 px-3 py-2 text-sm shadow-sm transition-all',
                    'hover:bg-slate-100',
                    'focus:outline-none focus:ring-2 focus:ring-slate-900',
                    procedureDropdownOpen && 'ring-2 ring-slate-900'
                  )}
                >
                  <span className={cn('truncate', !procedureName && 'text-muted-foreground font-medium')}>
                    {proceduresLoading
                      ? 'Loading procedures...'
                      : procedureName
                      ? `${procedureName} (₵${procedurePrice?.toFixed(2)})`
                      : 'Select Procedure...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>

                {procedureDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border-2 border-slate-900 bg-white text-black shadow-lg">
                    {/* Search input */}
                    <div className="flex items-center gap-2 border-b border-slate-900 px-3 py-2">
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input
                        ref={procedureSearchInputRef}
                        type="text"
                        value={procedureSearch}
                        onChange={(e) => setProcedureSearch(e.target.value)}
                        placeholder="Search by procedure name..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-bold"
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Escape') setProcedureDropdownOpen(false);
                        }}
                      />
                    </div>

                    {/* Procedures list */}
                    <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
                      {filteredProcedures.length === 0 ? (
                        <li className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                          No procedures found.
                        </li>
                      ) : (
                        filteredProcedures.map((p: any) => (
                          <li
                            key={p.id}
                            role="option"
                            aria-selected={procedureName === p.name}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setProcedureName(p.name);
                              setProcedurePrice(p.price);
                              setProcedureDropdownOpen(false);
                              setProcedureSearch('');
                            }}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 text-xs cursor-pointer select-none font-bold',
                              'hover:bg-slate-100 hover:text-black',
                              procedureName === p.name && 'bg-slate-200'
                            )}
                          >
                            <Check
                              className={cn(
                                'h-3 w-3 shrink-0 text-primary',
                                procedureName === p.name ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span>
                              {p.name}
                              <span className="ml-2 text-[10px] text-muted-foreground font-black font-sans">
                                ₵{p.price.toFixed(2)}
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

            {/* Surgeon Selection (Searchable) */}
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Select Surgeon</label>
              <div ref={surgeonDropdownContainerRef} className="relative w-full">
                <button
                  type="button"
                  onClick={() => setSurgeonDropdownOpen((o) => !o)}
                  className={cn(
                    'w-full flex items-center justify-between rounded-xl border border-input',
                    'bg-slate-50 px-3 py-2 text-sm shadow-sm transition-all',
                    'hover:bg-slate-100',
                    'focus:outline-none focus:ring-2 focus:ring-slate-900',
                    surgeonDropdownOpen && 'ring-2 ring-slate-900'
                  )}
                >
                  <span className={cn('truncate', !surgeonName && 'text-muted-foreground font-medium')}>
                    {doctorsLoading
                      ? 'Loading doctors...'
                      : surgeonName
                      ? `Dr. ${surgeonName}`
                      : 'Select Surgeon...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>

                {surgeonDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border-2 border-slate-900 bg-white text-black shadow-lg">
                    {/* Search input */}
                    <div className="flex items-center gap-2 border-b border-slate-900 px-3 py-2">
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input
                        ref={surgeonSearchInputRef}
                        type="text"
                        value={surgeonSearch}
                        onChange={(e) => setSurgeonSearch(e.target.value)}
                        placeholder="Search by surgeon name..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-bold"
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Escape') setSurgeonDropdownOpen(false);
                        }}
                      />
                    </div>

                    {/* Doctors list */}
                    <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
                      {filteredDoctors.length === 0 ? (
                        <li className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                          No doctors found.
                        </li>
                      ) : (
                        filteredDoctors.map((doc: any) => (
                          <li
                            key={doc.id}
                            role="option"
                            aria-selected={surgeonName === doc.fullName}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSurgeonName(doc.fullName);
                              setSurgeonDropdownOpen(false);
                              setSurgeonSearch('');
                            }}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 text-xs cursor-pointer select-none font-bold',
                              'hover:bg-slate-100 hover:text-black',
                              surgeonName === doc.fullName && 'bg-slate-200'
                            )}
                          >
                            <Check
                              className={cn(
                                'h-3 w-3 shrink-0 text-primary',
                                surgeonName === doc.fullName ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span>
                              Dr. {doc.fullName}
                              {doc.contractType === 'LOCUM' && (
                                <span className="ml-2 text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase italic">Locum</span>
                              )}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Scheduled Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Date</label>
                <Input
                  type="date"
                  className="bg-slate-50 border rounded-xl mt-1 font-bold"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Time</label>
                <Input
                  type="time"
                  className="bg-slate-50 border rounded-xl mt-1 font-bold"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                />
              </div>
            </div>            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsNewSurgeryOpen(false)} className="rounded-xl font-bold uppercase text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg hover:bg-black hover:scale-[1.02] transition-all flex items-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={16} />} Schedule Surgery
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
