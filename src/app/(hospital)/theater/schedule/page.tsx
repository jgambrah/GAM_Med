'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Calendar, Clock, User, Scissors, CheckCircle2, Loader2, ShieldAlert, ChevronsUpDown, Check, Search, Plus, Save, Trash2, Eye, Ban, FileText, Sparkles, XCircle } from 'lucide-react';
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
  scheduledDate: string;
  procedureName: string;
  procedurePrice?: number;
  patientName: string;
  surgeonName: string;
  patientId: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  completedAt?: any;
  cancelledAt?: any;
  findings?: string;
  anesthesiaType?: string;
  bloodLoss?: string;
  postOpInstructions?: string;
  checklist?: any;
};

export default function TheaterSchedule() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'SCHEDULED' | 'ARCHIVE'>('SCHEDULED');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'].includes(userProfile?.role || '');

  // Query all surgeries in the hospital (index-free, client-side split)
  const surgeriesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/surgeries`)
    );
  }, [firestore, hospitalId]);

  const { data: allSurgeries, isLoading: areSurgeriesLoading } = useCollection<Surgery>(surgeriesQuery);

  // Fetch patients, theaters, doctors and procedures for forms
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

  // Client-side splitting & sorting
  const activeSurgeries = useMemo(() => {
    if (!allSurgeries) return [];
    return allSurgeries
      .filter((s: Surgery) => s.status === 'SCHEDULED')
      .sort((a, b) => {
        const dateCompare = a.scheduledDate.localeCompare(b.scheduledDate);
        if (dateCompare !== 0) return dateCompare;
        return a.scheduledTime.localeCompare(b.scheduledTime);
      });
  }, [allSurgeries]);

  const archiveSurgeries = useMemo(() => {
    if (!allSurgeries) return [];
    return allSurgeries
      .filter((s: Surgery) => s.status === 'COMPLETED' || s.status === 'CANCELLED')
      .sort((a, b) => {
        const aTime = a.completedAt?.seconds || a.cancelledAt?.seconds || 0;
        const bTime = b.completedAt?.seconds || b.cancelledAt?.seconds || 0;
        return bTime - aTime;
      });
  }, [allSurgeries]);

  // Search filters
  const [archiveSearch, setArchiveSearch] = useState('');
  const filteredArchiveSurgeries = useMemo(() => {
    const term = archiveSearch.toLowerCase().trim();
    if (!term) return archiveSurgeries;
    return archiveSurgeries.filter((s: Surgery) =>
      s.patientName.toLowerCase().includes(term) ||
      s.procedureName.toLowerCase().includes(term) ||
      s.surgeonName.toLowerCase().includes(term) ||
      s.theaterName.toLowerCase().includes(term)
    );
  }, [archiveSurgeries, archiveSearch]);

  // Dialog State: Book Surgery
  const [isNewSurgeryOpen, setIsNewSurgeryOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [procedureName, setProcedureName] = useState('');
  const [procedurePrice, setProcedurePrice] = useState<number | null>(null);
  const [surgeonName, setSurgeonName] = useState('');
  const [selectedTheater, setSelectedTheater] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Dialog State: Reschedule Surgery
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleSurgery, setRescheduleSurgery] = useState<Surgery | null>(null);
  const [rescheduleTheater, setRescheduleTheater] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSurgeon, setRescheduleSurgeon] = useState('');
  const [rescheduleSurgeonDropdownOpen, setRescheduleSurgeonDropdownOpen] = useState(false);
  const [rescheduleSurgeonSearch, setRescheduleSurgeonSearch] = useState('');

  // Dialog State: Cancel Surgery
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelSurgery, setCancelSurgery] = useState<Surgery | null>(null);

  // Dialog State: View Archive Details
  const [isArchiveDetailsOpen, setIsArchiveDetailsOpen] = useState(false);
  const [selectedArchiveSurgery, setSelectedArchiveSurgery] = useState<Surgery | null>(null);

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

  const rescheduleSurgeonDropdownContainerRef = useRef<HTMLDivElement>(null);
  const rescheduleSurgeonSearchInputRef = useRef<HTMLInputElement>(null);

  // Filter lists client-side
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const term = patientSearch.toLowerCase().trim();
    if (!term) return patients;
    return patients.filter((p: any) =>
      `${p.firstName} ${p.lastName} ${p.ehrNumber}`.toLowerCase().includes(term)
    );
  }, [patients, patientSearch]);

  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];
    const term = surgeonSearch.toLowerCase().trim();
    if (!term) return doctors;
    return doctors.filter((d: any) =>
      d.fullName.toLowerCase().includes(term)
    );
  }, [doctors, surgeonSearch]);

  const filteredRescheduleDoctors = useMemo(() => {
    if (!doctors) return [];
    const term = rescheduleSurgeonSearch.toLowerCase().trim();
    if (!term) return doctors;
    return doctors.filter((d: any) =>
      d.fullName.toLowerCase().includes(term)
    );
  }, [doctors, rescheduleSurgeonSearch]);

  const filteredProcedures = useMemo(() => {
    if (!procedures) return [];
    const term = procedureSearch.toLowerCase().trim();
    if (!term) return procedures;
    return procedures.filter((p: any) =>
      p.name.toLowerCase().includes(term)
    );
  }, [procedures, procedureSearch]);

  // Focus search boxes
  useEffect(() => {
    if (patientDropdownOpen) setTimeout(() => patientSearchInputRef.current?.focus(), 50);
  }, [patientDropdownOpen]);

  useEffect(() => {
    if (surgeonDropdownOpen) setTimeout(() => surgeonSearchInputRef.current?.focus(), 50);
  }, [surgeonDropdownOpen]);

  useEffect(() => {
    if (procedureDropdownOpen) setTimeout(() => procedureSearchInputRef.current?.focus(), 50);
  }, [procedureDropdownOpen]);

  useEffect(() => {
    if (rescheduleSurgeonDropdownOpen) setTimeout(() => rescheduleSurgeonSearchInputRef.current?.focus(), 50);
  }, [rescheduleSurgeonDropdownOpen]);

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
      if (rescheduleSurgeonDropdownOpen && rescheduleSurgeonDropdownContainerRef.current && !rescheduleSurgeonDropdownContainerRef.current.contains(target)) {
        setRescheduleSurgeonDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [patientDropdownOpen, surgeonDropdownOpen, procedureDropdownOpen, rescheduleSurgeonDropdownOpen]);

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

  // Convert 12h time back to 24h format for input field (e.g. 02:30 PM -> 14:30)
  const convertTime12to24 = (time12: string) => {
    if (!time12) return '';
    const [time, modifier] = time12.split(' ');
    let [hoursStr, minutes] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    if (hours === 12) {
      hours = 0;
    }
    if (modifier === 'PM') {
      hours = hours + 12;
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`;
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

  const handleOpenReschedule = (surgery: Surgery) => {
    setRescheduleSurgery(surgery);
    setRescheduleTheater(surgery.theaterName || '');
    setRescheduleDate(surgery.scheduledDate || '');
    setRescheduleTime(surgery.scheduledTime ? convertTime12to24(surgery.scheduledTime) : '');
    setRescheduleSurgeon(surgery.surgeonName || '');
    setRescheduleSurgeonSearch('');
    setIsRescheduleOpen(true);
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !hospitalId || !rescheduleSurgery) return;

    setLoading(true);
    try {
      const formattedTime = formatTime12Hour(rescheduleTime);
      const surgeryRef = doc(firestore, `hospitals/${hospitalId}/surgeries`, rescheduleSurgery.id);
      
      const batch = writeBatch(firestore);
      batch.update(surgeryRef, {
        theaterName: rescheduleTheater,
        scheduledDate: rescheduleDate,
        scheduledTime: formattedTime,
        surgeonName: rescheduleSurgeon.trim(),
        updatedAt: serverTimestamp()
      });
      await batch.commit();

      toast({
        title: 'Surgery Rescheduled',
        description: `Successfully rescheduled to ${rescheduleDate} at ${formattedTime}.`,
      });
      setIsRescheduleOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Rescheduling Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCancel = (surgery: Surgery) => {
    setCancelSurgery(surgery);
    setIsCancelOpen(true);
  };

  const handleCancelSubmit = async () => {
    if (!firestore || !hospitalId || !cancelSurgery) return;

    setLoading(true);
    try {
      const surgeryRef = doc(firestore, `hospitals/${hospitalId}/surgeries`, cancelSurgery.id);
      const batch = writeBatch(firestore);
      batch.update(surgeryRef, {
        status: 'CANCELLED',
        cancelledAt: serverTimestamp()
      });
      await batch.commit();

      toast({
        title: 'Surgery Cancelled',
        description: `Successfully cancelled scheduled surgery for ${cancelSurgery.patientName}.`,
      });
      setIsCancelOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Cancellation Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenArchiveDetails = (surgery: Surgery) => {
    setSelectedArchiveSurgery(surgery);
    setIsArchiveDetailsOpen(true);
  };

  const isLoading = isUserLoading || isProfileLoading;
  
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-16 w-16 text-primary" /></div>;
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4 text-black">
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
    <div className="p-8 space-y-8 text-black font-bold max-w-7xl mx-auto">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b pb-6 gap-4">
        <div>
           <h1 className="text-3xl font-black uppercase tracking-tighter italic text-black">Operating <span className="text-primary">Theater</span></h1>
           <p className="text-muted-foreground font-medium text-xs uppercase tracking-wider mt-1">Surgical logboards, compliance checklists, &amp; logs database.</p>
        </div>
        <Button onClick={() => setIsNewSurgeryOpen(true)} className="sm:self-end">Schedule Surgery</Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b-2 border-slate-100 pb-1 gap-8">
        <button
          type="button"
          onClick={() => setActiveTab('SCHEDULED')}
          className={cn(
            "pb-3 text-sm font-black uppercase tracking-wider relative transition-all flex items-center gap-2",
            activeTab === 'SCHEDULED' ? "text-primary" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Calendar size={16} />
          Active Schedule ({activeSurgeries.length})
          {activeTab === 'SCHEDULED' && <span className="absolute bottom-[-2px] left-0 right-0 h-[3px] bg-primary rounded-full" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ARCHIVE')}
          className={cn(
            "pb-3 text-sm font-black uppercase tracking-wider relative transition-all flex items-center gap-2",
            activeTab === 'ARCHIVE' ? "text-primary" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <FileText size={16} />
          Surgical Archives ({archiveSurgeries.length})
          {activeTab === 'ARCHIVE' && <span className="absolute bottom-[-2px] left-0 right-0 h-[3px] bg-primary rounded-full" />}
        </button>
      </div>
      
      {areSurgeriesLoading ? (
        <div className="text-center p-20"><Loader2 className="animate-spin text-primary mx-auto" /></div>
      ) : activeTab === 'SCHEDULED' ? (
        // ACTIVE SCHEDULE LISTING
        activeSurgeries.length === 0 ? (
          <div className="text-center p-20 bg-card rounded-[32px] border-4 border-dashed border-slate-200">
              <p className="font-bold text-muted-foreground">No operations scheduled currently.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeSurgeries.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[32px] border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(15,23,42,0.05)] hover:shadow-[12px_12px_0px_0px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all space-y-4">
                <div className="flex justify-between items-start border-b pb-2">
                   <span className="text-[9px] font-black bg-blue-50 text-blue-800 px-3 py-1 rounded-full uppercase italic border border-blue-200">{s.theaterName}</span>
                   <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1"><Clock size={12}/> {s.scheduledTime}</span>
                </div>
                <div>
                   <p className="text-sm font-black uppercase tracking-tight text-slate-900">{s.procedureName}</p>
                   <p className="text-[10px] text-blue-600 mt-1 uppercase font-black">Patient: {s.patientName}</p>
                   <p className="text-[9px] text-slate-400 font-bold mt-0.5">Date: {s.scheduledDate}</p>
                </div>
                <div className="pt-4 border-t flex justify-between items-center gap-2">
                   <p className="text-[9px] text-slate-500 font-bold uppercase italic truncate">Surgeon: Dr. {s.surgeonName}</p>
                   <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        title="Reschedule Surgery"
                        onClick={() => handleOpenReschedule(s)}
                        className="text-slate-500 hover:text-blue-600 p-2 rounded-xl hover:bg-slate-50 transition-all border border-slate-100 bg-slate-50/50 cursor-pointer"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Cancel Surgery"
                        onClick={() => handleOpenCancel(s)}
                        className="text-slate-500 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-all border border-slate-100 bg-slate-50/50 cursor-pointer"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                      <Link 
                        href={`/theater/log/${s.id}`} 
                        title="Finalize Operative Log (WHO Checklist)"
                        className="bg-slate-900 text-white p-2 rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center border border-slate-900"
                      >
                        <Scissors size={14}/>
                      </Link>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // SURGICAL ARCHIVES LISTING
        <div className="space-y-6">
          {/* Search bar inside archives */}
          <div className="max-w-md relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input 
              type="text"
              value={archiveSearch}
              onChange={e => setArchiveSearch(e.target.value)}
              placeholder="Search by patient, procedure, room or doctor..."
              className="pl-11 bg-slate-50 border rounded-2xl font-bold h-11"
            />
          </div>

          {filteredArchiveSurgeries.length === 0 ? (
            <div className="text-center p-20 bg-card rounded-[32px] border-4 border-dashed border-slate-200">
                <p className="font-bold text-slate-400 italic">No archived operation records found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArchiveSurgeries.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-[32px] border-4 border-slate-200 shadow-sm space-y-4 text-black">
                  <div className="flex justify-between items-start border-b pb-2">
                     <span className="text-[9px] font-black bg-slate-100 text-slate-700 px-3 py-1 rounded-full uppercase italic border border-slate-200">{s.theaterName}</span>
                     {s.status === 'COMPLETED' ? (
                       <span className="text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full uppercase italic flex items-center gap-1">
                         <CheckCircle2 size={10}/> Completed
                       </span>
                     ) : (
                       <span className="text-[9px] font-black bg-red-50 text-red-800 border border-red-200 px-3 py-1 rounded-full uppercase italic flex items-center gap-1">
                         <XCircle size={10}/> Cancelled
                       </span>
                     )}
                  </div>
                  <div>
                     <p className="text-sm font-black uppercase text-slate-900 tracking-tight">{s.procedureName}</p>
                     <p className="text-[10px] text-slate-500 mt-1 uppercase">Patient: {s.patientName}</p>
                     <p className="text-[8px] text-slate-400 font-bold">Scheduled: {s.scheduledDate} {s.scheduledTime}</p>
                  </div>
                  <div className="pt-4 border-t flex justify-between items-center gap-2">
                     <div>
                       <p className="text-[9px] text-slate-600 font-bold uppercase italic truncate">Dr. {s.surgeonName}</p>
                       <p className="text-[8px] text-slate-400 font-bold">
                         {s.status === 'COMPLETED' 
                           ? `Logged: ${s.completedAt?.seconds ? new Date(s.completedAt.seconds * 1000).toLocaleDateString() : s.scheduledDate}`
                           : `Cancelled: ${s.cancelledAt?.seconds ? new Date(s.cancelledAt.seconds * 1000).toLocaleDateString() : s.scheduledDate}`
                         }
                       </p>
                     </div>
                     {s.status === 'COMPLETED' ? (
                       <button
                         type="button"
                         onClick={() => handleOpenArchiveDetails(s)}
                         className="bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 p-2 rounded-xl transition-all flex items-center gap-1 text-[10px] uppercase font-black cursor-pointer border"
                       >
                         <Eye size={12}/> View Log
                       </button>
                     ) : (
                       <span className="text-[8px] bg-slate-50 border px-2 py-1 rounded-lg text-slate-400 font-bold uppercase tracking-wider">No Log</span>
                     )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <SelectContent className="font-bold bg-white text-black">
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
                                <span className="ml-2 text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase italic font-bold">Locum</span>
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
            </div>

            <DialogFooter className="pt-4">
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

      {/* Reschedule Surgery Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="sm:max-w-md bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-2xl font-bold text-black"
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic text-black">
              Reschedule <span className="text-primary">Surgery</span>
            </DialogTitle>
            <p className="text-muted-foreground font-medium text-xs">Update Operating Room, date, time or surgeon.</p>
          </DialogHeader>

          {rescheduleSurgery && (
            <form onSubmit={handleRescheduleSubmit} className="space-y-4 pt-4 text-black">
              {/* Patient Display */}
              <div className="bg-slate-50 p-4 rounded-2xl border flex flex-col space-y-0.5">
                <span className="text-[8px] text-slate-400 uppercase font-black">Patient Name</span>
                <span className="text-xs font-black uppercase tracking-tight">{rescheduleSurgery.patientName}</span>
                <span className="text-[9px] text-primary uppercase font-bold mt-1">Procedure: {rescheduleSurgery.procedureName}</span>
              </div>

              {/* Operating Room Selection */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Operating Room</label>
                <Select onValueChange={setRescheduleTheater} value={rescheduleTheater}>
                  <SelectTrigger className="w-full bg-slate-50 border rounded-xl mt-1 font-bold">
                    <SelectValue placeholder="Select Operating Room" />
                  </SelectTrigger>
                  <SelectContent className="font-bold bg-white text-black">
                    {theaters?.map(t => (
                      <SelectItem key={t.id} value={t.name}>{t.name} ({t.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Surgeon Selection */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Select Surgeon</label>
                <div ref={rescheduleSurgeonDropdownContainerRef} className="relative w-full">
                  <button
                    type="button"
                    onClick={() => setRescheduleSurgeonDropdownOpen((o) => !o)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl border border-input',
                      'bg-slate-50 px-3 py-2 text-sm shadow-sm transition-all',
                      'hover:bg-slate-100',
                      'focus:outline-none focus:ring-2 focus:ring-slate-900',
                      rescheduleSurgeonDropdownOpen && 'ring-2 ring-slate-900'
                    )}
                  >
                    <span className={cn('truncate', !rescheduleSurgeon && 'text-muted-foreground font-medium')}>
                      {rescheduleSurgeon ? `Dr. ${rescheduleSurgeon}` : 'Select Surgeon...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>

                  {rescheduleSurgeonDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-xl border-2 border-slate-900 bg-white text-black shadow-lg">
                      <div className="flex items-center gap-2 border-b border-slate-900 px-3 py-2">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                          ref={rescheduleSurgeonSearchInputRef}
                          type="text"
                          value={rescheduleSurgeonSearch}
                          onChange={(e) => setRescheduleSurgeonSearch(e.target.value)}
                          placeholder="Search by surgeon name..."
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-bold"
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Escape') setRescheduleSurgeonDropdownOpen(false);
                          }}
                        />
                      </div>

                      <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
                        {filteredRescheduleDoctors.length === 0 ? (
                          <li className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                            No doctors found.
                          </li>
                        ) : (
                          filteredRescheduleDoctors.map((doc: any) => (
                            <li
                              key={doc.id}
                              role="option"
                              aria-selected={rescheduleSurgeon === doc.fullName}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setRescheduleSurgeon(doc.fullName);
                                setRescheduleSurgeonDropdownOpen(false);
                                setRescheduleSurgeonSearch('');
                              }}
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 text-xs cursor-pointer select-none font-bold',
                                'hover:bg-slate-100 hover:text-black',
                                rescheduleSurgeon === doc.fullName && 'bg-slate-200'
                              )}
                            >
                              <Check
                                className={cn(
                                  'h-3 w-3 shrink-0 text-primary',
                                  rescheduleSurgeon === doc.fullName ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span>Dr. {doc.fullName}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Date</label>
                  <Input
                    type="date"
                    className="bg-slate-50 border rounded-xl mt-1 font-bold"
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Time</label>
                  <Input
                    type="time"
                    className="bg-slate-50 border rounded-xl mt-1 font-bold"
                    value={rescheduleTime}
                    onChange={e => setRescheduleTime(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsRescheduleOpen(false)} className="rounded-xl font-bold uppercase text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg hover:bg-black hover:scale-[1.02] transition-all flex items-center gap-2">
                  {loading ? <Loader2 className="animate-spin" /> : <Save size={16} />} Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Surgery Confirmation Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-md bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-2xl font-bold text-black">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter italic text-red-600 flex items-center gap-2">
              <Ban className="animate-pulse" size={24} />
              Cancel <span className="text-black">Surgery Schedule</span>
            </DialogTitle>
            <p className="text-muted-foreground font-medium text-xs mt-1">Are you sure you want to cancel this scheduled operation?</p>
          </DialogHeader>

          {cancelSurgery && (
            <div className="space-y-4 pt-2 text-black">
              <div className="bg-red-50/50 p-4 rounded-2xl border border-red-200 text-xs text-red-950">
                <p className="font-black uppercase">Operation Details:</p>
                <p className="mt-1 font-bold">Patient: <span className="font-black">{cancelSurgery.patientName}</span></p>
                <p className="font-bold">Procedure: <span className="font-black">{cancelSurgery.procedureName}</span></p>
                <p className="font-bold">Scheduled Room: <span className="font-black">{cancelSurgery.theaterName}</span></p>
                <p className="font-bold">Scheduled Time: <span className="font-black">{cancelSurgery.scheduledDate} @ {cancelSurgery.scheduledTime}</span></p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCancelOpen(false)} className="rounded-xl font-bold uppercase text-xs">
                  Close
                </Button>
                <Button 
                  type="button" 
                  onClick={handleCancelSubmit} 
                  disabled={loading} 
                  className="bg-red-600 text-white hover:bg-red-700 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Ban size={16} />} Confirm Cancellation
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Details View Dialog */}
      <Dialog open={isArchiveDetailsOpen} onOpenChange={setIsArchiveDetailsOpen}>
        <DialogContent className="max-w-4xl bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-2xl font-bold text-black overflow-y-auto max-h-[90vh]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic text-black flex items-center gap-2">
              <FileText className="text-primary animate-in zoom-in-50 duration-300" size={24} />
              Surgical Operation <span className="text-primary">Record</span>
            </DialogTitle>
            <p className="text-muted-foreground font-medium text-xs">Official authenticated intra-operative log &amp; WHO safety compliance report.</p>
          </DialogHeader>

          {selectedArchiveSurgery && (
            <div className="space-y-6 pt-4 text-black">
              {/* Summary Metadata Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-3xl border text-[11px]">
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-black mb-0.5">Patient</span>
                  <span className="text-xs uppercase block truncate font-black text-slate-900">{selectedArchiveSurgery.patientName}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-black mb-0.5">Procedure</span>
                  <span className="text-xs uppercase block truncate font-black text-slate-900">{selectedArchiveSurgery.procedureName}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-black mb-0.5">Operating Surgeon</span>
                  <span className="text-xs uppercase block truncate font-black text-slate-900">Dr. {selectedArchiveSurgery.surgeonName}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block font-black mb-0.5">Date Completed</span>
                  <span className="text-xs uppercase block truncate font-black text-slate-900">
                    {selectedArchiveSurgery.completedAt?.seconds 
                      ? new Date(selectedArchiveSurgery.completedAt.seconds * 1000).toLocaleString() 
                      : selectedArchiveSurgery.scheduledDate}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* WHO Checklist Log */}
                <div className="md:col-span-6 space-y-4">
                  <div className="flex items-center gap-2 border-b pb-1">
                     <Sparkles className="text-emerald-600 h-4 w-4" />
                     <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">WHO Surgical Safety Audit</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-sky-600 uppercase tracking-widest pl-1">1. Sign-In (Before Anesthesia)</h4>
                    <div className="space-y-2">
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.patientIdentityConfirmed} label="Patient Identity &amp; Consent" />
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.siteMarked} label="Surgical Site Marked" />
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.anesthesiaSafetyCheck} label="Anesthesia Safety Checked" />
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.pulseOxiFunctioning} label="Pulse Oximeter Functioning" />
                    </div>

                    <h4 className="text-[9px] font-black text-amber-600 uppercase tracking-widest pt-2 pl-1">2. Time-Out (Before Incision)</h4>
                    <div className="space-y-2">
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.teamIntroduced} label="Team Introductions Completed" />
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.verbalIncisionConfirm} label="Verbal Incision Confirmation" />
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.antibioticsAdministered} label="Prophylactic Antibiotics Given" />
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.essentialImagingDisplayed} label="Imaging Results Displayed" />
                    </div>

                    <h4 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest pt-2 pl-1">3. Sign-Out (Before OR Exit)</h4>
                    <div className="space-y-2">
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.countsConfirmed} label="Instrument, Sponge &amp; Needle Counts" isCritical={true} />
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.specimenLabeled} label="Specimen Labeled Correctly" />
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.equipmentProblemsAddressed} label="Equipment Issues Checked" />
                      <ArchivedCheckRow checked={selectedArchiveSurgery.checklist?.recoveryPlanReviewed} label="Post-Op Recovery Plan Reviewed" />
                    </div>
                  </div>
                </div>

                {/* Operative Record Details */}
                <div className="md:col-span-6 space-y-4 bg-slate-50 p-6 rounded-[32px] border-2 border-slate-200/60">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b pb-1">Operative Details</h3>
                  
                  <div className="space-y-4 text-xs font-bold">
                    <div>
                      <span className="text-[8px] text-slate-400 uppercase block font-black mb-1">Intra-Operative Findings</span>
                      <p className="bg-white p-3 rounded-2xl border text-slate-700 leading-relaxed font-semibold">
                        {selectedArchiveSurgery.findings || 'No findings recorded.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase block font-black mb-1">Anesthesia Type</span>
                        <p className="bg-white p-3 rounded-2xl border text-slate-700 font-semibold">
                          {selectedArchiveSurgery.anesthesiaType || 'General'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 uppercase block font-black mb-1">Estimated Blood Loss</span>
                        <p className="bg-white p-3 rounded-2xl border text-slate-700 font-semibold">
                          {selectedArchiveSurgery.bloodLoss || '0 ml'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="text-[8px] text-slate-400 uppercase block font-black mb-1">Post-Operative Ward Instructions</span>
                      <p className="bg-white p-3 rounded-2xl border text-slate-700 leading-relaxed font-semibold">
                        {selectedArchiveSurgery.postOpInstructions || 'No instructions recorded.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button onClick={() => setIsArchiveDetailsOpen(false)} className="bg-slate-900 text-white rounded-xl font-bold uppercase text-xs">
              Close Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArchivedCheckRow({ checked, label, isCritical }: { checked: boolean; label: string; isCritical?: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 text-[11px] font-bold">
      <span className={cn("text-slate-700", isCritical && "text-slate-900 font-black")}>
        {label}
        {isCritical && <span className="ml-1.5 text-[8px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-black">Critical Count</span>}
      </span>
      {checked ? (
        <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-black uppercase">
          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" /> Verified
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase">
          Unverified
        </span>
      )}
    </div>
  );
}
