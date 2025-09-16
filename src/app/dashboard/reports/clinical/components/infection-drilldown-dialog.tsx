
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface InfectionDrilldownDialogProps {
  ward: string;
  count: number;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Mock data for the drill-down view. In a real app, this would be fetched based on the ward.
const mockDrilldownData = {
    'Surgical': [
        { caseId: 'INF-SURG-001', type: 'Surgical Site Infection', dateIdentified: '2024-07-15T00:00:00Z', patientAge: 65, patientGender: 'Male' },
        { caseId: 'INF-SURG-002', type: 'Surgical Site Infection', dateIdentified: '2024-07-22T00:00:00Z', patientAge: 48, patientGender: 'Female' },
    ],
    'Medical': [
        { caseId: 'INF-MED-001', type: 'UTI', dateIdentified: '2024-07-18T00:00:00Z', patientAge: 72, patientGender: 'Female' },
    ],
    'ICU': [
        { caseId: 'INF-ICU-001', type: 'Pneumonia', dateIdentified: '2024-07-25T00:00:00Z', patientAge: 55, patientGender: 'Male' },
    ]
}

export function InfectionDrilldownDialog({ ward, isOpen, onOpenChange }: InfectionDrilldownDialogProps) {
  const data = mockDrilldownData[ward as keyof typeof mockDrilldownData] || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Infection Cases for {ward}</DialogTitle>
          <DialogDescription>
            Anonymized list of infection cases for the selected period.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border mt-4 max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Infection Type</TableHead>
                <TableHead>Date Identified</TableHead>
                <TableHead>Patient Age</TableHead>
                <TableHead>Patient Gender</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(caseData => (
                <TableRow key={caseData.caseId}>
                  <TableCell className="font-mono text-xs">{caseData.caseId}</TableCell>
                  <TableCell>{caseData.type}</TableCell>
                  <TableCell>{format(new Date(caseData.dateIdentified), 'PPP')}</TableCell>
                  <TableCell>{caseData.patientAge}</TableCell>
                  <TableCell>{caseData.patientGender}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
