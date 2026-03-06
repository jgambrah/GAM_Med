'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, HeartPulse, CreditCard, 
  Settings, LogOut, ChevronRight, Hospital, Package, ClipboardList, Beaker, Camera, BedDouble, Scissors, Baby, Tag, BarChart3, Clock, FileText, Truck, UserCheck, Wallet, FolderTree, ArrowLeftRight, Building2, Landmark, HardDrive, Zap, RefreshCw, AlertTriangle, Skull, CheckCircle2, Plus, ArrowUpRight, Calculator, TrendingUp, GraduationCap, Gavel, Calendar, Award, MessageSquare, CalendarDays, Activity
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

const allMenuGroups = [
  {
    title: "Clinical",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'],
    items: [
      { name: "Doctor's Desk", href: "/doctor", icon: HeartPulse },
      { name: "Weekly Calendar", href: "/doctor/calendar", icon: CalendarDays },
      { name: "Set Availability", href: "/doctor/availability", icon: Clock },
      { name: "Nursing Station", href: "/nurse", icon: UserCheck },
      { name: "Triage Queue", href: "/nurse/triage", icon: Activity },
      { name: "Shift Handover", href: "/nurse/handover", icon: ClipboardList },
      { name: "Patients", href: "/patients", icon: Users },
    ]
  },
  {
    title: "Reception",
    roles: ['DIRECTOR', 'ADMIN', 'RECEPTIONIST', 'NURSE'],
    items: [
        { name: "Front Desk", href: "/reception", icon: Users },
        { name: "Appointments", href: "/reception/appointments", icon: Calendar },
        { name: "Assign Doctor", href: "/reception/assign-doctor", icon: UserCheck },
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
      { name: "Theater Setup", href: "/theater/setup", icon: Settings },
      { name: "OT Schedule", href: "/theater/schedule", icon: Calendar },
    ]
  },
  {
    title: "Inpatient",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'],
    items: [
      { name: "Ward Setup", href: "/wards/setup", icon: BedDouble },
      { name: "Bed Management", href: "/wards/management", icon: ClipboardList },
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
      { name: "Unit Setup", href: "/specialty/setup", icon: Zap },
      { name: "Treatment Dashboard", href: "/specialty/dashboard", icon: ClipboardList },
      { name: "New Plan", href: "/specialty/plans/new", icon: Plus },
    ]
  },
  {
    title: "Requisitions",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'STORE_MANAGER', 'PHARMACIST'],
    items: [
      { name: "New Request", href: "/requisitions/new", icon: Plus },
      { name: "Approve Requests", href: "/requisitions/approve", icon: CheckCircle2 },
    ]
  },
  {
    title: "Ancillary Services",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST'],
    items: [
        { name: "Pharmacy", href: "/pharmacy", icon: Package },
        { name: "Laboratory", href: "/lab/queue", icon: Beaker },
        { name: "Radiology", href: "/radiology/queue", icon: Camera },
    ]
  },
  {
    title: "Supply Chain",
    roles: ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
    items: [
      { name: "Dashboard", href: "/supply-chain", icon: LayoutDashboard },
      { name: "Store Dashboard", href: "/supply-chain/store", icon: HardDrive },
      { name: "Suppliers", href: "/supply-chain/procurement", icon: Building2 },
      { name: "Purchase Orders", href: "/supply-chain/orders", icon: Truck },
      { name: "Issue Requisitions", href: "/supply-chain/requisitions", icon: ArrowUpRight },
      { name: "Product Catalog", href: "/supply-chain/catalog", icon: HardDrive },
      { name: "Inventory Pulse", href: "/supply-chain/inventory-pulse", icon: BarChart3 },
      { name: "Re-Order Engine", href: "/supply-chain/reorder", icon: AlertTriangle },
      { name: "Stock Disposal", href: "/supply-chain/disposal", icon: Skull },
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
      { name: "Attendance Setup", href: "/hr/attendance/setup", icon: Clock },
      { name: "Leave Management", href: "/hr/leave", icon: Calendar },
      { name: "Appraisals & KPIs", href: "/hr/appraisal", icon: HeartPulse },
      { name: "Training & CPD", href: "/hr/cpd", icon: GraduationCap },
      { name: "Disciplinary Register", href: "/hr/disciplinary", icon: Gavel },
      { name: "Payroll Config", href: "/hr/payroll/config", icon: Settings },
      { name: "Run Payroll", href: "/hr/payroll/run", icon: Calculator },
      { name: "Remittance Schedules", href: "/hr/payroll/schedules", icon: Landmark },
    ]
  },
   {
    title: "Finance",
    roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'CASHIER'],
    items: [
      { name: "Accountant Console", href: "/accountant", icon: Wallet },
      { name: "Financial Reports", href: "/accountant/reports", icon: BarChart3 },
      { name: "Chart of Accounts", href: "/accountant/coa", icon: FolderTree },
      { name: "Fixed Assets", href: "/accountant/assets", icon: Building2 },
      { name: "Journal Vouchers", href: "/accountant/journals", icon: ArrowLeftRight },
      { name: "Payment Vouchers", href: "/accountant/payments", icon: FileText },
      { name: "Accounts Payable", href: "/accountant/payable", icon: Landmark },
      { name: "Payer Registry", href: "/finance/receivables", icon: Building2 },
      { name: "AR Aging Report", href: "/finance/receivables/ledger", icon: TrendingUp },
      { name: "Billing Console", href: "/finance/billing", icon: CreditCard },
      { name: "Insurance Claims", href: "/finance/insurance/claims", icon: FileText },
      { name: "Tariff Master", href: "/finance/tariffs", icon: Tag },
      { name: "Bulk Adjustments", href: "/finance/tariffs/bulk", icon: Zap },
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
    items: [
       { name: "Request Leave", href: "/staff/request-leave", icon: Calendar },
       isLocum && { name: "My Locum Claims", href: "/doctor/my-claims", icon: Wallet },
       !isLocum && { name: "My Payslips", href: "/staff/payslips", icon: Wallet },
       { name: "My CPD", href: "/staff/my-cpd", icon: GraduationCap },
       { name: "My Performance", href: "/staff/my-performance", icon: Award },
    ].filter(Boolean) as { name: string; href: string; icon: React.ElementType }[],
  };

  const visibleMenuGroups = allMenuGroups.filter(group => 
    userRole === 'DIRECTOR' || (group.roles && group.roles.includes(userRole))
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
