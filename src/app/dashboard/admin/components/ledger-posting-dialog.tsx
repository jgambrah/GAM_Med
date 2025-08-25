
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
import { useToast } from '@/hooks/use-toast';
import { postToLedger } from '@/lib/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockLedgerAccounts } from '@/lib/data';

interface LedgerPostingDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    amount: number;
    description: string;
}

export function LedgerPostingDialog({ isOpen, onOpenChange, amount, description }: LedgerPostingDialogProps) {
    const { toast } = useToast();

    const form = useForm<z.infer<typeof NewLedgerEntrySchema>>({
        resolver: zodResolver(NewLedgerEntrySchema),
        defaultValues: {
            debitAccountId: '1010', // Default to 'Cash and Bank'
            creditAccountId: '1020', // Default to 'Accounts Receivable'
            amount,
            description,
        }
    });

    const onSubmit = async (values: z.infer<typeof NewLedgerEntrySchema>) => {
        const result = await postToLedger(values);
        if (result.success) {
            toast({
                title: 'Transaction Posted',
                description: 'The transaction has been successfully posted to the ledger.',
            });
            onOpenChange(false);
        } else {
             toast({
                title: 'Posting Failed',
                description: result.message || 'An unexpected error occurred.',
                variant: 'destructive'
            });
        }
    }

    const accountOptions = mockLedgerAccounts.map(acc => ({
        label: `${acc.accountName} (${acc.accountCode})`,
        value: acc.accountId
    }));

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {accountOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
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
                                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {accountOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
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
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
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
