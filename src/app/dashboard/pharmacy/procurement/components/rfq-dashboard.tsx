
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
import { RequestForQuotation } from '@/lib/types';
import { format } from 'date-fns';
import { CreateRfqDialog } from './create-rfq-dialog';
import { ManageQuotesDialog } from './manage-quotes-dialog';

// Mock data for RFQs
const mockRfqs: RequestForQuotation[] = [
    {
        rfqId: 'RFQ-001',
        title: 'Quarterly Resupply of Painkillers',
        dateCreated: new Date('2024-08-10T00:00:00Z').toISOString(),
        deadline: new Date('2024-08-25T00:00:00Z').toISOString(),
        status: 'Evaluating',
        items: [
            { itemId: 'PARA1G', name: 'Paracetamol 1g', quantity: 200 },
        ],
        quotes: [
            { quoteId: 'Q-001A', supplierId: 'SUP-001', supplierName: 'PharmaSupply Ltd.', totalAmount: 3800.00, status: 'Submitted', dateSubmitted: new Date('2024-08-15T00:00:00Z').toISOString() },
            { quoteId: 'Q-001B', supplierId: 'SUP-003', supplierName: 'General Medical Supplies', totalAmount: 3650.00, status: 'Submitted', dateSubmitted: new Date('2024-08-16T00:00:00Z').toISOString() }
        ]
    },
    {
        rfqId: 'RFQ-002',
        title: 'Urgent Need for Antibiotics',
        dateCreated: new Date('2024-08-15T00:00:00Z').toISOString(),
        deadline: new Date('2024-08-20T00:00:00Z').toISOString(),
        status: 'Open for Bids',
        items: [
            { itemId: 'AMX500', name: 'Amoxicillin 500mg', quantity: 500 },
        ],
        quotes: []
    }
];


const getStatusVariant = (status: RequestForQuotation['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Open for Bids': return 'default';
        case 'Evaluating': return 'outline';
        case 'Closed': return 'secondary';
        default: return 'outline';
    }
};

export function RfqDashboard() {
  const [rfqs, setRfqs] = React.useState<RequestForQuotation[]>(mockRfqs);
  const [selectedRfq, setSelectedRfq] = React.useState<RequestForQuotation | null>(null);

  const handleRfqCreated = (newRfq: RequestForQuotation) => {
    setRfqs(prev => [newRfq, ...prev]);
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
        />
    )}
    </>
  );
}
