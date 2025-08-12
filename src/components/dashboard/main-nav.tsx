
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
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
    ClipboardHeart,
} from 'lucide-react';
import { User } from '@/lib/types';

const allRoles: User['role'][] = ['admin', 'doctor', 'pharmacist', 'patient', 'billing_clerk', 'lab_technician', 'nurse'];

export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: Home,
      roles: allRoles,
    },
    {
      href: '/dashboard/patients',
      label: 'Patients',
      icon: Users,
      roles: ['admin', 'doctor', 'billing_clerk'],
    },
    {
      href: '/dashboard/beds',
      label: 'Beds',
      icon: BedDouble,
      roles: ['admin', 'doctor'],
    },
    {
      href: '/dashboard/appointments',
      label: 'Appointments',
      icon: Calendar,
      roles: ['admin', 'doctor', 'billing_clerk'],
    },
    {
        href: '/dashboard/referrals',
        label: 'Referrals',
        icon: Send,
        roles: ['admin', 'doctor'],
    },
    {
        href: '/dashboard/lab',
        label: 'Laboratory',
        icon: Beaker,
        roles: ['lab_technician', 'doctor'],
    },
    {
      href: '/dashboard/nursing',
      label: 'Nursing Station',
      icon: ClipboardHeart,
      roles: ['nurse'],
    },
    {
      href: '/dashboard/prescriptions',
      label: 'Prescriptions',
      icon: Pill,
      roles: ['doctor', 'pharmacist', 'patient'],
    },
    {
      href: '/dashboard/my-practice',
      label: 'My Practice',
      icon: Stethoscope,
      roles: ['doctor'],
    },
    {
      href: '/dashboard/admin',
      label: 'Admin Panel',
      icon: LayoutDashboard,
      roles: ['admin'],
    },
  ];

  const accessibleItems = menuItems.filter(item => user && item.roles.includes(user.role));

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
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
