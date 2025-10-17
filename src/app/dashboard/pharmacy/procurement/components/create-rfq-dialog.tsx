
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
import { Plus, Trash2 } from 'lucide-react';
import { mockInventory } from '@/lib/data';
import { RequestForQuotation } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const RfqItemSchema = z.object({
  itemId: z.string().min(1, 'Item is required.'),
  name: z.string(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});

const NewRfqSchema = z.object({
  title: z.string().min(5, 'A title is required.'),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid deadline is required." }),
  items: z.array(RfqItemSchema).min(1, 'At least one item is required.'),
});

interface CreateRfqDialogProps {
  onRfqCreated: (newRfq: RequestForQuotation) => void;
}

export function CreateRfqDialog({ onRfqCreated }: CreateRfqDialogProps) {
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof NewRfqSchema>>({
    resolver: zodResolver(NewRfqSchema),
    defaultValues: {
      title: '',
      deadline: '',
      items: [{ itemId: '', name: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const onSubmit = (values: z.infer<typeof NewRfqSchema>) => {
    const newRfq: RequestForQuotation = {
      rfqId: `RFQ-${Date.now()}`,
      title: values.title,
      dateCreated: new Date().toISOString(),
      deadline: values.deadline,
      status: 'Open for Bids',
      items: values.items.map(item => ({
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
      })),
      quotes: [],
    };
    onRfqCreated(newRfq);
    toast.success(`Request for Quotation "${values.title}" has been created.`);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Create New RFQ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Request for Quotation</DialogTitle>
          <DialogDescription>
            Define the items you need quotes for from your suppliers.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RFQ Title</FormLabel>
                  <FormControl><Input placeholder="e.g., Q3 Medical Supplies, Janitorial Services" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submission Deadline</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Items to Quote</FormLabel>
              <ScrollArea className="h-48 w-full rounded-md border p-4">
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.itemId`}
                        render={({ field: itemField }) => (
                          <FormItem className="flex-grow">
                            <FormControl>
                              <select
                                {...itemField}
                                onChange={(e) => {
                                  const selectedItem = mockInventory.find(item => item.itemId === e.target.value);
                                  itemField.onChange(e.target.value);
                                  form.setValue(`items.${index}.name`, selectedItem?.name || '');
                                }}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="" disabled>Select an item...</option>
                                {mockInventory.map(item => <option key={item.itemId} value={item.itemId}>{item.name}</option>)}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem><FormControl><Input type="number" className="w-24" placeholder="Qty" {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                      />
                      <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ itemId: '', name: '', quantity: 1 })}>
                <Plus className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Submitting...' : 'Create RFQ'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
