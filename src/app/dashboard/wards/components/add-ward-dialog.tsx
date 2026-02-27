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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutGrid, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { NewWardSchema } from '@/lib/schemas';

/**
 * == SaaS Facility Structuring: Add Ward ==
 * 
 * Allows Directors to define new clinical units within their hospital.
 */
export function AddWardDialog() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof NewWardSchema>>({
    resolver: zodResolver(NewWardSchema),
    defaultValues: {
      hospitalId: user?.hospitalId || '',
      name: '',
      type: 'General',
    },
  });

  React.useEffect(() => {
    if (open && user) {
        form.setValue('hospitalId', user.hospitalId);
    }
  }, [open, user, form]);

  const onSubmit = async (values: z.infer<typeof NewWardSchema>) => {
    if (!firestore || !user) return;

    try {
        const wardId = `ward_${Date.now()}`;
        const wardRef = doc(firestore, 'wards', wardId);

        await setDoc(wardRef, {
            ...values,
            id: wardId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        toast.success('Clinical Unit Created', {
            description: `${values.name} has been added to your facility structure.`
        });
        
        setOpen(false);
        form.reset();
    } catch (error: any) {
        console.error("Ward creation failed:", error);
        toast.error("Process Failed", { description: "You don't have permission to modify facility units." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-slate-800 shadow-md">
          <Plus className="mr-2 h-4 w-4" /> Add Ward
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <LayoutGrid className="h-5 w-5" />
            <DialogTitle>Add Clinical Unit</DialogTitle>
          </div>
          <DialogDescription>
            Define a new department or ward area for <strong>{user?.hospitalId}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Ward Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ward A, Pediatric ICU" {...field} className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Unit Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="General">General Medical</SelectItem>
                      <SelectItem value="ICU">Intensive Care Unit (ICU)</SelectItem>
                      <SelectItem value="Pediatric">Pediatrics</SelectItem>
                      <SelectItem value="Maternity">Maternity & OBGYN</SelectItem>
                      <SelectItem value="Surgical">Post-Surgical</SelectItem>
                      <SelectItem value="Emergency">Emergency Triage</SelectItem>
                      <SelectItem value="Isolation">Isolation Unit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-slate-900 font-bold px-8">
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Provision Unit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}