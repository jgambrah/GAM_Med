'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, where } from 'firebase/firestore';
import { 
  Microscope, TestTube, TestTubes, CheckCircle2, 
  Search, Filter, ChevronRight, Clock, UserCheck, 
  FileText, AlertCircle, FlaskConical, Loader2, 
  ShieldAlert, Download, ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

type LabOrder = {
  id: string;
  patientId?: string;
  encounterId?: string;
  testName: string;
  patientName: string;
  providerName: string;
  orderedAt: any;
  completedAt?: any;
  status: string;
  priority?: 'STAT' | 'ROUTINE';
  resultValue?: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  labTechName?: string;
  remarks?: string;
  reportUrl?: string;
  specimenType?: string;
  specimenContainerId?: string;
  specimenCollectedAt?: any;
  specimenCollectedBy?: string;
  specimenCollectedByName?: string;
  parameters?: {
    name: string;
    value: string;
    referenceRange?: string;
    unit?: string;
    isAbnormal?: boolean;
  }[];
};

function CollectSpecimenDialog({ order, hospitalId, onSuccess, isLocked }: { order: LabOrder; hospitalId: string; onSuccess: () => void; isLocked?: boolean }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [specimenType, setSpecimenType] = useState('Whole Blood');
  const [containerId, setContainerId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !hospitalId || !order.id) return;
    if (!containerId.trim()) {
      toast({ variant: 'destructive', title: 'Container ID is required' });
      return;
    }

    setLoading(true);
    try {
      const orderRef = doc(firestore, `hospitals/${hospitalId}/lab_orders`, order.id);
      await updateDocumentNonBlocking(orderRef, {
        status: 'COLLECTED',
        specimenType,
        specimenContainerId: containerId.trim(),
        specimenCollectedAt: serverTimestamp(),
        specimenCollectedBy: user.uid,
        specimenCollectedByName: user.displayName || user.email,
      });

      toast({
        title: 'Specimen Logged',
        description: `Specimen collected for ${order.patientName}. Ready for analysis.`,
      });
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error logging specimen', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          disabled={isLocked}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
        >
          <TestTube className="w-4 h-4" /> {isLocked ? 'PAYMENT PENDING' : 'DRAW / COLLECT SPECIMEN'}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="text-violet-600" /> Log Specimen Collection
          </DialogTitle>
          <DialogDescription>
            Record sample draw for {order.patientName} ({order.testName}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Specimen Type</label>
            <select
              value={specimenType}
              onChange={(e) => setSpecimenType(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-background text-sm font-semibold shadow-sm"
            >
              <option value="Whole Blood">Whole Blood</option>
              <option value="Serum">Serum</option>
              <option value="Plasma">Plasma</option>
              <option value="Urine">Urine</option>
              <option value="Swab">Swab (Nasal/Throat)</option>
              <option value="Sputum">Sputum</option>
              <option value="CSF">CSF (Cerebrospinal Fluid)</option>
              <option value="Stool">Stool</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Container ID / Barcode Label</label>
            <input
              type="text"
              placeholder="e.g. B-10293"
              value={containerId}
              onChange={(e) => setContainerId(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-background text-sm font-semibold shadow-sm"
              required
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700 text-white font-black uppercase text-xs">
              {loading ? <Loader2 className="animate-spin" /> : 'Confirm Collection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ViewParametersDialog({ order }: { order: LabOrder }) {
  const [open, setOpen] = useState(false);
  if (!order.parameters || order.parameters.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[9px] font-black text-violet-600 hover:text-violet-800 uppercase underline cursor-pointer mt-1 block">
          View Parameters
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="text-violet-600" /> Panel Results: {order.testName}
          </DialogTitle>
          <DialogDescription>
            Detailed parameter parameters released for {order.patientName}.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-slate-50 p-6 rounded-[24px] border overflow-hidden">
          <table className="w-full text-left text-xs font-bold text-slate-700 border-collapse">
            <thead>
              <tr className="border-b text-[9px] text-slate-400 uppercase tracking-wider">
                <th className="pb-2">Parameter</th>
                <th className="pb-2 text-center">Value</th>
                <th className="pb-2 text-right">Reference Range</th>
              </tr>
            </thead>
            <tbody>
              {order.parameters.map((p: any, idx: number) => (
                <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-100/50">
                  <td className="py-2.5 text-slate-800 font-extrabold uppercase">{p.name}</td>
                  <td className="py-2.5 text-center">
                    <span className={p.isAbnormal ? "text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full" : "text-violet-700 font-extrabold"}>
                      {p.value} {p.unit}
                    </span>
                    {p.isAbnormal && <span className="ml-1 text-[8px] font-black text-red-500 uppercase animate-pulse">ABN</span>}
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-500 text-[11px]">{p.referenceRange || 'N/A'} {p.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DiagnosticQueueHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'COLLECTED' | 'ARCHIVE'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'stat' | 'routine'>('all');
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
      setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);
  
  const hospitalId = claims?.hospitalId;
  const userRole = claims?.role;
  const isAuthorized = userRole ? ['DIRECTOR', 'LAB_TECH', 'ADMIN', 'DOCTOR'].includes(userRole) : true;

  const [emergencyOverrides, setEmergencyOverrides] = useState<Record<string, boolean>>({});

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital } = useDoc(hospitalRef);
  const paymentPolicy = hospital?.diagnosticPaymentPolicy || 'NONE';

  const billingQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/billing_items`),
      where("status", "==", "UNPAID")
    );
  }, [firestore, hospitalId]);
  const { data: unpaidBillingItems } = useCollection<any>(billingQuery);

  const getOrderPaymentStatus = (order: LabOrder) => {
    if (paymentPolicy === 'NONE') return 'PAID';
    if (!unpaidBillingItems) return 'LOADING';
    const matchingUnpaid = unpaidBillingItems.find(item => 
      item.encounterId === order.encounterId &&
      item.category === 'LABORATORY' &&
      item.description.toLowerCase() === order.testName.toLowerCase()
    );
    if (!matchingUnpaid) return 'PAID';
    if (matchingUnpaid.billingType === 'INSURANCE_CLAIM') return 'INSURANCE';
    return 'UNPAID';
  };

  const allLabsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/lab_orders`),
      orderBy("orderedAt", "desc")
    );
  }, [firestore, hospitalId]);
  
  const { data: rawOrders, isLoading: areOrdersLoading } = useCollection<LabOrder>(allLabsQuery);

  // Demo Fallback Data if Firestore is empty
  const demoOrders: LabOrder[] = useMemo(() => [
    {
      id: 'REQ-001',
      patientName: 'JANET BONAH',
      patientId: 'p_janet',
      testName: 'Complete Blood Count (CBC)',
      providerName: 'Dr. Marcus Amosah Henaku',
      orderedAt: new Date(Date.now() - 30 * 60 * 1000),
      status: 'PENDING',
      priority: 'ROUTINE',
    },
    {
      id: 'REQ-002',
      patientName: 'KOFI MENSAH',
      patientId: 'p_kofi',
      testName: 'Fasting Blood Glucose',
      providerName: 'Dr. Ama Adu',
      orderedAt: new Date(Date.now() - 15 * 60 * 1000),
      status: 'COLLECTED',
      priority: 'STAT',
      specimenType: 'Whole Blood',
      specimenContainerId: 'B-10928'
    },
    {
      id: 'REQ-003',
      patientName: 'AMA SERWAA PREMPEH',
      patientId: 'p_ama',
      testName: 'Liver Function Panel (LFT)',
      providerName: 'Dr. Tracy Gambrah',
      orderedAt: new Date(Date.now() - 120 * 60 * 1000),
      completedAt: new Date(Date.now() - 10 * 60 * 1000),
      status: 'COMPLETED',
      priority: 'ROUTINE',
      resultValue: 'Normal LFT Panel',
      remarks: 'All parameters within reference range.'
    }
  ], []);

  const allOrders = useMemo(() => {
    if (rawOrders && rawOrders.length > 0) return rawOrders;
    return demoOrders;
  }, [rawOrders, demoOrders]);

  const pendingOrders = useMemo(() => {
    return allOrders.filter(o => o.status === 'PENDING');
  }, [allOrders]);

  const collectedOrders = useMemo(() => {
    return allOrders.filter(o => o.status === 'COLLECTED');
  }, [allOrders]);

  const archiveOrders = useMemo(() => {
    return allOrders.filter(o => o.status === 'COMPLETED');
  }, [allOrders]);

  const activeLogList = useMemo(() => {
    const list = activeTab === 'PENDING' ? pendingOrders : activeTab === 'COLLECTED' ? collectedOrders : archiveOrders;
    return list.filter(o => {
      const matchSearch = !searchQuery || o.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || o.testName.toLowerCase().includes(searchQuery.toLowerCase()) || o.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPriority = priorityFilter === 'all' || (priorityFilter === 'stat' && o.priority === 'STAT') || (priorityFilter === 'routine' && o.priority !== 'STAT');
      return matchSearch && matchPriority;
    });
  }, [activeTab, pendingOrders, collectedOrders, archiveOrders, searchQuery, priorityFilter]);

  const isLoading = isUserLoading || isClaimsLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to view the lab queue.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  const userName = user?.displayName || claims?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Violet/Fuchsia for Laboratory */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and User Context */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-500/20 border border-violet-500/30 rounded-xl text-violet-400">
                <Microscope className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                DIAGNOSTIC DESK
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              PROCESS LAB TEST REQUESTS, SPECIMEN COLLECTION & TRACK RELEASED REPORTS.
            </p>
          </div>

          {/* Active User Badge */}
          <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start md:self-auto">
            <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-400/40 flex items-center justify-center font-black text-violet-400 text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-violet-400 uppercase tracking-widest">LABORATORY TECHNICIAN</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          
          {/* Tab 1: Awaiting Specimen */}
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-slate-900 border-amber-500/50 ring-1 ring-amber-500/30 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <TestTube className="w-3.5 h-3.5 text-amber-400" /> Awaiting Specimen
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black">
                {pendingOrders.length} Pending
              </span>
            </div>
            <div className="text-2xl font-black text-white">{pendingOrders.length} {pendingOrders.length === 1 ? 'Request' : 'Requests'}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500" /> Requires Draw/Collection
            </div>
          </button>

          {/* Tab 2: Awaiting Analysis */}
          <button
            type="button"
            onClick={() => setActiveTab('COLLECTED')}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'COLLECTED'
                ? 'bg-slate-900 border-violet-500/50 ring-1 ring-violet-500/30 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <TestTubes className="w-3.5 h-3.5 text-violet-400" /> Awaiting Analysis
              </span>
              <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-black">
                {collectedOrders.length} Active
              </span>
            </div>
            <div className="text-2xl font-black text-white">{collectedOrders.length} {collectedOrders.length === 1 ? 'Specimen' : 'Specimens'}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" /> In Processing Queue
            </div>
          </button>

          {/* Tab 3: Transmitted Archive */}
          <button
            type="button"
            onClick={() => setActiveTab('ARCHIVE')}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'ARCHIVE'
                ? 'bg-slate-900 border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-lg'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Transmitted Archive
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                Released
              </span>
            </div>
            <div className="text-2xl font-black text-white">{archiveOrders.length} {archiveOrders.length === 1 ? 'Report' : 'Reports'}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-emerald-500" /> Results pushed to EHR
            </div>
          </button>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER & SEARCH CONTROL BAR             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Patient Name or Lab ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:inline">
            Priority Filter:
          </span>
          <select 
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="stat">STAT / Urgent</option>
            <option value="routine">Routine</option>
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. DIAGNOSTIC QUEUE CONTENT AREA           */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {activeTab === 'PENDING' && 'AWAITING SPECIMEN COLLECTION'}
            {activeTab === 'COLLECTED' && 'SPECIMENS AWAITING ANALYSIS'}
            {activeTab === 'ARCHIVE' && 'TRANSMITTED REPORTS ARCHIVE'}
          </h2>
          <span className="text-xs font-bold text-slate-400">
            Sorted by Requisition Time
          </span>
        </div>

        {areOrdersLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-2" />
            Fetching lab requisitions...
          </div>
        ) : activeTab === 'ARCHIVE' ? (
          /* TRANSMITTED REPORTS ARCHIVE TABLE */
          activeLogList.length === 0 ? (
            <div className="text-center p-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              No transmitted lab reports found in archive.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-wider">Test Name</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-wider">Patient Name</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-wider">Measured Value</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-wider">Ref Range</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-wider">Clinician</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-wider">Transmitted At</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-wider text-right">Report File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLogList.map((order) => {
                    const compDate = safeToDate(order.completedAt);
                    return (
                      <TableRow key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <TableCell className="font-bold text-slate-900 dark:text-slate-100 uppercase text-xs">
                          {order.testName}
                          <ViewParametersDialog order={order} />
                        </TableCell>
                        <TableCell className="font-black uppercase text-xs text-slate-600 dark:text-slate-300">{order.patientName}</TableCell>
                        <TableCell>
                          {order.parameters && order.parameters.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 px-2 py-0.5 rounded-full border border-violet-200 uppercase">Panel</span>
                              {order.isAbnormal && (
                                <Badge variant="destructive" className="text-[8px] font-black uppercase py-0 px-2 animate-pulse">ABNORMAL</Badge>
                              )}
                            </div>
                          ) : (
                            <>
                              <span className={`font-black text-sm ${order.isAbnormal ? 'text-red-600 border-b-2 border-red-500 pb-0.5' : 'text-violet-700 dark:text-violet-400'}`}>
                                {order.resultValue || 'Normal'} <span className="text-[10px] font-bold text-slate-400 not-italic">{order.unit}</span>
                              </span>
                              {order.isAbnormal && (
                                <Badge variant="destructive" className="ml-2 text-[8px] font-black uppercase py-0 px-2 animate-pulse">ABNORMAL</Badge>
                              )}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{order.referenceRange || 'N/A'} {order.unit}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-600 dark:text-slate-300">{order.providerName}</TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                          {compDate ? format(compDate, 'dd MMM yyyy, HH:mm') : 'Recently'}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.reportUrl ? (
                            <Button asChild size="sm" variant="outline" className="h-8 px-3 rounded-xl border-violet-200 hover:border-violet-400 text-violet-700 hover:bg-violet-50">
                              <a href={order.reportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-bold uppercase text-[9px]">
                                <Download size={12} /> View File
                              </a>
                            </Button>
                          ) : (
                            <span className="text-[9px] font-black uppercase text-slate-300 italic">No Attachment</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          /* PENDING OR COLLECTED CARDS LIST */
          activeLogList.length === 0 ? (
            <div className="text-center p-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
              <FlaskConical className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              No lab test requests in this view.
            </div>
          ) : (
            <div className="space-y-4">
              {activeLogList.map((req) => {
                const paymentStatus = getOrderPaymentStatus(req);
                const isLocked = paymentPolicy === 'STRICT' && paymentStatus === 'UNPAID' && !emergencyOverrides[req.id];
                const timeAgoDisplay = req.orderedAt ? (typeof req.orderedAt.toDate === 'function' ? formatDistanceToNow(req.orderedAt.toDate(), { addSuffix: true }) : 'Recently') : 'Just now';

                return (
                  <div key={req.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl border mt-1 ${
                        activeTab === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800' : 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/50 dark:text-violet-400 dark:border-violet-800'
                      }`}>
                        {activeTab === 'PENDING' ? <TestTube className="w-6 h-6" /> : <TestTubes className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">PATIENT</span>
                          <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase tracking-wide">
                            {req.patientName}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            activeTab === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                          }`}>
                            {req.status}
                          </span>
                          {req.priority === 'STAT' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[9px] font-black uppercase tracking-wider animate-pulse">
                              STAT / URGENT
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-black text-violet-700 dark:text-violet-400 uppercase mb-1">
                          {req.testName}
                        </div>
                        
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Ordered by {req.providerName}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> {timeAgoDisplay}
                          </span>
                        </div>

                        {req.specimenContainerId && (
                          <div className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span className="text-violet-600 font-extrabold uppercase">Specimen:</span> {req.specimenType || 'Whole Blood'} (Barcode: {req.specimenContainerId})
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-end md:items-center gap-3 self-end md:self-center">
                      {paymentPolicy === 'STRICT' && paymentStatus === 'UNPAID' && (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 p-2 rounded-xl border border-red-100 dark:border-red-900/40">
                          <input 
                            type="checkbox" 
                            id={`override-${req.id}`}
                            checked={!!emergencyOverrides[req.id]}
                            onChange={(e) => setEmergencyOverrides(prev => ({ ...prev, [req.id]: e.target.checked }))}
                            className="w-3.5 h-3.5 rounded border-red-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                          <label htmlFor={`override-${req.id}`} className="text-[9px] font-black text-red-800 dark:text-red-300 uppercase cursor-pointer select-none">
                            Emergency Override
                          </label>
                        </div>
                      )}

                      {activeTab === 'PENDING' ? (
                        <CollectSpecimenDialog 
                          order={req} 
                          hospitalId={hospitalId || 'default'} 
                          onSuccess={() => {}} 
                          isLocked={isLocked}
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => router.push(`/lab/results/${req.id}`)}
                          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
                        >
                          <FileText className="w-4 h-4" /> ENTER RESULTS & RELEASE
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

    </div>
  );
}
