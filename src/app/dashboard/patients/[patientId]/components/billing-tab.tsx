
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { GenerateInvoiceDialog } from './generate-invoice-dialog';
import { useAuth } from '@/hooks/use-auth';

interface BillingTabProps {
    patientId: string;
}

const mockInvoices = [
    {
        id: 'INV-001',
        date: new Date('2024-07-29T18:00:00Z'),
        description: 'Admission & Initial Consultation',
        amount: 250.00,
        status: 'Paid',
    },
    {
        id: 'INV-002',
        date: new Date('2024-07-30T18:00:00Z'),
        description: 'Lab Tests (Full Blood Count)',
        amount: 150.00,
        status: 'Paid',
    },
    {
        id: 'INV-003',
        date: new Date('2024-07-31T18:00:00Z'),
        description: 'Medication (Amlodipine)',
        amount: 75.50,
        status: 'Pending',
    }
];

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'Paid': return 'secondary';
        case 'Pending': return 'default';
        case 'Overdue': return 'destructive';
        default: return 'secondary';
    }
}

export function BillingTab({ patientId }: BillingTabProps) {
    const { user } = useAuth();
    const canGenerateInvoice = user?.role === 'admin' || user?.role === 'billing_clerk';

    const totalBilled = mockInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = mockInvoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
    const outstandingBalance = totalBilled - totalPaid;
    
    const handlePayNow = (invoiceId: string) => {
        alert(`Simulating payment for Invoice ${invoiceId}.\n\nIn a real application, this would redirect to a secure payment gateway. Upon successful payment, a 'payment' document would be created in Firestore, triggering the 'reconcilePayment' Cloud Function to update this invoice's status to 'Paid'.`);
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Billing & Invoices</CardTitle>
                        <CardDescription>A history of all financial transactions and invoices.</CardDescription>
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
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount (GHS)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mockInvoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.id}</TableCell>
                                        <TableCell>{format(invoice.date, 'PPP')}</TableCell>
                                        <TableCell>{invoice.description}</TableCell>
                                        <TableCell className="text-right">{invoice.amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(invoice.status === 'Pending' || invoice.status === 'Overdue') && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePayNow(invoice.id)}
                                                >
                                                    Pay Now
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
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
        </div>
    );
}
