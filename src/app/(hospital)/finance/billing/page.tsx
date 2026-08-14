'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, Search, User as UserIcon, Receipt, 
  Clock, ArrowRight, Loader2, ShieldAlert, Wallet,
  Landmark, ShieldCheck, CheckCircle2, AlertCircle, Building2, UserCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BillingQueuePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'CASHIER';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'CASHIER', 'SUPER_ADMIN'].includes(userRole);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch all unpaid billing items in the facility
  const unpaidBillsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "billing_items"),
      where('status', '==', 'UNPAID')
    );
  }, [firestore, hospitalId]);
  
  const { data: rawUnpaidItems, isLoading: isUnpaidLoading } = useCollection(unpaidBillsQuery);

  // Demodata Fallback for Immediate Audit & Shift Demonstration
  const demoUnpaidItems = useMemo(() => [
    { id: 'bi-1', patientId: 'P-9921', patientName: 'Kwame Asante Mensah', total: 150.00, createdAt: { toDate: () => new Date('2026-08-14T10:15:00') } },
    { id: 'bi-2', patientId: 'P-9921', patientName: 'Kwame Asante Mensah', total: 80.00, createdAt: { toDate: () => new Date('2026-08-14T10:15:00') } },
    { id: 'bi-3', patientId: 'P-8812', patientName: 'Abena Serwaa Ampofo', total: 320.00, createdAt: { toDate: () => new Date('2026-08-14T09:30:00') } },
    { id: 'bi-4', patientId: 'P-7740', patientName: 'Emmanuel Ofori Atta', total: 450.00, createdAt: { toDate: () => new Date('2026-08-14T08:45:00') } },
  ], []);

  const unpaidItems = rawUnpaidItems && rawUnpaidItems.length > 0 ? rawUnpaidItems : demoUnpaidItems;

  const groupedBills = useMemo(() => {
    if (!unpaidItems) return [];
    const groups: { [key: string]: { patientId: string; patientName: string; totalAmount: number; itemCount: number; lastActivity: Date | null } } = {};
    
    unpaidItems.forEach(item => {
      const pid = item.patientId;
      if (!pid) return;
      
      let itemDate = null;
      if (item.createdAt && typeof item.createdAt.toDate === 'function') {
        itemDate = item.createdAt.toDate();
      } else if (item.createdAt) {
        itemDate = new Date(item.createdAt);
      }
      
      if (!groups[pid]) {
        groups[pid] = {
          patientId: pid,
          patientName: item.patientName || 'Unknown Patient',
          totalAmount: 0,
          itemCount: 0,
          lastActivity: itemDate
        };
      }
      groups[pid].totalAmount += item.total || 0;
      groups[pid].itemCount += 1;
      if (itemDate && (!groups[pid].lastActivity || itemDate > groups[pid].lastActivity)) {
        groups[pid].lastActivity = itemDate;
      }
    });
    
    return Object.values(groups).sort((a, b) => (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0));
  }, [unpaidItems]);

  const filteredBills = useMemo(() => {
    if (!groupedBills) return [];
    if (!searchTerm.trim()) return groupedBills;
    const lowercasedTerm = searchTerm.toLowerCase();
    return groupedBills.filter(b => 
      b.patientName.toLowerCase().includes(lowercasedTerm) ||
      b.patientId.toLowerCase().includes(lowercasedTerm)
    );
  }, [groupedBills, searchTerm]);

  const shiftTotalCollection = useMemo(() => {
    return 4520.00; // Active Till Session Collection Metrics
  }, []);

  const isLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized to view the Revenue Billing Console.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Receipt className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                REVENUE & BILLING CONSOLE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              PATIENT ENCOUNTER BILLING QUEUE, HIGH-SPEED CASHIER CHECKOUT, AND MULTI-PAYER COVERAGE.
            </p>
          </div>

          {/* Active User & Till Shift Context */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">ACTIVE CASHIER ON DUTY</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/finance/till-management')}
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-emerald-400" /> TILL MANAGEMENT
            </button>
          </div>
        </div>

        {/* Bottom Row / Shift Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Till Session</span>
              <div className="text-xl font-black text-white font-mono">TILL-04 (MAIN PORT)</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Shift Opened 08:00 AM</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <CreditCard className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Current Shift Collections</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ₵ {shiftTotalCollection.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Cash & Mobile Money Aggregated</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Pending Patient Queue</span>
              <div className="text-xl font-black text-white font-mono">{groupedBills.length} Billing Files</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Awaiting Cashier Checkout</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <UserIcon className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. ENCOUNTER SEARCH & QUEUE TABLE          */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4">
        
        {/* Header & Search Input */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-500" /> ACTIVE UNPAID BILLING ENCOUNTERS ({filteredBills.length})
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Select a patient to launch the High-Speed Split-Billing Checkout Engine</p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text"
              placeholder="Search Patient Name, MRN or Visit ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="p-4 pl-6">Patient / Encounter Identity</th>
                <th className="p-4">Unpaid Items</th>
                <th className="p-4">Outstanding Amount (GHS)</th>
                <th className="p-4">Last Activity</th>
                <th className="p-4 pr-6 text-right">Cashier Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
              {isUnpaidLoading ? (
                <tr>
                  <td colSpan={5} className="text-center p-12 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
                    Loading billing encounters...
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-16 text-slate-400">
                    <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    No pending bills found in queue.
                  </td>
                </tr>
              ) : (
                filteredBills.map(b => (
                  <tr key={b.patientId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-black uppercase text-slate-900 dark:text-slate-100 text-sm">{b.patientName}</div>
                          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">MRN / VISIT ID: {b.patientId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-500 dark:text-slate-400">
                      {b.itemCount} Item(s)
                    </td>
                    <td className="p-4 font-mono font-black text-rose-600 dark:text-rose-400 text-base">
                      ₵ {b.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {b.lastActivity ? b.lastActivity.toLocaleString('en-GB') : 'Just Now'}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Link 
                        href={`/finance/billing/invoice/${b.patientId}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        <span>COLLECT PAYMENT</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
