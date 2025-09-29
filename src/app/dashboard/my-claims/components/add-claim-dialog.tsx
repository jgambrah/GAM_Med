

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
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NewStaffClaimSchema } from '@/lib/schemas';
import { LedgerAccount, StaffExpenseClaim } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { mockLedgerAccounts } from '@/lib/data';

interface AddClaimDialogProps {
  onClaimSubmitted: (newClaim: Omit<StaffExpenseClaim, 'staffId' | 'staffName' | 'hodId' | 'claimType'>) => void;
}

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function AddClaimDialog({ onClaimSubmitted }: AddClaimDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [accounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);

  const formSchema = NewStaffClaimSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      description: '',
      expenseAccountId: '',
    },
  });
  
  const expenseAccounts = accounts.filter(acc => acc.accountType === 'Expense');

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
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
      
      const newClaim: Omit<StaffExpenseClaim, 'staffId' | 'staffName' | 'hodId' | 'claimType'> = {
        claimId: `SEC-${Date.now()}`,
        amount: values.amount,
        description: values.description,
        expenseAccountId: values.expenseAccountId,
        submissionDate: new Date().toISOString(),
        approvalStatus: 'Pending HOD',
        paymentStatus: 'Unpaid',
        attachmentUrl: attachmentUrl,
      };

      onClaimSubmitted(newClaim);
      setOpen(false);
      form.reset();
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₵)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
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
                  <FormLabel>Description of Expense</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Provide a brief description of the expense..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="expenseAccountId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Expense Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an expense account..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {expenseAccounts.map(acc => (
                                    <SelectItem key={acc.accountId} value={acc.accountId}>
                                        {acc.accountName} ({acc.accountCode})
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
              name="attachment"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                    <FormLabel>Attach Receipt</FormLabel>
                    <FormControl>
                        <Input
                            {...fieldProps}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(event) => {
                                onChange(event.target.files && event.target.files[0]);
                            }}
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
