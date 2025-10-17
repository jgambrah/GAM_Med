
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
import { format } from 'date-fns';
import { RequestForQuotation, PurchaseOrder } from '@/lib/types';
import { CreateRfqDialog } from './create-rfq-dialog';
import { ManageQuotesDialog } from './manage-quotes-dialog';
import { RfqDetailDialog } from './rfq-detail-dialog'; // Import the new component

interface RfqDashboardProps {
  rfqs: RequestForQuotation[];
  setRfqs: React.Dispatch<React.SetStateAction<RequestForQuotation[]>>;
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
}

export function RfqDashboard({ rfqs, setRfqs, setPurchaseOrders }: RfqDashboardProps) {
  const [selectedRfq, setSelectedRfq] = React.useState<RequestForQuotation | null>(null);
  const [dialogType, setDialogType] = React.useState<'manage' | 'detail' | null>(null);


  const handleRfqCreated = (newRfq: RequestForQuotation) => {
    setRfqs(prev => [newRfq, ...prev]);
  };
  
  const handleQuoteAwarded = (rfqId: string, po: PurchaseOrder) => {
    setPurchaseOrders(prev => [po, ...prev]);
    setRfqs(prev => prev.map(r => r.rfqId === rfqId ? { ...r, status: 'Closed' } : r));
    setSelectedRfq(null);
    setDialogType(null);
  }

  const handleUpdateQuotes = (rfqId: string, updatedQuotes: RequestForQuotation['quotes']) => {
      setRfqs(prev => prev.map(r => r.rfqId === rfqId ? {...r, quotes: updatedQuotes} : r));
  };
  
  const openDialog = (rfq: RequestForQuotation, type: 'manage' | 'detail') => {
    setSelectedRfq(rfq);
    setDialogType(type);
  }

  const closeDialogs = () => {
    setSelectedRfq(null);
    setDialogType(null);
  }


  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Requests for Quotation (RFQ)</CardTitle>
            <CardDescription>
              Manage bids from suppliers for required items.
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
                {(rfqs || []).map((rfq) => (
                  <TableRow key={rfq.rfqId}>
                    <TableCell className="font-medium">{rfq.rfqId}</TableCell>
                    <TableCell>{rfq.title}</TableCell>
                    <TableCell>{format(new Date(rfq.deadline), 'PPP')}</TableCell>
                    <TableCell>{rfq.quotes?.length || 0}</TableCell>
                    <TableCell><Badge variant={rfq.status === 'Open for Bids' ? 'default' : 'secondary'}>{rfq.status}</Badge></TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button variant="outline" size="sm" onClick={() => openDialog(rfq, 'detail')}>
                          View RFQ
                       </Button>
                      <Button variant="outline" size="sm" onClick={() => openDialog(rfq, 'manage')}>
                        Manage Quotes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {selectedRfq && (
        <>
            <ManageQuotesDialog
            rfq={selectedRfq}
            isOpen={dialogType === 'manage'}
            onOpenChange={closeDialogs}
            onQuoteUpdate={handleUpdateQuotes}
            onQuoteAwarded={handleQuoteAwarded}
            />
            <RfqDetailDialog
                rfq={selectedRfq}
                isOpen={dialogType === 'detail'}
                onOpenChange={closeDialogs}
            />
        </>
      )}
    </>
  );
}
