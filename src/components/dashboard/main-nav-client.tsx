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
    CheckSquare,
    Wallet,
    Contact,
    Truck,
    ShieldCheck,
    BarChart,
    Scan,
    Apple,
    Briefcase,
    Receipt,
    CalendarOff,
    MessageSquare,
    FileText,
    Building,
    BookHeart,
    Globe,
    UserCog,
    UserPlus,
    FolderSearch,
    Zap
} from 'lucide-react';
import type { User } from '@/lib/types';
import { mockAlerts, allAdmissions } from '@/lib/data';

const allRoles: User['role'][] = ['super_admin', 'director', 'admin', 'doctor', 'nurse', 'pharmacist', 'patient', 'billing_clerk', 'lab_technician', 'ot_coordinator', 'receptionist', 'radiologist', 'dietitian', 'space_manager', 'supplier'];
const staffRoles: User['role'][] = ['director', 'admin', 'doctor', 'nurse', 'pharmacist', 'billing_clerk', 'lab_technician', 'ot_coordinator', 'receptionist', 'radiologist', 'dietitian', 'space_manager'];


export function MainNavClient() {
  const pathname = usePathname();
  const { user } = useAuth();

  const criticalAlertCount = React.useMemo(() => {
    if (!user || user.role !== 'doctor') return 0;
    
    const myPatientIds = new Set(
        allAdmissions
            .filter(a => a.attending_doctor_id === user.uid)
            .map(a => a.patient_id)
    );

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
      href: '/dashboard/super-admin/pulse',
      label: 'Platform Pulse',
      icon: Zap,
      roles: ['super_admin'],
    },
    {
      href: '/dashboard/super-admin',
      label: 'Hospital Management',
      icon: Globe,
      roles: ['super_admin'],
    },
    {
      href: '/dashboard/reception/register-patient',
      label: 'Register Patient',
      icon: UserPlus,
      roles: ['director', 'admin', 'receptionist'],
    },
    {
      href: '/dashboard/records/all-patients',
      label: 'Patient Directory',
      icon: FolderSearch,
      roles: ['director', 'admin', 'doctor', 'nurse', 'receptionist'],
    },
    {
      href: '/dashboard/director/staff',
      label: 'Staff Management',
      icon: UserCog,
      roles: ['director'],
    },
    {
      href: '/dashboard/admin/staff',
      label: 'Facility Staff',
      icon: Users,
      roles: ['admin'],
    },
    {
      href: '/dashboard/nursing',
      label: 'Nursing Station',
      icon: ClipboardCheck,
      roles: ['nurse'],
    },
    {
      href: '/dashboard/patients',
      label: 'Clinical Workbench',
      icon: Stethoscope,
      roles: ['director', 'admin', 'doctor', 'nurse', 'billing_clerk', 'receptionist'],
    },
    {
      href: '/dashboard/finance',
      label: 'Finance Hub',
      icon: Wallet,
      roles: ['director', 'admin', 'billing_clerk'],
    },
    {
      href: '/dashboard/beds',
      label: 'Beds',
      icon: BedDouble,
      roles: ['director', 'admin', 'doctor', 'nurse'],
    },
    {
      href: '/dashboard/appointments',
      label: 'Appointments',
      icon: Calendar,
      roles: ['director', 'admin', 'doctor', 'billing_clerk', 'patient', 'receptionist'],
    },
    {
        href: '/dashboard/messages',
        label: 'Messages',
        icon: MessageSquare,
        roles: allRoles
    },
    {
        href: '/dashboard/my-records',
        label: 'My Records',
        icon: FileText,
        roles: ['patient']
    },
    {
        href: '/dashboard/my-records/health-library',
        label: 'Health Library',
        icon: BookHeart,
        roles: ['patient']
    },
    {
        href: '/dashboard/my-billing',
        label: 'My Billing',
        icon: CreditCard,
        roles: ['patient']
    },
    {
        href: `/dashboard/hr/staff/${user?.uid}`,
        label: 'My Profile',
        icon: Contact,
        roles: staffRoles,
    },
    {
        href: '/dashboard/my-claims',
        label: 'My Claims',
        icon: Receipt,
        roles: staffRoles,
    },
    {
        href: '/dashboard/my-leave',
        label: 'My Leave',
        icon: CalendarOff,
        roles: staffRoles,
    },
     {
      href: '/dashboard/approvals',
      label: 'Approvals',
      icon: CheckSquare,
      roles: ['director', 'admin', 'doctor'],
    },
    {
        href: '/dashboard/ot',
        label: 'OT Schedule',
        icon: Scissors,
        roles: ['director', 'admin', 'doctor', 'ot_coordinator'],
    },
     {
        href: '/dashboard/waiting-lists',
        label: 'Waiting Lists',
        icon: Clock,
        roles: ['director', 'admin', 'receptionist'],
    },
    {
        href: '/dashboard/referrals',
        label: 'Referrals',
        icon: Send,
        roles: ['director', 'admin', 'doctor'],
    },
    {
        href: '/dashboard/radiology',
        label: 'Radiology',
        icon: Scan,
        roles: ['director', 'admin', 'doctor', 'receptionist', 'radiologist'],
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
        roles: ['director', 'admin', 'lab_technician', 'doctor'],
    },
    {
        href: '/dashboard/dietary',
        label: 'Dietary',
        icon: Apple,
        roles: ['director', 'admin', 'dietitian', 'nurse', 'doctor'],
    },
    {
      href: '/dashboard/pharmacy',
      label: 'Pharmacy',
      icon: Pill,
      roles: ['director', 'admin', 'doctor', 'pharmacist', 'nurse', 'billing_clerk'],
    },
    {
        href: '/dashboard/pharmacy/suppliers',
        label: 'Suppliers',
        icon: Truck,
        roles: ['director', 'admin', 'pharmacist'],
    },
    {
        href: '/dashboard/pharmacy/controlled-substances',
        label: 'Controlled Substances',
        icon: ShieldCheck,
        roles: ['director', 'admin', 'pharmacist'],
    },
    {
        href: '/dashboard/payroll',
        label: 'Payroll',
        icon: Wallet,
        roles: ['director', 'admin'],
    },
     {
        href: '/dashboard/space-management',
        label: 'Space Management',
        icon: Building,
        roles: ['director', 'admin'],
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
      icon: Briefcase,
      roles: ['director', 'admin'],
    },
    {
      href: '/dashboard/admin',
      label: 'Admin Panel',
      icon: LayoutDashboard,
      roles: ['director', 'admin'],
    },
     {
      href: '/dashboard/supplier',
      label: 'Supplier Dashboard',
      icon: Truck,
      roles: ['supplier'],
    },
  ];

  const accessibleItems = menuItems.filter(item => user && item.roles.includes(user.role)).sort((a, b) => {
    const order = ['/dashboard', '/dashboard/super-admin/pulse', '/dashboard/super-admin', '/dashboard/super-admin/analytics', '/dashboard/reception/register-patient', '/dashboard/records/all-patients', '/dashboard/director/staff', '/dashboard/admin/staff', '/dashboard/my-practice', '/dashboard/nursing', '/dashboard/appointments', '/dashboard/messages', '/dashboard/my-records', '/dashboard/my-records/health-library', '/dashboard/my-billing', `/dashboard/hr/staff/${user?.uid}`, '/dashboard/my-claims', '/dashboard/my-leave', '/dashboard/patients', '/dashboard/finance', '/dashboard/beds', '/dashboard/ot', '/dashboard/pharmacy', '/dashboard/pharmacy/controlled-substances', '/dashboard/pharmacy/suppliers', '/dashboard/lab', '/dashboard/lab/reports', '/dashboard/radiology', '/dashboard/dietary', '/dashboard/referrals', '/dashboard/approvals', '/dashboard/my-schedule', '/dashboard/payroll', '/dashboard/hr', '/dashboard/space-management', '/dashboard/admin'];
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
