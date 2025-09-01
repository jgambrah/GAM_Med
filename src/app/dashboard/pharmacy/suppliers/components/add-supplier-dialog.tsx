
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

interface AddSupplierDialogProps {
    onSupplierCreated: (newSupplier: Supplier) => void;
}

export function AddSupplierDialog({ onSupplierCreated }: AddSupplierDialogProps) {
  const [open, setOpen] = React.useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);

  const handleCreate = () => {
    // In a real app, you'd use a form library like react-hook-form with Zod for validation
    const formData = new FormData(formRef.current!);
    const name = formData.get('name') as string;
    const person = formData.get('person') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;
    const paymentTerms = formData.get('paymentTerms') as string;

    if (!name || !person || !email || !phone || !address || !paymentTerms) {
        toast.error('All fields are required.');
        return;
    }
    
    const newSupplier: Supplier = {
      supplierId: `SUP-${Date.now()}`,
      name,
      contactInfo: { person, email, phone, address },
      paymentTerms: paymentTerms as any,
    };
    
    onSupplierCreated(newSupplier);
    toast.success(`Supplier "${name}" has been created.`);
    setOpen(false);
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
            Enter the details for the new supplier or vendor.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} className="space-y-4 py-4">
            <div className="space-y-2">
                <FormLabel htmlFor="name">Supplier Name</FormLabel>
                <Input id="name" name="name" placeholder="e.g., PharmaSupply Ltd." />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <FormLabel htmlFor="person">Contact Person</FormLabel>
                    <Input id="person" name="person" />
                </div>
                 <div className="space-y-2">
                    <FormLabel htmlFor="phone">Contact Phone</FormLabel>
                    <Input id="phone" name="phone" />
                </div>
            </div>
             <div className="space-y-2">
                <FormLabel htmlFor="email">Contact Email</FormLabel>
                <Input id="email" name="email" type="email" />
            </div>
             <div className="space-y-2">
                <FormLabel htmlFor="address">Address</FormLabel>
                <Input id="address" name="address" />
            </div>
             <div className="space-y-2">
                <FormLabel htmlFor="paymentTerms">Payment Terms</FormLabel>
                <Select name="paymentTerms">
                    <SelectTrigger id="paymentTerms">
                        <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 60">Net 60</SelectItem>
                        <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Supplier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
