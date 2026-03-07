'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, UserCheck, Clock, Calendar, 
  HeartPulse, GraduationCap, Gavel, Settings,
  LogOut, ChevronRight, Calculator, Landmark, LayoutGrid, ListChecks, Layers, History
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

const menuGroups = [
  {
    title: "HR Management",
    items: [
      { name: "HR Dashboard", href: "/hr", icon: Users },
      { name: "Department Manager", href: "/hr/departments", icon: LayoutGrid },
      { name: "Attendance Setup", href: "/hr/attendance/setup", icon: Clock },
      { name: "Leave Management", href: "/hr/leave", icon: Calendar },
      { name: "Appraisals & KPIs", href: "/hr/appraisal", icon: HeartPulse },
      { name: "Training & CPD", href: "/hr/cpd", icon: GraduationCap },
      { name: "Disciplinary Register", href: "/hr/disciplinary", icon: Gavel },
    ]
  },
  {
    title: "Payroll",
    items: [
      { name: "Payroll Config", href: "/hr/payroll/config", icon: Settings },
      { name: "Salary Grades", href: "/hr/payroll/grades", icon: Layers },
      { name: "Payroll Items", href: "/hr/payroll/items", icon: ListChecks },
      { name: "Run Payroll", href: "/hr/payroll/run", icon: Calculator },
      { name: "Payroll Archives", href: "/hr/payroll/archives", icon: History },
      { name: "Locum Tracker", href: "/hr/locum-tracker", icon: UserCheck },
      { name: "Remittance Schedules", href: "/hr/payroll/schedules", icon: Landmark },
    ]
  }
];

export function HRSidebar() {
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
            <UserCheck size={20} className="text-primary" />
          </div>
          <span className="font-bold text-primary text-xl tracking-tight">Human Resources</span>
        </div>
        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
          People & Payroll
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
