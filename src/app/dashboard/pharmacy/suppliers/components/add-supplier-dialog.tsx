'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { Supplier } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { NewSupplierSchema } from '@/lib/schemas';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';

interface AddSupplierDialogProps {
    onSupplierCreated: (newSupplier: Supplier) => void;
}

export function AddSupplierDialog({ onSupplierCreated }: AddSupplierDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof NewSupplierSchema>>({
    resolver: zodResolver(NewSupplierSchema),
    defaultValues: {
        hospitalId: user?.hospitalId || '',
        name: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        paymentTerms: 'Net 30',
    }
  });

  React.useEffect(() => {
    if (open && user) {
        form.setValue('hospitalId', user.hospitalId);
    }
  }, [open, user, form]);

  const onSubmit = (values: z.infer<typeof NewSupplierSchema>) => {
    const newSupplier: Supplier = {
      supplierId: `SUP-${Date.now()}`,
      hospitalId: values.hospitalId,
      name: values.name,
      contactInfo: { 
          person: values.contactPerson,
          email: values.contactEmail,
          phone: values.contactPhone,
          address: values.address 
      },
      paymentTerms: values.paymentTerms,
    };
    
    onSupplierCreated(newSupplier);
    toast.success('Supplier Created', {
        description: `Supplier "${values.name}" has been created.`,
    });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Add New Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
          <DialogDescription>
            Enter the details for the new supplier or vendor. Access is strictly scoped to {user?.hospitalId}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Supplier Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., PharmaSupply Ltd." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="contactPerson"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contact Person</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Contact Phone</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                                <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Payment Terms</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment terms" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Net 30">Net 30</SelectItem>
                                    <SelectItem value="Net 60">Net 60</SelectItem>
                                    <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Creating...' : 'Create Supplier'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
