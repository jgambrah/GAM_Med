
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
import { LeaveRequestSchema } from '@/lib/schemas';
import { submitLeaveRequest } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';
import { LeaveRequest } from '@/lib/types';

interface LeaveRequestDialogProps {
    onLeaveSubmitted?: (newRequest: LeaveRequest) => void;
}

export function LeaveRequestDialog({ onLeaveSubmitted }: LeaveRequestDialogProps) {
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
    const result = await submitLeaveRequest(values);
    if(result.success) {
      toast.success("Leave request submitted successfully.");
      
      if(onLeaveSubmitted && user) {
          const newRequest: LeaveRequest = {
            leaveId: `LR-${Date.now()}`,
            staffId: user.uid,
            staffName: user.name,
            hodId: user.hodId, // Correctly assign the HOD ID
            leaveType: values.leaveType,
            startDate: values.startDate,
            endDate: values.endDate,
            reason: values.reason,
            status: 'Pending',
            requestedAt: new Date().toISOString()
          };
          onLeaveSubmitted(newRequest);
      }
      
      setOpen(false);
      form.reset();
    } else {
      toast.error(result.message || 'Failed to submit leave request.');
    }
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
