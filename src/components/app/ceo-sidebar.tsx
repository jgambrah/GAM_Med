'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, Zap, CreditCard, 
  ShieldAlert, Activity, Database, HeartPulse,
  ClipboardList, Settings, LogOut, ChevronRight, Globe, History
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

const menuGroups = [
  {
    title: "OVERSIGHT",
    items: [
      { name: "Pulse Dashboard", href: "/app-ceo/dashboard", icon: LayoutDashboard },
      { name: "Health Insights", href: "/app-ceo/health-insights", icon: Globe },
    ]
  },
  {
    title: "SALES & LEADS",
    items: [
      { name: "Leads Pipeline", href: "/app-ceo/leads", icon: HeartPulse },
    ]
  },
  {
    title: "PROVISIONING",
    items: [
      { name: "Hospital Register", href: "/app-ceo/hospitals", icon: Database },
      { name: "New Deployment", href: "/app-ceo/onboard", icon: Zap },
    ]
  },
  {
    title: "FINANCE",
    items: [
      { name: "Pricing Plans", href: "/app-ceo/pricing", icon: CreditCard },
      { name: "Revenue Console", href: "/app-ceo/billing", icon: CreditCard },
    ]
  },
  {
    title: "GOVERNANCE",
    items: [
      { name: "Kill-Switch", href: "#", icon: ShieldAlert },
    ]
  },
  {
    title: "SYSTEM",
    items: [
      { name: "Personnel Master", href: "#", icon: Users },
      { name: "Security Hub", href: "/app-ceo/security", icon: Settings },
      { name: "Audit Log", href: "/app-ceo/audit-logs", icon: History },
    ]
  }
];

export function CeoSidebar() {
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
    <div className="w-64 h-screen bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Zap size={20} className="text-white fill-current" />
          </div>
          <span className="font-bold text-white text-xl tracking-tight">GAM_Med</span>
        </div>
        <div className="bg-blue-900/30 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full inline-block">
          CEO COMMAND CENTRE
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="mb-6">
            <h3 className="text-[10px] font-bold text-slate-500 tracking-widest px-2 mb-2">
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
                      isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'} />
                    <span className="text-sm font-medium">{item.name}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white border border-slate-600">
            {user?.displayName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.displayName}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 cursor-pointer">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
