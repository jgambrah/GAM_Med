
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
  FileText,
  Sparkles,
} from "lucide-react"
import { usePathname } from "next/navigation"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

import type { UserRole } from "@/lib/types"

const navItems = {
  Admin: [
    { href: "/", icon: LayoutDashboard, label: "Dashboard", match: "/" },
    { href: "/admin/admissions", icon: LogIn, label: "Admissions", match: "/admin/admissions" },
    { href: "/admin/patients", icon: UsersRound, label: "Patients", match: "/admin/patients" },
    { href: "/admin/billing", icon: FileText, label: "Billing", match: "/admin/billing" },
  ],
  Doctor: [
    { href: "/", icon: LayoutDashboard, label: "Dashboard", match: "/" },
    { href: "/doctor/appointments", icon: CalendarDays, label: "Appointments", match: "/doctor/appointments" },
    { href: "/doctor/patients", icon: UsersRound, label: "Patients", match: "/doctor/patients" },
  ],
  Nurse: [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/nurse/appointments", icon: CalendarDays, label: "Appointments" },
    { href: "/nurse/vitals", icon: UsersRound, label: "Patient Vitals" },
  ],
  Pharmacist: [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/pharmacist/prescriptions", icon: Pill, label: "Prescriptions" },
    { href: "/pharmacist/inventory", icon: LayoutDashboard, label: "Inventory" },
  ],
  Patient: [
    { href: "/", icon: LayoutDashboard, label: "My Dashboard", match: "/" },
    { href: "/patient/appointments", icon: CalendarDays, label: "My Appointments", match: "/patient/appointments" },
    { href: "/patient/prescriptions", icon: Pill, label: "My Prescriptions" },
  ],
  BillingClerk: [
      { href: "/", icon: FileText, label: "Discharge Queue", match: "/" },
  ],
  Housekeeping: [
      { href: "/", icon: Sparkles, label: "Cleaning Tasks", match: "/" },
  ]
}

const roleIcons: Record<UserRole, React.ElementType> = {
  Admin: ShieldCheck,
  Doctor: Stethoscope,
  Nurse: HeartPulse,
  Pharmacist: Pill,
  Patient: User,
  BillingClerk: FileText,
  Housekeeping: Sparkles,
}

export function MainNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const RoleIcon = roleIcons[role];

  const isActive = (matchPattern?: string) => {
    if (!matchPattern) return false;
    if (matchPattern === "/") return pathname === "/";
    
    // This handles exact matches and directory-level matches 
    // e.g., /patients matches /patients/some-id
    return pathname === matchPattern || pathname.startsWith(`${matchPattern}/`);
  }

  return (
    <div className="flex flex-col gap-4 px-2 py-4">
      <SidebarMenu>
        {(navItems[role] || []).map((item, index) => (
          <SidebarMenuItem key={index}>
            <SidebarMenuButton
              href={item.href}
              isActive={isActive(item.match)}
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
