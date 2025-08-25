
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { GenerateInvoiceDialog } from './generate-invoice-dialog';
import { useAuth } from '@/hooks/use-auth';
import { mockInvoices as allMockInvoices, mockPayments } from '@/lib/data';
import { Invoice, Receipt } from '@/lib/types';
import { PaymentDialog } from './payment-dialog';
import { Download, FileText } from 'lucide-react';
import Link from 'next/link';

interface BillingTabProps {
    patientId: string;
}


const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'Paid': return 'secondary';
        case 'Pending Payment': return 'default';
        case 'Overdue': return 'destructive';
        default: return 'secondary';
    }
}

export function BillingTab({ patientId }: BillingTabProps) {
    const { user } = useAuth();
    const canGenerateInvoice = user?.role === 'admin' || user?.role === 'billing_clerk';

    const mockInvoices = allMockInvoices.filter(i => i.patientId === patientId);
    const patientPayments = mockPayments.filter(p => mockInvoices.some(i => i.invoiceId === p.invoiceId));


    const totalBilled = mockInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = mockPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const outstandingBalance = totalBilled - totalPaid;
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Invoices</CardTitle>
                        <CardDescription>A history of all invoices issued to this patient.</CardDescription>
                    </div>
                    {canGenerateInvoice && <GenerateInvoiceDialog patientId={patientId} />}
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Total Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mockInvoices.length > 0 ? (
                                    mockInvoices.map((invoice) => (
                                        <TableRow key={invoice.invoiceId}>
                                            <TableCell className="font-medium">{invoice.invoiceId}</TableCell>
                                            <TableCell>{format(new Date(invoice.issueDate), 'PPP')}</TableCell>
                                            <TableCell>₵{invoice.totalAmount.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                {invoice.invoicePdfUrl && (
                                                    <Button asChild variant="outline" size="sm">
                                                        <a href={invoice.invoicePdfUrl} target="_blank" rel="noopener noreferrer">
                                                            <FileText className="h-3 w-3 mr-2" />
                                                            View PDF
                                                        </a>
                                                    </Button>
                                                )}
                                                {(invoice.status === 'Pending Payment' || invoice.status === 'Overdue') && (
                                                    <PaymentDialog invoice={invoice} />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No invoices found for this patient.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Account Summary</CardTitle>
                </CardHeader>
                 <CardContent className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
                        <p className="text-2xl font-bold">₵{totalBilled.toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                        <p className="text-2xl font-bold text-green-600">₵{totalPaid.toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                        <p className={`text-2xl font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₵{outstandingBalance.toFixed(2)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>A log of all payments and generated receipts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Payment Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Invoice ID</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mockInvoices.flatMap(inv => inv.receipts || []).length > 0 ? (
                                    mockInvoices.flatMap(inv => inv.receipts?.map(receipt => ({...receipt, invoiceId: inv.invoiceId })) || []).map((receipt) => (
                                        <TableRow key={receipt.receiptId}>
                                            <TableCell>{format(new Date(receipt.dateIssued), 'PPP')}</TableCell>
                                            <TableCell>₵{receipt.amountPaid.toFixed(2)}</TableCell>
                                            <TableCell>
                                                {mockPayments.find(p => p.paymentId === receipt.paymentId)?.paymentMethod || 'N/A'}
                                            </TableCell>
                                            <TableCell>{receipt.invoiceId}</TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="outline" size="sm">
                                                    <a href={receipt.documentLink} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-3 w-3 mr-2" />
                                                        Download Receipt
                                                    </a>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No payment history found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
