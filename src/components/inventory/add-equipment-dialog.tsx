
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
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
import { Plus, Microscope, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { NewEquipmentSchema } from '@/lib/schemas';

/**
 * == SaaS Capital Asset Provisioning ==
 * 
 * Tool for registering expensive, reusable medical equipment.
 * Every machine is tied to the hospitalId SaaS Wall.
 */
export function AddEquipmentDialog() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof NewEquipmentSchema>>({
    resolver: zodResolver(NewEquipmentSchema),
    defaultValues: {
      hospitalId: user?.hospitalId || '',
      name: '',
      serialNumber: '',
      category: '',
      status: 'Available',
      lastMaintenance: '',
      nextMaintenance: '',
    },
  });

  React.useEffect(() => {
    if (open && user) {
        form.setValue('hospitalId', user.hospitalId);
    }
  }, [open, user, form]);

  const onSubmit = async (values: z.infer<typeof NewEquipmentSchema>) => {
    if (!firestore || !user) return;

    try {
        const newEquipment = {
            ...values,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        addDocumentNonBlocking(collection(firestore, 'medical_equipment'), newEquipment);
        
        toast.success('Equipment Registered', {
            description: `${values.name} (${values.serialNumber}) added to facility registry.`
        });
        
        setOpen(false);
        form.reset();
    } catch (error: any) {
        console.error("Asset registration failed:", error);
        toast.error("Process Failed", { description: "You don't have permission to register capital assets." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-md">
          <Plus className="h-4 w-4" /> Add Medical Equipment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Microscope className="h-5 w-5" />
            <DialogTitle>Register Capital Asset</DialogTitle>
          </div>
          <DialogDescription>
            Onboard a new reusable machine for <strong>{user?.hospitalId}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Machine Name</FormLabel>
                  <FormControl><Input placeholder="e.g., GE Ventilator XL" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl><Input placeholder="SN-12345" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Ventilator">Ventilator</SelectItem>
                                <SelectItem value="Defibrillator">Defibrillator</SelectItem>
                                <SelectItem value="Monitor">Patient Monitor</SelectItem>
                                <SelectItem value="Infusion Pump">Infusion Pump</SelectItem>
                                <SelectItem value="Oxygen Tank">Oxygen Tank</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="lastMaintenance"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-xs">Last Maintenance</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="nextMaintenance"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="text-xs">Next Due Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Finalize Registration
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
