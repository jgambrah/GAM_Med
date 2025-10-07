

'use client';

import * as React from 'react';
import { useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NewLedgerEntrySchema } from '@/lib/schemas';
import { mockLedgerAccounts as initialAccounts, mockLedgerEntries } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { LedgerAccount, LedgerEntry } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PostingSchema = z.object({
  debitAccountId: z.string().min(1, 'Debit account is required.'),
  creditAccountId: z.string().min(1, 'Credit account is required.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero.'),
  description: z.string().min(3, 'Description is required.'),
  paymentMethod: z.enum(['Cheque', 'Bank Transfer']),
  chequeNumber: z.string().optional(),
}).refine(data => {
    return data.paymentMethod !== 'Cheque' || (data.chequeNumber && data.chequeNumber.length > 0);
}, {
    message: "Cheque number is required for this payment method.",
    path: ["chequeNumber"],
});

interface LedgerPostingDialogProps {
    isOpen?: boolean;
    onOpenChange: (isOpen: boolean, posted?: boolean) => void;
    onPost: (values: z.infer<typeof PostingSchema>) => Promise<void>;
    amount?: number;
    description?: string;
    defaultDebit?: string;
    defaultCredit?: string;
    trigger?: React.ReactNode;
}

export function LedgerPostingDialog({ 
    isOpen, 
    onOpenChange, 
    onPost,
    amount, 
    description, 
    defaultDebit = '', 
    defaultCredit = '',
    trigger 
}: LedgerPostingDialogProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const [accounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', initialAccounts);
    const [entries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', mockLedgerEntries);

    const open = isOpen !== undefined ? isOpen : internalOpen;
    const setOpen = (newOpenState: boolean, posted = false) => {
        if (onOpenChange) {
            onOpenChange(newOpenState, posted);
        } else {
            setInternalOpen(newOpenState);
        }
    };
    const isManualEntry = trigger !== undefined;

    const form = useForm<z.infer<typeof PostingSchema>>({
        resolver: zodResolver(PostingSchema),
        defaultValues: {
            paymentMethod: 'Cheque',
        }
    });
    
    const paymentMethod = form.watch('paymentMethod');

    const checkForDuplicateCheque = (chequeNumber: string) => {
        if (!chequeNumber) return false;
        return entries.some(entry => entry.description.includes(`Cheque No: ${chequeNumber}`));
    };

    React.useEffect(() => {
        if (open) {
            const debitAccount = accounts.find(a => a.accountCode === defaultDebit || a.accountId === defaultDebit);
            const creditAccount = accounts.find(a => a.accountCode === defaultCredit || a.accountId === defaultCredit);

            form.reset({
                debitAccountId: debitAccount?.accountId || '',
                creditAccountId: creditAccount?.accountId || '',
                amount: amount || 0,
                description: description || '',
                paymentMethod: 'Cheque',
                chequeNumber: '',
            });
        }
    }, [open, amount, description, defaultDebit, defaultCredit, form.reset, accounts]);
    
    const onSubmit = async (values: z.infer<typeof PostingSchema>) => {
        if (values.paymentMethod === 'Cheque' && values.chequeNumber) {
            if (checkForDuplicateCheque(values.chequeNumber)) {
                form.setError("chequeNumber", {
                    type: "manual",
                    message: "This cheque number has already been used.",
                });
                return;
            }
        }
        await onPost(values);
        setOpen(false, true);
    }

    const accountOptions = accounts.map(acc => ({
        label: `${acc.accountName} (${acc.accountCode})`,
        value: acc.accountId
    }));

    const dialogContent = (
         <DialogContent>
            <DialogHeader>
                <DialogTitle>{isManualEntry ? 'Create Manual Journal Entry' : 'Post Transaction to Ledger'}</DialogTitle>
                <DialogDescription>
                    {isManualEntry ? 'Manually create a debit and credit entry.' : 'Confirm the accounts and payment details for this transaction.'}
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                     <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Input {...field} readOnly={!isManualEntry} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                         <FormField
                            control={form.control}
                            name="debitAccountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Debit Account</FormLabel>
                                    <Combobox options={accountOptions} value={field.value} onChange={field.onChange} placeholder="Search debit account..."/>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="creditAccountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Credit Account</FormLabel>
                                     <Combobox options={accountOptions} value={field.value} onChange={field.onChange} placeholder="Search credit account..."/>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} readOnly={!isManualEntry} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Method</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Cheque">Cheque</SelectItem>
                                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                    </div>
                    {paymentMethod === 'Cheque' && (
                        <FormField
                            control={form.control}
                            name="chequeNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cheque Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter cheque number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                     <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Posting...' : 'Post Transaction'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )

    if (trigger) {
        return (
            <Dialog open={open} onOpenChange={(newOpen) => setOpen(newOpen, false)}>
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
                {dialogContent}
            </Dialog>
        );
    }
    
    return (
        <Dialog open={open} onOpenChange={(newOpen) => setOpen(newOpen, false)}>
            {dialogContent}
        </Dialog>
    )
}
