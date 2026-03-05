'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp } from 'firebase/firestore';
import { Camera, Plus, Loader2, ShieldAlert, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


const scanFormSchema = z.object({
  name: z.string().min(1, "Scan name is required"),
  modality: z.string().min(1, "Modality is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
});

type ScanFormValues = z.infer<typeof scanFormSchema>;

export default function RadiologySetupPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [isAddScanOpen, setIsAddScanOpen] = useState(false);

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
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'RADIOLOGIST' || userRole === 'ADMIN';

  const menuQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "radiology_menu"));
  }, [firestore, hospitalId]);

  const { data: scans, isLoading: isMenuLoading } = useCollection(menuQuery);

  const form = useForm<ScanFormValues>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: {
      modality: 'X-Ray',
      price: 0
    },
  });

  const handleAddScan = (values: ScanFormValues) => {
    if (!firestore || !hospitalId) return;

    const scanData = {
      ...values,
      hospitalId,
      createdAt: serverTimestamp(),
    };
    
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/radiology_menu`), scanData);

    toast({
      title: 'Scan Added',
      description: `${values.name} has been added to the imaging menu.`,
    });
    form.reset();
    setIsAddScanOpen(false);
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
          <p className="text-muted-foreground">You are not authorized to configure the imaging menu.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Imaging <span className="text-primary">Menu</span></h1>
           <p className="text-muted-foreground font-medium">Configure all available imaging scans and pricing for your facility.</p>
        </div>
         <Dialog open={isAddScanOpen} onOpenChange={setIsAddScanOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus /> Add Scan to Menu
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Camera /> New Imaging Scan</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddScan)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                           <FormItem><FormLabel>Scan Name</FormLabel><FormControl><Input placeholder="e.g. Chest X-Ray (PA View)" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={form.control} name="modality" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Modality</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="X-Ray">X-Ray</SelectItem>
                                  <SelectItem value="Ultrasound (USS)">Ultrasound (USS)</SelectItem>
                                  <SelectItem value="CT Scan">CT Scan</SelectItem>
                                  <SelectItem value="MRI">MRI</SelectItem>
                                  <SelectItem value="ECG / Echo">ECG / Echo</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem><FormLabel>Price (GHS)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>

                         <DialogFooter className="pt-4">
                            <Button type="submit" disabled={form.formState.isSubmitting}>Save to Menu</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>

      {/* MENU TABLE */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-0">
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Scan Name</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Modality</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Price (GHS)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isMenuLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center h-24">Loading imaging menu...</TableCell></TableRow>
            ) : scans?.length === 0 ? (
                 <TableRow><TableCell colSpan={3} className="text-center h-48 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2" />
                    No scans configured. Add the first scan to the menu.
                </TableCell></TableRow>
            ) : (
                scans?.map(item => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-all">
                    <TableCell className="p-4 font-bold uppercase tracking-tight text-card-foreground">{item.name}</TableCell>
                    <TableCell className="p-4">
                        <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">
                            {item.modality}
                        </span>
                    </TableCell>
                    <TableCell className="p-4 text-right font-mono font-bold text-card-foreground">{item.price.toFixed(2)}</TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
