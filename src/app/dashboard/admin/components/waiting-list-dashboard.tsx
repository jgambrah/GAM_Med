
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { mockWaitingList } from '@/lib/data';
import { WaitingListEntry } from '@/lib/types';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

const getPriorityVariant = (priority: WaitingListEntry['priority']): "destructive" | "default" | "secondary" => {
    switch (priority) {
        case 'Urgent': return 'destructive';
        case 'Routine': return 'default';
        default: return 'secondary';
    }
}

export function WaitingListDashboard() {
  const activeWaitingList = mockWaitingList.filter(item => item.status === 'Active');

  const handleSchedule = (waitingListId: string) => {
    // In a real application, this would open a scheduling dialog (like NewAppointmentDialog)
    // pre-filled with the patient's information and the requested service.
    alert(`Simulating scheduling for waiting list item ${waitingListId}.`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Waiting List</CardTitle>
        <CardDescription>
          A prioritized list of patients awaiting appointments or procedures.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Added</TableHead>
                <TableHead>Patient ID</TableHead>
                <TableHead>Requested Service</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeWaitingList.length > 0 ? (
                activeWaitingList.map((item) => (
                  <TableRow key={item.waitinglistId}>
                    <TableCell className="font-medium">
                      {format(new Date(item.dateAdded), 'PPP')}
                    </TableCell>
                    <TableCell>{item.patientId}</TableCell>
                    <TableCell>{item.requestedService}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityVariant(item.priority)}>
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm"
                        onClick={() => handleSchedule(item.waitinglistId)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Schedule
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No patients are currently on the waiting list.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
