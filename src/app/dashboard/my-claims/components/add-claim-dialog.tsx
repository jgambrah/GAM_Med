
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { NewStaffClaimSchema } from '@/lib/schemas';
import { submitStaffClaim } from '@/lib/actions';
import { StaffExpenseClaim } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface AddClaimDialogProps {
  onClaimSubmitted: (newClaim: Omit<StaffExpenseClaim, 'claimId' | 'staffId' | 'staffName'>, attachmentFile?: File) => void;
}

export function AddClaimDialog({ onClaimSubmitted }: AddClaimDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
  const { user } = useAuth();

  const form = useForm<z.infer<typeof NewStaffClaimSchema>>({
    resolver: zodResolver(NewStaffClaimSchema),
    defaultValues: {
      claimType: 'Travel',
      amount: 0,
      description: '',
    },
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAttachmentFile(file);
    // Also update form state for validation
    form.setValue('attachment', file);
  }

  const onSubmit = async (values: z.infer<typeof NewStaffClaimSchema>) => {
    if (!user) {
        toast.error("You must be logged in to submit a claim.");
        return;
    }
    
    const result = await submitStaffClaim(values);
    if (result.success) {
      toast.success('Your expense claim has been submitted for HOD approval.');
      
      const newClaimData = {
        hodId: user.hodId,
        claimType: values.claimType,
        amount: values.amount,
        description: values.description,
        submissionDate: new Date().toISOString(),
        approvalStatus: 'Pending HOD' as const,
        paymentStatus: 'Unpaid' as const,
        attachmentUrl: attachmentFile ? URL.createObjectURL(attachmentFile) : undefined,
      };

      onClaimSubmitted(newClaimData);
      setOpen(false);
      form.reset();
      setAttachmentFile(null);
    } else {
      toast.error(result.message || 'An unexpected error occurred.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Submit New Claim
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit New Expense Claim</DialogTitle>
          <DialogDescription>
            Fill in the details below. Your claim will be sent to your Head of Department for approval.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="claimType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Claim Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select claim type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Travel">Travel & Transport</SelectItem>
                      <SelectItem value="Per Diem">Per Diem</SelectItem>
                      <SelectItem value="Medical Refund">Medical Refund</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₵)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                       onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? undefined : parseFloat(value));
                      }}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Provide a brief description of the expense..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attachment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attach Receipt</FormLabel>
                   <FormControl>
                      <Input 
                          type="file" 
                          onChange={handleFileChange}
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
