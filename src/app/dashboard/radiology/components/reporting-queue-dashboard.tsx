
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
import { format } from 'date-fns';
import Link from 'next/link';
import { mockRadiologyOrders, allPatients } from '@/lib/data';
import { CreateReportDialog } from './create-report-dialog';
import { RadiologyOrder } from '@/lib/types';

export function ReportingQueueDashboard() {
  const [orders, setOrders] = React.useState<RadiologyOrder[]>(
    mockRadiologyOrders.filter(o => o.status === 'Awaiting Report')
  );

  const getPatientName = (patientId: string) => {
    return allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';
  };

  const handleReportSubmitted = () => {
    // In a real app with real-time data, this would update automatically.
    // For the prototype, we just refilter the list to remove the completed one.
    setOrders(prev => prev.filter(o => o.status !== 'Awaiting Report'));
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Study Date</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Requested Studies</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length > 0 ? (
            orders.map(order => (
              <TableRow key={order.orderId}>
                <TableCell className="font-medium">{format(new Date(order.scheduledDateTime!), 'PPP p')}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/patients/${order.patientId}`} className="hover:underline text-primary">
                    {getPatientName(order.patientId)}
                  </Link>
                </TableCell>
                <TableCell>{order.studyIds.join(', ')}</TableCell>
                <TableCell>
                    <CreateReportDialog order={order} onReportSubmitted={handleReportSubmitted} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No studies are awaiting a report.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
