

'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Plus } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LedgerAccountSchema } from '@/lib/schemas';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';
import { LedgerAccount } from '@/lib/types';
import { mockLedgerAccounts } from '@/lib/data';
import Link from 'next/link';

function CreateLedgerAccountDialog() {
    const [open, setOpen] = React.useState(false);
    const [accounts, setAccounts] = React.useState<LedgerAccount[]>(mockLedgerAccounts);

    const form = useForm<z.infer<typeof LedgerAccountSchema>>({
        resolver: zodResolver(LedgerAccountSchema),
        defaultValues: {
            accountName: '',
            accountCode: '',
            accountType: 'Asset',
            parentAccountId: null,
        }
    });

    const parentAccountOptions = accounts
        .filter(acc => !acc.isSubLedger)
        .map(acc => ({
            label: `${acc.accountName} (${acc.accountCode})`,
            value: acc.accountId,
        }));

    const onSubmit = async (values: z.infer<typeof LedgerAccountSchema>) => {
        console.log('Creating new ledger account:', values);
        
        const newAccount: LedgerAccount = {
            ...values,
            accountId: `ACC-${Math.random().toString(36).substr(2, 9)}`, // Generate a dummy ID
            balance: 0,
            isSubLedger: !!values.parentAccountId,
            createdAt: new Date().toISOString(),
        }

        setAccounts(prev => [...prev, newAccount]);

        toast.success('Ledger Account Created', {
            description: `Account "${values.accountName}" has been created.`,
        });
        setOpen(false);
        form.reset();
    };
    
    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Ledger Account
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Ledger Account</DialogTitle>
                    <DialogDescription>
                        Add a new control ledger or sub-ledger to your chart of accounts.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField
                            control={form.control}
                            name="accountName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Cash and Bank" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="accountCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 1010" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="accountType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Asset">Asset</SelectItem>
                                            <SelectItem value="Liability">Liability</SelectItem>
                                            <SelectItem value="Equity">Equity</SelectItem>
                                            <SelectItem value="Revenue">Revenue</SelectItem>
                                            <SelectItem value="Expense">Expense</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="parentAccountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Parent Control Account (for Sub-Ledgers)</FormLabel>
                                     <Select 
                                        onValueChange={(value) => field.onChange(value === 'none' ? null : value)} 
                                        value={field.value || 'none'}
                                    >
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="None (This is a main control account)" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">None (This is a main control account)</SelectItem>
                                            {parentAccountOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Creating...' : 'Create Account'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}


export function FinancialReportsDashboard() {

  return (
    <Card>
        <CardHeader>
            <CardTitle>Financial Reporting</CardTitle>
            <CardDescription>
                Generate key financial statements and reports.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
            <Button asChild className="mt-4">
                <Link href="/dashboard/admin/reports">
                    Go to Financial Reports
                </Link>
            </Button>
        </CardContent>
    </Card>
  );
}
