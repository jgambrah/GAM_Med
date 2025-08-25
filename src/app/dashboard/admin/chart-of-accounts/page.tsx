
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { mockLedgerAccounts } from '@/lib/data';
import { LedgerAccount } from '@/lib/types';
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
import { Eye, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface CreateLedgerAccountDialogProps {
    existingAccounts: LedgerAccount[];
    onAccountCreate: (newAccount: LedgerAccount) => void;
}


function CreateLedgerAccountDialog({ existingAccounts, onAccountCreate }: CreateLedgerAccountDialogProps) {
    const [open, setOpen] = React.useState(false);
    const { toast } = useToast();
    const form = useForm<z.infer<typeof LedgerAccountSchema>>({
        resolver: zodResolver(LedgerAccountSchema),
        defaultValues: {
            accountName: '',
            accountCode: '',
            accountType: 'Asset',
            parentAccountId: null,
        }
    });

    const parentAccountOptions = existingAccounts
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

        onAccountCreate(newAccount);

        toast({
            title: 'Ledger Account Created',
            description: `Account "${values.accountName}" has been created.`,
        });
        setOpen(false);
        form.reset();
    };
    
    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
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

export default function ChartOfAccountsPage() {
    const [accounts, setAccounts] = React.useState<LedgerAccount[]>(mockLedgerAccounts);

    const handleAccountCreate = (newAccount: LedgerAccount) => {
        setAccounts(prevAccounts => [...prevAccounts, newAccount]);
    };

    const organizedAccounts = React.useMemo(() => {
        const accountsMap = new Map<string, LedgerAccount & { children: LedgerAccount[] }>();
        const rootAccounts: (LedgerAccount & { children: LedgerAccount[] })[] = [];

        accounts.forEach(acc => {
            accountsMap.set(acc.accountId, { ...acc, children: [] });
        });

        accounts.forEach(acc => {
            if (acc.isSubLedger && acc.parentAccountId) {
                const parent = accountsMap.get(acc.parentAccountId);
                if (parent) {
                    parent.children.push(accountsMap.get(acc.accountId)!);
                }
            } else {
                 rootAccounts.push(accountsMap.get(acc.accountId)!);
            }
        });

        return rootAccounts;

    }, [accounts]);

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Chart of Accounts</h1>
                <p className="text-muted-foreground">
                    Manage all financial ledgers and sub-ledgers.
                </p>
            </div>
            <CreateLedgerAccountDialog existingAccounts={accounts} onAccountCreate={handleAccountCreate} />
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Ledger Accounts</CardTitle>
          <CardDescription>A hierarchical list of all financial accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizedAccounts.map((account) => (
                    <React.Fragment key={account.accountId}>
                        <TableRow className="bg-muted/50 font-semibold">
                            <TableCell>{account.accountCode}</TableCell>
                            <TableCell className="flex items-center gap-2">
                                <span>{account.accountName}</span>
                                {account.children.length > 0 && <Badge variant="secondary">Control Account</Badge>}
                            </TableCell>
                            <TableCell>{account.accountType}</TableCell>
                             <TableCell>
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/dashboard/admin/chart-of-accounts/${account.accountId}`}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Ledger
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                        {account.children.map(child => (
                            <TableRow key={child.accountId}>
                                <TableCell className="pl-8">{child.accountCode}</TableCell>
                                <TableCell>{child.accountName}</TableCell>
                                <TableCell>{child.accountType}</TableCell>
                                 <TableCell>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/dashboard/admin/chart-of-accounts/${child.accountId}`}>
                                           <Eye className="h-4 w-4 mr-2" />
                                           View Ledger
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
