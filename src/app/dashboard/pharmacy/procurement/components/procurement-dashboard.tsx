

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
import { PharmacyOrder } from '@/lib/types';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { CreateOrderDialog } from './create-order-dialog';

const mockOrders: PharmacyOrder[] = [
    {
        orderId: 'PO-001',
        dateOrdered: new Date('2024-08-10T10:00:00Z').toISOString(),
        status: 'Received',
        orderedByUserId: 'pharma1',
        supplierId: 'SUP-001',
        orderedItems: [{ itemId: 'AMX500', quantity: 100, unit_cost: 0.50 }]
    },
    {
        orderId: 'PO-002',
        dateOrdered: new Date('2024-08-15T14:30:00Z').toISOString(),
        status: 'Submitted',
        orderedByUserId: 'pharma1',
        supplierId: 'SUP-002',
        orderedItems: [{ itemId: 'GAUZE', quantity: 50, unit_cost: 10.00 }]
    }
];

const getStatusVariant = (status: PharmacyOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Submitted': return 'default';
        case 'Received': return 'secondary';
        case 'Draft': return 'outline';
        default: return 'outline';
    }
};

export function ProcurementDashboard() {
  const [orders, setOrders] = React.useState<PharmacyOrder[]>(mockOrders);

  const handleOrderCreated = (newOrder: PharmacyOrder) => {
    setOrders(prev => [newOrder, ...prev]);
  };

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
                <TableHead>Supplier ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell className="font-medium">{order.orderId}</TableCell>
                  <TableCell>{format(new Date(order.dateOrdered), 'PPP')}</TableCell>
                  <TableCell>{order.supplierId}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">View Details</Button>
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
