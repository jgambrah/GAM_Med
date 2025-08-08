'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Home, Users, Calendar, Pill, Stethoscope, LayoutDashboard, UsersRound, Pyramid, Wrench } from 'lucide-react';
import { User } from '@/lib/types';

const allRoles: User['role'][] = ['admin', 'doctor', 'nurse', 'pharmacist', 'patient'];

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
      roles: ['admin', 'doctor', 'nurse'],
    },
    {
      href: '/dashboard/appointments',
      label: 'Appointments',
      icon: Calendar,
      roles: ['admin', 'doctor', 'nurse'],
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
      href: '/dashboard/succession-planning',
      label: 'Succession Planning',
      icon: UsersRound,
      roles: ['admin'],
    },
    {
      href: '/dashboard/talent-pools',
      label: 'Talent Pools',
      icon: Pyramid,
      roles: ['admin'],
    },
    {
      href: '/dashboard/skills-inventory',
      label: 'Skills Inventory',
      icon: Wrench,
      roles: ['admin'],
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
