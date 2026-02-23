
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Award } from 'lucide-react';
import { mockSuppliers, mockInventory } from '@/lib/data';
import { PurchaseOrder, Quote, RequestForQuotation, Supplier } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLocalStorage } from '@/hooks/use-local-storage';

const QuoteItemSchema = z.object({
  itemId: z.string(),
  unitPrice: z.coerce.number().min(0.01, "Unit price must be positive."),
});

const NewQuoteSchema = z.object({
  supplierId: z.string().min(1, 'A supplier must be selected.'),
  items: z.array(QuoteItemSchema).min(1),
});

function AddQuoteForm({ rfq, onQuoteAdded }: { rfq: RequestForQuotation, onQuoteAdded: (newQuote: Quote) => void }) {
  const [suppliers] = useLocalStorage<Supplier[]>('suppliers', mockSuppliers);

  const form = useForm<z.infer<typeof NewQuoteSchema>>({
    resolver: zodResolver(NewQuoteSchema),
    defaultValues: {
      supplierId: '',
      items: rfq.items.map(item => ({ itemId: item.itemId, unitPrice: 0 })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const onSubmit = (values: z.infer<typeof NewQuoteSchema>) => {
    const supplier = suppliers.find(s => s.supplierId === values.supplierId);
    if (!supplier) return;

    const totalAmount = values.items.reduce((acc, item, index) => {
        const rfqItem = rfq.items[index];
        return acc + (item.unitPrice * (rfqItem?.quantity || 0));
    }, 0);

    const newQuote: Quote = {
      quoteId: `Q-${Date.now()}`,
      supplierId: values.supplierId,
      supplierName: supplier.name,
      dateSubmitted: new Date().toISOString(),
      totalAmount,
      items: values.items.map((item, index) => ({
        itemId: rfq.items[index].itemId,
        unitPrice: item.unitPrice,
        notes: `Quoted for ${rfq.items[index].name} (Qty: ${rfq.items[index].quantity})`
      })),
      status: 'Submitted',
    };
    onQuoteAdded(newQuote);
    toast.success(`Quote from ${supplier.name} has been added.`);
    form.reset({
        supplierId: '',
        items: rfq.items.map(item => ({ itemId: item.itemId, unitPrice: 0 })),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-md">
        <h4 className="font-semibold">Add New Quote</h4>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.supplierId} value={s.supplierId}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {fields.map((field, index) => {
          const rfqItem = rfq.items[index];
          return (
            <div key={field.id} className="flex items-end gap-2">
              <div className="flex-grow">
                <Label>{rfqItem.name} (Qty: {rfqItem.quantity})</Label>
                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field: unitPriceField }) => (
                    <FormItem><FormControl><Input type="number" step="0.01" placeholder="Unit Price" {...unitPriceField} /></FormControl><FormMessage /></FormItem>
                  )}
                />
              </div>
            </div>
          );
        })}
        <Button type="submit" size="sm">Add Quote</Button>
      </form>
    </Form>
  );
}

interface ManageQuotesDialogProps {
  rfq: RequestForQuotation;
  isOpen: boolean;
  onOpenChange: () => void;
  onQuoteUpdate: (rfqId: string, updatedQuotes: Quote[]) => void;
  onQuoteAwarded: (rfqId: string, po: PurchaseOrder) => void;
}

export function ManageQuotesDialog({ rfq, isOpen, onOpenChange, onQuoteUpdate, onQuoteAwarded }: ManageQuotesDialogProps) {

  const handleAwardQuote = (quote: Quote) => {
    const awardedQuote = { ...quote, status: 'Awarded' as const };
    const otherQuotes = (rfq.quotes || []).filter(q => q.quoteId !== quote.quoteId).map(q => ({...q, status: 'Not Awarded' as const}));
    onQuoteUpdate(rfq.rfqId, [awardedQuote, ...otherQuotes]);

    const newPO: PurchaseOrder = {
        poId: `PO-${Date.now()}`,
        dateOrdered: new Date().toISOString(),
        status: 'Submitted',
        orderedByUserId: 'pharma1', // Mocked user
        supplierId: quote.supplierId,
        orderedItems: rfq.items.map(rfqItem => {
            const quoteItem = quote.items?.find(qi => qi.itemId === rfqItem.itemId);
            return {
                itemId: rfqItem.itemId,
                name: rfqItem.name,
                quantity: rfqItem.quantity,
                unit_cost: quoteItem?.unitPrice || 0,
            };
        }),
        totalAmount: quote.totalAmount,
    };
    
    onQuoteAwarded(rfq.rfqId, newPO);
    toast.success(`Quote from ${quote.supplierName} has been awarded. PO ${newPO.poId} created.`);
  };

  const handleAddQuote = (newQuote: Quote) => {
    const updatedQuotes = [...(rfq.quotes || []), newQuote];
    onQuoteUpdate(rfq.rfqId, updatedQuotes);
  };

  const lowestBid = React.useMemo(() => {
    if (!rfq.quotes || rfq.quotes.length === 0) return null;
    return rfq.quotes.reduce((lowest, current) => current.totalAmount < lowest.totalAmount ? current : lowest);
  }, [rfq.quotes]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Quotations for: {rfq.title}</DialogTitle>
          <DialogDescription>
            Review submitted quotes and award a supplier. The lowest bid is highlighted in green.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Total Amount (₵)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rfq.quotes || []).map(quote => (
                  <TableRow key={quote.quoteId} className={lowestBid?.quoteId === quote.quoteId ? 'bg-green-100' : ''}>
                    <TableCell className="font-medium">{quote.supplierName}</TableCell>
                    <TableCell className="text-right font-mono">{quote.totalAmount.toFixed(2)}</TableCell>
                    <TableCell><Badge variant={quote.status === 'Awarded' ? 'secondary' : 'outline'}>{quote.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleAwardQuote(quote)} disabled={rfq.status === 'Closed'}>
                        <Award className="h-4 w-4 mr-2" />
                        Award
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rfq.status !== 'Closed' && <AddQuoteForm rfq={rfq} onQuoteAdded={handleAddQuote} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
