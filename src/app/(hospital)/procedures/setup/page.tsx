'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp } from 'firebase/firestore';
import { Scissors, Plus, Loader2, ShieldAlert, Package } from 'lucide-react';
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


const procedureFormSchema = z.object({
  name: z.string().min(1, "Procedure name is required"),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
});

type ProcedureFormValues = z.infer<typeof procedureFormSchema>;

export default function ProcedureSetupPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [isAddProcedureOpen, setIsAddProcedureOpen] = useState(false);

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

  const menuQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "procedure_menu"));
  }, [firestore, hospitalId]);

  const { data: procedures, isLoading: isMenuLoading } = useCollection(menuQuery);

  const form = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureFormSchema),
    defaultValues: {
      category: 'Minor Surgery',
      price: 0
    },
  });

  const handleAddProcedure = (values: ProcedureFormValues) => {
    if (!firestore || !hospitalId) return;

    const procedureData = {
      ...values,
      hospitalId,
      createdAt: serverTimestamp(),
    };
    
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/procedure_menu`), procedureData);

    toast({
      title: 'Procedure Added',
      description: `${values.name} has been added to the procedures menu.`,
    });
    form.reset();
    setIsAddProcedureOpen(false);
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
          <p className="text-muted-foreground">You are not authorized to configure the procedures menu.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Procedure <span className="text-primary">Pricing</span></h1>
           <p className="text-muted-foreground font-medium">Configure all billable clinical procedures and their standard fees.</p>
        </div>
         <Dialog open={isAddProcedureOpen} onOpenChange={setIsAddProcedureOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus /> Add Procedure
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Scissors /> New Procedure</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddProcedure)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                           <FormItem><FormLabel>Procedure Name</FormLabel><FormControl><Input placeholder="e.g. Suturing of Laceration" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Minor Surgery">Minor Surgery</SelectItem>
                                  <SelectItem value="Wound Care">Wound Care</SelectItem>
                                  <SelectItem value="Emergency Procedure">Emergency Procedure</SelectItem>
                                  <SelectItem value="Inpatient Intervention">Inpatient Intervention</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem><FormLabel>Standard Fee (GHS)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
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

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-0">
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Procedure Name</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Category</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Fee (GHS)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isMenuLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center h-24">Loading procedure menu...</TableCell></TableRow>
            ) : procedures?.length === 0 ? (
                 <TableRow><TableCell colSpan={3} className="text-center h-48 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2" />
                    No procedures configured. Add the first one to the menu.
                </TableCell></TableRow>
            ) : (
                procedures?.map(item => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-all">
                    <TableCell className="p-4 font-bold uppercase tracking-tight text-card-foreground">{item.name}</TableCell>
                    <TableCell className="p-4">
                        <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">
                            {item.category}
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
