'use client';

import * as React from 'react';
import { allPatients } from '@/lib/data';
import { PatientTable } from './components/patient-table';
import { AddPatientDialog } from './components/add-patient-dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Patient } from '@/lib/types';

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filteredPatients, setFilteredPatients] = React.useState<Patient[]>(allPatients);

  React.useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = allPatients.filter(
      (patient) =>
        patient.full_name.toLowerCase().includes(lowercasedQuery) ||
        patient.patient_id.toLowerCase().includes(lowercasedQuery)
    );
    setFilteredPatients(filtered);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patient Management</h1>
          <p className="text-muted-foreground">
            Browse, register, and manage patient records.
          </p>
        </div>
        <AddPatientDialog />
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
             <div>
                <CardTitle>Patient List</CardTitle>
                <CardDescription>
                    A list of all registered patients in the system.
                </CardDescription>
             </div>
             <div className="w-full sm:w-auto">
                <Input
                    placeholder="Search by name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                />
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <PatientTable data={filteredPatients} />
        </CardContent>
      </Card>
    </div>
  );
}
