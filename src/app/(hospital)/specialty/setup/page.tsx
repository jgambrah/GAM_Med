'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import { Activity, Plus, Settings, Zap, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const unitSchema = z.object({
  name: z.string().min(3, "Unit name is required."),
  type: z.string().min(1, "Service type is required."),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1."),
});

type UnitFormValues = z.infer<typeof unitSchema>;

export default function SpecialtyUnitSetup() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN'].includes(userRole || '');

  const unitsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/specialty_units`));
  }, [firestore, hospitalId]);
  const { data: units, isLoading: unitsLoading } = useCollection(unitsQuery);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: '', type: 'DIALYSIS', capacity: 1 },
  });

  const saveUnit = async (values: UnitFormValues) => {
    if (!hospitalId || !firestore) return;
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/specialty_units`), {
      ...values,
      hospitalId,
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
    });
    toast({ title: "Specialty Unit Initialized", description: `${values.name} is now operational.` });
    setIsAddUnitOpen(false);
    form.reset();
  };
  
  const isLoading = isUserLoading || isProfileLoading;
  
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
    <div className="p-8 space-y-8 max-w-5xl mx-auto text-black font-bold">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
           <h1 className="text-4xl font-black uppercase tracking-tighter italic">Specialty <span className="text-blue-600">Unit Setup</span></h1>
           <p className="text-slate-500 font-bold text-xs uppercase italic">Define high-value, recurring care units like Dialysis.</p>
        </div>
        <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 text-white shadow-xl hover:bg-blue-700">
                    <Plus size={16}/> Initialize Unit
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Specialty Unit</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(saveUnit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Unit Name</FormLabel><FormControl><Input placeholder="e.g., Renal Center" {...field} /></FormControl><FormMessage/></FormItem>
                        )}/>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Service Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="DIALYSIS">Dialysis Center</SelectItem>
                                        <SelectItem value="ONCOLOGY">Chemotherapy Unit</SelectItem>
                                        <SelectItem value="PHYSIO">Physiotherapy</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage/></FormItem>
                            )}/>
                             <FormField control={form.control} name="capacity" render={({ field }) => (
                                <FormItem><FormLabel>Capacity (Chairs/Machines)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                            )}/>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Unit'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {unitsLoading && <p>Loading units...</p>}
        {units?.map(unit => (
            <div key={unit.id} className="bg-card p-6 rounded-[32px] border shadow-sm">
                <div className="flex justify-between items-start">
                    <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><Zap size={24}/></div>
                    <span className="text-[10px] font-black bg-muted text-muted-foreground px-3 py-1 rounded-full uppercase">{unit.type}</span>
                </div>
                <h3 className="text-xl font-black uppercase mt-4">{unit.name}</h3>
                <p className="text-sm font-bold text-muted-foreground">{unit.capacity} Stations/Chairs</p>
            </div>
        ))}
        {!unitsLoading && units?.length === 0 && (
            <p className="col-span-full text-center py-10 italic text-muted-foreground">No specialty units configured yet.</p>
        )}
      </div>
    </div>
  );
}