
'use client';

import { useAuth } from '@/hooks/use-auth';
import { PatientDashboard } from './components/patient-dashboard';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdminDashboard } from './components/admin-dashboard';
import { Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DoctorDashboard } from './components/doctor-dashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  
  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';
  const isNurse = user?.role === 'nurse';
  const isAdmin = user?.role === 'admin';

  const handleCustomizeClick = () => {
    toast.info("Dashboard Customization", {
      description: "This would open an interface to drag, drop, and configure dashboard widgets."
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back, {user?.name || 'User'}. You are logged in as a{' '}
            <strong>{user?.role}</strong>.
          </p>
        </div>
        {isAdmin && (
            <Button variant="outline" onClick={handleCustomizeClick}>
                <Edit className="h-4 w-4 mr-2" />
                Customize
            </Button>
        )}
      </div>
      
      {isAdmin && <AdminDashboard />}
      {isDoctor && <DoctorDashboard />}
      {isPatient && <PatientDashboard />}

      {isNurse && (
        <div className="p-8 border-2 border-dashed rounded-lg text-center">
            <h3 className="text-xl font-semibold">Nursing Station Dashboard</h3>
            <p className="text-muted-foreground mt-2">
                A summary of your ward's status, pending tasks, and alerts will appear here.
            </p>
            <Button asChild className="mt-4">
                <Link href="/dashboard/nursing">Go to Nursing Station</Link>
            </Button>
        </div>
      )}

      {!isDoctor && !isPatient && !isNurse && !isAdmin && (
        <div className="p-8 border-2 border-dashed rounded-lg text-center">
          <p className="text-muted-foreground">Your role-specific dashboard will appear here.</p>
        </div>
      )}
    </div>
  );
}

