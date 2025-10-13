
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { RadiologyOrder } from '@/lib/types';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { allPatients } from '@/lib/data';

interface ScheduleStudyDialogProps {
  order: RadiologyOrder;
  onScheduled: (orderId: string, scheduledDateTime: string) => void;
}

export function ScheduleStudyDialog({ order, onScheduled }: ScheduleStudyDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [dateTime, setDateTime] = React.useState('');

  const patientName = allPatients.find(p => p.patient_id === order.patientId)?.full_name || 'Unknown Patient';

  const handleSchedule = () => {
    if (!dateTime) {
      toast.error('Please select a date and time for the study.');
      return;
    }
    
    // In a real application, this would call a server action `scheduleImagingStudy(order.orderId, dateTime)`
    console.log(`Scheduling study for order ${order.orderId} at ${dateTime}`);
    toast.success('Study Scheduled', {
      description: `The imaging study for ${patientName} has been scheduled for ${format(new Date(dateTime), 'PPP p')}.`,
    });
    onScheduled(order.orderId, dateTime);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Imaging Study</DialogTitle>
          <DialogDescription>
            Select a date and time for {patientName}'s study: {order.studyIds.join(', ')}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="study-datetime">Appointment Date & Time</Label>
                <Input
                id="study-datetime"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                />
            </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={!dateTime}>
            Confirm Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
