
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Appointment } from '@/lib/types';
import { format } from 'date-fns';

interface AppointmentDetailDialogProps {
  appointment: Appointment;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AppointmentDetailDialog({ appointment, isOpen, onOpenChange }: AppointmentDetailDialogProps) {
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            {format(new Date(appointment.appointment_date), 'eeee, MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p><strong>Time:</strong> {format(new Date(appointment.appointment_date), 'p')}</p>
          <p><strong>Patient:</strong> {appointment.patient_name}</p>
          <p><strong>Doctor:</strong> {appointment.doctor_name}</p>
          <p><strong>Department:</strong> {appointment.department}</p>
          <p><strong>Type:</strong> <span className="capitalize">{appointment.type}</span></p>
          <p><strong>Status:</strong> <Badge>{appointment.status}</Badge></p>
          <p><strong>Notes:</strong> {appointment.notes || 'N/A'}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
