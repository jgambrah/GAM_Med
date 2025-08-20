
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
import { mockWaitingList, allPatients } from '@/lib/data';
import { WaitingListEntry } from '@/lib/types';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const getPriorityVariant = (priority: WaitingListEntry['priority']): "destructive" | "default" | "secondary" => {
    switch (priority) {
        case 'Urgent': return 'destructive';
        case 'Routine': return 'default';
        default: return 'secondary';
    }
}

export function WaitingListsTable() {
  const [waitingList, setWaitingList] = React.useState<WaitingListEntry[]>(mockWaitingList);
  const [priorityFilter, setPriorityFilter] = React.useState('All');
  const [statusFilter, setStatusFilter] = React.useState('Active');
  
  React.useEffect(() => {
    let filteredList = mockWaitingList;

    if (priorityFilter !== 'All') {
        filteredList = filteredList.filter(item => item.priority === priorityFilter);
    }
    if (statusFilter !== 'All') {
        filteredList = filteredList.filter(item => item.status === statusFilter);
    }

    setWaitingList(filteredList);

  }, [priorityFilter, statusFilter]);

  const handleSchedule = (waitingListId: string) => {
    // In a real application, this would open a scheduling dialog (like NewAppointmentDialog)
    // pre-filled with the patient's information and the requested service.
    alert(`Simulating scheduling for waiting list item ${waitingListId}.`);
  };

  const getPatientName = (patientId: string) => {
    return allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';
  }

  return (
    <div className="space-y-4">
        <div className="flex items-center gap-4">
             <div className="w-full sm:w-[200px]">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Priorities</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                        <SelectItem value="Routine">Routine</SelectItem>
                        <SelectItem value="Elective">Elective</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="w-full sm:w-[200px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Statuses</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Canceled">Canceled</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div className="rounded-md border">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Date Added</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Requested Service</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {waitingList.length > 0 ? (
                waitingList.map((item) => (
                <TableRow key={item.waitinglistId}>
                    <TableCell className="font-medium">
                    {format(new Date(item.dateAdded), 'PPP')}
                    </TableCell>
                    <TableCell>
                        <Link href={`/dashboard/patients/${item.patientId}`} className="hover:underline text-primary">
                            {getPatientName(item.patientId)}
                        </Link>
                    </TableCell>
                    <TableCell>{item.requestedService}</TableCell>
                    <TableCell>
                    <Badge variant={getPriorityVariant(item.priority)}>
                        {item.priority}
                    </Badge>
                    </TableCell>
                     <TableCell>
                      <Badge variant={item.status === 'Active' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                    <Button 
                        size="sm"
                        onClick={() => handleSchedule(item.waitinglistId)}
                        disabled={item.status !== 'Active'}
                    >
                        <Clock className="h-4 w-4 mr-2" />
                        Schedule
                    </Button>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                    No patients match the current filters.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
        </div>
    </div>
  );
}
