
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
import { MoreHorizontal, AlertTriangle, Eye } from 'lucide-react';
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

/**
 * == Patient Registry Table ==
 * 
 * Displays the list of patients with professional action menus.
 * Uses the 'id' field (Document ID) for navigation to ensure 100% reliability.
 */
export function PatientTable({ data, onPatientUpdated, onPatientDeleted }: PatientTableProps) {
  const [patientToEdit, setPatientToEdit] = React.useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = React.useState<Patient | null>(null);

  const handleDelete = () => {
    if (!patientToDelete) return;
    onPatientDeleted(patientToDelete.id || patientToDelete.patient_id);
    setPatientToDelete(null);
    toast.success(`Patient record for ${patientToDelete.full_name} deleted.`);
  };

  return (
    <>
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="pl-6">MRN</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Date of Birth</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right pr-6">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((patient) => (
              <TableRow key={patient.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs font-bold pl-6">
                  <div className="flex flex-col">
                    <span>{patient.mrn}</span>
                    {patient.isTemporary && (
                        <Badge variant="outline" className="w-fit mt-1 border-yellow-500 text-yellow-700 bg-yellow-50 text-[8px] h-4">
                            TEMPORARY
                        </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/patients/${patient.id}`} className="hover:underline text-primary font-bold">
                    {patient.full_name}
                  </Link>
                </TableCell>
                <TableCell className="text-xs">{patient.gender}</TableCell>
                <TableCell className="text-xs">{patient.dob}</TableCell>
                <TableCell>
                  <Badge variant={patient.is_admitted ? 'default' : 'secondary'} className="text-[10px] uppercase font-black">
                    {patient.is_admitted ? 'Admitted' : 'Outpatient'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-40">Clinical Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/patients/${patient.id}`} className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" /> View Full EHR
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPatientToEdit(patient)} className="cursor-pointer">
                        Edit Demographics
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive font-bold cursor-pointer"
                        onClick={() => setPatientToDelete(patient)}
                      >
                        Delete Chart
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                No patient records match the current view.
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
        onPatientUpdated={onPatientUpdated}
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
