'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, serverTimestamp, doc } from 'firebase/firestore';
import { Truck, Plus, Building2, Phone, Mail, Loader2, ShieldAlert } from 'lucide-react';
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

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required."),
  tin: z.string().min(1, "TIN is required for compliance."),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  category: z.string().min(1, "Category is required."),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export default function SupplierDirectoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);

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
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PHARMACIST'].includes(userRole);

  const suppliersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'suppliers'));
  }, [firestore, hospitalId]);

  const { data: suppliers, isLoading: areSuppliersLoading } = useCollection(suppliersQuery);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      tin: '',
      contactPerson: '',
      phone: '',
      email: '',
      category: 'Pharmaceuticals'
    },
  });

  const handleAddSupplier = (values: SupplierFormValues) => {
    if (!firestore || !hospitalId) return;
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/suppliers`), {
      ...values,
      hospitalId,
      createdAt: serverTimestamp(),
    });
    toast({ title: 'Supplier Registered', description: `${values.name} has been added to the master list.` });
    form.reset();
    setIsAddSupplierOpen(false);
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
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Supplier <span className="text-primary">Master</span></h1>
          <p className="text-muted-foreground font-medium">Verified Vendor Network for GamMed.</p>
        </div>
        <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} /> Register Supplier</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Supplier Onboarding</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddSupplier)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="e.g., KOS Pharma" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="tin" render={({ field }) => (
                  <FormItem><FormLabel>TIN (Tax ID Number)</FormLabel><FormControl><Input placeholder="Required for GRA compliance" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Pharmaceuticals">Pharmaceuticals</SelectItem>
                                <SelectItem value="Consumables">Consumables</SelectItem>
                                <SelectItem value="Equipment">Equipment</SelectItem>
                                <SelectItem value="General Services">General Services</SelectItem>
                            </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )}/>
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>Save Supplier</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areSuppliersLoading && <p>Loading suppliers...</p>}
        {suppliers?.map(s => (
          <div key={s.id} className="bg-card p-6 rounded-[32px] border-2 shadow-sm space-y-4 hover:border-primary/20 transition-all">
            <div className="flex justify-between items-start">
               <div className="bg-primary/10 p-3 rounded-2xl text-primary"><Building2 size={24} /></div>
               <span className="text-[10px] font-black bg-muted px-3 py-1 rounded-full uppercase">{s.category}</span>
            </div>
            <div>
               <h3 className="font-black text-lg uppercase leading-tight">{s.name}</h3>
               <p className="text-[10px] font-bold text-primary mt-1 uppercase">TIN: {s.tin}</p>
            </div>
            <div className="pt-4 border-t space-y-2">
               <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold"><Phone size={14}/> {s.phone || 'N/A'}</div>
               <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold"><Mail size={14}/> {s.email || 'N/A'}</div>
            </div>
          </div>
        ))}
         {!areSuppliersLoading && suppliers?.length === 0 && (
            <div className="md:col-span-3 text-center p-20 bg-card border-2 border-dashed rounded-2xl text-muted-foreground">
                No suppliers registered yet.
            </div>
        )}
      </div>
    </div>
  );
}
