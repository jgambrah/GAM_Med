'use client';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Scissors, Package, Save, Plus, Loader2, ChevronsUpDown, Check, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const procedureLogSchema = z.object({
  procedureId: z.string().min(1, "Please select a procedure."),
  techniqueNotes: z.string().min(10, "Technique notes are required."),
  consumables: z.array(z.object({
    itemId: z.string(),
    name: z.string(),
    sku: z.string(),
    quantityUsed: z.coerce.number().min(1, "Qty must be > 0"),
  })).optional(),
});

type ProcedureLogValues = z.infer<typeof procedureLogSchema>;

interface ProcedureLogDialogProps {
  patientId: string;
  patientName: string;
  hospitalId: string;
}

export function ProcedureLogDialog({ patientId, hospitalId, patientName }: ProcedureLogDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Data Fetching
  const proceduresQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/procedure_menu`));
  }, [firestore, hospitalId]);
  const { data: proceduresMenu, isLoading: proceduresLoading } = useCollection(proceduresQuery);

  // Fetch from master product catalog instead of pharmacy inventory
  const catalogQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/product_catalog`));
  }, [firestore, hospitalId]);
  const { data: catalog, isLoading: catalogLoading } = useCollection(catalogQuery);

  const form = useForm<ProcedureLogValues>({
    resolver: zodResolver(procedureLogSchema),
    defaultValues: { consumables: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "consumables",
  });

  const onSubmit = async (values: ProcedureLogValues) => {
    if (!user) return;
    setLoading(true);
    
    const selectedProcedure = proceduresMenu?.find(p => p.id === values.procedureId);
    const batch = writeBatch(firestore);

    try {
      // 1. Create the Procedure Log
      const logRef = doc(collection(firestore, `hospitals/${hospitalId}/procedure_logs`));
      batch.set(logRef, {
        patientId,
        patientName,
        hospitalId,
        procedureId: values.procedureId,
        procedureName: selectedProcedure?.name,
        serviceFee: selectedProcedure?.price,
        techniqueNotes: values.techniqueNotes,
        consumables: values.consumables,
        providerUid: user.uid,
        providerName: user.displayName,
        createdAt: serverTimestamp(),
      });

      // 2. FINANCIAL HANDSHAKE: Create billing items for each consumable
      if (values.consumables) {
        values.consumables.forEach(consumable => {
          const catalogItem = catalog?.find(item => item.id === consumable.itemId);
          if (catalogItem && catalogItem.sellingPrice > 0) {
            const billRef = doc(collection(firestore, `hospitals/${hospitalId}/billing_items`));
            batch.set(billRef, {
              hospitalId,
              patientId,
              patientName,
              encounterId: logRef.id, // Link to the procedure log
              description: consumable.name,
              category: 'PROCEDURE',
              sku: consumable.sku,
              unitPrice: catalogItem.sellingPrice,
              qty: consumable.quantityUsed,
              total: catalogItem.sellingPrice * consumable.quantityUsed,
              status: 'UNPAID',
              billedBy: user.uid,
              createdAt: serverTimestamp()
            });
          }
        });
      }

      await batch.commit();
      
      toast({
        title: "Procedure Logged & Billed",
        description: `${selectedProcedure?.name} and consumables have been added to the patient's record and bill.`,
      });

      form.reset();
      setOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Logging Failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="bg-foreground hover:bg-blue-600 text-background font-bold uppercase tracking-widest text-[10px]">
          <Scissors /> Record Procedure
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-black tracking-tighter uppercase text-xl"><Scissors /> Procedure Log</DialogTitle>
          <p className="text-xs text-muted-foreground font-bold uppercase">Patient: {patientName}</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
            <FormField
              control={form.control}
              name="procedureId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedure Performed</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={proceduresLoading}>
                        <SelectValue placeholder={proceduresLoading ? "Loading menu..." : "Select from procedure menu"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {proceduresMenu?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} (GHS {p.price.toFixed(2)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="techniqueNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technique & Clinical Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Site cleaned with betadine, local anesthesia with 2% lidocaine, 3.0 Silk sutures used..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4">
               <FormLabel>Materials Consumed</FormLabel>
               {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2 p-3 bg-muted/50 rounded-lg">
                        <p className="flex-1 text-sm font-medium">{field.name}</p>
                        <FormField
                            control={form.control}
                            name={`consumables.${index}.quantityUsed`}
                            render={({ field: qtyField }) => (
                                <FormItem>
                                     <FormControl>
                                        <Input type="number" placeholder="Qty" className="w-20" {...qtyField} />
                                     </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-9 w-9" onClick={() => remove(index)}>
                            <Trash2 size={16} />
                        </Button>
                    </div>
               ))}
               <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                            <Plus size={16} className="mr-2"/> Add Consumable from Catalog
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search catalog..." />
                            <CommandList>
                               <CommandEmpty>No products found.</CommandEmpty>
                               <CommandGroup>
                                 {catalog?.map(item => (
                                     <CommandItem
                                        key={item.id}
                                        value={`${item.name} ${item.sku}`}
                                        onSelect={() => append({ itemId: item.id, name: item.name, sku: item.sku, quantityUsed: 1 })}
                                     >
                                       <Check className={cn("mr-2 h-4 w-4", fields.some(f => f.itemId === item.id) ? "opacity-100" : "opacity-0")} />
                                       {item.name}
                                     </CommandItem>
                                 ))}
                               </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
               </Popover>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Save />}
                Log Procedure
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
