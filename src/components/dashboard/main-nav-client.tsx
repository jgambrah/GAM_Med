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
  Activity,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';
import type { User } from '@/lib/types';
import { mockAlerts, allAdmissions } from '@/lib/data';

// ─── Role Groups ─────────────────────────────────────────────────────────────
const allRoles: User['role'][] = [
  'super_admin', 'director', 'admin', 'doctor', 'nurse', 'pharmacist',
  'patient', 'billing_clerk', 'lab_technician', 'ot_coordinator',
  'receptionist', 'radiologist', 'dietitian', 'housekeeping',
  'space_manager', 'supplier',
];
const staffRoles: User['role'][] = [
  'director', 'admin', 'doctor', 'nurse', 'pharmacist', 'billing_clerk',
  'lab_technician', 'ot_coordinator', 'receptionist', 'radiologist',
  'dietitian', 'space_manager',
];

// ─── Category Types ───────────────────────────────────────────────────────────
type MenuCategory =
  | 'general'       
  | 'platform'      
  | 'my_practice'   
  | 'clinical'      
  | 'diagnostics'   
  | 'theatre'       
  | 'pharmacy'      
  | 'finance'       
  | 'admin'         
  | 'logistics'     
  | 'personal'      
  | 'supplier';     

// ─── Menu Item Schema ─────────────────────────────────────────────────────────
type MenuItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: User['role'][];
  category: MenuCategory;
  badge?: string;
};

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
    return mockAlerts.filter(
      alert =>
        myPatientIds.has(alert.patientId || '') &&
        alert.severity === 'Critical' &&
        !alert.isAcknowledged
    ).length;
  }, [user]);

  const menuItems: MenuItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home, roles: allRoles, category: 'general' },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, roles: allRoles, category: 'general' },

    { href: '/dashboard/super-admin/pulse', label: 'Platform Pulse', icon: Zap, roles: ['super_admin'], category: 'platform' },
    { href: '/dashboard/super-admin/leads', label: 'Sales Leads', icon: Inbox, roles: ['super_admin'], category: 'platform' },
    { href: '/dashboard/super-admin/pricing', label: 'Pricing Control', icon: CreditCard, roles: ['super_admin'], category: 'platform' },
    { href: '/dashboard/super-admin', label: 'Hospital Registry', icon: Globe, roles: ['super_admin'], category: 'platform' },

    { href: '/dashboard/my-practice', label: 'Practice Workbench', icon: Stethoscope, roles: ['doctor'], category: 'my_practice', badge: criticalAlertCount > 0 ? criticalAlertCount.toString() : undefined },
    { href: '/dashboard/my-practice/schedule', label: 'Daily Schedule', icon: ListTodo, roles: ['doctor'], category: 'my_practice' },
    { href: '/dashboard/my-schedule', label: 'Shift Calendar', icon: CalendarClock, roles: ['doctor'], category: 'my_practice' },

    { href: '/dashboard/reception/register-patient', label: 'Register Patient', icon: UserPlus, roles: ['director', 'admin', 'receptionist'], category: 'clinical' },
    { href: '/dashboard/reception/referrals', label: 'Incoming Referrals', icon: Inbox, roles: ['director', 'admin', 'receptionist'], category: 'clinical' },
    { href: '/dashboard/records/all-patients', label: 'Patient Directory', icon: FolderSearch, roles: ['director', 'admin', 'doctor', 'nurse', 'receptionist'], category: 'clinical' },
    { href: '/dashboard/patients', label: 'Clinical Workbench', icon: Stethoscope, roles: ['director', 'admin', 'doctor', 'nurse'], category: 'clinical', badge: criticalAlertCount > 0 ? criticalAlertCount.toString() : undefined },
    { href: '/dashboard/nursing', label: 'Nursing Station', icon: ClipboardCheck, roles: ['nurse'], category: 'clinical' },
    { href: '/dashboard/wards', label: 'Ward Management', icon: LayoutGrid, roles: ['director', 'admin', 'doctor', 'nurse'], category: 'clinical' },
    { href: '/dashboard/beds', label: 'Facility Census', icon: BedDouble, roles: ['director', 'admin', 'doctor', 'nurse'], category: 'clinical' },
    { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar, roles: ['director', 'admin', 'doctor', 'patient', 'receptionist'], category: 'clinical' },
    { href: '/dashboard/referrals', label: 'Referrals Out', icon: Send, roles: ['director', 'admin', 'doctor'], category: 'clinical' },
    { href: '/dashboard/dietary', label: 'Dietary', icon: Apple, roles: ['director', 'admin', 'dietitian', 'nurse'], category: 'clinical' },
    { href: '/dashboard/director/analytics', label: 'Executive Insights', icon: TrendingUp, roles: ['director'], category: 'clinical' },

    { href: '/dashboard/lab', label: 'Laboratory', icon: Beaker, roles: ['lab_technician', 'doctor'], category: 'diagnostics' },
    { href: '/dashboard/lab/reports', label: 'Lab Reports', icon: BarChart, roles: ['director', 'admin', 'lab_technician'], category: 'diagnostics' },
    { href: '/dashboard/radiology', label: 'Radiology', icon: Scan, roles: ['director', 'admin', 'doctor', 'radiologist'], category: 'diagnostics' },

    { href: '/dashboard/surgery', label: 'OT Status Board', icon: Monitor, roles: ['director', 'admin', 'doctor', 'ot_coordinator'], category: 'theatre' },
    { href: '/dashboard/ot', label: 'OT Schedule', icon: Scissors, roles: ['director', 'admin', 'doctor', 'ot_coordinator'], category: 'theatre' },

    { href: '/dashboard/pharmacy', label: 'Dispensary', icon: Pill, roles: ['director', 'admin', 'pharmacist', 'doctor', 'nurse'], category: 'pharmacy' },
    { href: '/dashboard/pharmacy/controlled-substances', label: 'Narcotics Register', icon: ShieldAlert, roles: ['director', 'admin', 'pharmacist'], category: 'pharmacy' },

    { href: '/dashboard/finance', label: 'Finance Hub', icon: Wallet, roles: ['director', 'admin', 'billing_clerk'], category: 'finance' },
    { href: '/dashboard/payroll', label: 'Payroll', icon: CreditCard, roles: ['director', 'admin'], category: 'finance' },
    { href: '/dashboard/approvals', label: 'Approvals', icon: CheckSquare, roles: ['director', 'admin', 'doctor'], category: 'finance' },

    { href: '/dashboard/admin', label: 'Admin Panel', icon: LayoutDashboard, roles: ['director', 'admin'], category: 'admin' },
    { href: '/dashboard/hr', label: 'Human Resources', icon: Briefcase, roles: ['director', 'admin'], category: 'admin' },
    { href: '/dashboard/director/staff', label: 'Staff Management', icon: UserCog, roles: ['director'], category: 'admin' },
    { href: '/dashboard/admin/staff', label: 'Facility Staff', icon: Users, roles: ['admin'], category: 'admin' },
    { href: '/dashboard/records/compliance', label: 'Statutory Returns', icon: FileSpreadsheet, roles: ['director', 'admin'], category: 'admin' },

    { href: '/dashboard/inventory', label: 'Medical Supplies', icon: Package, roles: ['director', 'admin', 'pharmacist'], category: 'logistics' },
    { href: '/dashboard/inventory/equipment', label: 'Medical Equipment', icon: Microscope, roles: ['director', 'admin', 'nurse'], category: 'logistics' },
    { href: '/dashboard/pharmacy/suppliers', label: 'Suppliers', icon: Truck, roles: ['director', 'admin', 'pharmacist'], category: 'logistics' },
    { href: '/dashboard/space-management', label: 'Space Management', icon: Building, roles: ['director', 'admin'], category: 'logistics' },

    { href: `/dashboard/hr/staff/${user?.uid}`, label: 'My Profile', icon: Contact, roles: staffRoles, category: 'personal' },
    { href: '/dashboard/my-claims', label: 'My Claims', icon: Receipt, roles: staffRoles, category: 'personal' },
    { href: '/dashboard/my-leave', label: 'My Leave', icon: CalendarOff, roles: staffRoles, category: 'personal' },
    { href: '/dashboard/my-records', label: 'My Records', icon: FileText, roles: ['patient'], category: 'personal' },
    { href: '/dashboard/my-records/health-library', label: 'Health Library', icon: BookHeart, roles: ['patient'], category: 'personal' },
    { href: '/dashboard/my-billing', label: 'My Billing', icon: CreditCard, roles: ['patient'], category: 'personal' },

    { href: '/dashboard/supplier', label: 'Supplier Portal', icon: Truck, roles: ['supplier'], category: 'supplier' },
  ];

  const accessibleItems = React.useMemo(() => {
    if (!user) return [];
    
    return menuItems.filter(item => {
      const userRoleStr = user.role as string;
      if (userRoleStr === 'super_admin') return true;
      const isPlatformPage = item.href.startsWith('/dashboard/super-admin');
      if (isPlatformPage) return false;
      return (item.roles as string[]).includes(userRoleStr);
    });
  }, [user]);

  const categories: {
    id: MenuCategory;
    label: string;
    icon: React.ElementType;
    collapsible: boolean;
    defaultOpen?: boolean;
  }[] = [
    { id: 'general',      label: 'General',              icon: Home,           collapsible: false },
    { id: 'platform',     label: 'Platform HQ',          icon: Globe,          collapsible: false },
    { id: 'my_practice',  label: 'My Practice',          icon: Stethoscope,    collapsible: false },
    { id: 'clinical',     label: 'Clinical Ops',         icon: Activity,       collapsible: true, defaultOpen: true },
    { id: 'diagnostics',  label: 'Diagnostics',          icon: Microscope,     collapsible: true, defaultOpen: false },
    { id: 'theatre',      label: 'Theatre',              icon: Scissors,       collapsible: true, defaultOpen: false },
    { id: 'pharmacy',     label: 'Pharmacy',             icon: Pill,           collapsible: true, defaultOpen: false },
    { id: 'finance',      label: 'Finance & Revenue',    icon: Wallet,         collapsible: true, defaultOpen: false },
    { id: 'admin',        label: 'Admin & HR',           icon: ShieldCheck,    collapsible: true, defaultOpen: false },
    { id: 'logistics',    label: 'Inventory & Space',    icon: Package,        collapsible: true, defaultOpen: false },
    { id: 'personal',     label: 'My Portal',            icon: UserIcon,       collapsible: true, defaultOpen: false },
    { id: 'supplier',     label: 'Supplier Portal',      icon: Truck,          collapsible: false },
  ];

  return (
    <SidebarMenu className="px-2 py-4">
      {categories.map((cat) => {
        const catItems = accessibleItems.filter(i => i.category === cat.id);
        if (catItems.length === 0) return null;

        if (!cat.collapsible) {
          return (
            <SidebarGroup key={cat.id} className="p-0 mb-4">
              <SidebarGroupLabel className="px-2 mb-1 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                {cat.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
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
                      {item.badge && (
                        <SidebarMenuBadge className="bg-red-500 text-white font-black text-[9px]">
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        }

        const hasActiveChild = catItems.some(i => pathname === i.href || pathname.startsWith(i.href + '/'));
        const shouldDefaultOpen = hasActiveChild || cat.defaultOpen;

        return (
          <Collapsible key={cat.id} defaultOpen={shouldDefaultOpen} className="group/collapsible mb-2">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={cat.label}
                  className="font-black text-xs text-slate-500 hover:text-primary transition-colors"
                >
                  <cat.icon className="h-4 w-4" />
                  <span>{cat.label}</span>
                  <ChevronDown className="ml-auto h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="border-l-2 ml-4 mt-1 border-slate-100">
                  {catItems.map((item) => (
                    <SidebarMenuSubItem key={item.href}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === item.href}
                        className="h-9"
                      >
                        <Link href={item.href} className="flex items-center gap-2 font-bold text-[11px]">
                          <item.icon className="h-3.5 w-3.5 opacity-60" />
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto bg-red-500 text-white font-black text-[9px] rounded-full px-1.5 py-0.5">
                              {item.badge}
                            </span>
                          )}
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
