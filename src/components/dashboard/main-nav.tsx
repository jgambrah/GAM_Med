'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Home, Users, Calendar, Pill, Stethoscope, LayoutDashboard } from 'lucide-react';

export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: Home,
      roles: ['Admin', 'Doctor', 'Nurse', 'Pharmacist', 'Patient'],
    },
    {
      href: '/dashboard/patients',
      label: 'Patients',
      icon: Users,
      roles: ['Admin', 'Doctor', 'Nurse'],
    },
    {
      href: '/dashboard/appointments',
      label: 'Appointments',
      icon: Calendar,
      roles: ['Admin', 'Doctor', 'Nurse'],
    },
    {
      href: '/dashboard/prescriptions',
      label: 'Prescriptions',
      icon: Pill,
      roles: ['Doctor', 'Pharmacist', 'Patient'],
    },
    {
      href: '/dashboard/my-practice',
      label: 'My Practice',
      icon: Stethoscope,
      roles: ['Doctor'],
    },
    {
      href: '/dashboard/admin',
      label: 'Admin Panel',
      icon: LayoutDashboard,
      roles: ['Admin'],
    },
  ];

  const accessibleItems = menuItems.filter(item => user && item.roles.includes(user.role));

  return (
    <SidebarMenu>
      {accessibleItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
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
