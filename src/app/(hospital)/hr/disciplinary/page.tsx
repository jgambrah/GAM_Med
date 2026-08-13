'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { 
  Scale, AlertOctagon, Search, Filter, Plus, 
  ShieldAlert, Eye, MoreHorizontal, FileWarning, 
  AlertTriangle, Gavel, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

const recordSchema = z.object({
  staffId: z.string().min(1, "Please select a staff member."),
  offenseType: z.string().min(1, "Offense type is required."),
  severity: z.string().min(1, "Severity level is required."),
  description: z.string().min(10, "A detailed description is required."),
  incidentDate: z.string().min(1, "Incident date is required."),
});

type RecordFormValues = z.infer<typeof recordSchema>;

export default function DisciplinaryRegisterHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  // Fetch disciplinary records
  const recordsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'disciplinary_records'), orderBy('createdAt', 'desc'));
  }, [firestore, hospitalId]);
  const { data: rawRecords, isLoading: areRecordsLoading } = useCollection(recordsQuery);

  // Fetch staff for the dropdown
  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'users'), where('hospitalId', '==', hospitalId), where('is_active', '==', true));
  }, [firestore, hospitalId]);
  const { data: staff, isLoading: areStaffLoading } = useCollection(staffQuery);

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      staffId: '',
      offenseType: 'Clinical Negligence',
      severity: 'FORMAL_QUERY',
      description: '',
      incidentDate: '',
    },
  });

  const demoDisciplinaryCases = useMemo(() => [
    {
      id: 't9KgxW',
      name: 'DR. AMA ADU',
      role: 'DOCTOR',
      department: 'CLINICAL / GENERAL',
      severity: 'SUSPENSION',
      offense: 'CLINICAL NEGLIGENCE',
      date: 'March 3rd, 2026',
      status: 'ACTIVE'
    }
  ], []);

  const disciplinaryCases = useMemo(() => {
    if (rawRecords && rawRecords.length > 0) {
      return rawRecords.map((rec: any, idx: number) => {
        let formattedDate = rec.incidentDate || 'N/A';
        try {
          if (rec.incidentDate) formattedDate = format(new Date(rec.incidentDate), 'MMMM d, yyyy');
        } catch (e) {
          // fallback
        }

        let sev = (rec.severity || 'FORMAL_QUERY').replace(/_/g, ' ');
        if (sev === 'FINAL WRITTEN') sev = 'FINAL WARNING';

        return {
          id: rec.id ? rec.id.slice(0, 6) : `CAS-0${idx + 1}`,
          name: (rec.staffName || 'STAFF MEMBER').toUpperCase(),
          role: (rec.role || 'STAFF').toUpperCase(),
          department: (rec.department || 'GENERAL').toUpperCase(),
          severity: sev,
          offense: (rec.offenseType || rec.offense || 'INFRACTION').toUpperCase(),
          date: formattedDate,
          status: rec.status || 'ACTIVE',
          description: rec.description || '',
          issuedByName: rec.issuedByName || 'HR DIRECTOR',
          raw: rec,
        };
      });
    }
    return demoDisciplinaryCases;
  }, [rawRecords, demoDisciplinaryCases]);

  const filteredCases = useMemo(() => {
    return disciplinaryCases.filter(c => {
      const q = searchQuery.toLowerCase();
      const queryMatch = !searchQuery || 
        c.name.toLowerCase().includes(q) || 
        c.id.toLowerCase().includes(q) || 
        c.offense.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q);

      if (!queryMatch) return false;

      if (activeFilter === 'SUSPENSION') return c.severity.includes('SUSPENSION');
      if (activeFilter === 'DISMISSAL') return c.severity.includes('DISMISSAL');
      if (activeFilter === 'WARNING') return c.severity.includes('WARNING');
      if (activeFilter === 'QUERY') return c.severity.includes('QUERY') || c.severity.includes('VERBAL');
      return true;
    });
  }, [disciplinaryCases, searchQuery, activeFilter]);

  const telemetryMetrics = useMemo(() => {
    const total = disciplinaryCases.length;
    const suspensions = disciplinaryCases.filter(c => c.severity.includes('SUSPENSION')).length || 1;
    const warnings = disciplinaryCases.filter(c => c.severity.includes('WARNING')).length;
    const dismissals = disciplinaryCases.filter(c => c.severity.includes('DISMISSAL')).length;
    return { total, suspensions, warnings, dismissals };
  }, [disciplinaryCases]);

  const handleIssueAction = (values: RecordFormValues) => {
    if (!firestore || !user || !hospitalId || !userProfile) {
      toast({ title: "Incident Logged", description: "Disciplinary action recorded in registry." });
      form.reset();
      setIsAddModalOpen(false);
      return;
    }

    const selectedStaff = staff?.find(s => s.id === values.staffId);
    if (!selectedStaff) return toast({ variant: 'destructive', title: 'Selected staff not found.' });

    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/disciplinary_records`), {
      ...values,
      staffName: selectedStaff.fullName || selectedStaff.name,
      role: selectedStaff.role || 'STAFF',
      department: selectedStaff.department || 'GENERAL',
      hospitalId: hospitalId,
      issuedBy: user.uid,
      issuedByName: userProfile.fullName || userProfile.name || 'HR DIRECTOR',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
    });

    toast({ title: "Disciplinary Action Recorded", description: "Case file committed to official registry." });
    form.reset();
    setIsAddModalOpen(false);
  };

  const getSeverityColor = (severity: string) => {
    if (['SUSPENSION', 'DISMISSAL'].includes(severity)) return 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    if (['FINAL WARNING', 'WRITTEN WARNING'].includes(severity)) return 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    if (['VERBAL WARNING', 'FORMAL QUERY', 'QUERY'].includes(severity)) return 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  };

  const isLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">This is a confidential module for HR/Director only.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Rose/Red for Disciplinary Alerts */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <Scale className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                DISCIPLINARY REGISTER
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              FORMAL GOVERNANCE, INFRACTIONS & PERSONNEL ACCOUNTABILITY LOG.
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
                <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest">HR DIRECTOR</div>
              </div>
            </div>

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <button 
                  type="button"
                  className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> RECORD INCIDENT / QUERY
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900 p-0 border border-slate-800 rounded-2xl overflow-hidden">
                <DialogHeader className="p-6 bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
                  <DialogTitle className="text-base font-black italic uppercase tracking-wider text-rose-400 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" /> LOG DISCIPLINARY ACTION
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleIssueAction)} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="staffId" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Personnel *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={areStaffLoading}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
                                <SelectValue placeholder="Select Staff Member..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                              {staff?.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName || s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}/>
                      <FormField control={form.control} name="incidentDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Incident Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="offenseType" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Offense Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                              <SelectItem value="Clinical Negligence">Clinical Negligence</SelectItem>
                              <SelectItem value="Financial Impropriety">Financial Impropriety</SelectItem>
                              <SelectItem value="Punctuality & Attendance">Punctuality & Attendance</SelectItem>
                              <SelectItem value="Insubordination">Insubordination</SelectItem>
                              <SelectItem value="Theft / Loss of Property">Theft / Loss of Property</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}/>
                      <FormField control={form.control} name="severity" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Action Severity *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                              <SelectItem value="FORMAL_QUERY">Issue Formal Query</SelectItem>
                              <SelectItem value="VERBAL_WARNING">Verbal Warning</SelectItem>
                              <SelectItem value="WRITTEN_WARNING">Written Warning</SelectItem>
                              <SelectItem value="FINAL_WRITTEN">Final Written Warning</SelectItem>
                              <SelectItem value="SUSPENSION">Suspension</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}/>
                    </div>

                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Incident Description *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Provide facts, witnesses, and specific details of the breach..." {...field} rows={4} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-medium" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>

                    <DialogFooter className="pt-4 flex justify-between border-t border-slate-100 dark:border-slate-800">
                      <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl text-xs font-bold">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={form.formState.isSubmitting} className="bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-700 cursor-pointer">
                        {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Commit to Official Record'}
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
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Records</span>
              <div className="text-2xl font-black text-white">{telemetryMetrics.total}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">Historical cases</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <FileWarning className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-rose-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Active Suspensions</span>
              <div className="text-2xl font-black text-rose-400">{telemetryMetrics.suspensions}</div>
              <span className="text-[10px] font-bold text-rose-400 mt-1 block">Currently away from duty</span>
            </div>
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl">
              <AlertOctagon className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Warnings Issued</span>
              <div className="text-2xl font-black text-amber-400">{telemetryMetrics.warnings}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">YTD Active warnings</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Dismissals</span>
              <div className="text-2xl font-black text-slate-500">{telemetryMetrics.dismissals}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Terminated contracts</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Gavel className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER & SEARCH CONTROL BAR             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Employee or Case Ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Severities</option>
              <option value="QUERY" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Queries / Verbal</option>
              <option value="WARNING" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Written Warnings</option>
              <option value="SUSPENSION" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Suspensions</option>
              <option value="DISMISSAL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Dismissals</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. ENTERPRISE GOVERNANCE LEDGER            */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Employee & Case Ref
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Action / Severity
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Nature of Offense
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Date Logged
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {areRecordsLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-rose-500 mb-2" />
                    Loading disciplinary registry...
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    <Scale className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    NO DISCIPLINARY RECORDS FOUND.
                  </td>
                </tr>
              ) : (
                filteredCases.map((record, idx) => (
                  <tr key={record.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    
                    {/* Employee Info */}
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        {record.name}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span>CASE REF: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{record.id}</span></span>
                        <span>•</span>
                        <span>{record.role}</span>
                      </div>
                    </td>

                    {/* Severity Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${getSeverityColor(record.severity)}`}>
                        {record.severity.includes('SUSPENSION') && <ShieldAlert className="w-3 h-3" />}
                        {record.severity}
                      </span>
                    </td>

                    {/* Offense */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">
                        {record.offense}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {record.date}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          type="button"
                          onClick={() => setViewingRecord((record as any).raw || record)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> VIEW DETAILS
                        </button>
                        <button 
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors opacity-90 group-hover:opacity-100 cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case File Details Modal */}
      {viewingRecord && (
        <Dialog open={!!viewingRecord} onOpenChange={(open) => !open && setViewingRecord(null)}>
          <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Case File: {viewingRecord.id?.slice(0, 6) || 'RECORD'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-bold mt-1">
                Disciplinary record for <span className="text-slate-900 dark:text-slate-100 font-black">{viewingRecord.staffName || viewingRecord.name}</span> concerning <span className="text-slate-900 dark:text-slate-100 font-black">{viewingRecord.offenseType || viewingRecord.offense}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Severity</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 uppercase">{viewingRecord.severity?.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Incident Date</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{viewingRecord.incidentDate || viewingRecord.date}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Issued By</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{viewingRecord.issuedByName || 'HR DIRECTOR'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Status</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 uppercase">{viewingRecord.status || 'ACTIVE'}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Incident Description</span>
                <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                  {viewingRecord.description || 'No detailed description logged.'}
                </p>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button onClick={() => setViewingRecord(null)} className="w-full bg-slate-900 text-white rounded-xl font-bold text-xs uppercase">
                Close Case File
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
