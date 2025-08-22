
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Invoice, InvoiceLineItem } from '@/lib/types';
import { format } from 'date-fns';
import Link from 'next/link';

interface InvoiceDetailDialogProps {
  invoice: Invoice;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const getStatusVariant = (status: Invoice['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Paid': return 'secondary';
        case 'Pending Payment': return 'default';
        case 'Overdue': return 'destructive';
        default: return 'outline';
    }
}

export function InvoiceDetailDialog({ invoice, isOpen, onOpenChange }: InvoiceDetailDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Invoice Details: {invoice.invoiceId}</DialogTitle>
          <DialogDescription>
            An audit trail of all items billed on this invoice for {invoice.patientName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-bold">{invoice.patientName}</p>
                    <p className="text-sm text-muted-foreground">Patient ID: {invoice.patientId}</p>
                </div>
                <div>
                     <p className="text-sm text-muted-foreground">Issued: {format(new Date(invoice.issueDate), 'PPP')}</p>
                     <p className="text-sm text-muted-foreground">Due: {format(new Date(invoice.dueDate), 'PPP')}</p>
                </div>
                 <div className="text-right">
                    <p className="text-2xl font-bold">₵{invoice.totalAmount.toFixed(2)}</p>
                    <Badge variant={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                </div>
            </div>

             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Service/Item</TableHead>
                            <TableHead>Billing Code</TableHead>
                            <TableHead>Linked Service ID</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoice.billedItems.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{item.serviceType}</TableCell>
                                <TableCell>{item.billingCode}</TableCell>
                                <TableCell>
                                    <Button variant="link" asChild className="p-0 h-auto">
                                        {/* This provides a link back to the patient's full record for auditing */}
                                        <Link href={`/dashboard/patients/${invoice.patientId}`}>
                                            {item.linkedServiceId}
                                        </Link>
                                    </Button>
                                </TableCell>
                                <TableCell className="text-right">₵{item.price.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
