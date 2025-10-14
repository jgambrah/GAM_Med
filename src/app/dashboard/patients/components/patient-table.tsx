
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Patient } from '@/lib/types';
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
import { AddPatientDialog } from './add-patient-dialog';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import { toast } from '@/hooks/use-toast';

interface PatientTableProps {
  data: Patient[];
  onPatientUpdated: () => void;
  onPatientDeleted: (patientId: string) => void;
}

export function PatientTable({ data, onPatientUpdated, onPatientDeleted }: PatientTableProps) {
  const [patientToEdit, setPatientToEdit] = React.useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = React.useState<Patient | null>(null);

  const handleDelete = () => {
    if (!patientToDelete) return;
    console.log(`Deleting patient ${patientToDelete.patient_id}`);
    onPatientDeleted(patientToDelete.patient_id);
    setPatientToDelete(null);
    toast.success(`Patient record for ${patientToDelete.full_name} has been deleted.`);
  };

  return (
    <>
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient ID</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Date of Birth</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((patient) => (
              <TableRow key={patient.patient_id}>
                <TableCell className="font-medium">
                  {patient.patient_id}
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/patients/${patient.patient_id}`} className="hover:underline text-primary font-medium">
                    {patient.full_name}
                  </Link>
                </TableCell>
                <TableCell>{patient.gender}</TableCell>
                <TableCell>{patient.dob}</TableCell>
                <TableCell>{patient.contact.primaryPhone}</TableCell>
                <TableCell>
                  <Badge variant={patient.is_admitted ? 'default' : 'secondary'}>
                    {patient.is_admitted ? 'Admitted' : 'Outpatient'}
                  </Badge>
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
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/patients/${patient.patient_id}`}>View Details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPatientToEdit(patient)}>
                        Edit Record
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setPatientToDelete(patient)}
                      >
                        Delete Record
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No patients found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>

    {patientToEdit && (
      <AddPatientDialog
        patientToEdit={patientToEdit}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPatientToEdit(null);
        }}
        onPatientAdded={onPatientUpdated}
      />
    )}

    {patientToDelete && (
      <DeleteConfirmationDialog
        isOpen={!!patientToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPatientToDelete(null);
        }}
        onConfirm={handleDelete}
        itemName={patientToDelete.full_name}
      />
    )}
    </>
  );
}
