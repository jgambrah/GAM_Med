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
    Zap,
    Package,
    TrendingUp,
    LayoutGrid,
    Microscope,
    Monitor,
    FileSpreadsheet,
    ListTodo,
    Inbox,
    ShieldAlert
} from 'lucide-react';
import type { User } from '@/lib/types';
import { mockAlerts, allAdmissions } from '@/lib/data';

const allRoles: User['role'][] = ['super_admin', 'director', 'admin', 'doctor', 'nurse', 'pharmacist', 'patient', 'billing_clerk', 'lab_technician', 'ot_coordinator', 'receptionist', 'radiologist', 'dietitian', 'space_manager', 'supplier'];
const staffRoles: User['role'][] = ['director', 'admin', 'doctor', 'nurse', 'pharmacist', 'billing_clerk', 'lab_technician', 'ot_coordinator', 'receptionist', 'radiologist', 'dietitian', 'space_manager'];


export function MainNavClient() {
  const pathname = usePathname();
  const { user } = useAuth();

  // In a real application, this would be a highly optimized, real-time query.
  const criticalAlertCount = React.useMemo(() => {
    if (!user || user.role !== 'doctor') return 0;
    
    const myPatientIds = new Set(
        allAdmissions
            .filter(a => a.attending_doctor_id === user.uid)
            .map(a => a.patient_id)
    );

    return mockAlerts.filter(alert => 
        myPatientIds.has(alert.patientId || '') && 
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
      slug: 'home'
    },
    {
      href: '/dashboard/super-admin/pulse',
      label: 'Platform Pulse',
      icon: Zap,
      roles: ['super_admin'],
    },
    {
      href: '/dashboard/super-admin/pricing',
      label: 'Pricing Control',
      icon: CreditCard,
      roles: ['super_admin'],
    },
    {
      href: '/dashboard/super-admin',
      label: 'Hospital Management',
      icon: Globe,
      roles: ['super_admin'],
    },
    {
      href: '/dashboard/director/analytics',
      label: 'Executive Insights',
      icon: TrendingUp,
      roles: ['director'],
      slug: 'analytics'
    },
    {
      href: '/dashboard/reception/register-patient',
      label: 'Register Patient',
      icon: UserPlus,
      roles: ['director', 'admin', 'receptionist'],
      slug: 'ehr'
    },
    {
      href: '/dashboard/reception/referrals',
      label: 'Incoming Referrals',
      icon: Inbox,
      roles: ['director', 'admin', 'receptionist'],
      slug: 'ehr'
    },
    {
      href: '/dashboard/records/all-patients',
      label: 'Patient Directory',
      icon: FolderSearch,
      roles: ['director', 'admin', 'doctor', 'nurse', 'receptionist'],
      slug: 'ehr'
    },
    {
      href: '/dashboard/records/compliance',
      label: 'Statutory Returns',
      icon: FileSpreadsheet,
      roles: ['director', 'admin'],
      slug: 'compliance'
    },
    {
      href: '/dashboard/director/staff',
      label: 'Staff Management',
      icon: UserCog,
      roles: ['director'],
      slug: 'home'
    },
    {
      href: '/dashboard/admin/staff',
      label: 'Facility Staff',
      icon: Users,
      roles: ['admin'],
      slug: 'home'
    },
    {
      href: '/dashboard/nursing',
      label: 'Nursing Station',
      icon: ClipboardCheck,
      roles: ['nurse'],
      slug: 'nursing'
    },
    {
      href: '/dashboard/patients',
      label: 'Clinical Workbench',
      icon: Stethoscope,
      roles: ['director', 'admin', 'doctor', 'nurse', 'billing_clerk', 'receptionist'],
      slug: 'ehr'
    },
    {
      href: '/dashboard/finance',
      label: 'Finance Hub',
      icon: Wallet,
      roles: ['director', 'admin', 'billing_clerk'],
      slug: 'billing'
    },
    {
      href: '/dashboard/wards',
      label: 'Ward Management',
      icon: LayoutGrid,
      roles: ['director', 'admin', 'doctor', 'nurse'],
      slug: 'wards'
    },
    {
      href: '/dashboard/beds',
      label: 'Facility Census',
      icon: BedDouble,
      roles: ['director', 'admin', 'doctor', 'nurse'],
      slug: 'wards'
    },
    {
      href: '/dashboard/inventory',
      label: 'Medical Supplies',
      icon: Package,
      roles: ['director', 'admin', 'pharmacist', 'space_manager'],
      slug: 'inventory'
    },
    {
      href: '/dashboard/inventory/equipment',
      label: 'Medical Equipment',
      icon: Microscope,
      roles: ['director', 'admin', 'pharmacist', 'nurse'],
      slug: 'inventory'
    },
    {
      href: '/dashboard/surgery',
      label: 'OT Status Board',
      icon: Monitor,
      roles: ['director', 'admin', 'doctor', 'ot_coordinator'],
      slug: 'surgery'
    },
    {
      href: '/dashboard/appointments',
      label: 'Appointments',
      icon: Calendar,
      roles: ['director', 'admin', 'doctor', 'billing_clerk', 'patient', 'receptionist'],
      slug: 'appointments'
    },
    {
        href: '/dashboard/messages',
        label: 'Messages',
        icon: MessageSquare,
        roles: allRoles,
        slug: 'home'
    },
    {
        href: '/dashboard/my-records',
        label: 'My Records',
        icon: FileText,
        roles: ['patient'],
        slug: 'home'
    },
    {
        href: '/dashboard/my-records/health-library',
        label: 'Health Library',
        icon: BookHeart,
        roles: ['patient'],
        slug: 'home'
    },
    {
        href: '/dashboard/my-billing',
        label: 'My Billing',
        icon: CreditCard,
        roles: ['patient'],
        slug: 'home'
    },
    {
        href: `/dashboard/hr/staff/${user?.uid}`,
        label: 'My Profile',
        icon: Contact,
        roles: staffRoles,
        slug: 'home'
    },
    {
        href: '/dashboard/my-claims',
        label: 'My Claims',
        icon: Receipt,
        roles: staffRoles,
        slug: 'home'
    },
    {
        href: '/dashboard/my-leave',
        label: 'My Leave',
        icon: CalendarOff,
        roles: staffRoles,
        slug: 'home'
    },
     {
      href: '/dashboard/approvals',
      label: 'Approvals',
      icon: CheckSquare,
      roles: ['director', 'admin', 'doctor'],
      slug: 'home'
    },
    {
        href: '/dashboard/ot',
        label: 'OT Schedule',
        icon: Scissors,
        roles: ['director', 'admin', 'doctor', 'ot_coordinator'],
        slug: 'surgery'
    },
     {
        href: '/dashboard/waiting-lists',
        label: 'Waiting Lists',
        icon: Clock,
        roles: ['director', 'admin', 'receptionist'],
        slug: 'appointments'
    },
    {
        href: '/dashboard/referrals',
        label: 'Referrals',
        icon: Send,
        roles: ['director', 'admin', 'doctor'],
        slug: 'ehr'
    },
    {
        href: '/dashboard/radiology',
        label: 'Radiology',
        icon: Scan,
        roles: ['director', 'admin', 'doctor', 'receptionist', 'radiologist'],
        slug: 'radiology'
    },
    {
        href: '/dashboard/lab',
        label: 'Laboratory',
        icon: Beaker,
        roles: ['lab_technician', 'doctor'],
        slug: 'lab'
    },
    {
        href: '/dashboard/lab/reports',
        label: 'Lab Reports',
        icon: BarChart,
        roles: ['director', 'admin', 'lab_technician', 'doctor'],
        slug: 'lab'
    },
    {
        href: '/dashboard/dietary',
        label: 'Dietary',
        icon: Apple,
        roles: ['director', 'admin', 'dietitian', 'nurse', 'doctor'],
        slug: 'nursing'
    },
    {
      href: '/dashboard/pharmacy',
      label: 'Pharmacy',
      icon: Pill,
      roles: ['director', 'admin', 'doctor', 'pharmacist', 'nurse', 'billing_clerk'],
      slug: 'pharmacy'
    },
    {
        href: '/dashboard/pharmacy/suppliers',
        label: 'Suppliers',
        icon: Truck,
        roles: ['director', 'admin', 'pharmacist'],
        slug: 'inventory'
    },
    {
        href: '/dashboard/pharmacy/controlled-substances',
        label: 'Controlled Substances',
        icon: ShieldAlert,
        roles: ['director', 'admin', 'pharmacist'],
        slug: 'narcotics'
    },
    {
        href: '/dashboard/payroll',
        label: 'Payroll',
        icon: Wallet,
        roles: ['director', 'admin'],
        slug: 'home'
    },
    {
        href: '/dashboard/space-management',
        label: 'Space Management',
        icon: Building,
        roles: ['director', 'admin'],
        slug: 'inventory'
    },
    {
      href: '/dashboard/my-practice/schedule',
      label: 'My Daily Schedule',
      icon: ListTodo,
      roles: ['doctor'],
      slug: 'home'
    },
    {
      href: '/dashboard/my-practice',
      label: 'My Practice',
      icon: Stethoscope,
      roles: ['doctor'],
      badge: criticalAlertCount > 0 ? criticalAlertCount.toString() : undefined,
      slug: 'home'
    },
     {
      href: '/dashboard/my-schedule',
      label: 'My Schedule',
      icon: CalendarClock,
      roles: ['doctor'],
      slug: 'home'
    },
    {
      href: '/dashboard/hr',
      label: 'Human Resources',
      icon: Briefcase,
      roles: ['director', 'admin'],
      slug: 'home'
    },
    {
      href: '/dashboard/admin',
      label: 'Admin Panel',
      icon: LayoutDashboard,
      roles: ['director', 'admin'],
      slug: 'home'
    },
     {
      href: '/dashboard/supplier',
      label: 'Supplier Dashboard',
      icon: Truck,
      roles: ['supplier'],
      slug: 'home'
    },
  ];

  const accessibleItems = menuItems.filter(item => {
    if (!user) return false;
    
    // Check Role Access
    const hasRole = item.roles.includes(user.role);
    if (!hasRole) return false;

    // Super Admin bypasses feature gating
    if (user.role === 'super_admin') return true;

    // Feature Gating: Check if the hospital plan supports this feature slug
    // If no slug is defined, assume basic access (always visible if role permits)
    if (!item.slug || item.slug === 'home') return true;

    return user.hospitalPlanSlugs?.includes(item.slug);

  }).sort((a, b) => {
    const order = ['/dashboard', '/dashboard/super-admin/pulse', '/dashboard/super-admin/pricing', '/dashboard/super-admin', '/dashboard/director/analytics', '/dashboard/reception/register-patient', '/dashboard/reception/referrals', '/dashboard/records/all-patients', '/dashboard/records/compliance', '/dashboard/director/staff', '/dashboard/admin/staff', '/dashboard/my-practice/schedule', '/dashboard/my-practice', '/dashboard/nursing', '/dashboard/appointments', '/dashboard/messages', '/dashboard/my-records', '/dashboard/my-records/health-library', '/dashboard/my-billing', `/dashboard/hr/staff/${user?.uid}`, '/dashboard/my-claims', '/dashboard/my-leave', '/dashboard/patients', '/dashboard/finance', '/dashboard/wards', '/dashboard/beds', '/dashboard/inventory', '/dashboard/inventory/equipment', '/dashboard/surgery', '/dashboard/ot', '/dashboard/pharmacy', '/dashboard/pharmacy/controlled-substances', '/dashboard/pharmacy/suppliers', '/dashboard/lab', '/dashboard/lab/reports', '/dashboard/radiology', '/dashboard/dietary', '/dashboard/referrals', '/dashboard/approvals', '/dashboard/my-schedule', '/dashboard/payroll', '/dashboard/hr', '/dashboard/space-management', '/dashboard/admin'];
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
