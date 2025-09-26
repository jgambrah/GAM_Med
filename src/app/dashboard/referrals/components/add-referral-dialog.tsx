
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
import { Input } from '@/components/ui/input';
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
import { ReferralSchema } from '@/lib/schemas';
import { Plus } from 'lucide-react';
import { Referral } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface AddReferralDialogProps {
  onReferralAdded: (newReferral: Referral) => void;
}

export function AddReferralDialog({ onReferralAdded }: AddReferralDialogProps) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<z.infer<typeof ReferralSchema>>({
    resolver: zodResolver(ReferralSchema),
    defaultValues: {
      referringProvider: '',
      patientName: '',
      patientPhone: '',
      patientDob: '',
      reasonForReferral: '',
      priority: 'Routine',
      assignedDepartment: '',
      notes: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof ReferralSchema>) => {
    // In a real app, this would call a server action that invokes the `processIncomingReferral` Cloud Function.
    console.log('New Referral Data:', values);

    const newReferral: Referral = {
        referral_id: `REF-${Date.now()}`,
        referringProvider: values.referringProvider,
        referralDate: new Date().toISOString(),
        patientDetails: {
            name: values.patientName,
            phone: values.patientPhone,
            dob: values.patientDob,
        },
        reasonForReferral: values.reasonForReferral,
        priority: values.priority,
        assignedDepartment: values.assignedDepartment,
        status: 'Pending Review',
        notes: values.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    
    onReferralAdded(newReferral);
    toast.success('New referral has been submitted successfully.');
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Referral
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register New Referral</DialogTitle>
          <DialogDescription>
            Fill in the details below to log a new patient referral.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="referringProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referring Provider / Facility</FormLabel>
                    <Input placeholder="e.g., Korle Bu Polyclinic" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedDepartment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cardiology">Cardiology</SelectItem>
                          <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                          <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                          <SelectItem value="Neurology">Neurology</SelectItem>
                          <SelectItem value="General Surgery">General Surgery</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <h4 className="text-md font-medium border-b pb-1">Patient Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Full Name</FormLabel>
                    <Input {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="patientDob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Date of Birth</FormLabel>
                    <Input type="date" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="patientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Phone</FormLabel>
                    <Input placeholder="+233..." {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <h4 className="text-md font-medium border-b pb-1">Referral Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="reasonForReferral"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Reason for Referral</FormLabel>
                            <Textarea placeholder="Clinical summary or reason..." {...field} />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority level" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="Routine">Routine</SelectItem>
                                <SelectItem value="Urgent">Urgent</SelectItem>
                                <SelectItem value="Emergency">Emergency</SelectItem>
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
                                <FormLabel>Internal Notes (Optional)</FormLabel>
                                <Textarea placeholder="Administrative notes..." {...field} />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormItem>
                        <FormLabel>Scanned Document (Optional)</FormLabel>
                        <Input type="file" />
                        <FormMessage />
                    </FormItem>
                </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Submit Referral'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
