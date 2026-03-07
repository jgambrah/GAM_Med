'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, HeartPulse, CreditCard, 
  Settings, LogOut, ChevronRight, Hospital, Package, ClipboardList, Beaker, Camera, BedDouble, Scissors, Baby, Tag, BarChart3, Clock, FileText, Truck, UserCheck, Wallet, FolderTree, ArrowLeftRight, Building2, Landmark, HardDrive, Zap, RefreshCw, AlertTriangle, Skull, CheckCircle2, Plus, ArrowUpRight, Calculator, TrendingUp, GraduationCap, Gavel, Calendar, Award, MessageSquare, CalendarDays, Activity, ShieldCheck, LayoutGrid, History, ListChecks, Layers
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

const allMenuGroups = [
  {
    title: "Clinical",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'],
    items: [
      { name: "Doctor's Desk", href: "/doctor", icon: HeartPulse, roles: ['DIRECTOR', 'DOCTOR'] },
      { name: "Weekly Calendar", href: "/doctor/calendar", icon: CalendarDays, roles: ['DIRECTOR', 'DOCTOR'] },
      { name: "Set Availability", href: "/doctor/availability", icon: Clock, roles: ['DIRECTOR', 'DOCTOR'] },
      { name: "Nursing Station", href: "/nurse", icon: UserCheck, roles: ['DIRECTOR', 'NURSE'] },
      { name: "Triage Queue", href: "/nurse/triage", icon: Activity, roles: ['DIRECTOR', 'NURSE'] },
      { name: "Shift Handover", href: "/nurse/handover", icon: ClipboardList, roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'] },
      { name: "Patients", href: "/patients", icon: Users, roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
    ]
  },
  {
    title: "Reception",
    roles: ['DIRECTOR', 'ADMIN', 'RECEPTIONIST', 'NURSE'],
    items: [
        { name: "Front Desk", href: "/reception", icon: Users, roles: ['DIRECTOR', 'ADMIN', 'RECEPTIONIST', 'NURSE'] },
        { name: "Appointments", href: "/reception/appointments", icon: Calendar, roles: ['DIRECTOR', 'ADMIN', 'RECEPTIONIST', 'NURSE'] },
        { name: "Assign Doctor", href: "/reception/assign-doctor", icon: UserCheck, roles: ['DIRECTOR', 'ADMIN', 'RECEPTIONIST', 'NURSE'] },
    ]
  },
  {
    title: "Analytics",
    roles: ['DIRECTOR', 'ADMIN'],
    items: [
      { name: "Performance", href: "/director/reports", icon: BarChart3 },
      { name: "GHS Returns", href: "/director/reports/ghs", icon: Landmark },
    ]
  },
  {
    title: "Communication",
    roles: ['DIRECTOR', 'ADMIN'],
    items: [
      { name: "Comms Hub", href: "/director/communication", icon: MessageSquare },
    ]
  },
  {
    title: "Operating Theater",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'],
    items: [
      { name: "Theater Setup", href: "/theater/setup", icon: Settings, roles: ['DIRECTOR', 'ADMIN'] },
      { name: "OT Schedule", href: "/theater/schedule", icon: Calendar, roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'] },
    ]
  },
  {
    title: "Inpatient",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'],
    items: [
      { name: "Ward Setup", href: "/wards/setup", icon: BedDouble, roles: ['DIRECTOR', 'ADMIN'] },
      { name: "Bed Management", href: "/wards/management", icon: ClipboardList, roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'] },
    ]
  },
  {
    title: "Maternity",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'],
    items: [
      { name: "ANC Dashboard", href: "/maternity/dashboard", icon: Baby },
    ]
  },
  {
    title: "Specialty Units",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'],
    items: [
      { name: "Unit Setup", href: "/specialty/setup", icon: Zap, roles: ['DIRECTOR', 'ADMIN'] },
      { name: "Treatment Dashboard", href: "/specialty/dashboard", icon: ClipboardList, roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'] },
      { name: "New Plan", href: "/specialty/plans/new", icon: Plus, roles: ['DIRECTOR', 'ADMIN', 'DOCTOR'] },
    ]
  },
  {
    title: "Requisitions",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'STORE_MANAGER', 'PHARMACIST'],
    items: [
      { name: "New Request", href: "/requisitions/new", icon: Plus, roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'STORE_MANAGER', 'PHARMACIST'] },
      { name: "Approve Requests", href: "/requisitions/approve", icon: CheckCircle2, roles: ['DIRECTOR', 'ADMIN'] },
    ]
  },
  {
    title: "Ancillary Services",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST'],
    items: [
        { name: "Pharmacy", href: "/pharmacy", icon: Package, roles: ['DIRECTOR', 'ADMIN', 'PHARMACIST'] },
        { name: "Laboratory", href: "/lab/queue", icon: Beaker, roles: ['DIRECTOR', 'ADMIN', 'LAB_TECH'] },
        { name: "Radiology", href: "/radiology/queue", icon: Camera, roles: ['DIRECTOR', 'ADMIN', 'RADIOLOGIST'] },
    ]
  },
  {
    title: "Administrative",
    roles: ['DIRECTOR', 'ADMIN'],
    items: [
      { name: "Staff", href: "/staff", icon: Users },
      { name: "Procedure Setup", href: "/procedures/setup", icon: Scissors },
      { name: "Subscription", href: "/director/subscription", icon: CreditCard },
    ]
  },
   {
    title: "Human Resources",
    roles: ['DIRECTOR', 'ADMIN', 'HR_MANAGER'],
    items: [
      { name: "HR Dashboard", href: "/hr", icon: Users },
      { name: "Department Manager", href: "/hr/departments", icon: LayoutGrid },
      { name: "Attendance Setup", href: "/hr/attendance/setup", icon: Clock },
      { name: "Leave Management", href: "/hr/leave", icon: Calendar },
      { name: "Appraisals & KPIs", href: "/hr/appraisal", icon: HeartPulse },
      { name: "Training & CPD", href: "/hr/cpd", icon: GraduationCap },
      { name: "Disciplinary Register", href: "/hr/disciplinary", icon: Gavel },
      { name: "Payroll Config", href: "/hr/payroll/config", icon: Settings },
      { name: "Salary Grades", href: "/hr/payroll/grades", icon: Layers },
      { name: "Payroll Items", href: "/hr/payroll/items", icon: ListChecks },
      { name: "Run Payroll", href: "/hr/payroll/run", icon: Calculator },
      { name: "Payroll Archives", href: "/hr/payroll/archives", icon: History },
      { name: "Locum Tracker", href: "/hr/locum-tracker", icon: UserCheck },
      { name: "Remittance Schedules", href: "/hr/payroll/schedules", icon: Landmark },
    ]
  },
   {
    title: "Finance",
    roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'CASHIER'],
    items: [
      { name: "Accountant Console", href: "/accountant", icon: Wallet, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Financial Reports", href: "/accountant/reports", icon: BarChart3, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Chart of Accounts", href: "/accountant/coa", icon: FolderTree, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Fixed Assets", href: "/accountant/assets", icon: Building2, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Journal Vouchers", href: "/accountant/journals", icon: ArrowLeftRight, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Payment Vouchers", href: "/accountant/payments", icon: FileText, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Accounts Payable", href: "/accountant/payable", icon: Landmark, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Payer Registry", href: "/finance/receivables", icon: Building2, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "AR Aging Report", href: "/finance/receivables/ledger", icon: TrendingUp, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Billing Console", href: "/finance/billing", icon: CreditCard, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'CASHIER'] },
      { name: "Insurance Claims", href: "/finance/insurance/claims", icon: FileText, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Tariff Master", href: "/finance/tariffs", icon: Tag, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Bulk Adjustments", href: "/finance/tariffs/bulk", icon: Zap, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
    ]
  },
  {
    title: "Internal Audit",
    roles: ['DIRECTOR', 'ADMIN', 'AUDITOR'],
    items: [
       { name: "Audit Console", href: "/auditor", icon: ShieldCheck },
    ]
  },
];

export function DirectorSidebar({ userProfile }: { userProfile: any }) {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
    router.push('/');
  };

  const userRole = userProfile?.role;
  const isLocum = userProfile?.contractType === 'LOCUM';

  const myPortalMenu = {
    title: "My Portal",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'ACCOUNTANT', 'CASHIER', 'HR_MANAGER', 'STORE_MANAGER', 'RECEPTIONIST'],
    items: [
       { name: "Request Leave", href: "/staff/request-leave", icon: Calendar },
       isLocum && { name: "My Locum Claims", href: "/doctor/my-claims", icon: Wallet },
       !isLocum && { name: "My Payslips", href: "/staff/payslips", icon: Wallet },
       { name: "My CPD", href: "/staff/my-cpd", icon: GraduationCap },
       { name: "My Performance", href: "/staff/my-performance", icon: Award },
    ].filter(Boolean) as { name: string; href: string; icon: React.ElementType, roles?: string[] }[],
  };

  const visibleMenuGroups = allMenuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => 
      userRole === 'DIRECTOR' || // Director sees all items in a group they can see
      !item.roles || 
      (item.roles && item.roles.includes(userRole))
    )
  })).filter(group => 
    group.items.length > 0 && // Group must have items left after filtering
    (userRole === 'DIRECTOR' || (group.roles && group.roles.includes(userRole)))
  );


  return (
    <div className="w-64 h-screen bg-white text-slate-800 flex-col border-r border-slate-200 hidden md:flex">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Hospital size={20} className="text-primary" />
          </div>
          <span className="font-bold text-primary text-xl tracking-tight">GAM_Med</span>
        </div>
        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
          Hospital Portal
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4">
        {[...visibleMenuGroups, myPortalMenu].map((group, idx) => (
          <div key={idx} className="mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 tracking-widest px-3 mb-2 uppercase">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all group ${
                      isActive ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-100'
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-sm font-medium">{item.name}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto text-primary" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Profile */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-primary border border-slate-300">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{user?.displayName || 'Director'}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-destructive cursor-pointer">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
