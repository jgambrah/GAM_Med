
'use client';

import { useAuth } from '@/hooks/use-auth';
import { DoctorAppointments } from './components/doctor-appointments';
import { InpatientList } from './components/inpatient-list';

export default function DashboardPage() {
  const { user } = useAuth();
  
  const isClinicalStaff = user && (user.role === 'doctor' || user.role === 'nurse');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, {user?.name || 'User'}. You are logged in as a{' '}
          <strong>{user?.role}</strong>.
        </p>
      </div>
      
      {isClinicalStaff ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="col-span-1">
                <DoctorAppointments />
            </div>
            <div className="col-span-1">
                <InpatientList />
            </div>
        </div>
      ) : (
        <div className="p-8 border-2 border-dashed rounded-lg text-center">
          <p className="text-muted-foreground">Your role-specific dashboard will appear here.</p>
        </div>
      )}
    </div>
  );
}
