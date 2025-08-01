"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Patient } from "@/lib/types"

const getStatusBadgeVariant = (status: Patient['admissionStatus']) => {
  switch (status) {
    case 'Inpatient':
      return 'default';
    case 'Outpatient':
      return 'secondary';
    case 'Discharged':
      return 'outline';
    default:
      return 'outline';
  }
};


export function PatientsList({ patients }: { patients: Patient[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Patients</CardTitle>
        <CardDescription>
          A list of all patients in the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Bed</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-mono">{patient.patientId}</TableCell>
                <TableCell className="font-medium">{patient.name}</TableCell>
                 <TableCell>
                  <Badge variant={getStatusBadgeVariant(patient.admissionStatus)}>{patient.admissionStatus}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {patient.bed || 'N/A'}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {patient.contact.phone}
                </TableCell>
                <TableCell>
                  {/* Actions can go here */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
