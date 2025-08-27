
'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { NewInvoiceSchema } from '@/lib/schemas';
import { toast } from '@/hooks/use-toast';
import { generateInvoice } from '@/lib/actions';
import { FilePlus, Plus, Trash2 } from 'lucide-react';
import { allPatients, mockPricingTables } from '@/lib/data';
import { Patient } from '@/lib/types';
import { Separator } from '@/components/ui/separator';


// In a real app, this would come from a 'billing_codes' collection
const billableServices = [
    { code: 'A001', description: 'Consultation' },
    { code: 'L001', description: 'Full Blood Count' },
    { code: 'A005', description: 'Other Procedure/Service' },
];

interface GenerateInvoiceDialogProps {
  patientId: string;
}

function getPrice(patient: Patient, billingCode: string): number {
    if (!patient || !billingCode) return 0;

    const patientTier = mockPricingTables.find(t => t.pricingId === patient.patientType);
    if (patientTier && patientTier.rate_card[billingCode]) {
        return patientTier.rate_card[billingCode];
    }
    
    // Fallback to the first (default/private) pricing table
    const defaultTier = mockPricingTables[0];
    return defaultTier?.rate_card[billingCode] || 0;
}

const calculateTaxes = (subtotal: number, vatOption: string) => {
    let nhia = 0;
    let getfund = 0;
    let vat = 0;
    let covidLevy = 0;
    let totalTax = 0;

    if (vatOption === "flat") { // Flat rate
        covidLevy = subtotal * 0.01;
        vat = subtotal * 0.03;
        totalTax = vat + covidLevy;
    } else if (vatOption === "standard") { // Standard rate
        nhia = subtotal * 0.025;
        getfund = subtotal * 0.025;
        covidLevy = subtotal * 0.01;
        const taxableBaseForVat = subtotal + nhia + getfund + covidLevy;
        vat = taxableBaseForVat * 0.15;
        totalTax = nhia + getfund + vat + covidLevy;
    }

    return { nhia, getfund, vat, covidLevy, totalTax, subtotal };
};

const formatCurrency = (amount: number) => `₵${amount.toFixed(2)}`;

function InvoiceItemRow({ control, index, patient, remove }: { control: any, index: number, patient: Patient, remove: (index: number) => void }) {
    const { setValue } = useFormContext();
    const billingCode = useWatch({
        control,
        name: `items.${index}.billingCode`
    });

    React.useEffect(() => {
        const price = getPrice(patient, billingCode);
        setValue(`items.${index}.unitPrice`, price);
    }, [billingCode, patient, index, setValue]);

    return (
        <div className="flex items-end gap-2 p-2 border rounded-md">
            <FormField
                control={control}
                name={`items.${index}.billingCode`}
                render={({ field }) => (
                    <FormItem className="flex-grow">
                        <FormLabel>Service</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a service..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {billableServices.map(service => (
                                    <SelectItem key={service.code} value={service.code}>
                                        {service.description} ({service.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`items.${index}.quantity`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Qty</FormLabel>
                        <FormControl>
                            <Input type="number" className="w-20" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`items.${index}.unitPrice`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unit Price</FormLabel>
                        <FormControl>
                            {/* This input is now for display; its value is set programmatically */}
                            <Input type="number" className="w-24 bg-muted" {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => remove(index)}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    )
}

export function GenerateInvoiceDialog({ patientId }: GenerateInvoiceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const patient = allPatients.find(p => p.patient_id === patientId);

  const form = useForm<z.infer<typeof NewInvoiceSchema>>({
    resolver: zodResolver(NewInvoiceSchema),
    defaultValues: {
      vatOption: 'zero',
      items: [{ billingCode: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const watchedVatOption = useWatch({ control: form.control, name: 'vatOption' });

  const { subtotal, nhia, getfund, vat, covidLevy, totalTax } = React.useMemo(() => {
    const currentSubtotal = watchedItems.reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        return acc + (qty * price);
    }, 0);
    return calculateTaxes(currentSubtotal, watchedVatOption);
  }, [watchedItems, watchedVatOption]);
  
  const grandTotal = subtotal + totalTax;

  const onSubmit = async (values: z.infer<typeof NewInvoiceSchema>) => {
    const result = await generateInvoice(patientId, values);
    if (result.success) {
      toast.success('Invoice Generated', {
        description: 'The new invoice has been successfully created.',
      });
      setOpen(false);
      form.reset({
         vatOption: 'zero',
         items: [{ billingCode: '', quantity: 1, unitPrice: 0 }]
      });
    } else {
      toast.error('Failed to Generate Invoice', {
        description: result.message || 'An unexpected error occurred.',
      });
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <FilePlus className="h-4 w-4 mr-2" />
            Generate New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generate New Invoice</DialogTitle>
          <DialogDescription>
            Create a new bill for ad-hoc services for {patient.full_name}.
            Prices are automatically set based on the patient's '{patient.patientType}' pricing tier.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                     <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {fields.map((field, index) => (
                            <InvoiceItemRow 
                                key={field.id}
                                control={form.control}
                                index={index}
                                patient={patient}
                                remove={() => remove(index)}
                            />
                        ))}
                    </div>
                    <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ billingCode: '', quantity: 1, unitPrice: 0 })}
                    >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                    </Button>
                </div>
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                     <FormField
                        control={form.control}
                        name="vatOption"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>VAT Option</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select VAT option..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="zero">Zero Rated VAT</SelectItem>
                                        <SelectItem value="flat">Flat Rate (3% VAT + 1% Levy)</SelectItem>
                                        <SelectItem value="standard">Standard Rate (15% VAT + Levies)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    <Separator />
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">NHIA Levy (2.5%)</span>
                            <span>{formatCurrency(nhia)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">GETFund Levy (2.5%)</span>
                            <span>{formatCurrency(getfund)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">COVID-19 Levy (1%)</span>
                            <span>{formatCurrency(covidLevy)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">VAT</span>
                            <span>{formatCurrency(vat)}</span>
                        </div>
                    </div>
                     <Separator />
                      <div className="flex justify-between text-lg font-bold">
                            <span>Grand Total</span>
                            <span>{formatCurrency(grandTotal)}</span>
                        </div>
                </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
