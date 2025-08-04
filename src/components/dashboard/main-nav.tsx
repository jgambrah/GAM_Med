

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
  Share2,
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
    { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard", match: "/admin/dashboard" },
    { href: "/admin/admissions", icon: LogIn, label: "Admissions", match: "/admin/admissions" },
    { href: "/admin/patients", icon: UsersRound, label: "Patients", match: "/admin/patients" },
    { href: "/admin/referrals", icon: Share2, label: "Referrals", match: "/admin/referrals" },
    { href: "/admin/billing", icon: FileText, label: "Billing", match: "/admin/billing" },
    { href: "/admin/staff", icon: UsersRound, label: "Staff Management", match: "/admin/staff" },
    { href: "/admin/departments", icon: Stethoscope, label: "Departments", match: "/admin/departments" },
  ],
  Doctor: [
    { href: "/doctor/dashboard", icon: LayoutDashboard, label: "Dashboard", match: "/doctor/dashboard" },
    { href: "/doctor/appointments", icon: CalendarDays, label: "Appointments", match: "/doctor/appointments" },
    { href: "/doctor/patients", icon: UsersRound, label: "Patients", match: "/doctor/patients" },
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
    { href: "/patient/dashboard", icon: LayoutDashboard, label: "My Dashboard", match: "/patient/dashboard" },
    { href: "/patient/appointments", icon: CalendarDays, label: "My Appointments", match: "/patient/appointments" },
    { href: "#", icon: Pill, label: "My Prescriptions" },
  ],
  BillingClerk: [
      { href: "/admin/billing", icon: FileText, label: "Discharge Queue", match: "/admin/billing" },
  ],
  Housekeeping: [
      { href: "/housekeeping/dashboard", icon: Sparkles, label: "Cleaning Tasks", match: "/housekeeping/dashboard" },
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
    // Special handling for patient details and discharge pages
    if (matchPattern === "/admin/patients" && (pathname.startsWith("/admin/patients/") || pathname.startsWith("/admin/patients/[patientId]"))) {
        return true;
    }
     if (matchPattern === "/doctor/patients" && (pathname.startsWith("/doctor/patients/") || pathname.startsWith("/doctor/patients/[patientId]"))) {
        return true;
    }
    return pathname.startsWith(matchPattern);
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
