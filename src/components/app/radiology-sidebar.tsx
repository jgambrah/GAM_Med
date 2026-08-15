'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Camera, Settings,
  LogOut, ChevronRight,
  Calendar, Clock, Wallet, GraduationCap, Award,
  Users
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { autoClockOutIfNeeded } from '@/lib/attendance';

export function RadiologySidebar() {
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

  const navSections = [
    {
      title: "MY PORTAL",
      links: [
        { name: "Request Leave", href: "/staff/request-leave", icon: Calendar },
        { name: "Clock In / Out", href: "/staff/clock-in", icon: Clock },
        isLocum ? { name: "My Locum Claims", href: "/doctor/my-claims", icon: Wallet } : { name: "My Payslips", href: "/staff/payslips", icon: Wallet },
        { name: "My CPD", href: "/staff/my-cpd", icon: GraduationCap },
        { name: "My Performance", href: "/staff/my-performance", icon: Award },
      ]
    },
    {
      title: "RADIOLOGY",
      links: [
        { name: "Imaging Queue", href: "/radiology/queue", icon: LayoutDashboard },
        { name: "Patients Directory", href: "/patients", icon: Users },
        { name: "Imaging Menu", href: "/radiology/setup", icon: Settings },
      ]
    }
  ];

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

  const displayName = userProfile?.name || user?.displayName || 'Marcus Amosah Henaku';
  const userEmail = user?.email || 'marcusamosah@gmail.com';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'MA';

  return (
    <aside className="w-64 h-screen bg-slate-900 text-slate-300 flex flex-col shadow-2xl border-r border-slate-800 hidden md:flex shrink-0">
      
      {/* 1. GAM Med Header */}
      <div className="p-6 bg-slate-950 border-b border-slate-800 shrink-0">
        <h1 className="text-2xl font-black text-white tracking-tight italic">GAM MED</h1>
        <h2 className="text-[10px] font-black text-indigo-400 mt-1 uppercase tracking-widest">
          Imaging & Diagnostics
        </h2>
      </div>

      {/* 2. Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-6 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx} className="mb-6">
            <h3 className="px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.links.map(link => {
                const isActive = pathname === link.href || (link.name === "Imaging Queue" && pathname === "/radiology/queue");
                const IconComponent = link.icon;

                return (
                  <li key={link.name}>
                    <Link href={link.href}>
                      <span className={`flex items-center px-6 py-2.5 text-xs font-bold transition-all group ${
                        isActive 
                          ? 'bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500 font-black' 
                          : 'text-slate-400 border-l-4 border-transparent hover:bg-slate-800 hover:text-white'
                      }`}>
                        <IconComponent className={`w-4 h-4 mr-3 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        {link.name}
                        {isActive && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* 3. Executive User Footer */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-indigo-900/80 text-indigo-200 flex items-center justify-center font-black text-xs border border-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-xs font-black text-slate-200 truncate">{displayName}</p>
            <p className="text-[10px] text-slate-500 truncate font-mono">{userEmail}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-white transition-colors p-1 cursor-pointer">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

    </aside>
  );
}
