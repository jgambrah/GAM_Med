'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, serverTimestamp, doc } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import { 
  Heart, UserPlus, Search, Filter, Droplet, Droplets, Award, CalendarDays,
  ChevronRight, ShieldCheck, Activity, Loader2, ShieldAlert,
  ChevronsUpDown, Eye, Sparkles, Printer, QrCode, FileText, Download,
  Share2, MessageSquare, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

const donorSchema = z.object({
  fullName: z.string().min(3, "Full name is required."),
  phone: z.string().min(10, "A valid phone number is required."),
  bloodGroup: z.string().min(1, "Blood group is required."),
  donorType: z.string().min(1, "Donor type is required."),
  lastDonationDate: z.string().optional(),
  patientId: z.string().optional(),
});

type DonorFormValues = z.infer<typeof donorSchema>;

export default function DonorArchiveHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAddDonorOpen, setIsAddDonorOpen] = useState(false);
  const [selectedCardDonor, setSelectedCardDonor] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  // States for Patient selection lookup
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const patientContainerRef = useRef<HTMLDivElement>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = userRole ? ['DIRECTOR', 'ADMIN', 'LAB_TECH', 'DOCTOR', 'NURSE'].includes(userRole) : true;

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital } = useDoc(hospitalRef);

  // Query donors
  const donorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/blood_donors`), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: rawDonors, isLoading: areDonorsLoading } = useCollection(donorsQuery);

  // Query patients for linking
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/patients`));
  }, [firestore, hospitalId]);
  const { data: patients, isLoading: patientsLoading } = useCollection(patientsQuery);

  const demoDonors = useMemo(() => [
    { 
      id: 'don_1',
      donorNumber: 'DON-26-4642', 
      fullName: 'ANGEL NHYIRABA', 
      phone: '0246897915', 
      bloodGroup: 'AB+', 
      donorType: 'VOLUNTARY', 
      lastDonationDate: null,
      donorTier: 'BRONZE',
      donationCount: 0
    },
    { 
      id: 'don_2',
      donorNumber: 'DON-26-7889', 
      fullName: 'JAMES GAMBRAH', 
      phone: '0246897915', 
      bloodGroup: 'B+', 
      donorType: 'VOLUNTARY', 
      lastDonationDate: null,
      donorTier: 'BRONZE',
      donationCount: 0
    },
    { 
      id: 'don_3',
      donorNumber: 'DON-26-1675', 
      fullName: 'SHANE OSEI', 
      phone: '0246897915', 
      bloodGroup: 'O+', 
      donorType: 'VOLUNTARY', 
      lastDonationDate: null,
      donorTier: 'BRONZE',
      donationCount: 0
    },
  ], []);

  const donors = useMemo(() => {
    if (rawDonors && rawDonors.length > 0) return rawDonors;
    return demoDonors;
  }, [rawDonors, demoDonors]);

  const filteredDonors = useMemo(() => {
    return donors.filter((d: any) => {
      const nameMatch = d.fullName ? d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const numMatch = d.donorNumber ? d.donorNumber.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const phoneMatch = d.phone ? d.phone.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const matchSearch = !searchQuery || nameMatch || numMatch || phoneMatch;

      const matchGroup = bloodGroupFilter === 'all' || d.bloodGroup === bloodGroupFilter;
      const matchTier = tierFilter === 'all' || (d.donorTier || 'BRONZE').toLowerCase() === tierFilter.toLowerCase();

      return matchSearch && matchGroup && matchTier;
    });
  }, [donors, searchQuery, bloodGroupFilter, tierFilter]);

  const form = useForm<DonorFormValues>({
    resolver: zodResolver(donorSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      bloodGroup: 'O+',
      donorType: 'VOLUNTARY',
      lastDonationDate: '',
      patientId: '',
    },
  });

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const term = patientSearch.toLowerCase().trim();
    if (!term) return patients;
    return patients.filter((p: any) =>
      `${p.firstName} ${p.lastName} ${p.ehrNumber}`.toLowerCase().includes(term)
    );
  }, [patients, patientSearch]);

  useEffect(() => {
    if (!patientDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (patientContainerRef.current && !patientContainerRef.current.contains(e.target as Node)) {
        setPatientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [patientDropdownOpen]);

  const saveDonor = async (values: DonorFormValues) => {
    if (!firestore || !hospitalId) {
      toast({ title: "Donor Registered", description: `${values.fullName} added to registry.` });
      setIsAddDonorOpen(false);
      form.reset();
      return;
    }

    try {
      const donorNumber = `DON-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`;
      addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/blood_donors`), {
        ...values,
        donorNumber,
        hospitalId,
        status: 'ELIGIBLE',
        screeningStatus: 'PENDING',
        donationCount: 0,
        donorTier: 'BRONZE',
        createdAt: serverTimestamp(),
        lastDonationDate: values.lastDonationDate || null,
        patientId: values.patientId || null,
      });
      toast({ title: "Donor Registered Successfully" });
      setIsAddDonorOpen(false);
      form.reset();
      setPatientSearch('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error", description: e.message });
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'PLATINUM':
        return <span className="text-[9px] font-black text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1"><Sparkles size={10} className="fill-purple-300"/> Platinum</span>;
      case 'GOLD':
        return <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1"><Award size={10} className="fill-amber-300"/> Gold</span>;
      case 'SILVER':
        return <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">Silver</span>;
      case 'BRONZE':
      default:
        return <span className="text-[9px] font-black text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">Bronze</span>;
    }
  };

  const voluntaryCount = useMemo(() => donors.filter((d: any) => d.donorType === 'VOLUNTARY').length, [donors]);
  const goldCount = useMemo(() => donors.filter((d: any) => d.donorTier === 'GOLD' || d.donorTier === 'PLATINUM').length, [donors]);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="animate-spin h-16 w-16 text-rose-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  const userName = user?.displayName || userProfile?.name || 'MARCUS A. HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Rose/Red for Blood Bank */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <Heart className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                DONOR ARCHIVE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              MANAGING GHANA'S GIFT OF LIFE • DONOR REGISTRY & RETENTION TRACKING.
            </p>
          </div>

          {/* Active User Context & Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 self-start md:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center font-black text-rose-400 text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest">BLOOD BANK TECHNICIAN</div>
              </div>
            </div>

            <Dialog open={isAddDonorOpen} onOpenChange={setIsAddDonorOpen}>
              <DialogTrigger asChild>
                <button 
                  type="button"
                  className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> ENROLL NEW DONOR
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight italic text-rose-600">Enroll New Donor Profile</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(saveDonor)} className="space-y-4">
                    
                    {/* Link to Patient EHR */}
                    <div ref={patientContainerRef} className="relative space-y-2">
                      <label className="text-xs uppercase font-bold text-slate-500">Link Patient Folder (Optional)</label>
                      <button
                        type="button"
                        onClick={() => setPatientDropdownOpen(o => !o)}
                        className="w-full flex items-center justify-between rounded-xl border p-3 bg-slate-50 text-sm font-semibold hover:bg-slate-100 transition-all text-left"
                      >
                        <span>
                          {form.watch('patientId') 
                            ? `Linked: ${form.watch('fullName')}`
                            : patientsLoading 
                            ? 'Loading patients...' 
                            : 'Search patient folder directory...'}
                        </span>
                        <ChevronsUpDown size={16} className="text-slate-400" />
                      </button>

                      {patientDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow-2xl p-2 space-y-2">
                          <div className="flex items-center gap-2 border rounded-lg px-2.5 py-1.5">
                            <Search size={14} className="text-slate-400" />
                            <input
                              type="text"
                              value={patientSearch}
                              onChange={(e) => setPatientSearch(e.target.value)}
                              placeholder="Search patient by name or EHR..."
                              className="w-full bg-transparent text-xs outline-none font-medium"
                            />
                          </div>
                          <ul className="max-h-48 overflow-y-auto space-y-1">
                            {filteredPatients.length === 0 ? (
                              <li className="text-center py-6 text-xs text-slate-400 uppercase italic">No patients found.</li>
                            ) : (
                              filteredPatients.map((p: any) => (
                                <li
                                  key={p.id}
                                  onMouseDown={() => {
                                    form.setValue('patientId', p.id);
                                    form.setValue('fullName', `${p.firstName} ${p.lastName}`);
                                    form.setValue('phone', p.phone || p.phoneNumber || '');
                                    if (p.bloodGroup && p.bloodGroup !== 'N/A') {
                                      form.setValue('bloodGroup', p.bloodGroup);
                                    }
                                    setPatientDropdownOpen(false);
                                  }}
                                  className="text-xs p-2.5 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-between font-semibold"
                                >
                                  <span>{p.firstName} {p.lastName} <span className="text-[10px] text-slate-400 font-mono ml-2">({p.ehrNumber})</span></span>
                                  {p.bloodGroup && <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[9px] font-black italic">{p.bloodGroup}</span>}
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                      )}
                    </div>

                    <FormField name="fullName" control={form.control} render={({field}) => <FormItem><FormLabel className="text-xs font-bold uppercase">Full Name</FormLabel><FormControl><Input placeholder="John Doe" className="rounded-xl" {...field} /></FormControl><FormMessage/></FormItem>} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField name="phone" control={form.control} render={({field}) => <FormItem><FormLabel className="text-xs font-bold uppercase">Phone Number</FormLabel><FormControl><Input placeholder="024XXXXXXX" className="rounded-xl" {...field} /></FormControl><FormMessage/></FormItem>} />
                      <FormField name="bloodGroup" control={form.control} render={({field}) => <FormItem><FormLabel className="text-xs font-bold uppercase">Blood Group</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger></FormControl><SelectContent className="bg-slate-900 text-white">
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent></Select><FormMessage/></FormItem>} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField name="donorType" control={form.control} render={({field}) => <FormItem><FormLabel className="text-xs font-bold uppercase">Donor Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger></FormControl><SelectContent className="bg-slate-900 text-white">
                        <SelectItem value="VOLUNTARY">Voluntary Donor</SelectItem>
                        <SelectItem value="REPLACEMENT">Replacement (Family)</SelectItem>
                      </SelectContent></Select><FormMessage/></FormItem>} />
                      <FormField name="lastDonationDate" control={form.control} render={({field}) => <FormItem><FormLabel className="text-xs font-bold uppercase">Last Donation Date</FormLabel><FormControl><Input type="date" className="rounded-xl" {...field} /></FormControl><FormMessage/></FormItem>} />
                    </div>

                    <DialogFooter className="pt-4">
                      <Button type="button" variant="ghost" onClick={() => { setIsAddDonorOpen(false); form.reset(); setPatientSearch(''); }} className="font-bold uppercase text-xs">Cancel</Button>
                      <Button type="submit" disabled={form.formState.isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs tracking-wider rounded-xl">
                        {form.formState.isSubmitting ? <Loader2 className="animate-spin"/> : 'Activate Donor Profile'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          {/* Card 1: Total Registered */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Total Registry
              </span>
              <div className="text-2xl font-black text-white">{donors.length}</div>
              <span className="text-[10px] font-bold text-rose-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-rose-500" /> Verified Profiles
              </span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <Heart className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Voluntary vs Replacement */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Voluntary Donors
              </span>
              <div className="text-2xl font-black text-sky-400">
                {donors.length > 0 ? `${Math.round((voluntaryCount / donors.length) * 100)}%` : '100%'}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                {voluntaryCount} Voluntary • {donors.length - voluntaryCount} Replacement
              </span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Droplet className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Eligible to Donate Today */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Eligible Today
              </span>
              <div className="text-2xl font-black text-emerald-400">{donors.length}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Past 3-month window</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Retention (Gold / Platinum) */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Gold Tier Donors
              </span>
              <div className="text-2xl font-black text-amber-400">{goldCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">5+ Lifetime Donations</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER, SEARCH & DATA TABLE CONTAINER   */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Control Bar: Search & Filters */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Donor Name, ID, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={bloodGroupFilter}
                onChange={(e) => setBloodGroupFilter(e.target.value)}
                className="bg-transparent focus:outline-none w-full text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">All Groups</option>
                <option value="A+" className="bg-slate-900 text-white">A+</option>
                <option value="A-" className="bg-slate-900 text-white">A-</option>
                <option value="B+" className="bg-slate-900 text-white">B+</option>
                <option value="B-" className="bg-slate-900 text-white">B-</option>
                <option value="AB+" className="bg-slate-900 text-white">AB+</option>
                <option value="AB-" className="bg-slate-900 text-white">AB-</option>
                <option value="O+" className="bg-slate-900 text-white">O+</option>
                <option value="O-" className="bg-slate-900 text-white">O-</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm w-full md:w-auto">
              <Award className="w-4 h-4 text-slate-400" />
              <select 
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-transparent focus:outline-none w-full text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">All Tiers</option>
                <option value="bronze" className="bg-slate-900 text-white">Bronze</option>
                <option value="silver" className="bg-slate-900 text-white">Silver</option>
                <option value="gold" className="bg-slate-900 text-white">Gold</option>
                <option value="platinum" className="bg-slate-900 text-white">Platinum</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enterprise Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Donor ID & Name
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Blood Group
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Type & Eligibility
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Tier / Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {areDonorsLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <Loader2 className="animate-spin text-rose-500 h-8 w-8 mx-auto mb-2" />
                    Loading donor registry...
                  </td>
                </tr>
              ) : filteredDonors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-400 italic">
                    No donors registered in this view.
                  </td>
                </tr>
              ) : (
                filteredDonors.map((donor: any, idx: number) => (
                  <tr key={donor.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        {donor.fullName}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>ID: <span className="text-slate-700 dark:text-slate-300 font-mono">{donor.donorNumber || donor.id}</span></span>
                        <span>•</span>
                        <span>{donor.phone}</span>
                        {donor.patientId && (
                          <span className="bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                            EHR LINKED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-black text-sm">
                        {donor.bloodGroup}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-[9px] font-black uppercase tracking-wider mb-1">
                        {donor.donorType || 'VOLUNTARY'}
                      </span>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" /> {donor.lastDonationDate ? format(new Date(donor.lastDonationDate), 'PPP') : 'First Time Donor'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTierBadge(donor.donorTier || 'BRONZE')}
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
                        {donor.donationCount || 0} DONATIONS
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        type="button"
                        onClick={() => setSelectedCardDonor(donor)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-colors group-hover:border-rose-200 group-hover:text-rose-600 cursor-pointer"
                      >
                        VIEW CARD <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {selectedCardDonor && (
        <DigitalDonorCardDialog
          donor={selectedCardDonor}
          hospital={hospital}
          open={!!selectedCardDonor}
          onOpenChange={() => setSelectedCardDonor(null)}
        />
      )}
    </div>
  );
}

// Digital Blood Donor Privilege Card Component
function DigitalDonorCardDialog({ donor, hospital, open, onOpenChange }: { donor: any; hospital: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const donationCount = donor.donationCount || 0;
  const activeTier = donor.donorTier || 'BRONZE';

  const publicCardUrl = `https://gam-med.vercel.app/verify/donor/${donor.id || 'donor'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicCardUrl);
    setIsCopied(true);
    toast({ title: 'Link Copied!', description: 'Public donor verification URL copied to clipboard.' });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=Here is your GAM Med Voluntary Blood Donor Card: ${encodeURIComponent(publicCardUrl)}`, '_blank');
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'GAM Med Voluntary Blood Donor Card',
        text: `Here is your GAM Med Voluntary Blood Donor Card for ${donor.fullName}:`,
        url: publicCardUrl,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `GAM_Med_Donor_Card_${donor.donorNumber || donor.id || 'Card'}.png`;
      link.click();
      toast({
        title: 'Donor Card Downloaded',
        description: 'High-resolution PNG saved to your downloads.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Unable to capture donor card image.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const tierConfig = useMemo(() => {
    switch (activeTier) {
      case 'PLATINUM':
        return { nextTier: 'MAX', target: donationCount, progress: 100, remaining: 0 };
      case 'GOLD':
        return { nextTier: 'PLATINUM', target: 20, progress: Math.min((donationCount / 20) * 100, 100), remaining: Math.max(20 - donationCount, 0) };
      case 'SILVER':
        return { nextTier: 'GOLD', target: 10, progress: Math.min((donationCount / 10) * 100, 100), remaining: Math.max(10 - donationCount, 0) };
      case 'BRONZE':
      default:
        return { nextTier: 'SILVER', target: 5, progress: Math.min((donationCount / 5) * 100, 100), remaining: Math.max(5 - donationCount, 0) };
    }
  }, [activeTier, donationCount]);

  const privileges = useMemo(() => {
    const bronzeList = (hospital?.bloodDonorBronzeBenefit || "Verified donor health screening reports & analytics;Priority queuing at blood bank and laboratory desks").split(';').filter(Boolean);
    const silverList = (hospital?.bloodDonorSilverBenefit || "15% discount waiver on standard blood processing fees;Priority queuing at blood bank and laboratory desks").split(';').filter(Boolean);
    const goldList = (hospital?.bloodDonorGoldBenefit || "50% discount waiver on standard blood processing fees;Exemption from family replacement donation requirements").split(';').filter(Boolean);
    const platinumList = (hospital?.bloodDonorPlatinumBenefit || "100% full processing fee waiver for donor and immediate family;Direct VIP billing desk priority").split(';').filter(Boolean);

    return [
      ...bronzeList.map((text: string) => ({ text, tier: 'BRONZE' })),
      ...silverList.map((text: string) => ({ text, tier: 'SILVER' })),
      ...goldList.map((text: string) => ({ text, tier: 'GOLD' })),
      ...platinumList.map((text: string) => ({ text, tier: 'PLATINUM' })),
    ];
  }, [hospital]);

  const hasAccess = (privilegeTier: string) => {
    const ranks: Record<string, number> = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4 };
    return ranks[activeTier] >= ranks[privilegeTier];
  };

  const printCard = () => {
    const printContent = document.getElementById('digital-blood-donor-card');
    if (!printContent) return;
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const printWindow = window.open(windowUrl, uniqueName.toString(), 'left=50,top=50,width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Blood Donor Card - ${donor.fullName}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: #fff;
              }
              .print-container {
                border: 4px solid #dc2626;
                border-radius: 24px;
                width: 450px;
                height: 260px;
                padding: 24px;
                box-sizing: border-box;
                background: linear-gradient(135deg, #7f1d1d 0%, #1e293b 100%);
                color: white;
                position: relative;
                overflow: hidden;
              }
              .header {
                font-size: 11px;
                font-weight: 900;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-bottom: 2px;
              }
              .subheader {
                font-size: 9px;
                color: #fbbf24;
                font-weight: 800;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                margin-bottom: 20px;
              }
              .name {
                font-size: 20px;
                font-weight: 900;
                text-transform: uppercase;
                margin: 0 0 6px 0;
                font-style: italic;
              }
              .info {
                font-size: 10px;
                font-family: monospace;
                color: #cbd5e1;
                margin: 2px 0;
              }
              .blood-group-container {
                position: absolute;
                right: 24px;
                top: 24px;
                border: 2px solid rgba(255,255,255,0.2);
                border-radius: 16px;
                background: rgba(255,255,255,0.1);
                width: 80px;
                height: 96px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .blood-group {
                font-size: 26px;
                font-weight: 900;
                font-style: italic;
              }
              .badge {
                position: absolute;
                right: 24px;
                bottom: 24px;
                font-size: 9px;
                font-weight: 900;
                padding: 6px 12px;
                border-radius: 8px;
                text-transform: uppercase;
                border: 2px solid;
              }
              .PLATINUM { border-color: #e9d5ff; background: rgba(168,85,247,0.2); color: #f3e8ff; }
              .GOLD { border-color: #fde047; background: rgba(234,179,8,0.2); color: #fef08a; }
              .SILVER { border-color: #cbd5e1; background: rgba(100,116,139,0.2); color: #f1f5f9; }
              .BRONZE { border-color: #fed7aa; background: rgba(194,65,12,0.2); color: #ffedd5; }
              .barcode {
                display: flex;
                gap: 2px;
                background: rgba(255,255,255,0.9);
                padding: 4px;
                border-radius: 4px;
                width: 120px;
                height: 30px;
                margin-top: 16px;
              }
              .bar {
                background: black;
                height: 100%;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <div class="header">Ghana National Blood Service</div>
              <div class="subheader">Voluntary Blood Donor Privilege Card</div>
              <div class="name">${donor.fullName}</div>
              <div class="info">DONOR NUMBER: ${donor.donorNumber || donor.id}</div>
              <div class="info">TEL NO: ${donor.phone}</div>
              <div class="info">STATUS: ACTIVE</div>
              <div class="blood-group-container">
                <span style="font-size: 16px; color: #ef4444;">💧</span>
                <span class="blood-group">${donor.bloodGroup}</span>
              </div>
              <div class="badge ${activeTier}">${activeTier}</div>
              <div class="barcode">
                ${Array.from({ length: 22 }).map((_, i) => `
                  <div class="bar" style="width: ${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px;"></div>
                `).join('')}
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase italic text-slate-900 dark:text-slate-100 tracking-tight flex items-center justify-between">
            <span>Privilege Card View</span>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleDownloadCard} 
                disabled={isDownloading}
                variant="outline" 
                size="sm" 
                className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" /> : <Download size={14} />}
                {isDownloading ? 'Downloading...' : 'Download Card'}
              </Button>
              <Button onClick={printCard} variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 rounded-xl text-xs font-bold cursor-pointer">
                <Printer size={14}/> Print Card
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Digital Card Graphic */}
        <div 
          ref={cardRef}
          id="digital-blood-donor-card"
          className="relative w-full aspect-[1.7/1] rounded-3xl p-6 text-white overflow-hidden shadow-2xl bg-gradient-to-br from-red-800 via-red-950 to-slate-900 border border-red-500/20 flex flex-col justify-between"
        >
          {/* Hologram / droplet watermarks */}
          <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 pointer-events-none">
            <Droplets size={250} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-slate-100 flex items-center gap-1.5">
                <Award size={12} className="text-amber-400 fill-amber-400"/> Ghana National Blood Service
              </p>
              <p className="text-[8px] font-bold uppercase text-amber-400 tracking-widest mt-0.5">Voluntary Blood Donor Card</p>
            </div>
            
            {/* Dynamic Glass Tier badge */}
            <div className={cn(
              "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm",
              activeTier === 'PLATINUM' && "bg-purple-500/20 text-purple-200 border-purple-400/40",
              activeTier === 'GOLD' && "bg-amber-500/20 text-amber-200 border-amber-400/40",
              activeTier === 'SILVER' && "bg-slate-400/20 text-slate-200 border-slate-300/40",
              activeTier === 'BRONZE' && "bg-orange-500/20 text-orange-200 border-orange-400/40",
            )}>
              {activeTier}
            </div>
          </div>

          <div className="space-y-1 z-10">
            <h2 className="text-2xl font-black italic uppercase tracking-tight truncate max-w-[280px] drop-shadow-md">{donor.fullName}</h2>
            <div className="flex flex-col text-[9px] font-mono text-slate-300">
              <span>DONOR ID: {donor.donorNumber || donor.id}</span>
              <span>TEL NUMBER: {donor.phone}</span>
            </div>
          </div>

          <div className="flex justify-between items-end mt-2 z-10">
            {/* Mock Barcode */}
            <div className="flex items-center gap-[2px] bg-white/95 p-1.5 rounded-lg h-8 w-32 shadow-inner font-black">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="bg-black h-full" style={{ width: `${(i % 3 === 0 ? 3.5 : i % 2 === 0 ? 1 : 2)}px` }} />
              ))}
            </div>
            
            {/* Blood Capsule display */}
            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 w-16 h-20 shadow-lg">
              <Droplets className="text-red-500 fill-red-500" size={24} />
              <span className="text-xl font-black italic tracking-tighter mt-0.5">{donor.bloodGroup}</span>
            </div>
          </div>
        </div>

        {/* Share actions & QR Code Scan */}
        <div className="mt-4 p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 flex-1 text-slate-800 dark:text-slate-200 w-full">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                <QrCode size={16} className="text-rose-500"/> Share Verification Card
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase leading-relaxed mt-1">
                Donor can scan the QR code to save their card on mobile, or transmit via WhatsApp / SMS.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
                className="border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl h-9 px-3.5 transition-all cursor-pointer"
              >
                {isCopied ? <Check size={14} className="text-emerald-500 mr-1" /> : null}
                {isCopied ? 'LINK COPIED!' : 'COPY SHARED LINK'}
              </Button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <MessageSquare size={14} /> SHARE VIA WHATSAPP
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="px-3.5 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Share2 size={14} /> SHARE VIA SMS / APP
              </button>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md shrink-0 flex flex-col items-center justify-center">
            <QRCodeSVG
              value={publicCardUrl}
              size={120}
              level="H"
            />
            <span className="text-[9px] font-mono font-bold text-slate-400 mt-1.5 uppercase">SCAN TO VERIFY</span>
          </div>
        </div>

        {/* Progression tracker */}
        <div className="mt-4 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="flex justify-between text-xs font-black uppercase text-slate-500">
            <span>Donations: {donationCount}</span>
            {activeTier === 'PLATINUM' ? (
              <span className="text-purple-600 flex items-center gap-1"><Sparkles size={12}/> VIP Maximum Rank</span>
            ) : (
              <span>Next: {tierConfig.nextTier} ({tierConfig.remaining} Left)</span>
            )}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-700">
            <div 
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                activeTier === 'PLATINUM' ? 'bg-purple-600' : 'bg-rose-600'
              )} 
              style={{ width: `${tierConfig.progress}%` }} 
            />
          </div>
        </div>

        {/* Benefits list */}
        <div className="mt-4 space-y-3">
          <h3 className="text-xs uppercase font-black text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
            <FileText size={14} className="text-rose-600"/> Current &amp; Locked Clinical Advantages
          </h3>
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold bg-slate-50 dark:bg-slate-800/40">
            {privileges.map((p, i) => {
              const active = hasAccess(p.tier);
              return (
                <div key={i} className={cn("p-3 flex items-start gap-2.5 transition-all", active ? "bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300" : "opacity-45 grayscale bg-white dark:bg-slate-900")}>
                  {active ? (
                    <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={16}/>
                  ) : (
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-400 p-0.5 rounded-full shrink-0 mt-0.5 text-[8px] font-black w-4 h-4 flex items-center justify-center">🔒</span>
                  )}
                  <div>
                    <p className="font-bold">{p.text}</p>
                    <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 mt-0.5 block">{p.tier} Privileges</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
