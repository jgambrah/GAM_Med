
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp } from 'firebase/firestore';
import { Package, Plus, Search, Loader2, ShieldAlert, HardDrive } from 'lucide-react';
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

const productSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  category: z.string().min(1, "Category is required."),
  storeType: z.string().min(1, "Store type is required."),
  unit: z.string().min(1, "Unit is required."),
  minLevel: z.coerce.number().min(0, "Min level cannot be negative."),
  basePrice: z.coerce.number().min(0, "Base price cannot be negative."),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductCatalogPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const catalogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'product_catalog'));
  }, [firestore, hospitalId]);
  
  const { data: products, isLoading: areProductsLoading } = useCollection(catalogQuery);
  
  const filteredProducts = useMemo(() => {
      if (!products) return [];
      if (!searchTerm) return products;
      const lowercasedTerm = searchTerm.toLowerCase();
      return products.filter(p => p.name.toLowerCase().includes(lowercasedTerm) || p.sku.toLowerCase().includes(lowercasedTerm));
  }, [products, searchTerm]);
  
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
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Product <span className="text-primary">Catalog</span></h1>
          <p className="text-muted-foreground font-medium">Standardized Master List for all Hospital Supplies.</p>
        </div>
        <AddProductDialog 
            hospitalId={hospitalId}
            isOpen={isAddProductOpen}
            setIsOpen={setIsAddProductOpen}
        />
      </div>
      
       <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input 
          placeholder="Search Catalog by Name or SKU..."
          className="w-full pl-12 pr-4 py-5 rounded-2xl border-2 bg-card"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-0">
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">SKU / Name</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Store / Category</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Min. Level</TableHead>
              <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Base Price (GHS)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areProductsLoading && <TableRow><TableCell colSpan={4} className="text-center h-48"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>}
            {filteredProducts?.map(p => (
              <TableRow key={p.id}>
                <TableCell className="p-4">
                  <p className="font-bold text-primary">{p.sku}</p>
                  <p className="uppercase text-card-foreground font-semibold">{p.name}</p>
                </TableCell>
                <TableCell className="p-4">
                  <p className="font-bold uppercase text-xs text-card-foreground">{p.storeType.replace('_', ' ')}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">{p.category}</p>
                </TableCell>
                <TableCell className="p-4 text-center font-bold text-lg">{p.minLevel}</TableCell>
                <TableCell className="p-4 text-right font-mono font-bold text-card-foreground">{p.basePrice.toFixed(2)}</TableCell>
              </TableRow>
            ))}
             {!areProductsLoading && filteredProducts?.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center p-20 text-muted-foreground italic">No products in catalog. Add a new template.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const AddProductDialog = ({ hospitalId, isOpen, setIsOpen }: { hospitalId: string, isOpen: boolean, setIsOpen: (open: boolean) => void }) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: '',
            category: 'MEDICINE',
            storeType: 'PHARMACY',
            unit: 'Box',
            minLevel: 10,
            basePrice: 0,
        }
    });

    const generateSKU = (name: string, cat: string) => {
        const prefix = cat.substring(0, 3).toUpperCase();
        const mid = name.substring(0, 3).toUpperCase();
        const random = Math.floor(100 + Math.random() * 900);
        return `${prefix}-${mid}-${random}`;
    };

    const onSubmit = (values: ProductFormValues) => {
        if (!firestore) return;
        const sku = generateSKU(values.name, values.category);
        addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/product_catalog`), {
            ...values,
            sku,
            hospitalId,
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Product Template Created', description: `${values.name} (${sku}) added to catalog.`});
        setIsOpen(false);
        form.reset();
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button><Plus/> Add Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>New Product Template</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Product Full Name</FormLabel><FormControl><Input placeholder="e.g., Amoxicillin 500mg" {...field} /></FormControl><FormMessage/></FormItem>
                        )}/>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="MEDICINE">Medicine / Drug</SelectItem>
                                        <SelectItem value="REAGENT">Lab Reagent</SelectItem>
                                        <SelectItem value="CONSUMABLE">Medical Consumable</SelectItem>
                                        <SelectItem value="GENERAL">General Supply</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage/></FormItem>
                            )}/>
                            <FormField control={form.control} name="storeType" render={({ field }) => (
                                <FormItem><FormLabel>Store Link</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="PHARMACY">Pharmacy Store</SelectItem>
                                        <SelectItem value="LAB">Laboratory Store</SelectItem>
                                        <SelectItem value="GENERAL_STORE">General Store</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage/></FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="unit" render={({ field }) => (
                                <FormItem><FormLabel>Base Unit</FormLabel><FormControl><Input placeholder="e.g., Box, Bottle" {...field} /></FormControl><FormMessage/></FormItem>
                            )}/>
                             <FormField control={form.control} name="minLevel" render={({ field }) => (
                                <FormItem><FormLabel>Reorder Level</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                            )}/>
                        </div>
                         <FormField control={form.control} name="basePrice" render={({ field }) => (
                            <FormItem><FormLabel>Base Price (GHS)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage/></FormItem>
                        )}/>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>Authorize Catalog Entry</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
