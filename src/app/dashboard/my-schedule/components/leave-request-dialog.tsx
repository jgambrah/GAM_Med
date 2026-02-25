
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

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
      attachment: undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof LeaveRequestSchema>) => {
    if (!user) {
        toast.error("You must be logged in to submit a request.");
        return;
    }

    let attachmentUrl: string | undefined;
    const file = values.attachment?.[0];

    if (file) {
      try {
        attachmentUrl = await fileToDataUrl(file);
      } catch (error) {
        console.error("Error converting file to Data URL:", error);
        toast.error("Failed to process the attachment. Please try again.");
        return;
      }
    }
    
    // This is a conceptual call. In a real app, the server action would handle the file.
    const result = await submitLeaveRequest(values);

    if(result.success) {
      toast.success("Leave request submitted successfully.");
      
      if(onLeaveSubmitted) {
          const newRequest: LeaveRequest = {
            leaveId: `LR-${Date.now()}`,
            hospitalId: user.hospitalId, // Added the mandatory SaaS stamp
            staffId: user.uid,
            staffName: user.name,
            hodId: user.hodId, // Correctly assign the HOD ID
            leaveType: values.leaveType,
            startDate: values.startDate,
            endDate: values.endDate,
            reason: values.reason,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
            attachmentUrl: attachmentUrl,
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
            <FormField
              control={form.control}
              name="attachment"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                    <FormLabel>Attach Document (Optional)</FormLabel>
                    <FormControl>
                        <Input
                            {...fieldProps}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(event) => {
                                onChange(event.target.files);
                            }}
                        />
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
