
'use client';

import * as React from 'react';
import { AppointmentsList } from './components/appointments-list';
import { PatientEHR } from './components/patient-ehr';
import { Appointment, Referral, Patient } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReferralsDashboard } from '../referrals/components/referrals-dashboard';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { mockReferrals, allPatients as initialPatients } from '@/lib/data';

export default function MyPracticePage() {
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
  const [referrals, setReferrals] = useLocalStorage<Referral[]>('referrals', mockReferrals);
  const [patients] = useLocalStorage<Patient[]>('patients', initialPatients);

  const selectedPatient = React.useMemo(() => {
    if (!selectedAppointment) return null;
    return patients.find(p => p.patient_id === selectedAppointment.patient_id);
  }, [selectedAppointment, patients]);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Practice Workbench</h1>
        <p className="text-muted-foreground">
          Your personal dashboard for managing appointments and patient records.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh]">
        <div className="lg:col-span-1">
          <AppointmentsList onAppointmentSelect={setSelectedAppointment} />
        </div>
        <div className="lg:col-span-2">
            {selectedAppointment && selectedPatient ? (
                <PatientEHR patient={selectedPatient} />
            ): (
                 <Card className="h-full">
                    <CardHeader>
                        <CardTitle>My Assigned Referrals</CardTitle>
                        <CardDescription>
                            A list of all patient referrals assigned to you for review. Select an appointment to view that patient's EHR.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ReferralsDashboard allReferrals={referrals} setAllReferrals={setReferrals} />
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
