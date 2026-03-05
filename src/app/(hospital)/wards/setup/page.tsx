'use client';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { BedDouble, Plus, Loader2, ShieldAlert, Users, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const wardFormSchema = z.object({
  name: z.string().min(3, "Ward name is required"),
  prefix: z.string().min(2, "Prefix required (e.g., MW)").max(5, "Prefix too long"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").max(100, "Capacity cannot exceed 100"),
});

type WardFormValues = z.infer<typeof wardFormSchema>;

export default function WardSetupPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [isAddWardOpen, setIsAddWardOpen] = useState(false);

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
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'ADMIN';

  const wardsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "wards"));
  }, [firestore, hospitalId]);

  const { data: wards, isLoading: isWardsLoading } = useCollection(wardsQuery);

  const form = useForm<WardFormValues>({
    resolver: zodResolver(wardFormSchema),
    defaultValues: {
      name: '',
      prefix: '',
      capacity: 0,
    }
  });

  const handleAddWard = async (values: WardFormValues) => {
    if (!firebaseApp) {
        toast({ variant: 'destructive', title: 'System Error', description: 'Firebase not available.'});
        return;
    }
    const functions = getFunctions(firebaseApp);
    const createWardAndBeds = httpsCallable(functions, 'createWardAndBeds');
    
    try {
        await createWardAndBeds(values);
        toast({
            title: 'Ward Created',
            description: `${values.name} with ${values.capacity} beds has been provisioned.`,
        });
        form.reset();
        setIsAddWardOpen(false);
    } catch(error: any) {
        toast({
            variant: 'destructive',
            title: 'Creation Failed',
            description: error.message,
        })
    }
  };
  
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
          <p className="text-muted-foreground">You are not authorized to configure hospital wards.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Ward <span className="text-primary">Architecture</span></h1>
           <p className="text-muted-foreground font-medium">Define clinical wards and bed capacity for your facility.</p>
        </div>
         <Dialog open={isAddWardOpen} onOpenChange={setIsAddWardOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus /> Construct New Ward
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><BedDouble /> New Ward Configuration</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddWard)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                           <FormItem><FormLabel>Ward Name</FormLabel><FormControl><Input placeholder="e.g. Male Surgical Ward" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="prefix" render={({ field }) => (
                            <FormItem><FormLabel>Bed Prefix</FormLabel><FormControl><Input placeholder="e.g. MSW" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="capacity" render={({ field }) => (
                            <FormItem><FormLabel>Bed Capacity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>

                         <DialogFooter className="pt-4">
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                                Provision Ward & Beds
                            </Button>
                         </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isWardsLoading ? (
            <p>Loading wards...</p>
        ) : wards?.length === 0 ? (
            <div className="md:col-span-3 text-center p-20 bg-card border-2 border-dashed rounded-2xl text-muted-foreground">
                <LayoutGrid className="h-12 w-12 mx-auto mb-2" />
                No wards configured. Construct the first ward to get started.
            </div>
        ) : (
            wards?.map(ward => (
              <div key={ward.id} className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                   <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                      <LayoutGrid size={24} />
                   </div>
                   <span className="text-[10px] font-black bg-muted text-muted-foreground px-3 py-1 rounded-full uppercase">{ward.prefix}</span>
                </div>
                <div>
                   <h3 className="text-xl font-black text-card-foreground uppercase">{ward.name}</h3>
                   <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                         <BedDouble size={14}/> {ward.capacity} Total Beds
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-primary">
                         <Users size={14}/> {ward.occupancy || 0} Occupied
                      </div>
                   </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
