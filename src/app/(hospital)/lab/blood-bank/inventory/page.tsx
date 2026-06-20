
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Droplets, Plus, AlertTriangle, 
  History, Thermometer, ShieldCheck, 
  Search, Calendar, Loader2, ShieldAlert, Save, Link as LinkIcon, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, differenceInDays, add } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { CrossmatchDialog } from '@/components/clinical/CrossmatchDialog';


const pintSchema = z.object({
  pintId: z.string().min(3, "Pint/Bag ID is required."),
  bloodGroup: z.string().min(1, "Blood Group is required."),
  source: z.string().min(1, "Source is required."),
  donorId: z.string().optional(),
  collectionDate: z.string().min(1, "Collection Date is required."),
  screened: z.boolean().default(false),
});

type PintFormValues = z.infer<typeof pintSchema>;


export default function BloodBankInventory() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAddPintOpen, setIsAddPintOpen] = useState(false);
  const [crossmatchPint, setCrossmatchPint] = useState<any | null>(null);
  const [discardPint, setDiscardPint] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'CROSSMATCHED' | 'QUARANTINE' | 'EXPIRED' | 'DISCARDED' | 'ALL'>('AVAILABLE');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'LAB_TECH', 'DOCTOR', 'NURSE'].includes(userRole || '');

  const pintsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/blood_pints`),
      orderBy("expiryDate", "asc")
    );
  }, [firestore, hospitalId]);
  
  const { data: pints, isLoading: arePintsLoading } = useCollection<any>(pintsQuery);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  
  const counts = useMemo(() => {
    const res = { AVAILABLE: 0, CROSSMATCHED: 0, QUARANTINE: 0, EXPIRED: 0, DISCARDED: 0, ALL: 0 };
    if (pints) {
      const now = new Date();
      pints.forEach(p => {
        const isExpired = p.expiryDate && p.expiryDate.toDate() < now;
        res.ALL++;
        if (p.status === 'DISCARDED') {
          res.DISCARDED++;
        } else if (p.status === 'CROSSMATCHED') {
          res.CROSSMATCHED++;
        } else if (isExpired && p.status !== 'TRANSFUSED') {
          res.EXPIRED++;
        } else if (p.status === 'AVAILABLE') {
          if (p.screened === false) {
            res.QUARANTINE++;
          } else {
            res.AVAILABLE++;
          }
        }
      });
    }
    return res;
  }, [pints]);

  const filteredPints = useMemo(() => {
    if (!pints) return [];
    const now = new Date();
    return pints.filter(p => {
      const isExpired = p.expiryDate && p.expiryDate.toDate() < now;
      
      switch (activeTab) {
        case 'AVAILABLE':
          return p.status === 'AVAILABLE' && p.screened === true && !isExpired;
        case 'CROSSMATCHED':
          return p.status === 'CROSSMATCHED';
        case 'QUARANTINE':
          return p.status === 'AVAILABLE' && p.screened === false && !isExpired;
        case 'EXPIRED':
          return p.status !== 'DISCARDED' && p.status !== 'TRANSFUSED' && isExpired;
        case 'DISCARDED':
          return p.status === 'DISCARDED';
        case 'ALL':
        default:
          return true;
      }
    });
  }, [pints, activeTab]);

  const bloodGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (pints) {
      for (const group of bloodGroups) {
        counts[group] = pints.filter(p => p.bloodGroup === group && p.status === 'AVAILABLE' && p.screened === true).length;
      }
    }
    return counts;
  }, [pints, bloodGroups]);
  
  const getDaysRemaining = (expiry: { toDate: () => Date }) => {
    if (!expiry) return { text: 'N/A', color: 'text-slate-400' };
    const days = differenceInDays(expiry.toDate(), new Date());
    if (days < 0) return { text: 'EXPIRED', color: 'text-red-500 font-black' };
    if (days <= 7) return { text: `${days} Days Left`, color: 'text-red-500' };
    return { text: `${days} Days`, color: 'text-green-600' };
  };

  const isLoading = isUserLoading || isProfileLoading || arePintsLoading;
  
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>
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

  return (
    <>
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b-8 border-red-600 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-black">Blood <span className="text-red-600">Bank Vault</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Critical Cold-Chain Pint Management.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="bg-red-50 text-red-600 px-6 py-2 rounded-2xl border-2 border-red-200 flex items-center gap-3">
            <Thermometer size={18} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase">Temp: 4.2°C (Optimal)</span>
            </div>
            <AddPintDialog hospitalId={hospitalId!} isOpen={isAddPintOpen} setIsOpen={setIsAddPintOpen} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {bloodGroups.map(group => {
            const count = bloodGroupCounts[group] || 0;
            return (
                <div key={group} className={`p-4 rounded-3xl border-4 text-center transition-all ${count === 0 ? 'bg-slate-50 border-slate-200 text-slate-300' : 'bg-white border-red-600 text-red-600 shadow-lg'}`}>
                    <p className="text-xl font-black">{group}</p>
                    <p className="text-[10px] font-bold uppercase">{count} Pints</p>
                </div>
            )
        })}
      </div>

      {/* TABS CONTROLLERS */}
      <div className="flex flex-wrap gap-2 bg-slate-50 p-2 rounded-[24px] border no-print">
        {[
          { id: 'AVAILABLE', label: 'Available', count: counts.AVAILABLE, color: 'text-green-600 bg-green-50' },
          { id: 'CROSSMATCHED', label: 'Reserved / Cross-matched', count: counts.CROSSMATCHED, color: 'text-blue-600 bg-blue-50' },
          { id: 'QUARANTINE', label: 'Quarantine (Unscreened)', count: counts.QUARANTINE, color: 'text-amber-600 bg-amber-50' },
          { id: 'EXPIRED', label: 'Expired', count: counts.EXPIRED, color: 'text-red-600 bg-red-50' },
          { id: 'DISCARDED', label: 'Discarded / Waste', count: counts.DISCARDED, color: 'text-slate-600 bg-slate-100' },
          { id: 'ALL', label: 'All Pints', count: counts.ALL, color: 'text-slate-800' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                isActive 
                  ? 'bg-white text-black shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${isActive ? tab.color : 'bg-slate-200 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-6 text-[10px] uppercase">Pint ID / Batch</th>
              <th className="p-6 text-[10px] uppercase">Blood Group</th>
              <th className="p-6 text-[10px] uppercase">Expiry Date</th>
              <th className="p-6 text-[10px] uppercase">Screening / Status</th>
              <th className="p-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin"/></td></tr>}
            {!isLoading && filteredPints?.length === 0 ? (
                 <tr><td colSpan={5} className="p-20 text-center text-slate-300 uppercase italic">No blood pints in this category.</td></tr>
            ) : filteredPints?.map(pint => {
              const expiryInfo = getDaysRemaining(pint.expiryDate);
              const isExpired = expiryInfo.text === 'EXPIRED';
              const isUnscreened = !pint.screened;
              const isCrossmatched = pint.status === 'CROSSMATCHED';
              const isTransfused = pint.status === 'TRANSFUSED';
              const isDiscarded = pint.status === 'DISCARDED';
              return (
              <tr key={pint.id} className={`hover:bg-red-50/30 transition-all font-bold ${isTransfused || isDiscarded ? 'opacity-40 grayscale' : ''}`}>
                <td className="p-6 uppercase text-sm">
                   {pint.pintId}
                   <p className="text-[9px] text-slate-400">Source: {pint.source || 'Donation'}</p>
                </td>
                <td className="p-6">
                   <span className="bg-red-600 text-white px-4 py-1 rounded-full text-xs font-black italic">{pint.bloodGroup}</span>
                </td>
                <td className="p-6">
                   <div className="flex flex-col">
                      <span className="text-xs uppercase">{pint.expiryDate ? format(pint.expiryDate.toDate(), 'PPP') : 'N/A'}</span>
                      <span className={`text-[8px] uppercase ${expiryInfo.color}`}>{expiryInfo.text}</span>
                   </div>
                </td>
                <td className="p-6">
                   <div className={`flex items-center gap-1 text-[10px] uppercase ${pint.status === 'DISCARDED' ? 'text-red-500' : pint.screened ? 'text-green-600' : 'text-amber-600'}`}>
                      {pint.status === 'DISCARDED' ? <AlertTriangle size={14}/> : pint.screened ? <ShieldCheck size={14}/> : <AlertTriangle size={14} />} 
                      {pint.status === 'DISCARDED' ? `Discarded (${pint.discardReason})` : pint.screened ? 'Tested (Negative)' : 'UNSCREENED'}
                   </div>
                </td>
                <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isTransfused ? (
                          <span className="text-xs text-muted-foreground uppercase">Used</span>
                      ) : isDiscarded ? (
                          <span className="text-xs text-red-500 uppercase">Discarded</span>
                      ) : isCrossmatched ? (
                          <>
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/nurse/transfusion/confirm/${pint.id}`}>
                                    <LinkIcon size={14}/> Transfusion Link
                                </Link>
                            </Button>
                            <Button 
                              onClick={() => setDiscardPint(pint)} 
                              variant="ghost" 
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-xl"
                            >
                              <Trash2 size={16}/>
                            </Button>
                          </>
                      ) : (
                          <>
                            <Button 
                              disabled={isUnscreened || isExpired}
                              onClick={() => setCrossmatchPint(pint)} 
                              className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] uppercase hover:bg-red-600 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {isExpired ? 'Expired' : isUnscreened ? 'Awaiting Screening' : 'Cross-match'}
                            </Button>
                            <Button 
                              onClick={() => setDiscardPint(pint)} 
                              variant="ghost" 
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-xl"
                            >
                              <Trash2 size={16}/>
                            </Button>
                          </>
                      )}
                    </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
    {crossmatchPint && <CrossmatchDialog hospitalId={hospitalId} pint={crossmatchPint} open={!!crossmatchPint} onOpenChange={() => setCrossmatchPint(null)} />}
    {discardPint && <DiscardPintDialog hospitalId={hospitalId!} pint={discardPint} open={!!discardPint} onOpenChange={() => setDiscardPint(null)} />}
    </>
  );
}


