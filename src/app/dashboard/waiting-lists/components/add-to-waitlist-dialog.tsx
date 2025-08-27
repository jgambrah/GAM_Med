
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { NewWaitingListSchema } from '@/lib/schemas';
import { allPatients } from '@/lib/data';
import { addToWaitingList } from '@/lib/actions';


const mockServices = [
    { value: 'Cardiology Consultation', label: 'Cardiology Consultation' },
    { value: 'Knee Surgery', label: 'Knee Surgery' },
    { value: 'MRI Scan', label: 'MRI Scan' },
    { value: 'Dermatology Follow-up', label: 'Dermatology Follow-up' },
];

export function AddToWaitlistDialog() {
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof NewWaitingListSchema>>({
    resolver: zodResolver(NewWaitingListSchema),
    defaultValues: {
      patientId: '',
      requestedService: '',
      priority: 'Routine',
      notes: '',
    },
  });

  const patientOptions = allPatients.map(p => ({
      value: p.patient_id,
      label: `${p.full_name} (${p.patient_id})`
  }));

  const onSubmit = async (values: z.infer<typeof NewWaitingListSchema>) => {
    const result = await addToWaitingList(values);
    if (result.success) {
      toast.success('Patient Added to Waitlist', {
        description: 'The patient has been successfully added to the waiting list.',
      });
      setOpen(false);
      form.reset();
    } else {
      toast.error('Failed to Add Patient', {
        description: result.message || 'An unexpected error occurred.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add to Waitlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Patient to Waiting List</DialogTitle>
          <DialogDescription>
            Fill in the details for the patient and the service they are waiting for.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Patient</FormLabel>
                    <Combobox
                        options={patientOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Search for a patient..."
                        searchPlaceholder='Search patients...'
                        notFoundText='No patient found.'
                    />
                    <FormMessage />
                    </FormItem>
                )}
                />
            
            <FormField
              control={form.control}
              name="requestedService"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requested Service</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockServices.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a priority level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Routine">Routine</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="Elective">Elective</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Patient is available on weekends" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Adding...' : 'Add Patient'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
