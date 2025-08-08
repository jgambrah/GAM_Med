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

export default function PatientsPage() {
  // In a real app, you would fetch this data from Firestore
  const patients = allPatients;

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
          <CardTitle>Patient List</CardTitle>
          <CardDescription>
            A list of all registered patients in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientTable data={patients} />
        </CardContent>
      </Card>
    </div>
  );
}