function AddPintDialog({ hospitalId, isOpen, setIsOpen }: { hospitalId: string, isOpen: boolean, setIsOpen: (open: boolean) => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const donorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/blood_donors`));
  }, [firestore, hospitalId]);
  const { data: donors, isLoading: donorsLoading } = useCollection(donorsQuery);

  const form = useForm<PintFormValues>({
    resolver: zodResolver(pintSchema),
    defaultValues: {
      pintId: '',
      bloodGroup: 'O+',
      source: 'VOLUNTARY_DONATION',
      donorId: '',
      collectionDate: '',
      screened: false,
    },
  });

  const savePint = (values: PintFormValues) => {
    if (!firestore) return;
    const collectionDate = new Date(values.collectionDate);
    const expiryDate = add(collectionDate, { days: 42 }); // Standard 42-day expiry for whole blood

    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/blood_pints`), {
      ...values,
      expiryDate,
      hospitalId,
      status: 'AVAILABLE',
      createdAt: serverTimestamp(),
    });

    // Automatically update donor donation count and tier
    if (values.donorId && values.source !== 'EXTERNAL_PURCHASE') {
      const donorDoc = donors?.find((d: any) => d.id === values.donorId);
      if (donorDoc) {
        const currentCount = donorDoc.donationCount || 0;
        const newCount = currentCount + 1;
        let newTier = 'BRONZE';
        if (newCount >= 20) newTier = 'PLATINUM';
        else if (newCount >= 10) newTier = 'GOLD';
        else if (newCount >= 5) newTier = 'SILVER';

        const donorRef = doc(firestore, `hospitals/${hospitalId}/blood_donors`, values.donorId);
        updateDocumentNonBlocking(donorRef, {
          donationCount: newCount,
          donorTier: newTier,
          lastDonationDate: values.collectionDate,
        });
      }
    }

    toast({ title: 'Blood Pint Added to Inventory' });
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white"><Plus size={16}/> New Pint</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Blood Pint Entry</DialogTitle>
          <DialogDescription>Add a new unit of blood to the cold-chain inventory.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(savePint)} className="space-y-4">
            <FormField control={form.control} name="pintId" render={({ field }) => (
                <FormItem><FormLabel>Pint ID / Bag Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
               <FormField name="bloodGroup" control={form.control} render={({field}) => <FormItem><FormLabel>Blood Group</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                   {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
               </SelectContent></Select><FormMessage/></FormItem>} />
               <FormField name="source" control={form.control} render={({field}) => <FormItem><FormLabel>Source</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                   <SelectItem value="VOLUNTARY_DONATION">Voluntary Donation</SelectItem>
                   <SelectItem value="REPLACEMENT_DONATION">Replacement Donation</SelectItem>
                   <SelectItem value="EXTERNAL_PURCHASE">External Purchase</SelectItem>
               </SelectContent></Select><FormMessage/></FormItem>} />
            </div>
            {form.watch('source') !== 'EXTERNAL_PURCHASE' && (
                <FormField name="donorId" control={form.control} render={({field}) => <FormItem><FormLabel>Donor</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={donorsLoading}><FormControl><SelectTrigger><SelectValue placeholder="Select from registry..."/></SelectTrigger></FormControl><SelectContent>
                    {donors?.map(d => <SelectItem key={d.id} value={d.id}>{d.fullName} ({d.donorNumber})</SelectItem>)}
                </SelectContent></Select><FormMessage/></FormItem>} />
            )}
             <FormField name="collectionDate" control={form.control} render={({field}) => <FormItem><FormLabel>Collection Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>} />
             <FormField control={form.control} name="screened" render={({ field }) => (
                <FormItem className="flex items-center gap-2 pt-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel>Pint has been screened for TTI (HIV, Hep B/C, Syphilis)</FormLabel>
                </FormItem>
             )}/>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Add to Inventory'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


function DiscardPintDialog({ 
  pint, 
  hospitalId, 
  open, 
  onOpenChange 
}: { 
  pint: any; 
  hospitalId: string; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('EXPIRED');
  const [remarks, setRemarks] = useState('');

  const handleDiscard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !hospitalId || !pint.id) return;

    setLoading(true);
    try {
      const pintRef = doc(firestore, `hospitals/${hospitalId}/blood_pints`, pint.id);
      await updateDocumentNonBlocking(pintRef, {
        status: 'DISCARDED',
        discardedAt: serverTimestamp(),
        discardedBy: user.uid,
        discardedByName: user.displayName || user.email,
        discardReason: reason,
        discardRemarks: remarks.trim() || null,
      });

      toast({
        title: 'Blood Pint Discarded',
        description: `Pint #${pint.pintId} has been logged as discarded.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error discarding pint', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2 font-black uppercase tracking-tight italic">
            <AlertTriangle /> Log Blood Discard
          </DialogTitle>
          <DialogDescription className="font-bold text-slate-500">
            Record clinical wastage of blood pint #{pint.pintId} ({pint.bloodGroup}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleDiscard} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Reason for Discard</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 border rounded-xl bg-slate-50 text-sm font-semibold outline-none focus:border-red-500"
            >
              <option value="EXPIRED">Expired (Shelf life exceeded 42 days)</option>
              <option value="TTI_POSITIVE">TTI Positive (Failed HIV/Hep/Syphilis screening)</option>
              <option value="BAG_DAMAGE_LEAKAGE">Bag Damage / Leakage</option>
              <option value="COLD_CHAIN_EXCURSION">Cold Chain Temp Excursion</option>
              <option value="OTHER">Other Clinical Reason</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Remarks (Optional)</label>
            <textarea
              placeholder="Enter context or disposal logs..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-3 border rounded-xl bg-slate-50 text-sm font-medium outline-none focus:border-red-500 h-24"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-bold uppercase text-xs">Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-wider py-4 h-auto px-6 rounded-xl shadow-lg">
              {loading ? <Loader2 className="animate-spin" /> : 'Confirm Disposal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
