
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useAuth } from '@/hooks/use-auth';
import { CalendarOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LeaveRequestSchema = z.object({
  leaveType: z.enum(['Annual Leave', 'Sick Leave', 'Specialist Leave', 'On-Call Duty']),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid start date is required." }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "A valid end date is required." }),
  reason: z.string().min(10, { message: "Reason must be at least 10 characters." }),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date cannot be before start date.",
    path: ["endDate"],
});

export function LeaveRequestDialog() {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();

  const form = useForm<z.infer<typeof LeaveRequestSchema>>({
    resolver: zodResolver(LeaveRequestSchema),
    defaultValues: {
      leaveType: 'Annual Leave',
      startDate: '',
      endDate: '',
      reason: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof LeaveRequestSchema>) => {
    /**
     * == Conceptual Invocation of Cloud Function ==
     * This is where the UI would call the `handleLeaveRequest` Cloud Function.
     * The function would then perform the complex backend logic of:
     * 1. Updating the doctor's schedule for each day in the range.
     * 2. Finding any conflicting appointments.
     * 3. Notifying administrative staff to handle the rescheduling.
     */
    console.log('Submitting leave request:', values);
    alert('Leave request submitted (simulated). Admin will be notified of any conflicting appointments.');
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
            <CalendarOff className="h-4 w-4 mr-2" />
            Request Leave
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Leave of Absence</DialogTitle>
          <DialogDescription>
            Select the date range for your leave. Any conflicting appointments will be flagged for rescheduling by admin staff.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                      <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                      <SelectItem value="Specialist Leave">Specialist Leave</SelectItem>
                      <SelectItem value="On-Call Duty">On-Call Duty (Blockout)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Leave</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Annual leave, conference attendance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
