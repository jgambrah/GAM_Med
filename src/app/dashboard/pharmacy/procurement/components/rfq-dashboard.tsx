'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RequestForQuotation, PurchaseOrder } from '@/lib/types';
import { format } from 'date-fns';
import { CreateRfqDialog } from './create-rfq-dialog';
import { ManageQuotesDialog } from './manage-quotes-dialog';
import { toast } from '@/hooks/use-toast';

const getStatusVariant = (status: RequestForQuotation['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Open for Bids': return 'default';
        case 'Evaluating': return 'outline';
        case 'Closed': return 'secondary';
        default: return 'outline';
    }
};

interface RfqDashboardProps {
  rfqs: RequestForQuotation[];
  setRfqs: React.Dispatch<React.SetStateAction<RequestForQuotation[]>>;
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
}

export function RfqDashboard({ rfqs, setRfqs, setPurchaseOrders }: RfqDashboardProps) {
  const [selectedRfq, setSelectedRfq] = React.useState<RequestForQuotation | null>(null);

  const handleRfqCreated = (newRfq: RequestForQuotation) => {
    setRfqs(prev => [newRfq, ...prev]);
  };

  const handleAward = (rfqId: string, quoteId: string) => {
    const rfq = rfqs.find(r => r.rfqId === rfqId);
    const quote = rfq?.quotes?.find(q => q.quoteId === quoteId);

    if (!rfq || !quote) {
      toast.error('Could not find RFQ or Quote to award.');
      return;
    }

    // 1. Update the RFQ status
    setRfqs(prevRfqs => prevRfqs.map(r => 
      r.rfqId === rfqId ? { ...r, status: 'Closed' } : r
    ));

    // 2. Generate a Purchase Order
    const newOrder: PurchaseOrder = {
        poId: `PO-${Date.now()}`,
        dateOrdered: new Date().toISOString(),
        status: 'Submitted',
        orderedByUserId: 'pharma1', // Mocked user
        supplierId: quote.supplierId,
        orderedItems: (quote.items || rfq.items).map(item => ({
            itemId: item.itemId,
            name: item.name || '',
            quantity: item.quantity,
            unit_cost: item.unitPrice || 0,
        })),
        totalAmount: quote.totalAmount,
    };
    
    setPurchaseOrders(prevOrders => [newOrder, ...prevOrders]);

    toast.success(`Quote from ${quote.supplierName} awarded! Purchase Order ${newOrder.poId} created.`);
    setSelectedRfq(null); // Close the dialog
  };
  
  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Requests for Quotation (RFQ)</CardTitle>
            <CardDescription>
                Manage quotation requests and compare supplier bids.
            </CardDescription>
        </div>
        <CreateRfqDialog onRfqCreated={handleRfqCreated} />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Quotes Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfqs.map((rfq) => (
                <TableRow key={rfq.rfqId}>
                  <TableCell className="font-medium">{rfq.rfqId}</TableCell>
                  <TableCell>{rfq.title}</TableCell>
                  <TableCell>{format(new Date(rfq.deadline), 'PPP')}</TableCell>
                  <TableCell className="text-center">{rfq.quotes?.length || 0}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(rfq.status)}>{rfq.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedRfq(rfq)}>Manage Quotes</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    {selectedRfq && (
        <ManageQuotesDialog
            rfq={selectedRfq}
            isOpen={!!selectedRfq}
            onOpenChange={() => setSelectedRfq(null)}
            onAward={handleAward}
        />
    )}
    </>
  );
}
