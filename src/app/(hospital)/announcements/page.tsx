'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { 
  Megaphone, Bell, FileText, Search, Plus, Filter, 
  ChevronRight, AlertCircle, ShieldCheck, UserCheck, 
  Clock, CheckCircle2, X, Eye, Loader2, Pin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const memoSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  category: z.string().min(1, "Category is required."),
  priority: z.string().min(1, "Priority is required."),
  department: z.string().min(1, "Department / Author is required."),
  content: z.string().min(10, "Memo content must be at least 10 characters."),
});

type MemoFormValues = z.infer<typeof memoSchema>;

interface AnnouncementItem {
  id: string;
  title: string;
  category: 'POLICY' | 'GENERAL' | 'CLINICAL' | 'SAFETY';
  priority: 'URGENT' | 'ROUTINE' | 'HIGH';
  author: string;
  publishedAt: any;
  snippet: string;
  content: string;
  pinned?: boolean;
}

export default function AnnouncementsHubPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<AnnouncementItem | null>(null);
  const [readMemos, setReadMemos] = useState<Record<string, boolean>>({});

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId || 'default';
  const userRole = userProfile?.role;
  const canPublish = ['DIRECTOR', 'ADMIN', 'HR', 'MEDICAL_DIRECTOR'].includes(userRole || 'DIRECTOR');

  const announcementsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${userProfile.hospitalId}/announcements`),
      orderBy("createdAt", "desc")
    );
  }, [firestore, userProfile?.hospitalId]);

  const { data: rawAnnouncements, isLoading: areAnnouncementsLoading } = useCollection<any>(announcementsQuery);

  const demoAnnouncements: AnnouncementItem[] = useMemo(() => [
    {
      id: 'MEMO-2026-001',
      title: 'MANDATORY REVISED INFECTION CONTROL PROTOCOL (IPC-2026)',
      category: 'POLICY',
      priority: 'URGENT',
      author: 'Office of the Medical Director',
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      snippet: 'All clinical personnel in ICU, Maternity, and Surgical Wards must adhere to the updated hand hygiene and PPE protocol standard.',
      content: 'Effective immediately, all clinical staff across Inpatient Wards, Emergency, and Surgical Suites must complete the mandatory 2026 Infection Prevention & Control (IPC) refresher. Personal Protective Equipment (PPE) compliance logs are now audited daily at shift handovers. Failure to comply will result in administrative review.',
      pinned: true,
    },
    {
      id: 'MEMO-2026-002',
      title: 'Q3 FACILITY MAINTENANCE & OXYGEN VAULT AUDIT SCHEDULING',
      category: 'CLINICAL',
      priority: 'HIGH',
      author: 'Biomedical Engineering & Support Services',
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      snippet: 'Scheduled pressure testing for central oxygen manifolds will take place on Saturday at 22:00 GMT. Secondary tanks prepped.',
      content: 'Biomedical engineering will perform scheduled maintenance and vacuum line testing for central manifolds this Saturday from 22:00 to 23:30 GMT. All primary ward crash carts and secondary emergency cylinders have been verified and placed on standby. Nursing leads should ensure all patient flowmeters are set to fallback bottles prior to maintenance window.',
      pinned: false,
    },
    {
      id: 'MEMO-2026-003',
      title: 'ANNUAL VOLUNTARY BLOOD DONATION DRIVE & PRIVILEGE PROGRAM',
      category: 'GENERAL',
      priority: 'ROUTINE',
      author: 'Blood Bank & Laboratory Services',
      publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      snippet: 'The Ghana National Blood Service drive begins next Monday. All staff members are encouraged to participate and claim donor privilege tiers.',
      content: 'Our annual facility blood drive in partnership with GNBS commences next week Monday in the main courtyard. Staff members who donate will be enrolled in the GAM Med Voluntary Blood Donor Privilege Program (Silver/Gold Tiers) offering processing fee waivers for immediate family members.',
      pinned: false,
    },
    {
      id: 'MEMO-2026-004',
      title: 'UPDATED NHIS & PRIVATE PAYER TARIFF CLAIMS CLEARANCE PROCEDURES',
      category: 'SAFETY',
      priority: 'ROUTINE',
      author: 'Finance & Claims Vetting Department',
      publishedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
      snippet: 'All diagnostic prescriptions must include G-DRG codes prior to pharmacy discharge to eliminate billing claim rejections.',
      content: 'To prevent claim vetting rejections from NHIA and private insurance underwriters, all prescribers must ensure diagnosis coding matching G-DRG classification is attached to lab and pharmacy orders before finalizing electronic discharges.',
      pinned: false,
    }
  ], []);

  const announcements: AnnouncementItem[] = useMemo(() => {
    if (rawAnnouncements && rawAnnouncements.length > 0) {
      return rawAnnouncements.map((a: any, idx: number) => ({
        id: a.id || `MEMO-2026-${String(idx + 1).padStart(3, '0')}`,
        title: (a.title || 'HOSPITAL NOTICE').toUpperCase(),
        category: a.category || 'GENERAL',
        priority: a.priority || 'ROUTINE',
        author: a.department || a.author || 'Hospital Administration',
        publishedAt: a.createdAt ? (typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : new Date()) : new Date(),
        snippet: a.content ? `${a.content.slice(0, 120)}...` : 'Official hospital communication.',
        content: a.content || 'No detailed content available.',
        pinned: a.pinned || false,
      }));
    }
    return demoAnnouncements;
  }, [rawAnnouncements, demoAnnouncements]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(item => {
      const matchSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.author.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.content.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter || (categoryFilter === 'URGENT' && item.priority === 'URGENT');
      return matchSearch && matchCat;
    });
  }, [announcements, searchQuery, categoryFilter]);

  const unreadCount = useMemo(() => {
    return announcements.filter(a => !readMemos[a.id]).length;
  }, [announcements, readMemos]);

  const policyCount = useMemo(() => {
    return announcements.filter(a => a.category === 'POLICY').length;
  }, [announcements]);

  const generalCount = useMemo(() => {
    return announcements.filter(a => a.category === 'GENERAL' || a.category === 'SAFETY').length;
  }, [announcements]);

  const form = useForm<MemoFormValues>({
    resolver: zodResolver(memoSchema),
    defaultValues: {
      title: '',
      category: 'POLICY',
      priority: 'URGENT',
      department: 'Office of the Medical Director',
      content: '',
    },
  });

  const handlePublishMemo = (values: MemoFormValues) => {
    if (!firestore || !hospitalId) {
      toast({ title: 'Memo Published', description: `${values.title} broadcasted to all staff.` });
      setIsPublishOpen(false);
      form.reset();
      return;
    }

    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/announcements`), {
      ...values,
      hospitalId,
      createdAt: serverTimestamp(),
      publisherUid: user?.uid || 'admin',
      publisherName: user?.displayName || userProfile?.name || 'Administrator',
    });

    toast({
      title: 'Announcement Published',
      description: 'Official memo has been broadcasted to all hospital desks.',
    });
    form.reset();
    setIsPublishOpen(false);
  };

  const handleAcknowledge = (id: string) => {
    setReadMemos(prev => ({ ...prev, [id]: true }));
    toast({ title: 'Memo Acknowledged', description: 'Marked as read in your session.' });
    setSelectedMemo(null);
  };

  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Indigo/Fuchsia */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Megaphone className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                INTERNAL ANNOUNCEMENTS & MEMOS
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              OFFICIAL HOSPITAL COMMUNICATIONS, PROTOCOL UPDATES & GENERAL NOTICES.
            </p>
          </div>

          {/* Actions / Publish Dialog */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {canPublish && (
              <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
                <DialogTrigger asChild>
                  <button 
                    type="button"
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" /> PUBLISH NEW MEMO
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-900 p-0 border border-slate-800 rounded-2xl overflow-hidden">
                  
                  {/* SIGNATURE DARK MODAL HEADER */}
                  <div className="p-6 bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                        <Megaphone className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block">
                          EXECUTIVE BROADCAST ENGINE
                        </span>
                        <h2 className="text-base font-black italic uppercase tracking-wider text-white">
                          PUBLISH OFFICIAL MEMO
                        </h2>
                      </div>
                    </div>
                  </div>

                  {/* FORM BODY */}
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handlePublishMemo)} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                      
                      <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Memo Title *
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. MANDATORY REVISED INFECTION CONTROL PROTOCOL" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold uppercase" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField control={form.control} name="category" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Category *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
                                  <SelectValue placeholder="Category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-900 text-white border-slate-800">
                                <SelectItem value="POLICY">POLICY</SelectItem>
                                <SelectItem value="CLINICAL">CLINICAL</SelectItem>
                                <SelectItem value="SAFETY">SAFETY</SelectItem>
                                <SelectItem value="GENERAL">GENERAL</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="priority" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Priority *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
                                  <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-900 text-white border-slate-800">
                                <SelectItem value="URGENT">URGENT</SelectItem>
                                <SelectItem value="HIGH">HIGH</SelectItem>
                                <SelectItem value="ROUTINE">ROUTINE</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="department" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Issuing Department</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Office of Medical Director" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name="content" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Full Memo Directives *</FormLabel>
                          <FormControl>
                            <textarea
                              rows={5}
                              placeholder="Enter comprehensive memo instructions, protocols, and compliance requirements..."
                              {...field}
                              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <button 
                          type="button" 
                          onClick={() => setIsPublishOpen(false)}
                          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          disabled={form.formState.isSubmitting} 
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                        >
                          BROADCAST TO ALL DESKS
                        </button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          
          {/* Card 1: Unread Memos (Rose/Red) */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Unread Memos
              </span>
              <div className="text-2xl font-black text-rose-400">{unreadCount} Pending</div>
              <span className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                <Bell className="w-3 h-3 text-rose-500" /> Action required
              </span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          {/* Card 2: Policy Updates (Sky/Blue) */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Policy Updates
              </span>
              <div className="text-2xl font-black text-sky-400">{policyCount} Protocols</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Clinical & SOP guidelines</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: General Notices (Slate/Gray) */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                General Notices
              </span>
              <div className="text-2xl font-black text-slate-200">{generalCount} Active</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Operational broadcasts</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Megaphone className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER & SEARCH CONTROL BAR             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search memo title, department, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>

        {/* Category Segmented Control Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['ALL', 'URGENT', 'POLICY', 'GENERAL'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. ANNOUNCEMENT FEED / BOARD               */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-indigo-500" /> OFFICIAL BROADCAST BOARD
          </h2>
          <span className="text-xs font-bold text-slate-400">
            {filteredAnnouncements.length} {filteredAnnouncements.length === 1 ? 'Memo' : 'Memos'} Available
          </span>
        </div>

        {areAnnouncementsLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            Loading hospital announcements...
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-16 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <Megaphone className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            No announcements found matching your criteria.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((memo) => {
              const isRead = readMemos[memo.id];
              const formattedDate = memo.publishedAt ? (typeof memo.publishedAt.toDate === 'function' ? format(memo.publishedAt.toDate(), 'PPP') : 'Today') : 'Recently';

              return (
                <div 
                  key={memo.id}
                  className={`p-6 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group ${
                    memo.priority === 'URGENT'
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:border-rose-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    {/* Header badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {memo.priority === 'URGENT' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> URGENT MEMO
                        </span>
                      )}
                      {memo.category === 'POLICY' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[9px] font-black uppercase tracking-wider border border-sky-200 dark:border-sky-800">
                          POLICY UPDATE
                        </span>
                      )}
                      {memo.category === 'CLINICAL' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-[9px] font-black uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                          CLINICAL PROTOCOL
                        </span>
                      )}
                      {memo.category === 'GENERAL' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                          GENERAL NOTICE
                        </span>
                      )}

                      {memo.pinned && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-bold flex items-center gap-1">
                          <Pin className="w-3 h-3" /> PINNED
                        </span>
                      )}

                      {isRead && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> READ
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase tracking-wide group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {memo.title}
                    </h3>

                    {/* Author & Timestamp */}
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" /> From: <strong className="font-extrabold">{memo.author}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {formattedDate}
                      </span>
                    </div>

                    {/* Snippet */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed pt-1">
                      {memo.snippet}
                    </p>
                  </div>

                  {/* Read Full Memo Button */}
                  <div className="self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedMemo(memo)}
                      className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-indigo-600 dark:hover:bg-indigo-500 text-white dark:text-slate-900 text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" /> READ FULL MEMO
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 4. DETAIL MEMO VIEW DIALOG                 */}
      {/* ========================================== */}
      {selectedMemo && (
        <Dialog open={!!selectedMemo} onOpenChange={() => setSelectedMemo(null)}>
          <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900 p-0 border border-slate-800 rounded-2xl overflow-hidden">
            
            {/* MEMO HEADER */}
            <div className={`p-6 text-white border-b flex items-center justify-between ${
              selectedMemo.priority === 'URGENT' ? 'bg-rose-950 border-rose-900' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  selectedMemo.priority === 'URGENT' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
                }`}>
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    {selectedMemo.author}
                  </span>
                  <h2 className="text-base font-black italic uppercase tracking-wider text-white">
                    OFFICIAL BROADCAST DIRECTIVE
                  </h2>
                </div>
              </div>
            </div>

            {/* MEMO CONTENT BODY */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[9px] font-black uppercase tracking-wider border">
                  REF: {selectedMemo.id}
                </span>
                {selectedMemo.priority === 'URGENT' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider">
                    URGENT
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-[9px] font-black uppercase tracking-wider border">
                  {selectedMemo.category}
                </span>
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                {selectedMemo.title}
              </h3>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>ISSUING AUTHORITY: {selectedMemo.author}</span>
                <span>STATUS: ACTIVE DIRECTIVE</span>
              </div>

              <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed space-y-3 font-medium whitespace-pre-wrap">
                {selectedMemo.content}
              </div>
            </div>

            <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setSelectedMemo(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Close View
              </button>
              <button
                type="button"
                onClick={() => handleAcknowledge(selectedMemo.id)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> ACKNOWLEDGE & MARK AS READ
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
