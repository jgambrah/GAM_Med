'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Droplets, Plus, AlertTriangle, 
  History, Thermometer, ShieldCheck, 
  Search, Calendar, Loader2, ShieldAlert, Save, Link as LinkIcon, Trash2,
  CheckCircle2, ArchiveX, Filter, MoreHorizontal
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
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'CROSSMATCHED' | 'QUARANTINE' | 'EXPIRED' | 'DISCARDED' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = userRole ? ['DIRECTOR', 'ADMIN', 'LAB_TECH', 'DOCTOR', 'NURSE'].includes(userRole) : true;

  const pintsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/blood_pints`),
      orderBy("expiryDate", "asc")
    );
  }, [firestore, hospitalId]);
  
  const { data: rawPints, isLoading: arePintsLoading } = useCollection<any>(pintsQuery);

  const demoPints = useMemo(() => [
    { id: 'pnt_1', pintId: 'PNT-2026-0089', bloodGroup: 'AB+', expiryDate: { toDate: () => new Date('2026-07-28') }, status: 'EXPIRED', screened: true, source: 'Voluntary' },
    { id: 'pnt_2', pintId: 'PNT-2026-0092', bloodGroup: 'O+', expiryDate: { toDate: () => new Date('2026-08-30') }, status: 'CROSSMATCHED', screened: true, source: 'Replacement' },
    { id: 'pnt_3', pintId: 'PNT-2026-0081', bloodGroup: 'O+', expiryDate: { toDate: () => new Date('2026-07-20') }, status: 'EXPIRED', screened: true, source: 'Voluntary' },
    { id: 'pnt_4', pintId: 'PNT-2026-0085', bloodGroup: 'B+', expiryDate: { toDate: () => new Date('2026-07-25') }, status: 'EXPIRED', screened: true, source: 'External' },
  ], []);

  const pints = useMemo(() => {
    if (rawPints && rawPints.length > 0) return rawPints;
    return demoPints;
  }, [rawPints, demoPints]);

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
        } else if (p.status === 'AVAILABLE' || !p.status) {
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
      const matchesSearch = !searchQuery || p.pintId.toLowerCase().includes(searchQuery.toLowerCase()) || p.bloodGroup.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

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
  }, [pints, activeTab, searchQuery]);

  const bloodGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (pints) {
      for (const group of bloodGroups) {
        counts[group] = pints.filter(p => p.bloodGroup === group && p.status !== 'DISCARDED' && p.status !== 'TRANSFUSED').length;
      }
    }
    return counts;
  }, [pints, bloodGroups]);
  
  const getDaysRemaining = (expiry: { toDate: () => Date }) => {
    if (!expiry) return { text: 'N/A', color: 'text-slate-400' };
    const days = differenceInDays(expiry.toDate(), new Date());
    if (days < 0) return { text: 'EXPIRED', color: 'text-rose-500 font-black' };
    if (days <= 7) return { text: `${days} Days Left`, color: 'text-rose-500' };
    return { text: `${days} Days`, color: 'text-emerald-600' };
  };

  const inventoryFilters = [
    { id: 'AVAILABLE', label: 'AVAILABLE', count: counts.AVAILABLE, color: 'emerald' },
    { id: 'CROSSMATCHED', label: 'RESERVED / CROSS-MATCHED', count: counts.CROSSMATCHED, color: 'amber' },
    { id: 'QUARANTINE', label: 'QUARANTINE (UNSCREENED)', count: counts.QUARANTINE, color: 'slate' },
    { id: 'EXPIRED', label: 'EXPIRED', count: counts.EXPIRED, color: 'rose' },
    { id: 'DISCARDED', label: 'DISCARDED / WASTE', count: counts.DISCARDED, color: 'slate' },
    { id: 'ALL', label: 'ALL PINTS', count: counts.ALL, color: 'indigo' },
  ];

  const isLoading = isUserLoading || isProfileLoading || arePintsLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-rose-500" />
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

  return (
    <>
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Rose/Red for Blood Bank */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400">
                <Droplets className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                BLOOD BANK VAULT
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CRITICAL COLD-CHAIN PINT INVENTORY & CROSS-MATCH MANAGEMENT.
            </p>
          </div>

          {/* Telemetry & Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 self-start xl:self-auto">
            
            {/* Live Cold-Chain Thermometer */}
            <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 shadow-inner">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                <Thermometer className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">VAULT TEMPERATURE</div>
                <div className="text-sm font-black text-emerald-400 flex items-center gap-2">
                  4.2°C <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/20 border border-emerald-500/30">OPTIMAL</span>
                </div>
              </div>
            </div>

            <AddPintDialog hospitalId={hospitalId || 'default'} isOpen={isAddPintOpen} setIsOpen={setIsAddPintOpen} />
          </div>
        </div>

        {/* Bottom Row / Grid: Blood Group Telemetry */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 relative z-10">
          {bloodGroups.map((group) => {
            const count = bloodGroupCounts[group] || 0;
            return (
              <div 
                key={group} 
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  count > 0 
                    ? 'bg-slate-900 border-rose-500/50 ring-1 ring-rose-500/30 shadow-lg' 
                    : 'bg-slate-900/50 border-slate-800 opacity-70'
                }`}
              >
                <span className={`text-xl font-black ${count > 0 ? 'text-white' : 'text-slate-500'}`}>
                  {group}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${count > 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                  {count} {count === 1 ? 'PINT' : 'PINTS'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. INVENTORY FILTERS & DATA TABLE          */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Status Filters Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {inventoryFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveTab(filter.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                  activeTab === filter.id
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {filter.label}
                <span className={`px-2 py-0.5 rounded-md ${
                  activeTab === filter.id 
                    ? 'bg-slate-800 text-white' 
                    : `bg-${filter.color}-50 dark:bg-${filter.color}-950 text-${filter.color}-600 dark:text-${filter.color}-400 border border-${filter.color}-200 dark:border-${filter.color}-800`
                }`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar Row */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Pint ID / Batch Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Enterprise Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Pint ID / Batch
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Blood Group
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Screening
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Expiry / Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPints.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    <Droplets className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    NO BLOOD PINTS IN THIS CATEGORY.
                  </td>
                </tr>
              ) : (
                filteredPints.map((pint, idx) => {
                  const expiryInfo = getDaysRemaining(pint.expiryDate);
                  const isExpired = expiryInfo.text === 'EXPIRED';
                  const isUnscreened = !pint.screened;
                  const isCrossmatched = pint.status === 'CROSSMATCHED';
                  const isTransfused = pint.status === 'TRANSFUSED';
                  const isDiscarded = pint.status === 'DISCARDED';

                  return (
                    <tr key={pint.id || idx} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group ${isTransfused || isDiscarded ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide font-mono">
                          {pint.pintId}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                          Source: {pint.source || 'Donation'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-black text-sm">
                          {pint.bloodGroup}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {pint.screened ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[9px] font-black uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> CLEARED / TESTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[9px] font-black uppercase tracking-wider">
                            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" /> UNSCREENED
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          EXP: {pint.expiryDate ? (typeof pint.expiryDate.toDate === 'function' ? format(pint.expiryDate.toDate(), 'yyyy-MM-dd') : '2026-08-30') : '2026-08-30'}
                        </div>
                        {isExpired && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-[9px] font-black uppercase tracking-wider">
                            <ArchiveX className="w-3 h-3 text-rose-600 dark:text-rose-400" /> EXPIRED
                          </span>
                        )}
                        {isCrossmatched && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[9px] font-black uppercase tracking-wider">
                            <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" /> RESERVED
                          </span>
                        )}
                        {isDiscarded && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-wider">
                            DISCARDED ({pint.discardReason || 'Expired'})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isTransfused ? (
                            <span className="text-xs text-slate-400 font-bold uppercase">Transfused</span>
                          ) : isDiscarded ? (
                            <span className="text-xs text-rose-500 font-bold uppercase">Discarded</span>
                          ) : isCrossmatched ? (
                            <>
                              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold">
                                <Link href={`/nurse/transfusion/confirm/${pint.id}`}>
                                  <LinkIcon size={14} className="mr-1"/> Transfusion Link
                                </Link>
                              </Button>
                              <Button 
                                onClick={() => setDiscardPint(pint)} 
                                variant="ghost" 
                                size="sm"
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                              >
                                <Trash2 size={16}/>
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                disabled={isUnscreened || isExpired}
                                onClick={() => setCrossmatchPint(pint)} 
                                className="bg-slate-900 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                              >
                                {isExpired ? 'Expired' : isUnscreened ? 'Awaiting Screening' : 'Cross-match'}
                              </Button>
                              <Button 
                                onClick={() => setDiscardPint(pint)} 
                                variant="ghost" 
                                size="sm"
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer"
                              >
                                <Trash2 size={16}/>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
    {crossmatchPint && <CrossmatchDialog hospitalId={hospitalId || 'default'} pint={crossmatchPint} open={!!crossmatchPint} onOpenChange={() => setCrossmatchPint(null)} />}
    {discardPint && <DiscardPintDialog hospitalId={hospitalId || 'default'} pint={discardPint} open={!!discardPint} onOpenChange={() => setDiscardPint(null)} />}
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
    if (!firestore) {
      toast({ title: 'Blood Pint Added to Vault', description: `Pint #${values.pintId} logged.` });
      setIsOpen(false);
      form.reset();
      return;
    }
    const collectionDate = new Date(values.collectionDate);
    const expiryDate = add(collectionDate, { days: 42 });

    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/blood_pints`), {
      ...values,
      expiryDate,
      hospitalId,
      status: 'AVAILABLE',
      createdAt: serverTimestamp(),
    });

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
        <button 
          type="button"
          className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" /> NEW PINT
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600 font-black uppercase">
            <Droplets className="w-5 h-5 text-rose-600" /> New Blood Pint Entry
          </DialogTitle>
          <DialogDescription className="font-bold text-slate-500">
            Add a new unit of blood to the cold-chain vault inventory.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(savePint)} className="space-y-4">
            <FormField control={form.control} name="pintId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase">Pint ID / Bag Number</FormLabel>
                <FormControl><Input placeholder="e.g. PNT-2026-0099" {...field} className="rounded-xl" /></FormControl>
                <FormMessage/>
              </FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField name="bloodGroup" control={form.control} render={({field}) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Blood Group</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent className="bg-slate-900 text-white">
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage/>
                </FormItem>
              )} />
              <FormField name="source" control={form.control} render={({field}) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Source</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent className="bg-slate-900 text-white">
                      <SelectItem value="VOLUNTARY_DONATION">Voluntary Donation</SelectItem>
                      <SelectItem value="REPLACEMENT_DONATION">Replacement Donation</SelectItem>
                      <SelectItem value="EXTERNAL_PURCHASE">External Purchase</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage/>
                </FormItem>
              )} />
            </div>
            {form.watch('source') !== 'EXTERNAL_PURCHASE' && (
              <FormField name="donorId" control={form.control} render={({field}) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Donor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={donorsLoading}>
                    <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select from registry..."/></SelectTrigger></FormControl>
                    <SelectContent className="bg-slate-900 text-white">
                      {donors?.map(d => <SelectItem key={d.id} value={d.id}>{d.fullName} ({d.donorNumber})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage/>
                </FormItem>
              )} />
            )}
            <FormField name="collectionDate" control={form.control} render={({field}) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase">Collection Date</FormLabel>
                <FormControl><Input type="date" {...field} className="rounded-xl" /></FormControl>
                <FormMessage/>
              </FormItem>
            )} />
            <FormField control={form.control} name="screened" render={({ field }) => (
              <FormItem className="flex items-center gap-2 pt-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="text-xs font-bold text-slate-700 cursor-pointer">Pint screened for TTI (HIV, Hep B/C, Syphilis)</FormLabel>
              </FormItem>
            )}/>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs">
                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Add to Vault'}
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
    if (!firestore || !user || !hospitalId || !pint.id) {
      toast({ title: 'Blood Pint Discarded', description: `Pint #${pint.pintId} marked discarded.` });
      onOpenChange(false);
      return;
    }

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
          <DialogTitle className="text-rose-600 flex items-center gap-2 font-black uppercase tracking-tight italic">
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
              className="w-full p-3 border rounded-xl bg-slate-50 text-sm font-semibold outline-none focus:border-rose-500 cursor-pointer"
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
              className="w-full p-3 border rounded-xl bg-slate-50 text-sm font-medium outline-none focus:border-rose-500 h-24"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-bold uppercase text-xs">Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs tracking-wider py-4 h-auto px-6 rounded-xl shadow-lg">
              {loading ? <Loader2 className="animate-spin" /> : 'Confirm Disposal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
