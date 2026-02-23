
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
import { allPatients } from '@/lib/data';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useAuth } from '@/hooks/use-auth';

export default function PatientsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [storedPatients, setStoredPatients] = useLocalStorage<Patient[]>('patients', allPatients);
  const [filteredPatients, setFilteredPatients] = React.useState<Patient[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSearch = useDebouncedCallback((query: string) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    // SaaS LOGIC: Always filter by hospitalId first
    const hospitalPatients = storedPatients.filter(p => p.hospitalId === user.hospitalId);
    
    if (!query) {
      setFilteredPatients(hospitalPatients);
    } else {
      const lowercasedQuery = query.toLowerCase();
      const filtered = hospitalPatients.filter(
        (patient) =>
          patient.full_name.toLowerCase().includes(lowercasedQuery) ||
          patient.patient_id.toLowerCase().includes(lowercasedQuery) ||
          patient.contact.primaryPhone.includes(lowercasedQuery)
      );
      setFilteredPatients(filtered);
    }

    setIsLoading(false);
  }, 300);

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    handleSearch(e.target.value);
  };

  // Effect to update filtered list when storedPatients or user changes
  React.useEffect(() => {
    if (user) {
        handleSearch(searchQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedPatients, user]);
  
  const handlePatientAdded = (newPatient: Patient) => {
    setStoredPatients(prev => [newPatient, ...prev]);
  }

  const handlePatientDeleted = (patientId: string) => {
    setStoredPatients(prev => prev.filter(p => p.patient_id !== patientId));
  }
  
  const handlePatientUpdated = () => {
    const updatedPatients = JSON.parse(localStorage.getItem('patients') || '[]');
    setStoredPatients(updatedPatients);
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
        <AddPatientDialog onPatientAdded={handlePatientAdded} />
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
                data={filteredPatients} 
                onPatientUpdated={handlePatientUpdated} 
                onPatientDeleted={handlePatientDeleted}
             />
           )}
        </CardContent>
      </Card>
    </div>
  );
}
