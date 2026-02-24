
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { mockRadiologyOrders, allPatients, allUsers } from '@/lib/data';
import Link from 'next/link';

// NOTE: This component is now deprecated in favor of the full /dashboard/radiology page.
// It is kept here for reference but should be removed in a future iteration.

export function RadiologyDashboard() {
  const pendingOrders = mockRadiologyOrders.filter(o => o.status === 'Pending' || o.status === 'Pending Scheduling');

  const getPatientName = (patientId: string) => {
    return allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';
  }

  const getDoctorName = (doctorId: string) => {
    return allUsers.find(u => u.uid === doctorId)?.name || 'Unknown Doctor';
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
          {pendingOrders.length > 0 ? (
            pendingOrders.map(order => (
              <TableRow key={order.orderId}>
                <TableCell className="font-medium">{format(new Date(order.dateOrdered), 'PPP')}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/patients/${order.patientId}`} className="hover:underline text-primary">
                    {getPatientName(order.patientId)}
                  </Link>
                </TableCell>
                <TableCell>{getDoctorName(order.doctorId)}</TableCell>
                <TableCell>{order.modality}</TableCell>
                <TableCell>
                    <Button variant="outline" size="sm" disabled>Schedule (Moved)</Button>
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
