'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import { Pill, Plus, AlertCircle, Package, Loader2, ShieldAlert, Edit3, Trash2, Search } from 'lucide-react';
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
  const [isEditStockOpen, setIsEditStockOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = claims?.hospitalId || userProfile?.hospitalId;
  const userRole = claims?.role || userProfile?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'PHARMACIST' || userRole === 'ADMIN';
  const isManager = userRole === 'DIRECTOR' || userRole === 'ADMIN';

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "pharmacy_inventory"));
  }, [firestore, hospitalId]);

  const { data: inventory, isLoading: isInventoryLoading } = useCollection(inventoryQuery);

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];

    const map = new Map<string, any>();

    // 1. DEDUPLICATE & CONSOLIDATE INVENTORY RECORDS BY DRUG KEY
    inventory.forEach((item: any) => {
      const rawName = item.name || item.drugName || item.itemName || item.title || '';
      if (!rawName.trim()) return; // Filter out blank ghost documents

      const key = rawName.toLowerCase().trim();

      if (!map.has(key)) {
        map.set(key, { ...item });
      } else {
        const existing = map.get(key);
        // Merge metadata: prioritize non-empty fields
        existing.name = existing.name || item.name || item.drugName;
        existing.genericName = (existing.genericName && existing.genericName !== '') ? existing.genericName : (item.genericName || item.generic);
        existing.strength = (existing.strength && existing.strength !== '') ? existing.strength : (item.strength || item.dosage);
        existing.batchNumber = (existing.batchNumber && existing.batchNumber !== 'N/A') ? existing.batchNumber : (item.batchNumber || item.batchNo || 'N/A');
        existing.expiryDate = (existing.expiryDate && existing.expiryDate !== 'N/A') ? existing.expiryDate : (item.expiryDate || item.expirationDate || 'N/A');
        existing.price = existing.price || item.price || item.unitPrice || 25.0;

        // Consolidate quantity: pick highest active stock
        const qty1 = typeof existing.quantity === 'number' ? existing.quantity : (typeof existing.quantityInStock === 'number' ? existing.quantityInStock : 0);
        const qty2 = typeof item.quantity === 'number' ? item.quantity : (typeof item.quantityInStock === 'number' ? item.quantityInStock : 0);
        const consolidatedQty = Math.max(qty1, qty2);
        existing.quantity = consolidatedQty > 0 ? consolidatedQty : 100;
        existing.quantityInStock = existing.quantity;
      }
    });

    const list = Array.from(map.values());
    const queryStr = searchQuery.toLowerCase().trim();
    if (!queryStr) return list;

    return list.filter((item: any) => {
      const nameStr = item.name || item.drugName || item.itemName || item.title || '';
      const genStr = item.genericName || item.generic || '';
      const batchStr = item.batchNumber || item.batchNo || item.batch || '';
      return (
        nameStr.toLowerCase().includes(queryStr) ||
        genStr.toLowerCase().includes(queryStr) ||
        batchStr.toLowerCase().includes(queryStr)
      );
    });
  }, [inventory, searchQuery]);

  const form = useForm<StockFormValues>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: {
      form: 'Tablet',
      quantity: 0,
      price: 0
    },
  });

  const editForm = useForm<StockFormValues>({
    resolver: zodResolver(stockFormSchema),
  });

  const handleAddStock = (values: StockFormValues) => {
    if (!firestore || !hospitalId) return;
    if (!isManager) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to manually add inventory.',
      });
      return;
    }

    // Deterministic Single Source of Truth Document ID (e.g. DRUG-vita-c)
    const docId = `DRUG-${values.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}`;
    const itemRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, docId);

    const stockData = {
      ...values,
      id: docId,
      drugName: values.name,
      itemName: values.name,
      name: values.name,
      genericName: values.genericName,
      generic: values.genericName,
      strength: values.strength || '',
      dosage: values.strength || '',
      quantity: values.quantity,
      quantityInStock: values.quantity,
      price: values.price,
      unitPrice: values.price,
      batchNumber: values.batchNumber || 'N/A',
      batchNo: values.batchNumber || 'N/A',
      expiryDate: values.expiryDate || 'N/A',
      expirationDate: values.expiryDate || 'N/A',
      hospitalId,
      lastUpdated: serverTimestamp(),
    };
    
    updateDocumentNonBlocking(itemRef, stockData);

    toast({
      title: 'Single-Source Stock Consolidated',
      description: `${values.name} stock consolidated under document ID ${docId}.`,
    });
    form.reset();
    setIsAddStockOpen(false);
  };

  const openEditDialog = (item: any) => {
    if (!isManager) return;
    setEditingItem(item);
    editForm.reset({
      name: item.name || item.drugName || item.itemName || '',
      genericName: item.genericName || item.generic || '',
      strength: item.strength || item.dosage || '',
      form: item.form || 'Tablet',
      quantity: item.quantity ?? item.quantityInStock ?? 0,
      price: item.price ?? item.unitPrice ?? 0,
      batchNumber: item.batchNumber || item.batchNo || '',
      expiryDate: item.expiryDate || item.expirationDate || '',
    });
    setIsEditStockOpen(true);
  };

  const handleEditStock = (values: StockFormValues) => {
    if (!firestore || !hospitalId || !editingItem) return;
    if (!isManager) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to manually modify inventory.',
      });
      return;
    }

    const itemRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, editingItem.id);
    updateDocumentNonBlocking(itemRef, {
      ...values,
      drugName: values.name,
      itemName: values.name,
      generic: values.genericName,
      quantityInStock: values.quantity,
      unitPrice: values.price,
      batchNo: values.batchNumber || 'N/A',
      expirationDate: values.expiryDate || 'N/A',
      lastUpdated: serverTimestamp()
    });
    toast({
      title: 'Stock Updated',
      description: `${values.name} has been updated.`,
    });
    setIsEditStockOpen(false);
    setEditingItem(null);
  };

  const handleDeleteStock = (id: string, name: string) => {
    if (!firestore || !hospitalId) return;
    if (!isManager) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to delete inventory.',
      });
      return;
    }

    if (confirm(`Are you sure you want to delete ${name} from inventory?`)) {
      const itemRef = doc(firestore, `hospitals/${hospitalId}/pharmacy_inventory`, id);
      deleteDocumentNonBlocking(itemRef);
      toast({
        title: 'Stock Deleted',
        description: `${name} has been removed from inventory.`,
      });
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
        {isManager && (
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
        )}
      </div>

      {/* SEARCH BAR */}
      <div className="max-w-md relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
        <Input 
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by brand name, generic name, or batch..."
          className="pl-11 bg-slate-50 border rounded-2xl font-bold h-11 text-black placeholder:text-slate-400"
        />
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
              {isManager && <TableHead className="p-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInventoryLoading ? (
                <TableRow><TableCell colSpan={isManager ? 6 : 5} className="text-center h-24">Loading inventory...</TableCell></TableRow>
            ) : filteredInventory.length === 0 ? (
                 <TableRow><TableCell colSpan={isManager ? 6 : 5} className="text-center h-48 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2" />
                    No stock items match your search.
                </TableCell></TableRow>
            ) : (
                filteredInventory.map(item => {
                  const displayName = item.name || item.drugName || item.itemName || item.title || 'UNNAMED DRUG ITEM';
                  const displayGeneric = item.genericName || item.generic || '';
                  const displayStrength = item.strength || item.dosage || item.dose || '';
                  const displayBatch = item.batchNumber || item.batchNo || item.batch || 'N/A';
                  const displayExpiry = item.expiryDate || item.expirationDate || item.expiry || 'N/A';
                  const displayQty = typeof item.quantity === 'number' ? item.quantity : (typeof item.quantityInStock === 'number' ? item.quantityInStock : Number(item.quantity || item.quantityInStock) || 0);
                  const displayPrice = typeof item.price === 'number' ? item.price : (typeof item.unitPrice === 'number' ? item.unitPrice : Number(item.price || item.unitPrice) || 0);

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50 transition-all">
                      <TableCell className="p-4">
                        <p className="font-bold uppercase tracking-tight text-card-foreground">{displayName}</p>
                        {(displayGeneric || displayStrength) ? (
                          <p className="text-[10px] font-bold text-primary">
                            {displayGeneric}{displayGeneric && displayStrength ? ' • ' : ''}{displayStrength}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="p-4 text-xs font-mono text-muted-foreground">{displayBatch}</TableCell>
                      <TableCell className="p-4 text-xs font-bold text-muted-foreground">{displayExpiry}</TableCell>
                      <TableCell className="p-4">
                        <div className={`flex items-center gap-2 font-black ${displayQty < 20 ? 'text-destructive' : 'text-green-600'}`}>
                          <span>{displayQty}</span>
                          {displayQty < 20 && <AlertCircle size={14} />}
                        </div>
                      </TableCell>
                      <TableCell className="p-4 text-right font-mono font-bold text-card-foreground">{displayPrice.toFixed(2)}</TableCell>
                      {isManager && (
                        <TableCell className="p-4 text-right space-x-2">
                           <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="hover:text-primary h-8 w-8 rounded-lg">
                              <Edit3 size={14} />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteStock(item.id, displayName)} className="hover:text-destructive text-muted-foreground h-8 w-8 rounded-lg">
                              <Trash2 size={14} />
                           </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </div>

      {/* EDIT STOCK DIALOG */}
      {isManager && (
        <Dialog open={isEditStockOpen} onOpenChange={setIsEditStockOpen}>
           <DialogContent>
               <DialogHeader>
                   <DialogTitle>Edit Drug Entry</DialogTitle>
               </DialogHeader>
               <Form {...editForm}>
                   <form onSubmit={editForm.handleSubmit(handleEditStock)} className="space-y-4">
                       <FormField control={editForm.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>Brand Name</FormLabel><FormControl><Input placeholder="e.g. Panadol" {...field} /></FormControl><FormMessage /></FormItem>
                       )} />
                       <FormField control={editForm.control} name="genericName" render={({ field }) => (
                          <FormItem><FormLabel>Generic Name</FormLabel><FormControl><Input placeholder="e.g. Paracetamol" {...field} /></FormControl><FormMessage /></FormItem>
                       )} />
                       <div className="grid grid-cols-2 gap-4">
                          <FormField control={editForm.control} name="strength" render={({ field }) => (
                             <FormItem><FormLabel>Strength</FormLabel><FormControl><Input placeholder="e.g. 500mg" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={editForm.control} name="form" render={({ field }) => (
                           <FormItem>
                             <FormLabel>Form</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                          <FormField control={editForm.control} name="quantity" render={({ field }) => (
                             <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={editForm.control} name="price" render={({ field }) => (
                             <FormItem><FormLabel>Price (GHS)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                       </div>
                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={editForm.control} name="batchNumber" render={({ field }) => (
                             <FormItem><FormLabel>Batch Number</FormLabel><FormControl><Input placeholder="e.g. AB1234" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={editForm.control} name="expiryDate" render={({ field }) => (
                             <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>

                        <DialogFooter>
                           <Button type="button" variant="outline" onClick={() => setIsEditStockOpen(false)}>Cancel</Button>
                           <Button type="submit" disabled={editForm.formState.isSubmitting}>Update Stock</Button>
                        </DialogFooter>
                   </form>
               </Form>
           </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
