
'use client';

import * as React from 'react';
import { AppointmentsList } from './components/appointments-list';
import { PatientEHR } from './components/patient-ehr';
import { Appointment, Referral } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReferralsDashboard } from '../referrals/components/referrals-dashboard';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { mockReferrals, allAppointments as initialAppointments } from '@/lib/data';

export default function MyPracticePage() {
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
  const [referrals, setReferrals] = useLocalStorage<Referral[]>('referrals', mockReferrals);
  const [allAppointments] = useLocalStorage<Appointment[]>('appointments', initialAppointments);


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
          <AppointmentsList appointments={allAppointments} onAppointmentSelect={setSelectedAppointment} />
        </div>
        <div className="lg:col-span-2">
            {selectedAppointment ? (
                <PatientEHR patientId={selectedAppointment.patient_id} />
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
