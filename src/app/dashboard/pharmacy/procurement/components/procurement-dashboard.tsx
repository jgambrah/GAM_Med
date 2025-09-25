
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
import { PurchaseOrder } from '@/lib/types';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { CreateOrderDialog } from './create-order-dialog';
import { ReceiveOrderDialog } from './receive-order-dialog';
import { mockPurchaseOrders, mockSuppliers } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';

const getStatusVariant = (status: PurchaseOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Submitted': return 'default';
        case 'Received': return 'secondary';
        default: return 'outline';
    }
};

export function ProcurementDashboard() {
  const [orders, setOrders] = useLocalStorage<PurchaseOrder[]>('purchaseOrders', mockPurchaseOrders);

  const handleOrderCreated = (newOrder: PurchaseOrder) => {
    setOrders(prev => [newOrder, ...prev]);
  };
  
  const handleOrderReceived = (orderId: string) => {
      setOrders(prev => prev.map(order => 
          order.poId === orderId ? { ...order, status: 'Received' } : order
      ));
  }

  const getSupplierName = (supplierId: string) => {
    return mockSuppliers.find(s => s.supplierId === supplierId)?.name || 'Unknown';
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Purchase Orders</CardTitle>
            <CardDescription>
                Manage purchase orders for medications and supplies.
            </CardDescription>
        </div>
        <CreateOrderDialog onOrderCreated={handleOrderCreated} />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date Ordered</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.poId}>
                  <TableCell className="font-medium">{order.poId}</TableCell>
                  <TableCell>{format(new Date(order.dateOrdered), 'PPP')}</TableCell>
                  <TableCell>{getSupplierName(order.supplierId)}</TableCell>
                  <TableCell className="text-right font-mono">₵{order.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ReceiveOrderDialog order={order} onOrderReceived={handleOrderReceived} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
