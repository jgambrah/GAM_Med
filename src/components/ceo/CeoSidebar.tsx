'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, Zap, CreditCard, 
  ShieldAlert, Activity, Database, HeartPulse,
  ClipboardList, Settings, LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

const menuGroups = [
  {
    title: "OVERSIGHT",
    items: [
      { name: "Pulse Dashboard", href: "/ceo/dashboard", icon: LayoutDashboard },
      { name: "Activity Feed", href: "/ceo/activity", icon: Activity },
    ]
  },
  {
    title: "SALES & LEADS",
    items: [
      { name: "Leads Pipeline", href: "/ceo/leads", icon: HeartPulse },
      { name: "Demo Requests", href: "/ceo/demos", icon: ClipboardList },
    ]
  },
  {
    title: "PROVISIONING",
    items: [
      { name: "Hospital Register", href: "/ceo/hospitals", icon: Database },
      { name: "New Deployment", href: "/ceo/onboard", icon: Zap },
    ]
  },
  {
    title: "FINANCE",
    items: [
      { name: "Pricing Plans", href: "/ceo/pricing", icon: CreditCard },
      { name: "Revenue Console", href: "/ceo/revenue", icon: CreditCard },
    ]
  },
  {
    title: "GOVERNANCE",
    items: [
      { name: "Kill-Switch", href: "/ceo/governance", icon: ShieldAlert },
    ]
  },
  {
    title: "SYSTEM",
    items: [
      { name: "Personnel Master", href: "/ceo/staff", icon: Users },
      { name: "Security Hub", href: "/ceo/security", icon: Settings },
    ]
  }
];

export default function CeoSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
    router.push('/login');
  };

  return (
    <div className="w-64 h-screen bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Zap size={20} className="text-white fill-current" />
          </div>
          <span className="font-bold text-white text-xl tracking-tight">GamMed</span>
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
                const isActive = pathname.startsWith(item.href);
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
            JG
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">Dr. Gambrah</p>
            <p className="text-[10px] text-slate-500 truncate">App CEO</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 cursor-pointer">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}