'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
    ShieldAlert,
    ChevronRight,
    User as UserIcon,
    ChevronDown
} from 'lucide-react';
import type { User } from '@/lib/types';
import { mockAlerts, allAdmissions } from '@/lib/data';
import { cn } from '@/lib/utils';

const allRoles: User['role'][] = ['super_admin', 'director', 'admin', 'doctor', 'nurse', 'pharmacist', 'patient', 'billing_clerk', 'lab_technician', 'ot_coordinator', 'receptionist', 'radiologist', 'dietitian', 'housekeeping', 'space_manager', 'supplier'];
const staffRoles: User['role'][] = ['director', 'admin', 'doctor', 'nurse', 'pharmacist', 'billing_clerk', 'lab_technician', 'ot_coordinator', 'receptionist', 'radiologist', 'dietitian', 'space_manager'];

type MenuCategory = 'main' | 'clinical' | 'finance' | 'admin' | 'logistics' | 'personal' | 'platform';

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
        myPatientIds.has(alert.patientId || '') && 
        alert.severity === 'Critical' && 
        !alert.isAcknowledged
    ).length;

  }, [user]);

  const menuItems: { href: string; label: string; icon: any; roles: User['role'][]; category: MenuCategory; badge?: string }[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: Home,
      roles: allRoles,
      category: 'main'
    },
    {
      href: '/dashboard/super-admin/pulse',
      label: 'Platform Pulse',
      icon: Zap,
      roles: ['super_admin'],
      category: 'platform'
    },
    {
      href: '/dashboard/super-admin/leads',
      label: 'Sales Leads',
      icon: Inbox,
      roles: ['super_admin'],
      category: 'platform'
    },
    {
      href: '/dashboard/super-admin/pricing',
      label: 'Pricing Control',
      icon: CreditCard,
      roles: ['super_admin'],
      category: 'platform'
    },
    {
      href: '/dashboard/super-admin',
      label: 'Hospital Registry',
      icon: Globe,
      roles: ['super_admin'],
      category: 'platform'
    },
    {
      href: '/dashboard/director/analytics',
      label: 'Executive Insights',
      icon: TrendingUp,
      roles: ['director'],
      category: 'main'
    },
    {
      href: '/dashboard/reception/register-patient',
      label: 'Register Patient',
      icon: UserPlus,
      roles: ['director', 'admin', 'receptionist'],
      category: 'clinical'
    },
    {
      href: '/dashboard/reception/referrals',
      label: 'Incoming Referrals',
      icon: Inbox,
      roles: ['director', 'admin', 'receptionist'],
      category: 'clinical'
    },
    {
      href: '/dashboard/records/all-patients',
      label: 'Patient Directory',
      icon: FolderSearch,
      roles: ['director', 'admin', 'doctor', 'nurse', 'receptionist'],
      category: 'clinical'
    },
    {
      href: '/dashboard/records/compliance',
      label: 'Statutory Returns',
      icon: FileSpreadsheet,
      roles: ['director', 'admin'],
      category: 'admin'
    },
    {
      href: '/dashboard/director/staff',
      label: 'Staff Management',
      icon: UserCog,
      roles: ['director'],
      category: 'admin'
    },
    {
      href: '/dashboard/admin/staff',
      label: 'Facility Staff',
      icon: Users,
      roles: ['admin'],
      category: 'admin'
    },
    {
      href: '/dashboard/nursing',
      label: 'Nursing Station',
      icon: ClipboardCheck,
      roles: ['nurse'],
      category: 'clinical'
    },
    {
      href: '/dashboard/patients',
      label: 'Clinical Workbench',
      icon: Stethoscope,
      roles: ['director', 'admin', 'doctor', 'nurse', 'billing_clerk', 'receptionist'],
      category: 'clinical'
    },
    {
      href: '/dashboard/finance',
      label: 'Finance Hub',
      icon: Wallet,
      roles: ['director', 'admin', 'billing_clerk'],
      category: 'finance'
    },
    {
      href: '/dashboard/wards',
      label: 'Ward Management',
      icon: LayoutGrid,
      roles: ['director', 'admin', 'doctor', 'nurse'],
      category: 'clinical'
    },
    {
      href: '/dashboard/beds',
      label: 'Facility Census',
      icon: BedDouble,
      roles: ['director', 'admin', 'doctor', 'nurse'],
      category: 'clinical'
    },
    {
      href: '/dashboard/inventory',
      label: 'Medical Supplies',
      icon: Package,
      roles: ['director', 'admin', 'pharmacist', 'space_manager'],
      category: 'logistics'
    },
    {
      href: '/dashboard/inventory/equipment',
      label: 'Medical Equipment',
      icon: Microscope,
      roles: ['director', 'admin', 'pharmacist', 'nurse'],
      category: 'logistics'
    },
    {
      href: '/dashboard/surgery',
      label: 'OT Status Board',
      icon: Monitor,
      roles: ['director', 'admin', 'doctor', 'ot_coordinator'],
      category: 'clinical'
    },
    {
      href: '/dashboard/appointments',
      label: 'Appointments',
      icon: Calendar,
      roles: ['director', 'admin', 'doctor', 'billing_clerk', 'patient', 'receptionist'],
      category: 'clinical'
    },
    {
        href: '/dashboard/messages',
        label: 'Messages',
        icon: MessageSquare,
        roles: allRoles,
        category: 'main'
    },
    {
        href: '/dashboard/my-records',
        label: 'My Records',
        icon: FileText,
        roles: ['patient'],
        category: 'personal'
    },
    {
        href: '/dashboard/my-records/health-library',
        label: 'Health Library',
        icon: BookHeart,
        roles: ['patient'],
        category: 'personal'
    },
    {
        href: '/dashboard/my-billing',
        label: 'My Billing',
        icon: CreditCard,
        roles: ['patient'],
        category: 'personal'
    },
    {
        href: `/dashboard/hr/staff/${user?.uid}`,
        label: 'My Profile',
        icon: Contact,
        roles: staffRoles,
        category: 'personal'
    },
    {
        href: '/dashboard/my-claims',
        label: 'My Claims',
        icon: Receipt,
        roles: staffRoles,
        category: 'personal'
    },
    {
        href: '/dashboard/my-leave',
        label: 'My Leave',
        icon: CalendarOff,
        roles: staffRoles,
        category: 'personal'
    },
     {
      href: '/dashboard/approvals',
      label: 'Approvals',
      icon: CheckSquare,
      roles: ['director', 'admin', 'doctor'],
      category: 'admin'
    },
    {
        href: '/dashboard/ot',
        label: 'OT Schedule',
        icon: Scissors,
        roles: ['director', 'admin', 'doctor', 'ot_coordinator'],
        category: 'clinical'
    },
     {
        href: '/dashboard/waiting-lists',
        label: 'Waiting Lists',
        icon: Clock,
        roles: ['director', 'admin', 'receptionist'],
        category: 'clinical'
    },
    {
        href: '/dashboard/referrals',
        label: 'Referrals',
        icon: Send,
        roles: ['director', 'admin', 'doctor'],
        category: 'clinical'
    },
    {
        href: '/dashboard/radiology',
        label: 'Radiology',
        icon: Scan,
        roles: ['director', 'admin', 'doctor', 'receptionist', 'radiologist'],
        category: 'clinical'
    },
    {
        href: '/dashboard/lab',
        label: 'Laboratory',
        icon: Beaker,
        roles: ['lab_technician', 'doctor'],
        category: 'clinical'
    },
    {
        href: '/dashboard/lab/reports',
        label: 'Lab Reports',
        icon: BarChart,
        roles: ['director', 'admin', 'lab_technician', 'doctor'],
        category: 'clinical'
    },
    {
        href: '/dashboard/dietary',
        label: 'Dietary',
        icon: Apple,
        roles: ['director', 'admin', 'dietitian', 'nurse', 'doctor'],
        category: 'clinical'
    },
    {
      href: '/dashboard/pharmacy',
      label: 'Pharmacy',
      icon: Pill,
      roles: ['director', 'admin', 'doctor', 'pharmacist', 'nurse', 'billing_clerk'],
      category: 'clinical'
    },
    {
        href: '/dashboard/pharmacy/suppliers',
        label: 'Suppliers',
        icon: Truck,
        roles: ['director', 'admin', 'pharmacist'],
        category: 'logistics'
    },
    {
        href: '/dashboard/pharmacy/controlled-substances',
        label: 'Controlled Substances',
        icon: ShieldAlert,
        roles: ['director', 'admin', 'pharmacist'],
        category: 'clinical'
    },
    {
        href: '/dashboard/payroll',
        label: 'Payroll',
        icon: Wallet,
        roles: ['director', 'admin'],
        category: 'admin'
    },
    {
        href: '/dashboard/space-management',
        label: 'Space Management',
        icon: Building,
        roles: ['director', 'admin'],
        category: 'logistics'
    },
    {
      href: '/dashboard/my-practice/schedule',
      label: 'My Daily Schedule',
      icon: ListTodo,
      roles: ['doctor'],
      category: 'clinical'
    },
    {
      href: '/dashboard/my-practice',
      label: 'My Practice',
      icon: Stethoscope,
      roles: ['doctor'],
      badge: criticalAlertCount > 0 ? criticalAlertCount.toString() : undefined,
      category: 'clinical'
    },
     {
      href: '/dashboard/my-schedule',
      label: 'My Schedule',
      icon: CalendarClock,
      roles: ['doctor'],
      category: 'clinical'
    },
    {
      href: '/dashboard/hr',
      label: 'Human Resources',
      icon: Briefcase,
      roles: ['director', 'admin'],
      category: 'admin'
    },
    {
      href: '/dashboard/admin',
      label: 'Admin Panel',
      icon: LayoutDashboard,
      roles: ['director', 'admin'],
      category: 'admin'
    },
     {
      href: '/dashboard/supplier',
      label: 'Supplier Dashboard',
      icon: Truck,
      roles: ['supplier'],
      category: 'main'
    },
  ];

  const accessibleItems = menuItems.filter(item => {
    if (!user) return false;
    
    // 1. CEO / Super Admin Bypass
    const isSuperAdmin = (user.role as string) === 'super_admin';
    if (isSuperAdmin) return true;

    // 2. Role Access Control for everyone else
    const hasRole = (item.roles as string[]).includes(user.role);
    if (!hasRole) return false;

    // 3. Platform Protection
    const isPlatformPage = item.href.startsWith('/dashboard/super-admin');
    if (isPlatformPage) return false;

    return true; 
  });

  const categories: { id: MenuCategory; label: string; icon: any; collapsible: boolean }[] = [
    { id: 'main', label: 'General', icon: LayoutDashboard, collapsible: false },
    { id: 'platform', label: 'Platform HQ', icon: Globe, collapsible: false },
    { id: 'clinical', label: 'Clinical Ops', icon: Activity, collapsible: true },
    { id: 'finance', label: 'Finance & Revenue', icon: Wallet, collapsible: true },
    { id: 'admin', label: 'Admin & HR', icon: ShieldCheck, collapsible: true },
    { id: 'logistics', label: 'Inventory & Space', icon: Package, collapsible: true },
    { id: 'personal', label: 'My Portal', icon: UserIcon, collapsible: true },
  ];

  return (
    <SidebarMenu className="px-2 py-4">
      {categories.map((cat) => {
        const catItems = accessibleItems.filter(i => i.category === cat.id);
        if (catItems.length === 0) return null;

        if (!cat.collapsible) {
            return (
                <SidebarGroup key={cat.id} className="p-0 mb-6">
                    <SidebarGroupLabel className="px-2 mb-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                        {cat.label}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        {catItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === item.href}
                                    tooltip={item.label}
                                    className="font-bold text-xs"
                                >
                                    <Link href={item.href}>
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                                {item.badge && <SidebarMenuBadge className="bg-red-500 text-white font-black text-[9px]">{item.badge}</SidebarMenuBadge>}
                            </SidebarMenuItem>
                        ))}
                    </SidebarGroupContent>
                </SidebarGroup>
            );
        }

        return (
            <Collapsible key={cat.id} className="group/collapsible mb-2">
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={cat.label} className="font-black text-xs text-slate-500 hover:text-primary">
                            <cat.icon className="h-4 w-4" />
                            <span>{cat.label}</span>
                            <ChevronDown className="ml-auto h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub className="border-l-2 ml-4 mt-1 border-slate-100 group-data-[state=open]/collapsible:animate-in group-data-[state=open]/collapsible:fade-in-0">
                            {catItems.map((item) => (
                                <SidebarMenuSubItem key={item.href}>
                                    <SidebarMenuSubButton asChild isActive={pathname === item.href} className="h-9">
                                        <Link href={item.href} className="flex items-center gap-2 font-bold text-[11px]">
                                            <item.icon className="h-3.5 w-3.5 opacity-60" />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </SidebarMenuItem>
            </Collapsible>
        );
      })}
    </SidebarMenu>
  );
}
