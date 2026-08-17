'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Wallet, FolderTree, FileText, 
  Landmark, Building2, TrendingUp, CreditCard,
  Settings, LogOut, ChevronRight, Calculator, ArrowLeftRight, BarChart3, Tag, Zap, UserCheck, History, AlertCircle, Calendar, Lock, TrendingDown, CheckCircle2, FileSearch, Library, Clock, GraduationCap, Award, Scale
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { autoClockOutIfNeeded } from '@/lib/attendance';

const menuGroups = [
  {
    title: "Financial Control",
    items: [
      { name: "Accountant Console", href: "/accountant", icon: LayoutDashboard },
      { name: "Financial Reports", href: "/accountant/reports", icon: BarChart3 },
      { name: "Chart of Accounts", href: "/accountant/coa", icon: FolderTree },
      { name: "Budgeting Console", href: "/accountant/budgets", icon: Calculator },
      { name: "Fixed Assets", href: "/accountant/assets", icon: Building2 },
      { name: "Asset Schedule", href: "/accountant/assets/schedule", icon: Calendar },
      { name: "Depreciation", href: "/accountant/assets/depreciation", icon: TrendingDown },
      { name: "Bank Reconciliation", href: "/accountant/reconciliation", icon: CheckCircle2 },
    ]
  },
  {
    title: "Transactions",
    items: [
      { name: "Journal Vouchers", href: "/accountant/journals", icon: ArrowLeftRight },
      { name: "Payment Vouchers", href: "/accountant/payments", icon: FileText },
      { name: "Vendor Registry", href: "/accountant/vendors", icon: Building2 },
      { name: "Voucher Archive", href: "/accountant/payments/archive", icon: History },
      { name: "Audit Queries", href: "/accountant/queries", icon: AlertCircle },
      { name: "Locum Payments", href: "/accountant/locum-payments", icon: UserCheck },
      { name: "Till Verification", href: "/accountant/tills", icon: CheckCircle2 },
    ]
  },
  {
    title: "Revenue & Payables",
    items: [
      { name: "Gateway Reconciliation", href: "/finance/gateway-reconciliation", icon: Scale },
      { name: "Accounts Payable", href: "/accountant/payable", icon: Landmark },
      { name: "Payer Registry", href: "/finance/receivables", icon: Building2 },
      { name: "AR Aging Report", href: "/finance/receivables/ledger", icon: TrendingUp },
      { name: "Institutional Schedule", href: "/finance/reports/institutional-schedule", icon: FileText },
      { name: "Billing Console", href: "/finance/billing", icon: CreditCard },
      { name: "Till Management", href: "/finance/till-management", icon: Lock },
      { name: "Insurance Claims", href: "/finance/insurance/claims", icon: FileText },
      { name: "Claims Vetting", href: "/finance/insurance/vetting", icon: FileSearch },
      { name: "NHIS Batching", href: "/finance/insurance/nhis-batching", icon: Library },
      { name: "Tariff Master", href: "/finance/tariffs", icon: Tag },
      { name: "General Services Setup", href: "/finance/setup", icon: Settings },
      { name: "Bulk Adjustments", href: "/finance/tariffs/bulk", icon: Zap },
    ]
  }
];

export function AccountantSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  const isLocum = userProfile?.contractType === 'LOCUM';

  const myPortalMenu = {
    title: "My Portal",
    items: [
       { name: "Request Leave", href: "/staff/request-leave", icon: Calendar },
       { name: "Clock In / Out", href: "/staff/clock-in", icon: Clock },
       isLocum ? { name: "My Locum Claims", href: "/doctor/my-claims", icon: Wallet } : { name: "My Payslips", href: "/staff/payslips", icon: Wallet },
       { name: "My CPD", href: "/staff/my-cpd", icon: GraduationCap },
       { name: "My Performance", href: "/staff/my-performance", icon: Award },
    ]
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

  return (
    <aside className="w-64 h-screen bg-slate-950 text-slate-100 flex flex-col border-r border-slate-800 hidden md:flex shrink-0">
      <div className="p-6 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
            <Wallet size={20} className="text-emerald-400" />
          </div>
          <span className="font-black text-white text-xl tracking-tight uppercase italic">Finance Desk</span>
        </div>
        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
          Accounts & Revenue
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* My Portal Menu Group */}
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 tracking-widest px-3 mb-2 uppercase">
            {myPortalMenu.title}
          </h3>
          <div className="space-y-1">
            {myPortalMenu.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                    isActive 
                      ? 'bg-emerald-600/15 text-emerald-400 font-bold border border-emerald-500/20' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <item.icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'} />
                  <span className="text-sm font-medium">{item.name}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto text-emerald-400" />}
                </Link>
              );
            })}
          </div>
        </div>

        {menuGroups.map((group, idx) => (
          <div key={idx}>
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                      isActive 
                        ? 'bg-emerald-600/15 text-emerald-400 font-bold border border-emerald-500/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <item.icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'} />
                    <span className="text-sm font-medium">{item.name}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto text-emerald-400" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-emerald-400 border border-slate-700">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.displayName || 'User'}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-emerald-400 transition cursor-pointer p-1">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
