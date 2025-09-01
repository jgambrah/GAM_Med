
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { PurchaseOrder } from '@/lib/types';
import { updateInventory } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';

const ReceiveItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  quantity: z.coerce.number(),
  batchNumber: z.string().min(1, 'Batch number is required.'),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid expiry date is required." }),
});

const ReceiveOrderSchema = z.object({
  items: z.array(ReceiveItemSchema),
});

interface ReceiveOrderDialogProps {
  order: PurchaseOrder;
  onOrderReceived: (orderId: string) => void;
}

export function ReceiveOrderDialog({ order, onOrderReceived }: ReceiveOrderDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof ReceiveOrderSchema>>({
    resolver: zodResolver(ReceiveOrderSchema),
    defaultValues: {
      items: order.orderedItems.map(item => ({
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
        batchNumber: '',
        expiryDate: '',
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const onSubmit = async (values: z.infer<typeof ReceiveOrderSchema>) => {
    // In a real app, this would be a single server action that loops through items
    // and calls the updateInventory function for each.
    for (const item of values.items) {
      // Simulate the conceptual Cloud Function call
      await updateInventory({
        itemId: item.itemId,
        quantityChange: item.quantity,
        type: 'Restock',
        userId: user?.uid || 'pharma1',
        reason: `Purchase Order ${order.poId}`,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
      });
    }

    toast.success('Stock Received', { description: `Inventory has been updated for order ${order.poId}.` });
    onOrderReceived(order.poId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={order.status === 'Received'}>
          {order.status === 'Received' ? 'Received' : 'Receive Stock'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive Stock for Order: {order.poId}</DialogTitle>
          <DialogDescription>
            Enter the batch number and expiry date for each item received.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-md">
                   <h4 className="font-semibold">{field.name}</h4>
                   <p className="text-sm text-muted-foreground">Quantity Ordered: {field.quantity}</p>
                   <div className="grid grid-cols-2 gap-4 mt-2">
                     <FormField
                        control={form.control}
                        name={`items.${index}.batchNumber`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Batch Number</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`items.${index}.expiryDate`}
                        render={({ field }) => (
                             <FormItem>
                                <FormLabel>Expiry Date</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                   </div>
                </div>
              ))}
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Receiving...' : 'Confirm and Add to Inventory'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
