
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { allPatients, allUsers } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const OtSessionSchema = z.object({
  patientId: z.string().min(1, 'A patient is required.'),
  otRoomId: z.string().min(1, 'An operating theatre is required.'),
  procedureName: z.string().min(5, 'Procedure name must be at least 5 characters.'),
  leadSurgeonId: z.string().min(1, 'A lead surgeon is required.'),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
});

const mockOperatingTheaters = [
    { value: 'OT-1', label: 'Operating Theatre 1 (General)' },
    { value: 'OT-2', label: 'Operating Theatre 2 (Cardiothoracic)' },
    { value: 'OT-3', label: 'Operating Theatre 3 (Orthopedic)' },
];

export function BookOtSessionDialog() {
  const [open, setOpen] = React.useState(false);
  
  const form = useForm<z.infer<typeof OtSessionSchema>>({
    resolver: zodResolver(OtSessionSchema),
    defaultValues: {
      patientId: '',
      otRoomId: '',
      procedureName: '',
      leadSurgeonId: '',
      startTime: '',
      endTime: '',
      notes: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof OtSessionSchema>) => {
    // This would call the `bookOtSession` Cloud Function
    console.log('Booking OT Session with values:', values);
    alert('OT session booked successfully (simulated).');
    setOpen(false);
    form.reset();
  };

  const patientOptions = allPatients.map(p => ({ value: p.patient_id, label: `${p.full_name} (${p.patient_id})` }));
  const surgeonOptions = allUsers.filter(u => u.role === 'doctor').map(d => ({ value: d.uid, label: d.name }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Book OT Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book Operating Theatre Session</DialogTitle>
          <DialogDescription>
            Schedule a new surgical procedure. All fields are required unless marked optional.
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
                    searchPlaceholder="Search patients..."
                    notFoundText="No patient found."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="procedureName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedure Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Appendectomy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="otRoomId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Operating Theatre</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an OT room" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {mockOperatingTheaters.map((ot) => (
                                    <SelectItem key={ot.value} value={ot.value}>
                                    {ot.label}
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
                    name="leadSurgeonId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Lead Surgeon</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a surgeon" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {surgeonOptions.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Any special equipment or pre-op notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Booking...' : 'Book Session'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
