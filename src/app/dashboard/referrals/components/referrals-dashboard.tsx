
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
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Referral } from '@/lib/types';
import { format } from 'date-fns';

const mockReferrals: Referral[] = [
  {
    referral_id: 'REF-001',
    referringProvider: 'Korle Bu Polyclinic',
    referralDate: new Date('2024-08-01T10:00:00Z').toISOString(),
    patientDetails: {
      name: 'Ama Serwaa',
      phone: '+233201234567',
      dob: '1988-02-15',
    },
    reasonForReferral: 'Persistent headaches and dizziness, requires neurological assessment.',
    priority: 'Urgent',
    assignedDepartment: 'Neurology',
    status: 'Pending Review',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    referral_id: 'REF-002',
    referringProvider: '37 Military Hospital',
    referralDate: new Date('2024-07-29T14:30:00Z').toISOString(),
    patientDetails: {
      name: 'Kofi Mensah',
      phone: '+233558765432',
      dob: '1975-09-20',
    },
    reasonForReferral: 'Post-operative follow-up for cardiac surgery.',
    priority: 'Routine',
    assignedDepartment: 'Cardiology',
    assignedDoctorId: 'doc1',
    status: 'Assigned',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
   {
    referral_id: 'REF-003',
    referringProvider: 'Private Clinic',
    referralDate: new Date('2024-07-25T09:00:00Z').toISOString(),
    patientDetails: {
      name: 'Esi Parker',
      phone: '+233249998877',
      dob: '2001-11-10',
      existingPatientId: 'P-654321',
    },
    reasonForReferral: 'Scheduled consultation for acne treatment.',
    priority: 'Routine',
    assignedDepartment: 'Dermatology',
    status: 'Completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const getStatusVariant = (status: Referral['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Pending Review': return 'destructive';
        case 'Assigned': return 'default';
        case 'Scheduled': return 'outline';
        case 'Completed': return 'secondary';
        default: return 'secondary';
    }
};

const getPriorityVariant = (priority: Referral['priority']): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
        case 'Emergency': return 'destructive';
        case 'Urgent': return 'default';
        case 'Routine': return 'secondary';
        default: return 'secondary';
    }
}


export function ReferralsDashboard() {

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referral Date</TableHead>
            <TableHead>Patient Name</TableHead>
            <TableHead>Referring Provider</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockReferrals.length > 0 ? (
            mockReferrals.map((referral) => (
              <TableRow key={referral.referral_id}>
                <TableCell className="font-medium">
                  {format(new Date(referral.referralDate), 'PPP')}
                </TableCell>
                <TableCell>{referral.patientDetails.name}</TableCell>
                <TableCell>{referral.referringProvider}</TableCell>
                <TableCell>{referral.assignedDepartment}</TableCell>
                <TableCell>
                    <Badge variant={getPriorityVariant(referral.priority)}>{referral.priority}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(referral.status)}>{referral.status}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Assign to Doctor</DropdownMenuItem>
                      <DropdownMenuItem>Update Status</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No referrals found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
