
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Droplets, Plus, AlertTriangle, 
  History, Thermometer, ShieldCheck, 
  Search, Calendar, Loader2, ShieldAlert, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
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
      where("status", "==", "AVAILABLE"),
      orderBy("expiryDate", "asc")
    );
  }, [firestore, hospitalId]);
  
  const { data: pints, isLoading: arePintsLoading } = useCollection(pintsQuery);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const bloodGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (pints) {
      for (const group of bloodGroups) {
        counts[group] = pints.filter(p => p.bloodGroup === group).length;
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
            <AddPintDialog hospitalId={hospitalId} isOpen={isAddPintOpen} setIsOpen={setIsAddPintOpen} />
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

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-6 text-[10px] uppercase">Pint ID / Batch</th>
              <th className="p-6 text-[10px] uppercase">Blood Group</th>
              <th className="p-6 text-[10px] uppercase">Expiry Date</th>
              <th className="p-6 text-[10px] uppercase">Screening</th>
              <th className="p-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin"/></td></tr>}
            {!isLoading && pints?.length === 0 ? (
                 <tr><td colSpan={5} className="p-20 text-center text-slate-300 uppercase italic">No available pints in inventory.</td></tr>
            ) : pints?.map(pint => {
              const expiryInfo = getDaysRemaining(pint.expiryDate);
              return (
              <tr key={pint.id} className="hover:bg-red-50/30 transition-all font-bold">
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
                   <div className={`flex items-center gap-1 text-[10px] uppercase ${pint.screened ? 'text-green-600' : 'text-amber-600'}`}>
                      {pint.screened ? <ShieldCheck size={14}/> : <AlertTriangle size={14} />} {pint.screened ? 'Tested (Negative)' : 'UNSCREENED'}
                   </div>
                </td>
                <td className="p-6 text-right">
                   <button className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] uppercase hover:bg-red-600 transition-all">Cross-match</button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
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
