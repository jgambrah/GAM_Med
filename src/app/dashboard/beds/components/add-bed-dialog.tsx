
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
import { Bed } from '@/lib/types';
import { NewBedSchema } from '@/lib/schemas';
import { Plus } from 'lucide-react';

interface AddBedDialogProps {
  onBedCreated: (newBed: Bed) => void;
}

export function AddBedDialog({ onBedCreated }: AddBedDialogProps) {
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof NewBedSchema>>({
    resolver: zodResolver(NewBedSchema),
    defaultValues: {
      bedId: '',
      wardName: '',
      roomNumber: '',
    },
  });

  const onSubmit = (values: z.infer<typeof NewBedSchema>) => {
    const newBed: Bed = {
      bed_id: values.bedId,
      wardName: values.wardName,
      room_number: values.roomNumber,
      status: 'vacant',
      cleaningNeeded: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onBedCreated(newBed);
    toast.success('Bed Created', {
      description: `Bed ${values.bedId} has been successfully created in ${values.wardName}.`,
    });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add New Bed
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Bed</DialogTitle>
          <DialogDescription>
            Add a new bed to the hospital's registry.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="bedId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bed ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., C-102, GW-209" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="wardName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ward Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cardiology, General Ward" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roomNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 10, 21" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Adding...' : 'Add Bed'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
