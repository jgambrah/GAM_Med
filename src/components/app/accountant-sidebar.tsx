'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Wallet, FolderTree, FileText, 
  Landmark, Building2, TrendingUp, CreditCard,
  Settings, LogOut, ChevronRight, Calculator, ArrowLeftRight, BarChart3, Tag, Zap, UserCheck, History, AlertCircle, TrendingDown
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

const menuGroups = [
  {
    title: "Financial Control",
    items: [
      { name: "Accountant Console", href: "/accountant", icon: LayoutDashboard },
      { name: "Financial Reports", href: "/accountant/reports", icon: BarChart3 },
      { name: "Chart of Accounts", href: "/accountant/coa", icon: FolderTree },
      { name: "Fixed Assets", href: "/accountant/assets", icon: Building2 },
      { name: "Depreciation", href: "/accountant/assets/depreciation", icon: TrendingDown },
    ]
  },
  {
    title: "Transactions",
    items: [
      { name: "Journal Vouchers", href: "/accountant/journals", icon: ArrowLeftRight },
      { name: "Payment Vouchers", href: "/accountant/payments", icon: FileText },
      { name: "Voucher Archive", href: "/accountant/payments/archive", icon: History },
      { name: "Audit Queries", href: "/accountant/queries", icon: AlertCircle },
      { name: "Locum Payments", href: "/accountant/locum-payments", icon: UserCheck },
    ]
  },
  {
    title: "Receivables & Payables",
    items: [
      { name: "Accounts Payable", href: "/accountant/payable", icon: Landmark },
      { name: "Payer Registry", href: "/finance/receivables", icon: Building2 },
      { name: "AR Aging Report", href: "/finance/receivables/ledger", icon: TrendingUp },
    ]
  },
  {
    title: "Revenue Cycle",
    items: [
      { name: "Billing Console", href: "/finance/billing", icon: CreditCard },
      { name: "Insurance Claims", href: "/finance/insurance/claims", icon: FileText },
      { name: "Tariff Master", href: "/finance/tariffs", icon: Tag },
      { name: "Bulk Adjustments", href: "/finance/tariffs/bulk", icon: Zap },
    ]
  }
];

export function AccountantSidebar() {
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

  return (
    <aside className="w-64 h-screen bg-white text-slate-800 flex-col border-r border-slate-200 hidden md:flex">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Wallet size={20} className="text-primary" />
          </div>
          <span className="font-bold text-primary text-xl tracking-tight">Finance Desk</span>
        </div>
        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
          Accounts & Revenue
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        {menuGroups.map((group, idx) => (
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

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-primary border border-slate-300">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{user?.displayName || 'User'}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-destructive cursor-pointer">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
