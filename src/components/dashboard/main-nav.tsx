"use client"

import {
  CalendarDays,
  HeartPulse,
  LayoutDashboard,
  LogIn,
  Pill,
  ShieldCheck,
  Stethoscope,
  User,
  UsersRound,
} from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

import type { UserRole } from "@/lib/types"

const navItems = {
  Admin: [
    { href: "#", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/admissions", icon: LogIn, label: "Admissions" },
    { href: "#", icon: UsersRound, label: "Patients" },
    { href: "#", icon: UsersRound, label: "Staff Management" },
    { href: "#", icon: Stethoscope, label: "Departments" },
  ],
  Doctor: [
    { href: "#", icon: LayoutDashboard, label: "Dashboard" },
    { href: "#", icon: CalendarDays, label: "Appointments" },
    { href: "#", icon: UsersRound, label: "Patients" },
  ],
  Nurse: [
    { href: "#", icon: LayoutDashboard, label: "Dashboard" },
    { href: "#", icon: CalendarDays, label: "Appointments" },
    { href: "#", icon: UsersRound, label: "Patient Vitals" },
  ],
  Pharmacist: [
    { href: "#", icon: LayoutDashboard, label: "Dashboard" },
    { href: "#", icon: Pill, label: "Prescriptions" },
    { href: "#", icon: LayoutDashboard, label: "Inventory" },
  ],
  Patient: [
    { href: "#", icon: LayoutDashboard, label: "My Dashboard" },
    { href: "#", icon: CalendarDays, label: "My Appointments" },
    { href: "#", icon: Pill, label: "My Prescriptions" },
  ],
}

const roleIcons: Record<UserRole, React.ElementType> = {
  Admin: ShieldCheck,
  Doctor: Stethoscope,
  Nurse: HeartPulse,
  Pharmacist: Pill,
  Patient: User,
  BillingClerk: User,
}

export function MainNav({ role }: { role: UserRole }) {
  const RoleIcon = roleIcons[role];

  return (
    <div className="flex flex-col gap-4 px-2 py-4">
      <SidebarMenu>
        {(navItems[role] || []).map((item, index) => (
          <SidebarMenuItem key={index}>
            <SidebarMenuButton
              href={item.href}
              isActive={index === 1}
              className="justify-start"
              asChild
            >
              <a>
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </div>
  )
}
