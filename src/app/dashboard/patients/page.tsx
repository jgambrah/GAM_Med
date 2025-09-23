'use client';

import * as React from 'react';
import { useDebouncedCallback } from 'use-debounce';
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
import { searchPatientsAction } from '@/lib/actions';
import { allPatients } from '@/lib/data';

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [patients, setPatients] = React.useState<Patient[]>(allPatients);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSearch = useDebouncedCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    const result = await searchPatientsAction(query);
    if (result.success) {
      setPatients(result.data || []);
    } else {
      setError(result.message || 'Failed to search for patients.');
      setPatients([]);
    }
    setIsLoading(false);
  }, 300);

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };
  
  // Initial load effect
  React.useEffect(() => {
    // This could also be a call to fetch all patients initially
    // For this prototype, we start with the full mock list.
    setPatients(allPatients);
  }, []);
  
  const handlePatientUpdated = () => {
    // This is a placeholder. In a real app with a database, you would re-fetch the data.
    // For this prototype, we assume the mock data is mutated and just re-filter.
    handleSearch(searchQuery);
  }

  const handlePatientDeleted = (patientId: string) => {
    // This is a placeholder for the prototype to simulate deletion from the list.
    setPatients(prev => prev.filter(p => p.patient_id !== patientId));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patient Management</h1>
          <p className="text-muted-foreground">
            Browse, register, and manage patient records.
          </p>
        </div>
        <AddPatientDialog onPatientAdded={handlePatientUpdated} />
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
                    placeholder="Search by name, ID, or phone..."
                    value={searchQuery}
                    onChange={onSearchInputChange}
                    className="max-w-sm"
                />
             </div>
          </div>
        </CardHeader>
        <CardContent>
           {error && <p className="text-center text-destructive">{error}</p>}
           {isLoading ? (
             <div className="h-24 flex items-center justify-center">
                <p className="text-muted-foreground">Searching...</p>
             </div>
           ) : (
             <PatientTable 
                data={patients} 
                onPatientUpdated={handlePatientUpdated} 
                onPatientDeleted={handlePatientDeleted}
             />
           )}
        </CardContent>
      </Card>
    </div>
  );
}
