
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { mockInvoices, mockClaims, mockPayments, mockLedgerAccounts, mockLedgerEntries } from '@/lib/data';
import { Invoice, Claim, FinancialTransaction, LedgerAccount, LedgerEntry } from '@/lib/types';
import Link from 'next/link';
import { InvoiceDetailDialog } from './invoice-detail-dialog';
import { ClaimDetailDialog } from './claim-detail-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { LogPaymentSchema } from '@/lib/schemas';
import { toast } from '@/hooks/use-toast';
import { logPayment } from '@/lib/actions';
import { LedgerPostingDialog } from './ledger-posting-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useAuth } from '@/hooks/use-auth';


const getInvoiceStatusVariant = (status: Invoice['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Paid': return 'secondary';
        case 'Pending Payment': return 'default';
        case 'Overdue': return 'destructive';
        default: return 'outline';
    }
}

const getClaimStatusVariant = (status: Claim['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Paid': return 'secondary';
        case 'Submitted': return 'default';
        case 'Denied': return 'destructive';
        default: return 'outline';
    }
}

function InvoiceManagementTab() {
    const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
    
    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice ID</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Date Issued</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockInvoices.map((invoice) => (
                            <TableRow key={invoice.invoiceId}>
                                <TableCell className="font-medium">{invoice.invoiceId}</TableCell>
                                <TableCell>
                                    <Link href={`/dashboard/patients/${invoice.patientId}`} className="hover:underline text-primary">
                                        {invoice.patientName}
                                    </Link>
                                </TableCell>
                                <TableCell>{format(new Date(invoice.issueDate), 'PPP')}</TableCell>
                                <TableCell>₵{invoice.grandTotal.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Badge variant={getInvoiceStatusVariant(invoice.status)}>{invoice.status}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(invoice)}>View</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            {selectedInvoice && (
                <InvoiceDetailDialog 
                    invoice={selectedInvoice}
                    isOpen={!!selectedInvoice}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setSelectedInvoice(null);
                        }
                    }}
                />
            )}
        </>
    );
}

