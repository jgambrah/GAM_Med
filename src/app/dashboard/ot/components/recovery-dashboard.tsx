
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
import { mockOtSessions, allPatients } from '@/lib/data';
import { OTSession } from '@/lib/types';
import { format, formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Monitoring': return 'default';
        case 'Stable': return 'outline';
        case 'Discharged': return 'secondary';
        default: return 'outline';
    }
};

export function RecoveryDashboard() {
  // In a real app, this would query for sessions where status is 'Post-Op'
  // and recoveryStatus is not 'Discharged'.
  const patientsInRecovery = mockOtSessions.filter(
    s => s.status === 'Post-Op' && s.recoveryStatus !== 'Discharged'
  );

  const getPatientName = (patientId: string) => allPatients.find(p => p.patient_id === patientId)?.full_name || 'Unknown Patient';

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Procedure</TableHead>
            <TableHead>Recovery Status</TableHead>
            <TableHead>Time in Recovery</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patientsInRecovery.length > 0 ? (
            patientsInRecovery.map((session) => (
              <TableRow key={session.sessionId}>
                <TableCell className="font-medium">
                  <Link href={`/dashboard/patients/${session.patientId}`} className="hover:underline text-primary">
                    {getPatientName(session.patientId)}
                  </Link>
                </TableCell>
                <TableCell>{session.procedureName}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(session.recoveryStatus || '')}>
                    {session.recoveryStatus || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                    {session.recoveryRoomEntryTime ? 
                        formatDistanceToNowStrict(new Date(session.recoveryRoomEntryTime))
                        : 'N/A'
                    }
                </TableCell>
                <TableCell>
                    <Button asChild variant="outline" size="sm">
                         <Link href={`/dashboard/patients/${session.patientId}?tab=post-op`}>View Chart</Link>
                    </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No patients currently in the recovery room.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
