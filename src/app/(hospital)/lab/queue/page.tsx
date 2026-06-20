'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, where } from 'firebase/firestore';
import { FlaskConical, Loader2, ShieldAlert, CheckCircle2, Download, ExternalLink } from 'lucide-react';
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
        <Button 
          disabled={isLocked}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-[10px] tracking-widest transition-all mt-4 py-5 rounded-2xl disabled:bg-slate-100 disabled:text-slate-400"
        >
          {isLocked ? 'Payment Pending' : 'Draw/Collect Specimen'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="text-purple-600" /> Log Specimen Collection
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
              className="w-full p-2 border rounded-lg bg-background text-sm font-semibold shadow-sm"
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
              className="w-full p-2 border rounded-lg bg-background text-sm font-semibold shadow-sm"
              required
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
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
        <button className="text-[9px] font-black text-purple-600 hover:text-purple-800 uppercase underline cursor-pointer mt-1 block">
          View Parameters
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="text-purple-600" /> Panel Results: {order.testName}
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
                    <span className={p.isAbnormal ? "text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full" : "text-purple-700 font-extrabold"}>
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

export default function LabQueuePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'COLLECTED' | 'ARCHIVE'>('PENDING');
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
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'LAB_TECH' || userRole === 'ADMIN';

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
  
  const { data: allOrders, isLoading: areOrdersLoading } = useCollection<LabOrder>(allLabsQuery);

  const pendingOrders = useMemo(() => {
    return allOrders?.filter(o => o.status === 'PENDING') || [];
  }, [allOrders]);

  const collectedOrders = useMemo(() => {
    return allOrders?.filter(o => o.status === 'COLLECTED') || [];
  }, [allOrders]);

  const archiveOrders = useMemo(() => {
    return allOrders?.filter(o => o.status === 'COMPLETED') || [];
  }, [allOrders]);

  // Group pending orders by Patient Name
  const groupedPending = useMemo(() => {
    const groups: Record<string, LabOrder[]> = {};
    for (const order of pendingOrders) {
      const key = order.patientName;
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    }
    return groups;
  }, [pendingOrders]);

  // Group collected orders by Patient Name
  const groupedCollected = useMemo(() => {
    const groups: Record<string, LabOrder[]> = {};
    for (const order of collectedOrders) {
      const key = order.patientName;
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    }
    return groups;
  }, [collectedOrders]);

  const isLoading = isUserLoading || isClaimsLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Diagnostic <span className="text-purple-600">Desk</span></h1>
           <p className="text-muted-foreground font-medium">Process lab test requests and track released reports.</p>
        </div>
        
        {/* TAB CONTROLLERS */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 border">
           <button 
             onClick={() => setActiveTab('PENDING')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'PENDING' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
           >
              Awaiting Specimen ({areOrdersLoading ? '...' : pendingOrders.length})
           </button>
           <button 
             onClick={() => setActiveTab('COLLECTED')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'COLLECTED' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
           >
              Awaiting Analysis ({areOrdersLoading ? '...' : collectedOrders.length})
           </button>
           <button 
             onClick={() => setActiveTab('ARCHIVE')}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'ARCHIVE' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
           >
              Transmitted Archive ({areOrdersLoading ? '...' : archiveOrders.length})
           </button>
        </div>
      </div>
      
      {areOrdersLoading ? (
         <div className="text-center p-12 text-muted-foreground bg-card border rounded-[32px]">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-600" />
            Fetching lab requests...
         </div>
      ) : activeTab === 'PENDING' ? (
        pendingOrders.length === 0 ? (
          <div className="text-center p-20 bg-card border-2 border-dashed rounded-[32px] text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            No pending tests waiting for specimen.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPending).map(([patientName, orders]) => (
              <div key={patientName} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4 hover:border-purple-200 transition-all">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</span>
                    <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight leading-tight">{patientName}</h3>
                  </div>
                  <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                    AWAITING {orders.length} SPECIMEN{orders.length > 1 ? 'S' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.map((order) => {
                    const paymentStatus = getOrderPaymentStatus(order);
                    const isLocked = paymentPolicy === 'STRICT' && paymentStatus === 'UNPAID' && !emergencyOverrides[order.id];
                    
                    return (
                      <div key={order.id} className="bg-slate-50/50 p-5 rounded-2xl border flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <p className="font-black text-sm uppercase text-slate-800 leading-tight">{order.testName}</p>
                            {paymentPolicy !== 'NONE' && (
                              <span className={cn(
                                "text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0",
                                paymentStatus === 'PAID' && "bg-green-50 text-green-700 border-green-200",
                                paymentStatus === 'INSURANCE' && "bg-blue-50 text-blue-700 border-blue-200",
                                paymentStatus === 'UNPAID' && "bg-red-50 text-red-700 border-red-200",
                                paymentStatus === 'LOADING' && "bg-slate-50 text-slate-400 border-slate-200 animate-pulse"
                              )}>
                                {paymentStatus}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400">
                            Ordered by Dr. {order.providerName} • {formatDistanceToNow(safeToDate(order.orderedAt) || new Date(), { addSuffix: true })}
                          </p>
                        </div>

                        {paymentPolicy === 'STRICT' && paymentStatus === 'UNPAID' && (
                          <div className="flex items-center gap-2 mt-3 bg-red-50/60 p-2 rounded-xl border border-red-100">
                            <input 
                              type="checkbox" 
                              id={`override-${order.id}`}
                              checked={!!emergencyOverrides[order.id]}
                              onChange={(e) => setEmergencyOverrides(prev => ({ ...prev, [order.id]: e.target.checked }))}
                              className="w-3.5 h-3.5 rounded border-red-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            <label htmlFor={`override-${order.id}`} className="text-[9px] font-black text-red-800 uppercase cursor-pointer select-none">
                              Emergency Override
                            </label>
                          </div>
                        )}

                        <CollectSpecimenDialog 
                          order={order} 
                          hospitalId={hospitalId!} 
                          onSuccess={() => {}} 
                          isLocked={isLocked}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'COLLECTED' ? (
        collectedOrders.length === 0 ? (
          <div className="text-center p-20 bg-card border-2 border-dashed rounded-[32px] text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            No specimens collected. Perform specimen draw in "Awaiting Specimen" first.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCollected).map(([patientName, orders]) => (
              <div key={patientName} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4 hover:border-purple-200 transition-all">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</span>
                    <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight leading-tight">{patientName}</h3>
                  </div>
                  <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200">
                    {orders.length} SPECIMEN{orders.length > 1 ? 'S' : ''} READY
                  </span>
                </div>

                {/* VERIFICATION SUMMARY: List all unique specimens collected for this patient */}
                <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-2">
                  <p className="text-[10px] font-black text-purple-800 uppercase tracking-wider">Collected Specimens Verification Label list:</p>
                  <div className="flex flex-wrap gap-3">
                    {Array.from(new Set(orders.map(o => `${o.specimenType} [Barcode: ${o.specimenContainerId}]`))).map((label, idx) => (
                      <span key={idx} className="bg-white border border-purple-200 px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm flex items-center gap-1.5">
                        <FlaskConical size={12} className="text-purple-600" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.map((order) => {
                    const paymentStatus = getOrderPaymentStatus(order);
                    const isLocked = paymentPolicy === 'STRICT' && paymentStatus === 'UNPAID' && !emergencyOverrides[order.id];

                    return (
                      <div key={order.id} className="bg-slate-50/50 p-5 rounded-2xl border flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <p className="font-black text-sm uppercase text-slate-800 leading-tight">{order.testName}</p>
                            {paymentPolicy !== 'NONE' && (
                              <span className={cn(
                                "text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0",
                                paymentStatus === 'PAID' && "bg-green-50 text-green-700 border-green-200",
                                paymentStatus === 'INSURANCE' && "bg-blue-50 text-blue-700 border-blue-200",
                                paymentStatus === 'UNPAID' && "bg-red-50 text-red-700 border-red-200",
                                paymentStatus === 'LOADING' && "bg-slate-50 text-slate-400 border-slate-200 animate-pulse"
                              )}>
                                {paymentStatus}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400">
                            Ordered by Dr. {order.providerName}
                          </p>
                          <div className="pt-2 mt-2 border-t text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                            <span className="font-bold text-purple-700">Specimen:</span> {order.specimenType} ({order.specimenContainerId})
                          </div>
                        </div>

                        {paymentPolicy === 'STRICT' && paymentStatus === 'UNPAID' && (
                          <div className="flex items-center gap-2 mt-3 bg-red-50/60 p-2 rounded-xl border border-red-100">
                            <input 
                              type="checkbox" 
                              id={`override-${order.id}`}
                              checked={!!emergencyOverrides[order.id]}
                              onChange={(e) => setEmergencyOverrides(prev => ({ ...prev, [order.id]: e.target.checked }))}
                              className="w-3.5 h-3.5 rounded border-red-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            <label htmlFor={`override-${order.id}`} className="text-[9px] font-black text-red-800 uppercase cursor-pointer select-none">
                              Emergency Override
                            </label>
                          </div>
                        )}

                        <Button 
                          disabled={isLocked}
                          className="w-full bg-foreground hover:bg-purple-600 text-background font-black uppercase text-[10px] tracking-widest transition-all mt-4 py-5 rounded-2xl disabled:bg-slate-100 disabled:text-slate-400"
                          onClick={() => router.push(`/lab/results/${order.id}`)}
                        >
                          {isLocked ? 'Payment Pending' : 'Enter Results & Release'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ARCHIVE TAB VIEW */
        archiveOrders.length === 0 ? (
          <div className="text-center p-20 bg-card border-2 border-dashed rounded-[32px] text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            You have not transmitted any lab reports yet.
          </div>
        ) : (
          <div className="bg-card rounded-[32px] border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Test Name</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Patient Name</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Measured Value</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Ref Range</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Clinician</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Transmitted At</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider">Remarks</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-wider text-right">Report File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archiveOrders.map((order) => {
                  const compDate = safeToDate(order.completedAt);
                  return (
                    <TableRow key={order.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-black uppercase text-xs">
                        {order.testName}
                        <ViewParametersDialog order={order} />
                      </TableCell>
                      <TableCell className="font-black uppercase text-xs text-slate-600">{order.patientName}</TableCell>
                      <TableCell>
                        {order.parameters && order.parameters.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200 uppercase">Panel</span>
                            {order.isAbnormal && (
                              <Badge variant="destructive" className="text-[8px] font-black uppercase py-0 px-2 animate-pulse">ABNORMAL</Badge>
                            )}
                          </div>
                        ) : (
                          <>
                            <span className={`font-black text-sm ${order.isAbnormal ? 'text-red-600 border-b-2 border-red-500 pb-0.5' : 'text-purple-700'}`}>
                              {order.resultValue} <span className="text-[10px] font-bold text-slate-400 not-italic">{order.unit}</span>
                            </span>
                            {order.isAbnormal && (
                              <Badge variant="destructive" className="ml-2 text-[8px] font-black uppercase py-0 px-2 animate-pulse">ABNORMAL</Badge>
                            )}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{order.referenceRange || 'N/A'} {order.unit}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600">Dr. {order.providerName}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {compDate ? format(compDate, 'dd MMM yyyy, HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs italic text-slate-500 max-w-xs truncate" title={order.remarks}>
                        {order.remarks || 'No remarks.'}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.reportUrl ? (
                          <Button asChild size="sm" variant="outline" className="h-8 px-3 rounded-xl border-purple-200 hover:border-purple-400 text-purple-700 hover:bg-purple-50">
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
      )}
    </div>
  );
}
