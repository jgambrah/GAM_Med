'use client';
import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scissors, Plus, Loader2, ShieldAlert, LayoutGrid } from 'lucide-react';

const theaterFormSchema = z.object({
  name: z.string().min(3, "Theater name is required"),
  type: z.string().min(1, "Type is required"),
});

type TheaterFormValues = z.infer<typeof theaterFormSchema>;

export default function TheaterSetup() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isAddTheaterOpen, setIsAddTheaterOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN'].includes(userRole);

  const theatersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'theaters'));
  }, [firestore, hospitalId]);
  const { data: theaters, isLoading: areTheatersLoading } = useCollection(theatersQuery);

  const form = useForm<TheaterFormValues>({
    resolver: zodResolver(theaterFormSchema),
    defaultValues: { name: '', type: 'Major' },
  });

  const handleAddTheater = (values: TheaterFormValues) => {
    if (!firestore || !hospitalId) return;
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/theaters`), {
      ...values,
      hospitalId,
      status: 'AVAILABLE',
      createdAt: serverTimestamp(),
    });
    toast({ title: 'Theater Deployed', description: `${values.name} is now available for scheduling.` });
    form.reset();
    setIsAddTheaterOpen(false);
  };

  const isLoading = isUserLoading || isProfileLoading;

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
          <p className="text-muted-foreground">You are not authorized for this high-security module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Theater <span className="text-primary">Infrastructure</span></h1>
          <p className="text-muted-foreground font-medium">Define your facility's surgical operating rooms.</p>
        </div>
        <Dialog open={isAddTheaterOpen} onOpenChange={setIsAddTheaterOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} /> Deploy Theater</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Theater Configuration</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddTheater)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Theater Name/Number</FormLabel><FormControl><Input placeholder="e.g., Theater 01 (Main)" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Major">Major</SelectItem>
                        <SelectItem value="Minor">Minor</SelectItem>
                        <SelectItem value="Maternity/Labor">Maternity/Labor</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>Save Configuration</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areTheatersLoading ? <p>Loading theaters...</p> :
        theaters?.map(t => (
          <div key={t.id} className="bg-card p-6 rounded-[32px] border-2 flex justify-between items-center group hover:border-primary/20 transition-all">
             <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                   <Scissors size={24} />
                </div>
                <div>
                   <p className="font-black text-card-foreground uppercase text-sm">{t.name}</p>
                   <p className="text-[10px] font-bold text-muted-foreground">{t.type}</p>
                </div>
             </div>
             <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase italic ${t.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {t.status}
             </span>
          </div>
        ))}
         {!areTheatersLoading && theaters?.length === 0 && (
            <div className="md:col-span-3 text-center p-20 bg-card border-2 border-dashed rounded-2xl text-muted-foreground">
                <LayoutGrid className="h-12 w-12 mx-auto mb-2" />
                No theaters configured. Deploy the first one to get started.
            </div>
        )}
      </div>
    </div>
  );
}
