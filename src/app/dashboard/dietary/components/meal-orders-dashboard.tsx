
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { mockMealOrders, allPatients } from '@/lib/data';
import { MealOrder } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const getStatusVariant = (status: MealOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Ordered':
      return 'default';
    case 'Preparing':
      return 'outline';
    case 'Delivered':
      return 'secondary';
    case 'Canceled':
      return 'destructive';
    default:
      return 'outline';
  }
};

export function MealOrdersDashboard() {
  const [orders, setOrders] = React.useState<MealOrder[]>(mockMealOrders);

  const handleUpdateStatus = (orderId: string, newStatus: MealOrder['status']) => {
    // In a real app, this would call the 'updateMealStatus' Cloud Function.
    setOrders(prev =>
      prev.map(order => (order.mealOrderId === orderId ? { ...order, status: newStatus } : order))
    );
  };

  const getPatientName = (patientId: string) => {
    return allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Time</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Meal Type</TableHead>
            <TableHead>Dietary Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length > 0 ? (
            orders.sort((a,b) => new Date(b.orderDateTime).getTime() - new Date(a.orderDateTime).getTime()).map(order => (
              <TableRow key={order.mealOrderId}>
                <TableCell className="font-medium">{format(new Date(order.orderDateTime), 'p')}</TableCell>
                <TableCell>
                    <Link href={`/dashboard/patients/${order.patientId}`} className="hover:underline text-primary">
                        {getPatientName(order.patientId)}
                    </Link>
                </TableCell>
                <TableCell>{order.mealType}</TableCell>
                <TableCell>{order.dietaryPlan}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                    {order.status === 'Ordered' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(order.mealOrderId, 'Preparing')}>
                            Start Preparing
                        </Button>
                    )}
                     {order.status === 'Preparing' && (
                        <Button size="sm" onClick={() => handleUpdateStatus(order.mealOrderId, 'Delivered')}>
                            Mark as Delivered
                        </Button>
                    )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No meal orders found for today.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
