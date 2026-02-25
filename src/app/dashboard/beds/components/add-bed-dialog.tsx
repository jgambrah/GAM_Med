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
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, BedDouble, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc } from 'firebase/firestore';
import { Ward } from '@/lib/types';

const AddBedSchema = z.object({
  hospitalId: z.string().min(1),
  wardId: z.string().min(1, "Please select a ward"),
  bedNumber: z.string().min(1, "Bed label is required (e.g. Bed 10)"),
  type: z.enum(['Electric', 'Manual']),
});

/**
 * == SaaS Facility Provisioning: Add Bed ==
 * 
 * Securely registers a new bed into a specific hospital ward.
 * Enforces the SaaS Wall by locking hospitalId to the current user.
 */
export function AddBedDialog() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);

  // Fetch wards for the selection dropdown
  const wardsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(collection(firestore, 'wards'), where('hospitalId', '==', user.hospitalId));
  }, [firestore, user?.hospitalId]);

  const { data: wards } = useCollection<Ward>(wardsQuery);

  const form = useForm<z.infer<typeof AddBedSchema>>({
    resolver: zodResolver(AddBedSchema),
    defaultValues: {
      hospitalId: user?.hospitalId || '',
      wardId: '',
      bedNumber: '',
      type: 'Manual',
    },
  });

  React.useEffect(() => {
    if (open && user) {
        form.setValue('hospitalId', user.hospitalId);
    }
  }, [open, user, form]);

  const onSubmit = async (values: z.infer<typeof AddBedSchema>) => {
    if (!firestore) return;

    try {
        const ward = wards?.find(w => w.id === values.wardId);
        const bedId = `${values.hospitalId}_${values.wardId}_${values.bedNumber.replace(/\s+/g, '')}`;
        const bedRef = doc(firestore, 'beds', bedId);

        await setDoc(bedRef, {
            ...values,
            id: bedId,
            status: 'Available',
            wardName: ward?.name || 'Unknown',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        toast.success('Facility Inventory Updated', {
            description: `${values.bedNumber} is now active in ${ward?.name}.`
        });
        
        setOpen(false);
        form.reset();
    } catch (error: any) {
        console.error("Provisioning failed:", error);
        toast.error("Access Denied", { description: "You don't have permission to modify facility assets." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add New Bed
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <BedDouble className="h-5 w-5" />
            <DialogTitle>Add Facility Asset</DialogTitle>
          </div>
          <DialogDescription>
            Register a new inpatient bed for <strong>{user?.hospitalId}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="wardId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Ward</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a ward unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {wards?.map(ward => (
                        <SelectItem key={ward.id} value={ward.id}>{ward.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bedNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bed Number / Label</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bed 10, Suite A" {...field} />
                  </FormControl>
                  <FormDescription className="text-[10px]">Must be unique within the ward.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bed Mechanism</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Manual">Manual (Standard)</SelectItem>
                      <SelectItem value="Electric">Electric (ICU Grade)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Provision Bed
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}