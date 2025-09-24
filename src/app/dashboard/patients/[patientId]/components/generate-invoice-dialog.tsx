
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
import { allPatients, mockPricingTables, allAppointments, mockLabResults } from '@/lib/data';
import { Patient, Appointment, LabResult } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';

interface GenerateInvoiceDialogProps {
  patientId: string;
}

// In a real app, this would come from a 'billing_codes' collection
const billableServices = [
    { code: 'A001', description: 'Consultation' },
    { code: 'L001', description: 'Full Blood Count' },
    { code: 'A005', description: 'Other Procedure/Service' },
];

function getPrice(patient: Patient, billingCode: string): number {
    if (!patient || !billingCode) return 0;

    const patientTier = mockPricingTables.find(t => t.pricingId === patient.patientType);
    if (patientTier && patientTier.rate_card[billingCode]) {
        return patientTier.rate_card[billingCode];
    }
    
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

type UnbilledService = {
  serviceId: string;
  description: string;
  date: string;
  billingCode: string;
  price: number;
};

export function GenerateInvoiceDialog({ patientId }: GenerateInvoiceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [unbilledServices, setUnbilledServices] = React.useState<UnbilledService[]>([]);
  const patient = allPatients.find(p => p.patient_id === patientId);

  React.useEffect(() => {
    if (open && patient) {
      // ** CONCEPT: Fetch Unbilled Services **
      // This simulates fetching all billable items for the patient that have `isBilled: false`.
      // In a real app, this would be a server action calling a Cloud Function.
      const completedAppointments = allAppointments.filter(
        (a) => a.patient_id === patientId && a.status === 'completed' && !a.isBilled
      ).map(a => ({
        serviceId: a.appointment_id,
        description: `Consultation with ${a.doctor_name}`,
        date: a.appointment_date,
        billingCode: 'A001', // Example mapping
        price: getPrice(patient, 'A001')
      }));

      const completedLabs = mockLabResults.filter(
        (l) => l.patientId === patientId && (l.status === 'Completed' || l.status === 'Validated') && !l.isBilled
      ).map(l => ({
        serviceId: l.testId,
        description: `Lab Test: ${l.testName}`,
        date: l.completedAt!,
        billingCode: 'L001', // Example mapping
        price: getPrice(patient, 'L001')
      }));

      setUnbilledServices([...completedAppointments, ...completedLabs]);
    }
  }, [open, patient, patientId]);

  const form = useForm<z.infer<typeof NewInvoiceSchema>>({
    resolver: zodResolver(NewInvoiceSchema),
    defaultValues: {
      vatOption: 'zero',
      items: [],
    },
  });
  
  const { control, handleSubmit, watch } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedVatOption = watch('vatOption');
  const watchedItems = watch('items');

  const { subtotal, nhia, getfund, vat, covidLevy, totalTax } = React.useMemo(() => {
    const currentSubtotal = watchedItems.reduce((acc, item) => acc + item.unitPrice, 0);
    return calculateTaxes(currentSubtotal, watchedVatOption);
  }, [watchedItems, watchedVatOption]);
  
  const grandTotal = subtotal + totalTax;

  const handleSelectService = (service: UnbilledService, isSelected: boolean) => {
    if (isSelected) {
      append({
        billingCode: service.billingCode,
        description: service.description, // Store description
        quantity: 1,
        unitPrice: service.price,
      });
    } else {
      const itemIndex = fields.findIndex(field => field.description === service.description);
      if (itemIndex > -1) {
        remove(itemIndex);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof NewInvoiceSchema>) => {
    const result = await generateInvoice(patientId, values);
    if (result.success) {
      toast.success('Invoice Generated', {
        description: 'The new invoice has been successfully created.',
      });
      setOpen(false);
      form.reset();
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
            Select unbilled services for {patient.full_name} to add them to the invoice.
            Prices are automatically set based on the patient's '{patient.patientType}' pricing tier.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="font-semibold">Unbilled Services</h4>
                     <div className="space-y-2 max-h-96 overflow-y-auto pr-2 border rounded-md p-2">
                        {unbilledServices.length > 0 ? unbilledServices.map(service => (
                            <div key={service.serviceId} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                                <Checkbox
                                    id={service.serviceId}
                                    onCheckedChange={(checked) => handleSelectService(service, !!checked)}
                                />
                                <label htmlFor={service.serviceId} className="flex-grow text-sm font-medium leading-none">
                                    {service.description} ({format(new Date(service.date), 'PPP')})
                                </label>
                                <span className="text-sm font-mono">{formatCurrency(service.price)}</span>
                            </div>
                        )) : (
                            <p className="text-center text-sm text-muted-foreground p-4">No unbilled services found for this patient.</p>
                        )}
                    </div>
                </div>
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                     <h3 className="text-lg font-semibold">Invoice Summary</h3>
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
              <Button type="submit" disabled={form.formState.isSubmitting || watchedItems.length === 0}>
                {form.formState.isSubmitting ? 'Generating...' : 'Generate Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
