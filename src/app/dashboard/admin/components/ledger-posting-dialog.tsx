
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NewLedgerEntrySchema } from '@/lib/schemas';
import { toast } from '@/hooks/use-toast';
import { mockLedgerAccounts as initialAccounts, mockLedgerEntries as initialEntries } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { LedgerAccount, LedgerEntry } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';

interface LedgerPostingDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean, posted?: boolean) => void;
    amount: number;
    description: string;
    defaultDebit?: string;
    defaultCredit?: string;
}

export function LedgerPostingDialog({ isOpen, onOpenChange, amount, description, defaultDebit = '1010', defaultCredit = '4000' }: LedgerPostingDialogProps) {
    const [accounts, setAccounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', initialAccounts);
    const [entries, setEntries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', initialEntries);

    const form = useForm<z.infer<typeof NewLedgerEntrySchema>>({
        resolver: zodResolver(NewLedgerEntrySchema),
        defaultValues: {
            debitAccountId: defaultDebit,
            creditAccountId: defaultCredit,
            amount,
            description,
        }
    });

    // When the component re-opens with new props, reset the form.
    React.useEffect(() => {
        const debitAccount = accounts.find(acc => acc.accountCode === defaultDebit)?.accountId;
        const creditAccount = accounts.find(acc => acc.accountCode === defaultCredit)?.accountId;
        form.reset({
            debitAccountId: debitAccount,
            creditAccountId: creditAccount,
            amount,
            description,
        })
    }, [isOpen, amount, description, defaultDebit, defaultCredit, form, accounts])

    const onSubmit = async (values: z.infer<typeof NewLedgerEntrySchema>) => {
        // This simulates the postToLedger server action
        const now = new Date().toISOString();
        const { debitAccountId, creditAccountId, amount: transactionAmount, description: transactionDescription } = values;

        const newDebitEntry: LedgerEntry = {
            entryId: `entry-${Date.now()}-dr`,
            accountId: debitAccountId,
            date: now,
            description: transactionDescription,
            debit: transactionAmount
        };
        const newCreditEntry: LedgerEntry = {
            entryId: `entry-${Date.now()}-cr`,
            accountId: creditAccountId,
            date: now,
            description: transactionDescription,
            credit: transactionAmount
        };
        
        setEntries(prev => [...prev, newDebitEntry, newCreditEntry]);

        // Update account balances
        setAccounts(prev => prev.map(acc => {
            if (acc.accountId === debitAccountId) {
                 const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                 return { ...acc, balance: acc.balance + (isDebitType ? transactionAmount : -transactionAmount) };
            }
            if (acc.accountId === creditAccountId) {
                 const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                 return { ...acc, balance: acc.balance + (isDebitType ? -transactionAmount : transactionAmount) };
            }
            return acc;
        }));


        toast.success('Transaction Posted', {
            description: 'The transaction has been successfully posted to the ledger.',
        });
        onOpenChange(false, true);
    }

    const accountOptions = accounts.map(acc => ({
        label: `${acc.accountName} (${acc.accountCode})`,
        value: acc.accountId
    }));

    return (
        <Dialog open={isOpen} onOpenChange={(open) => onOpenChange(open, false)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Post Transaction to Ledger</DialogTitle>
                    <DialogDescription>
                        Select the appropriate debit and credit accounts for this transaction.
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
                                        <FormLabel>Debit Account (Increase)</FormLabel>
                                        <Combobox
                                            options={accountOptions}
                                            value={field.value}
                                            onChange={field.onChange}
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
                                        <FormLabel>Credit Account (Decrease)</FormLabel>
                                        <Combobox
                                            options={accountOptions}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Search for an account..."
                                            searchPlaceholder="Search accounts..."
                                            notFoundText="No account found."
                                        />
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
                                            <Input type="number" {...field} readOnly disabled />
                                        </FormControl>
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
                                            <Input {...field} readOnly disabled />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                         <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false, false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Posting...' : 'Post Transaction'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
