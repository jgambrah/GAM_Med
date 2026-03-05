'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp } from 'firebase/firestore';
import { Pill, Plus, AlertCircle, Package, Loader2, ShieldAlert } from 'lucide-react';
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


const stockFormSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  genericName: z.string().min(1, "Generic name is required"),
  strength: z.string().optional(),
  form: z.string().min(1, "Drug form is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

type StockFormValues = z.infer<typeof stockFormSchema>;

export default function PharmacyInventory() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);

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
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'PHARMACIST' || userRole === 'ADMIN';

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "pharmacy_inventory"));
  }, [firestore, hospitalId]);

  const { data: inventory, isLoading: isInventoryLoading } = useCollection(inventoryQuery);

  const form = useForm<StockFormValues>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: {
      form: 'Tablet',
      quantity: 0,
      price: 0
    },
  });

  const handleAddStock = (values: StockFormValues) => {
    if (!firestore || !hospitalId) return;

    const stockData = {
      ...values,
      hospitalId,
      lastUpdated: serverTimestamp(),
    };
    
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/pharmacy_inventory`), stockData);

    toast({
      title: 'Stock Added',
      description: `${values.name} has been added to the inventory.`,
    });
    form.reset();
    setIsAddStockOpen(false);
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
          <p className="text-muted-foreground">You are not authorized to manage pharmacy inventory.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Pharmacy <span className="text-primary">Inventory</span></h1>
           <p className="text-muted-foreground font-medium">Manage all drug stock levels and pricing for your facility.</p>
        </div>
         <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus /> Add New Stock
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Drug Entry</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddStock)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                           <FormItem><FormLabel>Brand Name</FormLabel><FormControl><Input placeholder="e.g. Panadol" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="genericName" render={({ field }) => (
                           <FormItem><FormLabel>Generic Name</FormLabel><FormControl><Input placeholder="e.g. Paracetamol" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={form.control} name="strength" render={({ field }) => (
                              <FormItem><FormLabel>Strength</FormLabel><FormControl><Input placeholder="e.g. 500mg" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="form" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Form</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Tablet">Tablet</SelectItem>
                                  <SelectItem value="Capsule">Capsule</SelectItem>
                                  <SelectItem value="Syrup">Syrup</SelectItem>
                                  <SelectItem value="Injection">Injection</SelectItem>
                                  <SelectItem value="Ointment">Ointment</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                           <FormField control={form.control} name="quantity" render={({ field }) => (
                              <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="price" render={({ field }) => (
                              <FormItem><FormLabel>Price (GHS)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="batchNumber" render={({ field }) => (
                              <FormItem><FormLabel>Batch Number</FormLabel><FormControl><Input placeholder="e.g. AB1234" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                           <FormField control={form.control} name="expiryDate" render={({ field }) => (
                              <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                         </div>

                         <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>Save to Store</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>

      {/* STOCK TABLE */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-0">
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Drug Name & Strength</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Batch No.</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Expiry</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stock Level</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Unit Price (GHS)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInventoryLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">Loading inventory...</TableCell></TableRow>
            ) : inventory?.length === 0 ? (
                 <TableRow><TableCell colSpan={5} className="text-center h-48 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2" />
                    No inventory items found. Add your first stock item.
                </TableCell></TableRow>
            ) : (
                inventory?.map(item => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-all">
                    <TableCell className="p-4">
                    <p className="font-bold uppercase tracking-tight text-card-foreground">{item.name}</p>
                    <p className="text-[10px] font-bold text-primary">{item.genericName} • {item.strength}</p>
                    </TableCell>
                    <TableCell className="p-4 text-xs font-mono text-muted-foreground">{item.batchNumber}</TableCell>
                    <TableCell className="p-4 text-xs font-bold text-muted-foreground">{item.expiryDate}</TableCell>
                    <TableCell className="p-4">
                    <div className={`flex items-center gap-2 font-black ${item.quantity < 20 ? 'text-destructive' : 'text-green-600'}`}>
                        <span>{item.quantity}</span>
                        {item.quantity < 20 && <AlertCircle size={14} />}
                    </div>
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
