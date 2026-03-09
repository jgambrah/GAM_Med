'use client';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, serverTimestamp, doc } from 'firebase/firestore';
import { 
  UserPlus, Droplets, ShieldCheck, 
  Search, Calendar, Phone, Plus, Loader2, ShieldAlert
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

const donorSchema = z.object({
  fullName: z.string().min(3, "Full name is required."),
  phone: z.string().min(10, "A valid phone number is required."),
  bloodGroup: z.string().min(1, "Blood group is required."),
  donorType: z.string().min(1, "Donor type is required."),
  lastDonationDate: z.string().optional(),
});

type DonorFormValues = z.infer<typeof donorSchema>;

export default function DonorRegistryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAddDonorOpen, setIsAddDonorOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'LAB_TECH'].includes(userRole || '');

  const donorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/blood_donors`), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: donors, isLoading: areDonorsLoading } = useCollection(donorsQuery);

  const form = useForm<DonorFormValues>({
    resolver: zodResolver(donorSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      bloodGroup: 'O+',
      donorType: 'VOLUNTARY',
      lastDonationDate: '',
    },
  });

  const saveDonor = async (values: DonorFormValues) => {
    if (!firestore || !hospitalId) return;

    try {
      const donorNumber = `DON-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`;
      addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/blood_donors`), {
        ...values,
        donorNumber,
        hospitalId,
        status: 'ELIGIBLE',
        screeningStatus: 'PENDING',
        createdAt: serverTimestamp()
      });
      toast({ title: "Donor Registered Successfully" });
      setIsAddDonorOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Error", description: e.message });
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
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b-8 border-red-600 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Donor <span className="text-red-600">Archive</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Managing Ghana's Gift of Life.</p>
        </div>
        <Dialog open={isAddDonorOpen} onOpenChange={setIsAddDonorOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 text-white"><UserPlus size={16} /> New Donor Entry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll New Donor</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(saveDonor)} className="space-y-4">
                 <FormField name="fullName" control={form.control} render={({field}) => <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                <div className="grid grid-cols-2 gap-4">
                   <FormField name="phone" control={form.control} render={({field}) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                   <FormField name="bloodGroup" control={form.control} render={({field}) => <FormItem><FormLabel>Blood Group</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                       {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                   </SelectContent></Select><FormMessage/></FormItem>} />
                </div>
                 <FormField name="donorType" control={form.control} render={({field}) => <FormItem><FormLabel>Donor Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                    <SelectItem value="VOLUNTARY">Voluntary Donor</SelectItem>
                    <SelectItem value="REPLACEMENT">Replacement (Family)</SelectItem>
                 </SelectContent></Select><FormMessage/></FormItem>} />
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="animate-spin"/> : 'Activate Donor Profile'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
               <th className="p-6 text-[10px] uppercase">Donor ID & Name</th>
               <th className="p-6 text-[10px] uppercase text-center">Group</th>
               <th className="p-6 text-[10px] uppercase">Type</th>
               <th className="p-6 text-[10px] uppercase">Last Donation</th>
               <th className="p-6 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {areDonorsLoading ? <TableRow><TableCell colSpan={5} className="text-center p-12"><Loader2 className="animate-spin" /></TableCell></TableRow> :
            donors?.map(d => (
              <tr key={d.id} className="hover:bg-red-50/20 transition-all font-bold">
                <td className="p-6">
                   <p className="text-sm uppercase">{d.fullName}</p>
                   <p className="text-[9px] text-blue-600">ID: {d.donorNumber} • {d.phone}</p>
                </td>
                <td className="p-6 text-center">
                   <span className="text-red-600 font-black text-lg italic">{d.bloodGroup}</span>
                </td>
                <td className="p-6">
                   <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase">{d.donorType}</span>
                </td>
                <td className="p-6 text-xs text-slate-400">
                   {d.lastDonationDate ? format(new Date(d.lastDonationDate), 'PPP') : 'First Time Donor'}
                </td>
                <td className="p-6 text-right">
                   <span className="text-[10px] font-black text-green-600 uppercase border-2 border-green-100 px-3 py-1 rounded-lg">{d.status}</span>
                </td>
              </tr>
            ))}
            {!areDonorsLoading && donors?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center p-20 text-slate-300 italic">No donors registered yet.</TableCell></TableRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
