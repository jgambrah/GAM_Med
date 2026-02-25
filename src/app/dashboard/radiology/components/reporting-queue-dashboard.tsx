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
import { mockRadiologyOrders } from '@/lib/data';
import { CreateReportDialog } from './create-report-dialog';
import { Patient, RadiologyOrder } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useAuth } from '@/hooks/use-auth';

interface ReportingQueueDashboardProps {
  allPatients: Patient[];
}

export function ReportingQueueDashboard({ allPatients }: ReportingQueueDashboardProps) {
  const { user } = useAuth();
  const [storedOrders, setStoredOrders] = useLocalStorage<RadiologyOrder[]>(
    'radiologyOrders',
    mockRadiologyOrders
  );
  
  // SaaS LOGIC: filter by hospitalId first.
  const awaitingReportOrders = React.useMemo(() => {
    if (!user) return [];
    return storedOrders.filter(o => o.hospitalId === user.hospitalId && o.status === 'Awaiting Report');
  }, [storedOrders, user]);

  const getPatientName = (patientId: string) => {
    return allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';
  };

  const handleReportSubmitted = (orderId: string) => {
    setStoredOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: 'Completed', isReported: true } : o));
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Study Date</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Study Type</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {awaitingReportOrders.length > 0 ? (
            awaitingReportOrders.map(order => (
              <TableRow key={order.orderId}>
                <TableCell className="font-medium">{format(new Date(order.scheduledDateTime!), 'PPP p')}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/patients/${order.patientId}`} className="hover:underline text-primary">
                    {order.patientName || getPatientName(order.patientId)}
                  </Link>
                </TableCell>
                <TableCell>{order.test_name}</TableCell>
                <TableCell>
                    <CreateReportDialog order={order} onReportSubmitted={() => handleReportSubmitted(order.orderId)} />
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