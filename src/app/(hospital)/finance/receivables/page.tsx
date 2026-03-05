'use client';
import { useState, useEffect, useMemo } from 'react';
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
import { Building2, Plus, ShieldCheck, Landmark, Loader2, ShieldAlert } from 'lucide-react';

const payerSchema = z.object({
  name: z.string().min(1, "Payer name is required."),
  type: z.string().min(1, "Payer type is required."),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
});

type PayerFormValues = z.infer<typeof payerSchema>;

export default function PayerRegistryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAddPayerOpen, setIsAddPayerOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole);

  const payersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payers`));
  }, [firestore, hospitalId]);

  const { data: payers, isLoading: arePayersLoading } = useCollection(payersQuery);

  const form = useForm<PayerFormValues>({
    resolver: zodResolver(payerSchema),
    defaultValues: { name: '', type: 'PRIVATE_INSURANCE', creditLimit: 0 },
  });

  const handleAddPayer = (values: PayerFormValues) => {
    if (!firestore || !hospitalId) return;
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/payers`), {
      ...values,
      currentBalance: 0,
      hospitalId,
      createdAt: serverTimestamp(),
    });
    toast({ title: 'Payer Entity Registered', description: `${values.name} has been added to the master list.` });
    form.reset();
    setIsAddPayerOpen(false);
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
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Payer <span className="text-primary">Master List</span></h1>
          <p className="text-muted-foreground font-medium">Managing Insurance, Corporate, and Third-Party Debtors.</p>
        </div>
        <Dialog open={isAddPayerOpen} onOpenChange={setIsAddPayerOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} /> Register New Payer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Payer Registration</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddPayer)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Entity Name</FormLabel><FormControl><Input placeholder="e.g. Acacia Health Insurance" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Payer Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="PRIVATE_INSURANCE">Private Health Insurance</SelectItem>
                        <SelectItem value="NHIS">National Health Insurance (NHIA)</SelectItem>
                        <SelectItem value="CORPORATE">Corporate Client (Company)</SelectItem>
                        <SelectItem value="PATIENT_CREDIT">Patient Credit Facility</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactPerson" render={({ field }) => (
                    <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="creditLimit" render={({ field }) => (
                    <FormItem><FormLabel>Credit Limit (GHS)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>Authorize Entity</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {arePayersLoading ? <p>Loading payers...</p> : payers?.map(p => (
          <div key={p.id} className="bg-card p-8 rounded-[40px] border-2 shadow-sm space-y-6 hover:border-primary/20 transition-all">
            <div className="flex justify-between items-start">
              <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                {p.type === 'NHIS' ? <Landmark size={24} /> : p.type === 'CORPORATE' ? <Building2 size={24}/> : <ShieldCheck size={24}/>}
              </div>
              <span className="text-[10px] font-black bg-muted px-3 py-1 rounded-full uppercase italic">{p.type.replace('_', ' ')}</span>
            </div>
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight leading-tight text-card-foreground">{p.name}</h3>
              <p className="text-[9px] text-muted-foreground font-black uppercase mt-1">Contact: {p.contactPerson || 'N/A'}</p>
            </div>
            <div className="bg-foreground p-6 rounded-3xl text-background">
              <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest">Total Outstanding</p>
              <p className="text-2xl font-black italic">GHS {p.currentBalance.toLocaleString()}</p>
            </div>
          </div>
        ))}
        {!arePayersLoading && payers?.length === 0 && (
            <div className="md:col-span-3 text-center p-20 bg-card border-2 border-dashed rounded-2xl text-muted-foreground">
                No payers registered yet. Add the first one to begin tracking receivables.
            </div>
        )}
      </div>
    </div>
  );
}

    
