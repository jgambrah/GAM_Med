
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
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
import { BedAllocationSchema } from '@/lib/schemas';
import { allPatients, allBeds, allUsers } from '@/lib/data';
import { allocateBed } from '@/lib/actions';

export function AllocateBedDialog() {
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof BedAllocationSchema>>({
    resolver: zodResolver(BedAllocationSchema),
    defaultValues: {
      patientId: '',
      bedId: '',
      attendingDoctorId: '',
      reasonForAdmission: '',
    },
  });

  const unadmittedPatients = allPatients.filter(p => !p.is_admitted);
  const vacantBeds = allBeds.filter(b => b.status === 'vacant');
  const doctors = allUsers.filter(u => u.role === 'doctor');

  const onSubmit = async (values: z.infer<typeof BedAllocationSchema>) => {
    const result = await allocateBed(values);
    if (result.success) {
      alert('Patient has been admitted successfully (simulated).');
      setOpen(false);
      form.reset();
    } else {
      alert(`Error: ${result.message || 'Failed to allocate bed.'}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Allocate Bed</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Allocate Bed to Patient</DialogTitle>
          <DialogDescription>
            Assign a patient to an available bed to admit them.
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an unadmitted patient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {unadmittedPatients.map(p => (
                        <SelectItem key={p.patient_id} value={p.patient_id}>
                          {p.full_name} ({p.patient_id})
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
              name="bedId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vacant Bed</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vacant bed" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vacantBeds.map(b => (
                        <SelectItem key={b.bed_id} value={b.bed_id}>
                           {b.bed_id} ({b.ward})
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
              name="attendingDoctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attending Doctor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map(d => (
                        <SelectItem key={d.uid} value={d.uid}>
                          {d.name}
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
                name="reasonForAdmission"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Reason for Admission</FormLabel>
                        <FormControl>
                            <Textarea 
                                placeholder="Enter reason for admission..."
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Allocating...' : 'Allocate and Admit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
