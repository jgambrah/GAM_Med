
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
    ClipboardHeart
} from 'lucide-react';
import { User } from '@/lib/types';

const allRoles: User['role'][] = ['admin', 'doctor', 'nurse', 'pharmacist', 'patient', 'billing_clerk', 'lab_technician'];

export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Simplified menu specifically for the nurse role to isolate the error
  const nurseMenuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: Home,
    },
    {
      href: '/dashboard/nursing',
      label: 'Nursing Station',
      icon: ClipboardHeart,
    },
  ];

  const generalMenuItems = [
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
      roles: ['admin', 'doctor', 'billing_clerk'], // Temporarily remove nurse to isolate
    },
    {
      href: '/dashboard/beds',
      label: 'Beds',
      icon: BedDouble,
      roles: ['admin', 'doctor'], // Temporarily remove nurse to isolate
    },
    {
      href: '/dashboard/appointments',
      label: 'Appointments',
      icon: Calendar,
      roles: ['admin', 'doctor', 'billing_clerk'], // Temporarily remove nurse to isolate
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

  // Determine which menu to use based on the user's role
  const menuItems = user?.role === 'nurse' 
    ? nurseMenuItems 
    : generalMenuItems.filter(item => user && item.roles.includes(user.role));

  return (
    <SidebarMenu>
      {menuItems.map((item) => (
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
