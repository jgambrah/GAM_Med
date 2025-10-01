

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
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
import { mockLedgerAccounts as initialAccounts } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { LedgerAccount } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';

interface LedgerPostingDialogProps {
    isOpen?: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onPost: (values: z.infer<typeof NewLedgerEntrySchema>) => Promise<void>;
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

    const open = isOpen !== undefined ? isOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;
    const isManualEntry = trigger !== undefined;

    const form = useForm<z.infer<typeof NewLedgerEntrySchema>>({
        resolver: zodResolver(NewLedgerEntrySchema),
        defaultValues: {
            debitAccountId: '',
            creditAccountId: '',
            amount: 0,
            description: '',
        }
    });

    React.useEffect(() => {
        if (open) {
            form.reset({
                debitAccountId: defaultDebit,
                creditAccountId: defaultCredit,
                amount: amount || 0,
                description: description || '',
            })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, amount, description, defaultDebit, defaultCredit, form.reset]);
    
    const onSubmit = async (values: z.infer<typeof NewLedgerEntrySchema>) => {
        await onPost(values);
        setOpen(false);
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
                    {isManualEntry ? 'Manually create a debit and credit entry in the general ledger.' : 'Confirm the debit and credit accounts for this transaction.'}
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                         <FormField
                            control={form.control}
                            name="debitAccountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Debit Account</FormLabel>
                                    <Combobox
                                        options={accountOptions}
                                        value={field.value}
                                        onChange={(value) => field.onChange(value)}
                                        placeholder="Search for an account..."
                                        searchPlaceholder="Search accounts..."
                                        notFoundText="No account found."
                                    />
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
                                    <Combobox
                                        options={accountOptions}
                                        value={field.value}
                                        onChange={(value) => field.onChange(value)}
                                        placeholder="Search for an account..."
                                        searchPlaceholder="Search accounts..."
                                        notFoundText="No account found."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    
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
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
                {dialogContent}
            </Dialog>
        );
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {dialogContent}
        </Dialog>
    )
}
