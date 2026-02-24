
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  doc, 
  writeBatch 
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { FilePlus, Loader2 } from 'lucide-react';
import { NewInvoiceSchema } from '@/lib/schemas';
import { Patient, PricingTable } from '@/lib/types';
import { mockPricingTables } from '@/lib/data';

interface GenerateInvoiceDialogProps {
  patient: Patient & { id: string };
}

type UnbilledService = {
  id: string;
  collection: string;
  description: string;
  date: string;
  billingCode: string;
  price: number;
};

export function GenerateInvoiceDialog({ patient }: GenerateInvoiceDialogProps) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);
  const [unbilledServices, setUnbilledServices] = React.useState<UnbilledService[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof NewInvoiceSchema>>({
    resolver: zodResolver(NewInvoiceSchema),
    defaultValues: {
      hospitalId: user?.hospitalId || '',
      vatOption: 'zero',
      items: [],
    },
  });

  const { control, handleSubmit, watch, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // 1. HARVESTING LOGIC: Fetch unbilled clinical events
  const harvestUnbilledItems = React.useCallback(async () => {
    if (!firestore || !user?.hospitalId || !patient.id) return;
    setIsLoading(true);

    try {
      const harvested: UnbilledService[] = [];
      const privateTier = mockPricingTables.find(t => t.pricingId === patient.patientType) || mockPricingTables[0];

      // A) Check Appointments
      const apptQ = query(
        collection(firestore, 'appointments'),
        where('hospitalId', '==', user.hospitalId),
        where('patient_id', '==', patient.id),
        where('status', '==', 'completed'),
        where('isBilled', '==', false)
      );
      const apptSnap = await getDocs(apptQ);
      apptSnap.forEach(d => {
        const data = d.data();
        harvested.push({
          id: d.id,
          collection: 'appointments',
          description: `Consultation: ${data.type}`,
          date: data.appointment_date,
          billingCode: 'A001',
          price: privateTier.rate_card['A001'] || 150
        });
      });

      // B) Check Lab Orders
      const labQ = query(
        collection(firestore, 'lab_orders'),
        where('hospitalId', '==', user.hospitalId),
        where('patientId', '==', patient.id),
        where('status', '==', 'Completed'),
        where('isBilled', '==', false)
      );
      const labSnap = await getDocs(labQ);
      labSnap.forEach(d => {
        const data = d.data();
        harvested.push({
          id: d.id,
          collection: 'lab_orders',
          description: `Lab Test: ${data.testName}`,
          date: data.completedAt || data.createdAt,
          billingCode: 'L001',
          price: privateTier.rate_card['L001'] || 80
        });
      });

      setUnbilledServices(harvested);
    } catch (error) {
      console.error("Harvesting failed:", error);
      toast.error("Failed to fetch unbilled services.");
    } finally {
      setIsLoading(false);
    }
  }, [firestore, user?.hospitalId, patient.id, patient.patientType]);

  React.useEffect(() => {
    if (open) {
      harvestUnbilledItems();
      reset({
        hospitalId: user?.hospitalId || '',
        vatOption: 'zero',
        items: [],
      });
    }
  }, [open, harvestUnbilledItems, user?.hospitalId, reset]);

  const watchedVatOption = watch('vatOption');
  const watchedItems = watch('items');

  const subtotal = React.useMemo(() => {
    return watchedItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  }, [watchedItems]);

  const calculateTotal = () => {
    // Simplified tax logic for Ghana
    if (watchedVatOption === 'zero') return subtotal;
    if (watchedVatOption === 'flat') return subtotal * 1.04;
    return subtotal * 1.219;
  };

  const grandTotal = calculateTotal();

  const handleSelectService = (service: UnbilledService, isSelected: boolean) => {
    if (isSelected) {
      append({
        billingCode: service.billingCode,
        description: service.description,
        quantity: 1,
        unitPrice: service.price,
      });
    } else {
      const index = watchedItems.findIndex(i => i.description === service.description);
      if (index > -1) remove(index);
    }
  };

  const onSubmit = async (values: z.infer<typeof NewInvoiceSchema>) => {
    if (!firestore || !user) return;

    try {
      const batch = writeBatch(firestore);
      const invoiceRef = doc(collection(firestore, 'invoices'));

      // 2. CREATE INVOICE (With SaaS Wall)
      batch.set(invoiceRef, {
        invoiceId: invoiceRef.id,
        hospitalId: user.hospitalId,
        patientId: patient.id,
        patientName: patient.full_name,
        patientType: patient.patientType,
        issueDate: serverTimestamp(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        billedItems: values.items,
        subtotal: subtotal,
        vatOption: values.vatOption,
        grandTotal: grandTotal,
        amountDue: grandTotal,
        status: 'Pending Payment',
        generatedBy: user.name,
        createdAt: serverTimestamp()
      });

      // 3. ATOMIC FLAG: Mark harvested items as billed
      watchedItems.forEach(item => {
        const source = unbilledServices.find(s => s.description === item.description);
        if (source) {
          const ref = doc(firestore, source.collection, source.id);
          batch.update(ref, { isBilled: true });
        }
      });

      await batch.commit();
      toast.success('Invoice Generated', { description: `Invoice ${invoiceRef.id} has been created.` });
      setOpen(false);
    } catch (error) {
      console.error("Invoicing failed:", error);
      toast.error("Could not generate invoice.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <FilePlus className="h-4 w-4 mr-2" />
          Generate Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generate Invoice for {patient.full_name}</DialogTitle>
          <DialogDescription>
            Harvest unbilled clinical events directly from the patient's EHR.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Unbilled Clinical Events
              {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            </h4>
            <div className="border rounded-lg h-[300px] overflow-y-auto p-4 space-y-3 bg-muted/10">
              {unbilledServices.length > 0 ? (
                unbilledServices.map((service) => (
                  <div key={service.id} className="flex items-center space-x-3 p-3 rounded-md bg-background border shadow-sm hover:border-primary transition-all">
                    <Checkbox 
                      id={service.id} 
                      onCheckedChange={(checked) => handleSelectService(service, !!checked)}
                    />
                    <div className="flex-grow">
                      <p className="text-sm font-bold">{service.description}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(service.date), 'PPP')}</p>
                    </div>
                    <p className="text-sm font-mono font-black text-primary">₵{service.price.toFixed(2)}</p>
                  </div>
                ))
              ) : !isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <FilePlus className="h-10 w-10 mb-2" />
                  <p className="text-xs">No unbilled events found.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 p-6 rounded-lg bg-green-50/50 border border-green-100">
            <h4 className="text-sm font-bold uppercase tracking-wider text-green-800">Invoice Configuration</h4>
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="vatOption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">VAT Compliance</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="zero">Zero Rated (NHIS/GETFund only)</SelectItem>
                          <SelectItem value="flat">VFRS (4% Unified)</SelectItem>
                          <SelectItem value="standard">Standard (15% + Levies)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <Separator className="bg-green-200" />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Line Total (₵)</span>
                    <span>{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Est. Taxes (₵)</span>
                    <span className="text-green-700">{(grandTotal - subtotal).toFixed(2)}</span>
                  </div>
                  <Separator className="bg-green-200 my-2" />
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold uppercase text-green-800">Grand Total</span>
                    <span className="text-2xl font-black text-green-900 font-mono">₵{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg shadow-lg" disabled={watchedItems.length === 0}>
                  Finalize & Post Invoice
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
