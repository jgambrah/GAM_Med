
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, HeartPulse, CreditCard, 
  Settings, LogOut, ChevronRight, Hospital, Package, ClipboardList, Beaker, Camera, BedDouble, Scissors, Baby, Tag, BarChart3, Clock, FileText, Truck, UserCheck, Wallet, FolderTree, ArrowLeftRight, Building2, Landmark, HardDrive, Zap, AlertTriangle, Skull, CheckCircle2, Plus, ArrowUpRight, Calculator, TrendingUp, GraduationCap, Gavel, Calendar, Award, MessageSquare, CalendarDays, Activity, ShieldCheck, Layers, History, Archive, Droplets, FileSignature, Lock, FileSearch, Library, ListChecks, UserPlus, LayoutGrid, FileUp, Trash2
} from 'lucide-react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { autoClockOutIfNeeded } from '@/lib/attendance';

const allMenuGroups = [
  {
    title: "Clinical",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RADIOLOGIST', 'LAB_TECH'],
    items: [
      { name: "Doctor's Desk", href: "/doctor", icon: HeartPulse, roles: ['DIRECTOR', 'DOCTOR'] },
      { name: "Weekly Calendar", href: "/doctor/calendar", icon: CalendarDays, roles: ['DIRECTOR', 'DOCTOR'] },
      { name: "Set Availability", href: "/doctor/availability", icon: Clock, roles: ['DIRECTOR', 'DOCTOR'] },
      { name: "Nursing Station", href: "/nurse", icon: UserCheck, roles: ['DIRECTOR', 'NURSE'] },
      { name: "Triage Queue", href: "/nurse/triage", icon: Activity, roles: ['DIRECTOR', 'NURSE'] },
      { name: "Shift Handover", href: "/nurse/handover", icon: ClipboardList, roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE'] },
      { name: "Patients", href: "/patients", icon: Users, roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'RADIOLOGIST', 'LAB_TECH'] },
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
    title: "Laboratory",
    roles: ['DIRECTOR', 'ADMIN', 'LAB_TECH'],
    items: [
      { name: "Diagnostic Queue", href: "/lab/queue", icon: LayoutDashboard },
      { name: "Blood Inventory", href: "/lab/blood-bank/inventory", icon: Droplets },
      { name: "Donor Registry", href: "/lab/blood-bank/donors", icon: Users },
      { name: "Test Menu Setup", href: "/lab/setup", icon: Settings },
    ]
  },
  {
    title: "Pharmacy",
    roles: ['DIRECTOR', 'ADMIN', 'PHARMACIST'],
    items: [
      { name: "Pharmacy Hub", href: "/pharmacy", icon: LayoutDashboard },
      { name: "Dispensing Queue", href: "/pharmacy/dispensing", icon: ClipboardList },
      { name: "Inventory", href: "/pharmacy/inventory", icon: Package },
      { name: "Shelf Disposal", href: "/pharmacy/disposal", icon: Trash2, roles: ['DIRECTOR', 'ADMIN', 'PHARMACIST'] },
      { name: "New Requisition", href: "/requisitions/new", icon: ArrowUpRight, roles: ['DIRECTOR', 'ADMIN', 'PHARMACIST'] },
      { name: "My Requisitions", href: "/pharmacy/requisitions", icon: ClipboardList, roles: ['DIRECTOR', 'ADMIN', 'PHARMACIST'] },
    ]
  },
  {
    title: "Radiology",
    roles: ['DIRECTOR', 'ADMIN', 'RADIOLOGIST'],
    items: [
      { name: "Radiology Hub", href: "/radiology", icon: Camera },
      { name: "Imaging Queue", href: "/radiology/queue", icon: LayoutDashboard },
      { name: "Imaging Menu", href: "/radiology/setup", icon: Settings },
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
    title: "Mortuary Services",
    roles: ['DIRECTOR', 'ADMIN', 'MORTUARY_ATTENDANT'],
    items: [
        { name: "Body Intake", href: "/mortuary/intake", icon: UserPlus, roles: ['DIRECTOR', 'ADMIN', 'MORTUARY_ATTENDANT'] },
        { name: "Mortuary Register", href: "/mortuary/register", icon: FileText, roles: ['DIRECTOR', 'ADMIN', 'MORTUARY_ATTENDANT'] },
        { name: "Release Archive", href: "/mortuary/archive", icon: Archive, roles: ['DIRECTOR', 'ADMIN', 'MORTUARY_ATTENDANT'] },
        { name: "Setup", href: "/mortuary/setup", icon: Settings, roles: ['DIRECTOR', 'ADMIN'] },
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
    title: "Supply Chain",
    roles: ['DIRECTOR', 'ADMIN', 'STORE_MANAGER'],
    items: [
      { name: "Procurement", href: "/supply-chain", icon: Truck },
      { name: "Suppliers", href: "/supply-chain/procurement", icon: Building2 },
      { name: "Product Catalog", href: "/supply-chain/catalog", icon: HardDrive },
      { name: "Purchase Orders", href: "/supply-chain/orders", icon: FileText },
      { name: "Re-Order Intel", href: "/supply-chain/reorder", icon: TrendingUp },
      { name: "Bulk Stock Upload", href: "/supply-chain/bulk-upload", icon: FileUp },
      { name: "Inventory Pulse", href: "/supply-chain/inventory-pulse", icon: BarChart3 },
      { name: "Store Dashboard", href: "/supply-chain/store", icon: LayoutGrid },
      { name: "Disposal Archive", href: "/supply-chain/disposal/logs", icon: History },
      { name: "New Disposal", href: "/supply-chain/disposal", icon: Archive },
    ]
  },
  {
    title: "Requisitions",
    roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'STORE_MANAGER', 'PHARMACIST'],
    items: [
      { name: "New Request (Supplies)", href: "/requisitions/new", icon: Plus, roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'STORE_MANAGER', 'PHARMACIST'] },
      { name: "New Request (Service)", href: "/requisitions/new-service", icon: FileSignature, roles: ['DIRECTOR', 'ADMIN', 'DOCTOR', 'NURSE', 'STORE_MANAGER', 'PHARMACIST'] },
      { name: "Approve Supplies", href: "/requisitions/approve", icon: CheckCircle2, roles: ['DIRECTOR', 'ADMIN'] },
      { name: "Approve Services", href: "/requisitions/approve-service", icon: CheckCircle2, roles: ['DIRECTOR', 'ADMIN'] },
      { name: "Certify Service", href: "/supply-chain/services/certify", icon: Award, roles: ['DIRECTOR', 'ADMIN', 'STORE_MANAGER'] },
      { name: "JCC Archive", href: "/supply-chain/services/archive", icon: History, roles: ['DIRECTOR', 'ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'] },
    ]
  },
  {
    title: "Administrative",
    roles: ['DIRECTOR', 'ADMIN'],
    items: [
      { name: "Hospital Profile", href: "/director/profile", icon: Settings },
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
      { name: "Staff Directory", href: "/staff", icon: Users },
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
      { name: "Budgeting Console", href: "/accountant/budgets", icon: Calculator, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Fixed Assets", href: "/accountant/assets", icon: Building2, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Journal Vouchers", href: "/accountant/journals", icon: ArrowLeftRight, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Payment Vouchers", href: "/accountant/payments", icon: FileText, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Vendor Registry", href: "/accountant/vendors", icon: Building2, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Accounts Payable", href: "/accountant/payable", icon: Landmark, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Payer Registry", href: "/finance/receivables", icon: Building2, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "AR Aging Report", href: "/finance/receivables/ledger", icon: TrendingUp, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Bank Reconciliation", href: "/accountant/reconciliation", icon: CheckCircle2, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Billing Console", href: "/finance/billing", icon: CreditCard, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'CASHIER'] },
      { name: "Insurance Claims", href: "/finance/insurance/claims", icon: FileText, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Claims Vetting", href: "/finance/insurance/vetting", icon: FileSearch, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "NHIS Batching", href: "/finance/insurance/nhis-batching", icon: Library, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "Tariff Master", href: "/finance/tariffs", icon: Tag, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
      { name: "General Services Setup", href: "/finance/setup", icon: Settings, roles: ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'] },
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
  const firestore = useFirestore();

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [hasInitialized, setHasInitialized] = useState(false);

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleLogout = async () => {
    if (auth && firestore && user?.uid) {
      try {
        await autoClockOutIfNeeded(user.uid, firestore, userProfile);
      } catch (err) {
        console.error("Error during auto clock-out on logout:", err);
      }
    }

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
       { name: "Clock In / Out", href: "/staff/clock-in", icon: Clock },
       isLocum && { name: "My Locum Claims", href: "/doctor/my-claims", icon: Wallet },
       !isLocum && { name: "My Payslips", href: "/staff/payslips", icon: Wallet },
       { name: "My CPD", href: "/staff/my-cpd", icon: GraduationCap },
       { name: "My Performance", href: "/staff/my-performance", icon: Award },
    ].filter(Boolean) as { name: string; href: string; icon: React.ElementType, roles?: string[] }[],
  };

  const visibleMenuGroups = allMenuGroups.map(group => ({
    ...group,
    items: group.items.filter((item: any) => 
      userRole === 'DIRECTOR' || // Director sees all items in a group they can see
      !item.roles || 
      (item.roles && item.roles.includes(userRole))
    )
  })).filter(group => 
    group.items.length > 0 && // Group must have items left after filtering
    (userRole === 'DIRECTOR' || (group.roles && group.roles.includes(userRole)))
  );

  // Initialize and auto-expand active group
  useEffect(() => {
    if (!hasInitialized && (visibleMenuGroups.length > 0 || myPortalMenu.items.length > 0)) {
      const initial: Record<string, boolean> = {};
      
      // Collapse all groups by default
      [myPortalMenu, ...visibleMenuGroups].forEach(group => {
        initial[group.title] = true;
      });

      // Find the group with the active item and expand it
      const activeGroup = [myPortalMenu, ...visibleMenuGroups].find(group => 
        group.items.some(item => pathname === item.href)
      );

      if (activeGroup) {
        initial[activeGroup.title] = false;
      } else {
        // Fallback: keep My Portal open if no matching active items (e.g. main dashboard)
        initial["My Portal"] = false;
      }

      setCollapsedGroups(initial);
      setHasInitialized(true);
    }
  }, [pathname, visibleMenuGroups, hasInitialized]);

  // Expand parent group when pathname updates
  useEffect(() => {
    if (hasInitialized) {
      const activeGroup = [myPortalMenu, ...visibleMenuGroups].find(group => 
        group.items.some(item => pathname === item.href)
      );
      if (activeGroup) {
        setCollapsedGroups(prev => ({
          ...prev,
          [activeGroup.title]: false
        }));
      }
    }
  }, [pathname, hasInitialized]);

  return (
    <div className="w-64 h-screen bg-white text-slate-800 flex-col border-r border-slate-200 hidden md:flex print:hidden">
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
        {[myPortalMenu, ...visibleMenuGroups].map((group, idx) => {
          const isCollapsed = collapsedGroups[group.title] ?? false;
          return (
            <div key={idx} className="mb-4">
              <button 
                type="button"
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 tracking-widest px-3 mb-2 uppercase hover:text-slate-700 transition-colors select-none text-left"
              >
                <span>{group.title}</span>
                <ChevronRight 
                  size={12} 
                  className={`text-slate-400 transition-transform duration-200 ${!isCollapsed ? 'rotate-90 text-primary' : ''}`} 
                />
              </button>
              
              <div 
                className="space-y-1 transition-all duration-300 ease-in-out overflow-hidden"
                style={{ 
                  maxHeight: isCollapsed ? '0px' : '850px',
                  opacity: isCollapsed ? 0 : 1,
                  visibility: isCollapsed ? 'hidden' : 'visible'
                }}
              >
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
          );
        })}
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
