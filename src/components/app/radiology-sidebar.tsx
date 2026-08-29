'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, Camera, Settings, PackageCheck, BarChart3,
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
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get('tab');
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
      title: "RADIOLOGY & DIAGNOSTICS",
      links: [
        { name: "Imaging Queue", href: "/radiology/queue", icon: LayoutDashboard },
        { name: "Patient Directory", href: "/patients", icon: Users },
        { name: "Scan Archive & Releases", href: "/radiology/queue?tab=archive", icon: Camera },
        { name: "Analytics & TAT", href: "/radiology/queue?tab=analytics", icon: BarChart3 },
        { name: "Modality / Imaging Menu", href: "/radiology/setup", icon: Settings },
        { name: "Store & Service Requests", href: "/radiology/requisitions", icon: PackageCheck },
      ]
    },
    {
      title: "MY WORKSPACE",
      links: [
        { name: "Clock In / Out", href: "/staff/clock-in", icon: Clock },
        { name: "Request Leave", href: "/staff/request-leave", icon: Calendar },
        isLocum ? { name: "My Locum Claims", href: "/doctor/my-claims", icon: Wallet } : { name: "My Payslips", href: "/staff/payslips", icon: Wallet },
        { name: "My CPD & Training", href: "/staff/my-cpd", icon: GraduationCap },
        { name: "My Performance", href: "/staff/my-performance", icon: Award },
      ]
    }
  ];

  const handleLogout = async () => {
    if (auth && firestore && user?.uid) {
      try {
        await autoClockOutIfNeeded(user.uid, firestore, userProfile);
      } catch (err) {
        console.error("Auto clock-out failed:", err);
      }
    }
    await signOut(auth);
    router.push('/login');
  };

  const displayName = userProfile?.name || user?.displayName || 'Marcus Amosah Henaku';
  const userEmail = user?.email || 'marcusamosah@gmail.com';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'MA';

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0">
      
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/30">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-sm tracking-wider text-white block">GAM MED</span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Radiology Suite</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 overflow-y-auto space-y-6">
        {navSections.map(section => (
          <div key={section.title}>
            <h3 className="px-6 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.links.map(link => {
                const isAnalyticsLink = link.name === "Analytics & TAT";
                const isArchiveLink = link.name === "Scan Archive & Releases";
                const isQueueLink = link.name === "Imaging Queue";
                const isActive = (isQueueLink && pathname === "/radiology/queue" && currentTab !== 'archive' && currentTab !== 'analytics') ||
                  (isArchiveLink && pathname === "/radiology/queue" && currentTab === 'archive') ||
                  (isAnalyticsLink && pathname === "/radiology/queue" && currentTab === 'analytics') ||
                  (!isQueueLink && !isArchiveLink && !isAnalyticsLink && pathname === link.href);
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
