
'use client';

import * as React from 'react';
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
import { mockInvoices, mockClaims, mockPayments } from '@/lib/data';
import { Invoice, Claim, FinancialTransaction } from '@/lib/types';
import Link from 'next/link';

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
    return (
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
                            <TableCell>₵{invoice.totalAmount.toFixed(2)}</TableCell>
                            <TableCell>
                                <Badge variant={getInvoiceStatusVariant(invoice.status)}>{invoice.status}</Badge>
                            </TableCell>
                            <TableCell>
                                <Button variant="outline" size="sm">View</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function ClaimsTrackingTab() {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Claim ID</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Submission Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mockClaims.map((claim) => (
                        <TableRow key={claim.claimId}>
                            <TableCell className="font-medium">{claim.claimId}</TableCell>
                            <TableCell>
                                <Link href={`/dashboard/patients/${claim.patientId}`} className="hover:underline text-primary">
                                    {claim.patientName}
                                </Link>
                            </TableCell>
                             <TableCell>{claim.invoiceId}</TableCell>
                            <TableCell>{format(new Date(claim.submissionDate), 'PPP')}</TableCell>
                            <TableCell>
                                <Badge variant={getClaimStatusVariant(claim.status)}>{claim.status}</Badge>
                            </TableCell>
                            <TableCell>
                                <Button variant="outline" size="sm">Review</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function PaymentReconciliationTab() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Log New Payment</CardTitle>
                    <CardDescription>Manually record a payment against an invoice.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Payment logging form will be available here.</p>
                         <Button className="mt-4" disabled>Log Payment</Button>
                    </div>
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
                                    <TableRow key={payment.paymentId}>
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
    );
}


export function BillingDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Financials</CardTitle>
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
