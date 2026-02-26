
'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { PatientDashboard } from './components/patient-dashboard';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdminDashboard } from './components/admin-dashboard';
import { Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DoctorDashboard } from './components/doctor-dashboard';

/**
 * == Role-Based Dashboard Hub ==
 * 
 * This page acts as the dynamic landing zone for all staff and patients.
 * It detects the user's role and renders the appropriate specialized view.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  
  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';
  const isNurse = user?.role === 'nurse';
  const isAdmin = user?.role === 'admin' || user?.role === 'director';
  const isSupplier = user?.role === 'supplier';

  const handleCustomizeClick = () => {
    toast.info("Dashboard Customization", {
      description: "This would open an interface to drag, drop, and configure dashboard widgets."
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back, {user?.name || 'User'}. You are logged in as a{' '}
            <strong className="capitalize">{user?.role.replace('_', ' ')}</strong>.
          </p>
        </div>
        {isAdmin && (
            <Button variant="outline" onClick={handleCustomizeClick}>
                <Edit className="h-4 w-4 mr-2" />
                Customize
            </Button>
        )}
      </div>
      
      {/* 
        == Dashboard Distribution ==
        Directors and Admins see the high-level operational overview.
        Doctors see their clinical worklist.
        Patients see their health records and stats.
      */}
      {isAdmin && <AdminDashboard />}
      {isDoctor && <DoctorDashboard />}
      {isPatient && <PatientDashboard />}

      {isNurse && (
        <div className="p-8 border-2 border-dashed rounded-xl text-center bg-muted/5">
            <h3 className="text-xl font-bold">Nursing Station Dashboard</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                A summary of your ward's status, pending tasks, and alerts is active in the specialized nursing view.
            </p>
            <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700 h-11 px-8 shadow-md">
                <Link href="/dashboard/nursing">Enter Nursing Station</Link>
            </Button>
        </div>
      )}

      {isSupplier && (
        <div className="p-8 border-2 border-dashed rounded-xl text-center bg-muted/5">
            <h3 className="text-xl font-bold">Supplier Portal</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                View open Requests for Quotation (RFQs) and submit your competitive bids.
            </p>
            <Button asChild className="mt-6 h-11 px-8 shadow-md">
                <Link href="/dashboard/supplier">Open Supplier Dashboard</Link>
            </Button>
        </div>
      )}

      {!isDoctor && !isPatient && !isNurse && !isAdmin && !isSupplier && (
        <div className="p-8 border-2 border-dashed rounded-lg text-center">
          <p className="text-muted-foreground">Your specialized dashboard is being configured.</p>
        </div>
      )}
    </div>
  );
}
