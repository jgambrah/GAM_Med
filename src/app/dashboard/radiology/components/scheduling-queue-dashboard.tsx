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
import { format } from 'date-fns';
import { mockRadiologyOrders, allPatients, allUsers } from '@/lib/data';
import Link from 'next/link';
import { ScheduleStudyDialog } from './schedule-study-dialog';
import { RadiologyOrder } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function SchedulingQueueDashboard() {
  const [orders, setOrders] = useLocalStorage<RadiologyOrder[]>(
    'radiologyOrders',
    mockRadiologyOrders
  );
  
  const pendingSchedulingOrders = orders.filter(o => o.status === 'Pending Scheduling');

  const getPatientName = (patientId: string) => {
    return allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';
  }

  const getDoctorName = (doctorId: string) => {
    return allUsers.find(u => u.uid === doctorId)?.name || 'Unknown Doctor';
  }

  const handleScheduled = (orderId: string) => {
      // In a real app, this would be handled by a real-time subscription.
      // For this prototype, we manually update the status.
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: 'Scheduled' } : o));
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date Ordered</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Ordering Doctor</TableHead>
            <TableHead>Requested Studies</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingSchedulingOrders.length > 0 ? (
            pendingSchedulingOrders.map(order => (
              <TableRow key={order.orderId}>
                <TableCell className="font-medium">{format(new Date(order.dateOrdered), 'PPP')}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/patients/${order.patientId}`} className="hover:underline text-primary">
                    {getPatientName(order.patientId)}
                  </Link>
                </TableCell>
                <TableCell>{getDoctorName(order.doctorId)}</TableCell>
                <TableCell>{order.studyIds.join(', ')}</TableCell>
                <TableCell>
                    <ScheduleStudyDialog order={order} onScheduled={() => handleScheduled(order.orderId)} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No radiology orders are pending scheduling.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

    
