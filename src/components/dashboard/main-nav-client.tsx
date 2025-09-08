'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { 
    Home, 
    Users, 
    Calendar, 
    Pill, 
    Stethoscope, 
    LayoutDashboard, 
    BedDouble,
    Beaker,
    Send,
    ClipboardCheck,
    CalendarClock,
    Scissors,
    Clock,
    CreditCard,
    Receipt,
    CheckSquare,
    Wallet,
    Contact,
    Truck,
    ShieldCheck,
    BarChart,
    Scan,
} from 'lucide-react';
import type { User } from '@/lib/types';
import { mockAlerts, allAdmissions } from '@/lib/data';

const allRoles: User['role'][] = ['admin', 'doctor', 'nurse', 'pharmacist', 'patient', 'billing_clerk', 'lab_technician', 'ot_coordinator', 'receptionist'];

export function MainNavClient() {
  const pathname = usePathname();
  const { user } = useAuth();

  // In a real application, this would be a highly optimized, real-time query.
  // It would fetch unacknowledged 'Critical' alerts for patients assigned to this doctor.
  const criticalAlertCount = React.useMemo(() => {
    if (!user || user.role !== 'doctor') return 0;
    
    // Get a list of patients this doctor is attending
    const myPatientIds = new Set(
        allAdmissions
            .filter(a => a.attending_doctor_id === user.uid)
            .map(a => a.patient_id)
    );

    // Count unacknowledged critical alerts for those patients
    return mockAlerts.filter(alert => 
        myPatientIds.has(alert.patientId) && 
        alert.severity === 'Critical' && 
        !alert.isAcknowledged
    ).length;

  }, [user]);

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: Home,
      roles: allRoles,
    },
    {
      href: '/dashboard/nursing',
      label: 'Nursing Station',
      icon: ClipboardCheck,
      roles: ['nurse'],
    },
    {
      href: '/dashboard/patients',
      label: 'Patients',
      icon: Users,
      roles: ['admin', 'doctor', 'nurse', 'billing_clerk', 'receptionist'],
    },
    {
      href: '/dashboard/beds',
      label: 'Beds',
      icon: BedDouble,
      roles: ['admin', 'doctor', 'nurse'],
    },
    {
      href: '/dashboard/appointments',
      label: 'Appointments',
      icon: Calendar,
      roles: ['admin', 'doctor', 'billing_clerk', 'patient', 'receptionist'],
    },
    {
        href: '/dashboard/my-billing',
        label: 'My Billing',
        icon: CreditCard,
        roles: ['patient']
    },
    {
        href: '/dashboard/my-claims',
        label: 'My Claims',
        icon: Receipt,
        roles: ['doctor', 'nurse', 'admin', 'billing_clerk', 'pharmacist', 'lab_technician', 'ot_coordinator', 'receptionist'],
    },
     {
      href: '/dashboard/approvals',
      label: 'Approvals',
      icon: CheckSquare,
      roles: ['admin', 'doctor'], // HOD roles
    },
    {
        href: '/dashboard/ot',
        label: 'OT Schedule',
        icon: Scissors,
        roles: ['admin', 'doctor', 'ot_coordinator'],
    },
     {
        href: '/dashboard/waiting-lists',
        label: 'Waiting Lists',
        icon: Clock,
        roles: ['admin', 'receptionist'],
    },
    {
        href: '/dashboard/referrals',
        label: 'Referrals',
        icon: Send,
        roles: ['admin', 'doctor'],
    },
    {
        href: '/dashboard/radiology',
        label: 'Radiology',
        icon: Scan,
        roles: ['admin', 'doctor', 'receptionist'],
    },
    {
        href: '/dashboard/lab',
        label: 'Laboratory',
        icon: Beaker,
        roles: ['lab_technician', 'doctor'],
    },
    {
        href: '/dashboard/lab/reports',
        label: 'Lab Reports',
        icon: BarChart,
        roles: ['admin', 'lab_technician', 'doctor'],
    },
    {
      href: '/dashboard/pharmacy',
      label: 'Pharmacy',
      icon: Pill,
      roles: ['admin', 'doctor', 'pharmacist', 'nurse', 'billing_clerk'],
    },
    {
        href: '/dashboard/pharmacy/suppliers',
        label: 'Suppliers',
        icon: Truck,
        roles: ['admin', 'pharmacist'],
    },
    {
        href: '/dashboard/pharmacy/controlled-substances',
        label: 'Controlled Substances',
        icon: ShieldCheck,
        roles: ['admin', 'pharmacist'],
    },
    {
        href: '/dashboard/payroll',
        label: 'Payroll',
        icon: Wallet,
        roles: ['admin'],
    },
    {
      href: '/dashboard/my-practice',
      label: 'My Practice',
      icon: Stethoscope,
      roles: ['doctor'],
      badge: criticalAlertCount > 0 ? criticalAlertCount.toString() : undefined,
    },
     {
      href: '/dashboard/my-schedule',
      label: 'My Schedule',
      icon: CalendarClock,
      roles: ['doctor'],
    },
    {
      href: '/dashboard/hr',
      label: 'Human Resources',
      icon: Contact,
      roles: ['admin'],
    },
    {
      href: '/dashboard/admin',
      label: 'Admin Panel',
      icon: LayoutDashboard,
      roles: ['admin'],
    },
  ];

  const accessibleItems = menuItems.filter(item => user && item.roles.includes(user.role)).sort((a, b) => {
    const order = ['/dashboard', '/dashboard/my-practice', '/dashboard/nursing', '/dashboard/appointments', '/dashboard/my-billing', '/dashboard/patients', '/dashboard/beds', '/dashboard/ot', '/dashboard/pharmacy', '/dashboard/pharmacy/controlled-substances', '/dashboard/pharmacy/suppliers', '/dashboard/lab', '/dashboard/lab/reports', '/dashboard/radiology', '/dashboard/referrals', '/dashboard/approvals', '/dashboard/my-claims', '/dashboard/my-schedule', '/dashboard/payroll', '/dashboard/hr', '/dashboard/admin'];
    return order.indexOf(a.href) - order.indexOf(b.href);
  });

  return (
    <SidebarMenu>
      {accessibleItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
            tooltip={item.label}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
          {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
