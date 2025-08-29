
'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { mockSuppliers, mockInventory } from '@/lib/data';
import { PharmacyOrder } from '@/lib/types';

const OrderItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required.'),
  name: z.string(), // We'll add this to the object when an item is selected.
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
  unit_cost: z.coerce.number().min(0.01, 'Cost must be greater than 0.'),
});

const NewOrderSchema = z.object({
  supplierId: z.string().min(1, 'A supplier must be selected.'),
  items: z.array(OrderItemSchema).min(1, 'At least one item is required.'),
});

interface CreateOrderDialogProps {
  onOrderCreated: (newOrder: PharmacyOrder) => void;
}

export function CreateOrderDialog({ onOrderCreated }: CreateOrderDialogProps) {
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof NewOrderSchema>>({
    resolver: zodResolver(NewOrderSchema),
    defaultValues: {
      supplierId: '',
      items: [{ itemId: '', name: '', quantity: 1, unit_cost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  
  const totalCost = React.useMemo(() => {
    return watchedItems.reduce((acc, item) => acc + (item.quantity * item.unit_cost), 0);
  }, [watchedItems]);

  const onSubmit = (values: z.infer<typeof NewOrderSchema>) => {
    // In a real app, this would call the `generatePurchaseOrder` Cloud Function
    const newOrder: PharmacyOrder = {
        orderId: `PO-${Date.now()}`,
        dateOrdered: new Date().toISOString(),
        status: 'Submitted',
        orderedByUserId: 'pharma1', // Mocked user
        ...values
    }
    onOrderCreated(newOrder);
    toast.success('Purchase Order Created', { description: `Order ${newOrder.orderId} has been submitted.` });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Create New Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Purchase Order</DialogTitle>
          <DialogDescription>
            Select a supplier and add items to generate a new purchase order.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockSuppliers.map(supplier => (
                        <SelectItem key={supplier.supplierId} value={supplier.supplierId}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
                <FormLabel>Items</FormLabel>
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
                        <FormField
                            control={form.control}
                            name={`items.${index}.itemId`}
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <Select 
                                      onValueChange={(value) => {
                                        const selectedItem = mockInventory.find(item => item.itemId === value);
                                        field.onChange(value);
                                        form.setValue(`items.${index}.name`, selectedItem?.name || '');
                                      }} 
                                      defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {mockInventory.map(item => <SelectItem key={item.itemId} value={item.itemId}>{item.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                                <FormItem><FormControl><Input type="number" className="w-24" placeholder="Qty" {...field} /></FormControl></FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`items.${index}.unit_cost`}
                            render={({ field }) => (
                                <FormItem><FormControl><Input type="number" className="w-28" placeholder="Unit Cost" {...field} /></FormControl></FormItem>
                            )}
                        />
                         <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', name: '', quantity: 1, unit_cost: 0 })}>
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
            </div>
            
            <div className="text-right font-bold text-lg">
                Total Order Cost: ₵{totalCost.toFixed(2)}
            </div>

            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Submitting...' : 'Submit Order'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