function ClaimsTrackingTab() {
    const [selectedClaim, setSelectedClaim] = React.useState<Claim | null>(null);
    const [statusFilter, setStatusFilter] = React.useState('All');
    const [providerFilter, setProviderFilter] = React.useState('All');
    
    const uniqueProviders = ['All', ...Array.from(new Set(mockClaims.map(c => c.providerId)))];
    const claimStatuses: (Claim['status'] | 'All')[] = ['All', 'Paid', 'Submitted', 'Denied'];

    const filteredClaims = React.useMemo(() => {
        return mockClaims.filter(claim => {
            const statusMatch = statusFilter === 'All' || claim.status === statusFilter;
            const providerMatch = providerFilter === 'All' || claim.providerId === providerFilter;
            return statusMatch && providerMatch;
        });
    }, [statusFilter, providerFilter]);


    return (
        <>
            <div className="flex items-center gap-4 mb-4">
                <div className="w-full sm:w-[200px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by status..." />
                        </SelectTrigger>
                        <SelectContent>
                            {claimStatuses.map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="w-full sm:w-[200px]">
                    <Select value={providerFilter} onValueChange={setProviderFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by provider..." />
                        </SelectTrigger>
                        <SelectContent>
                            {uniqueProviders.map(provider => (
                                <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Claim ID</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>Submission Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClaims.map((claim) => (
                            <TableRow key={claim.claimId}>
                                <TableCell className="font-medium">{claim.claimId}</TableCell>
                                <TableCell>
                                    <Link href={`/dashboard/patients/${claim.patientId}`} className="hover:underline text-primary">
                                        {claim.patientName}
                                    </Link>
                                </TableCell>
                                <TableCell>{claim.providerId}</TableCell>
                                <TableCell>{format(new Date(claim.submissionDate), 'PPP')}</TableCell>
                                <TableCell>
                                    <Badge variant={getClaimStatusVariant(claim.status)}>{claim.status}</Badge>
                                </TableCell>
                                <TableCell>₵{claim.payoutAmount?.toFixed(2) || 'N/A'}</TableCell>
                                <TableCell>
                                    <Button variant="outline" size="sm" onClick={() => setSelectedClaim(claim)}>Review Claim</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
             {selectedClaim && (
                <ClaimDetailDialog 
                    claim={selectedClaim}
                    isOpen={!!selectedClaim}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setSelectedClaim(null);
                        }
                    }}
                />
            )}
        </>
    );
}

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

function PaymentReconciliationTab() {
    const { user } = useAuth();
    const [postingInfo, setPostingInfo] = React.useState<{ amount: number; description: string } | null>(null);
    const [accounts, setAccounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);
    const [entries, setEntries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', mockLedgerEntries);

    const form = useForm<z.infer<typeof LogPaymentSchema>>({
        resolver: zodResolver(LogPaymentSchema),
        defaultValues: {
            invoiceId: '',
            amount: 0,
            paymentMethod: 'Cash',
        },
    });

    const unpaidInvoices = mockInvoices
        .filter(inv => inv.status === 'Pending Payment' || inv.status === 'Overdue')
        .map(inv => ({
            value: inv.invoiceId,
            label: `${inv.invoiceId} - ${inv.patientName} (Due: ₵${inv.amountDue.toFixed(2)})`
        }));
    
    const selectedInvoiceId = form.watch('invoiceId');

    React.useEffect(() => {
        if (selectedInvoiceId) {
            const invoice = mockInvoices.find(inv => inv.invoiceId === selectedInvoiceId);
            if (invoice) {
                form.setValue('amount', invoice.amountDue);
            }
        }
    }, [selectedInvoiceId, form]);

    const handlePostToLedger = async (values: z.infer<typeof PostingSchema>) => {
        const { debitAccountId, creditAccountId, amount, paymentMethod, chequeNumber } = values;

        if (amount <= 0) {
            toast.success("Zero-amount transaction skipped.");
            return;
        }

        try {
            const now = new Date().toISOString();

            const debitAccount = accounts.find(a => a.accountId === debitAccountId);
            const creditAccount = accounts.find(a => a.accountId === creditAccountId);

            if (!debitAccount || !creditAccount) {
                toast.error("One or more accounts not found for ledger posting.");
                return;
            }
            
            let finalDescription = values.description;
            if (paymentMethod === 'Cheque' && chequeNumber) {
                finalDescription = `${finalDescription} (Cheque No: ${chequeNumber})`;
            } else if (paymentMethod === 'Bank Transfer') {
                finalDescription = `${finalDescription} (Bank Transfer)`;
            }

            const newDebitEntry: LedgerEntry = { hospitalId: user?.hospitalId || 'hosp-1', entryId: `entry-${Date.now()}-dr`, accountId: debitAccountId, date: now, description: finalDescription, debit: amount };
            const newCreditEntry: LedgerEntry = { hospitalId: user?.hospitalId || 'hosp-1', entryId: `entry-${Date.now()}-cr`, accountId: creditAccountId, date: now, description: finalDescription, credit: amount };
            
            setEntries(prev => [...prev, newDebitEntry, newCreditEntry]);

            setAccounts(prev => prev.map(acc => {
                let balanceChange = 0;
                if (acc.accountId === debitAccountId) {
                    const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                    balanceChange = isDebitType ? amount : -amount;
                } else if (acc.accountId === creditAccountId) {
                    const isDebitType = ['Asset', 'Expense'].includes(acc.accountType);
                    balanceChange = isDebitType ? -amount : amount;
                }
                return balanceChange !== 0 ? { ...acc, balance: acc.balance + balanceChange } : acc;
            }));
            
            toast.success("Transaction Posted", { description: `${finalDescription} for ₵${amount.toFixed(2)}` });
        } catch (e) {
            console.error(e);
            toast.error("Failed to post transaction.", { description: 'An unknown error occurred.' });
        }
    };

    const onSubmit = async (values: z.infer<typeof LogPaymentSchema>) => {
        const result = await logPayment(values);
        if (result.success) {
            toast.success(`Payment of ₵${values.amount} for invoice ${values.invoiceId} has been logged.`);
            form.reset();
            setPostingInfo({
                amount: values.amount,
                description: `Payment for Invoice ${values.invoiceId}`
            });
        } else {
            toast.error(result.message || 'Failed to log payment.');
        }
    }

    return (
        <>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Log New Payment</CardTitle>
                    <CardDescription>Manually record a payment received against an invoice. This will open the ledger posting tool.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-lg mx-auto">
                            <FormField
                                control={form.control}
                                name="invoiceId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unpaid Invoice</FormLabel>
                                        <Combobox
                                            options={unpaidInvoices}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Search for an unpaid invoice..."
                                            searchPlaceholder='Search invoices...'
                                            notFoundText='No unpaid invoices found.'
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                 <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Amount Paid</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
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
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a method" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Cash">Cash</SelectItem>
                                                    <SelectItem value="Credit Card">Credit Card (In-Person)</SelectItem>
                                                    <SelectItem value="Mobile Money">Mobile Money (In-Person)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? 'Logging...' : 'Log Payment & Post to Ledger'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Transaction ID</TableHead>
                                    <TableHead>Invoice ID</TableHead>
                                    <TableHead>Payment Date</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mockPayments.map((payment) => (
                                    <TableRow key={payment.transactionId}>
                                        <TableCell className="font-medium">{payment.transactionId}</TableCell>
                                        <TableCell>{payment.invoiceId}</TableCell>
                                        <TableCell>{format(new Date(payment.paymentDate), 'PPP')}</TableCell>
                                        <TableCell>{payment.paymentMethod}</TableCell>
                                        <TableCell>₵{payment.amount.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
        {postingInfo && (
            <LedgerPostingDialog 
                isOpen={!!postingInfo}
                onPost={handlePostToLedger}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setPostingInfo(null);
                    }
                }}
                amount={postingInfo.amount}
                description={postingInfo.description}
                defaultDebit="1010" // Cash and Bank
                defaultCredit="1020" // Accounts Receivable
            />
        )}
        </>
    );
}


export function BillingDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts Receivable</CardTitle>
        <CardDescription>
          A high-level overview of the hospital's financial status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="invoices">
            <TabsList>
                <TabsTrigger value="invoices">Invoice Management</TabsTrigger>
                <TabsTrigger value="claims">Claims Tracking</TabsTrigger>
                <TabsTrigger value="reconciliation">Payment Reconciliation</TabsTrigger>
            </TabsList>
            <TabsContent value="invoices" className="mt-4">
                <InvoiceManagementTab />
            </TabsContent>
             <TabsContent value="claims" className="mt-4">
                <ClaimsTrackingTab />
            </TabsContent>
             <TabsContent value="reconciliation" className="mt-4">
                <PaymentReconciliationTab />
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
