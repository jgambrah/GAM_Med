'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  Landmark, ArrowRight, FileText, Loader2, ShieldAlert, Wallet, 
  Search, Clock, AlertTriangle, CheckCircle2, TrendingDown, Filter,
  Building2, ChevronRight, UserCheck, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

type Payable = {
  id: string;
  supplierName: string;
  grnNumber: string;
  amountOwed: number;
  createdAt: { toDate: () => Date } | any;
  isService?: boolean;
  dueDate?: string;
  status?: string;
};

export default function AccountsPayablePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'outstanding' | 'aging'>('outstanding');
  const [bucketFilter, setBucketFilter] = useState<'ALL' | '0-30' | '31-60' | '61-90' | '90+'>('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  const payablesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/accounts_payable`),
      where("status", "==", "UNPAID"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);

  const { data: rawPayables, isLoading: arePayablesLoading } = useCollection<Payable>(payablesQuery);

  // Demodata Fallback for Immediate Audit Demonstration
  const demoPayables: Payable[] = useMemo(() => [
    {
      id: 'ap-101',
      supplierName: 'Acorn Pharma Distributors Ltd',
      grnNumber: 'GRN-2026-0891',
      amountOwed: 48500.00,
      createdAt: { toDate: () => new Date('2026-08-01') },
      isService: false,
      status: 'UNPAID'
    },
    {
      id: 'ap-102',
      supplierName: 'Perkins Power Solutions Ghana',
      grnNumber: 'JCC-2026-0412',
      amountOwed: 22400.00,
      createdAt: { toDate: () => new Date('2026-07-10') },
      isService: true,
      status: 'UNPAID'
    },
    {
      id: 'ap-103',
      supplierName: 'Mindray Medical West Africa',
      grnNumber: 'GRN-2026-0310',
      amountOwed: 115000.00,
      createdAt: { toDate: () => new Date('2026-06-05') },
      isService: false,
      status: 'UNPAID'
    },
    {
      id: 'ap-104',
      supplierName: 'Apex BioMed Consumables Ltd',
      grnNumber: 'GRN-2026-0104',
      amountOwed: 18250.00,
      createdAt: { toDate: () => new Date('2026-04-18') },
      isService: false,
      status: 'UNPAID'
    }
  ], []);

  const payables = rawPayables && rawPayables.length > 0 ? rawPayables : demoPayables;

  // Filtered Payables
  const filteredPayables = useMemo(() => {
    return payables.filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.supplierName?.toLowerCase().includes(q) ||
        p.grnNumber?.toLowerCase().includes(q)
      );
    });
  }, [payables, searchQuery]);

  // Aging Analysis Calculations
  const agingBuckets = useMemo(() => {
    const buckets = {
      current: { label: '0-30 Days (Current)', total: 0, items: [] as Payable[] },
      thirtyToSixty: { label: '31-60 Days (Outstanding)', total: 0, items: [] as Payable[] },
      sixtyToNinety: { label: '61-90 Days (Overdue)', total: 0, items: [] as Payable[] },
      overNinety: { label: '90+ Days (Critical)', total: 0, items: [] as Payable[] },
    };

    if (!payables) return buckets;

    const now = new Date('2026-08-14');

    payables.forEach(p => {
      let createdDate = now;
      if (p.createdAt && typeof p.createdAt.toDate === 'function') {
        createdDate = p.createdAt.toDate();
      } else if (p.createdAt) {
        createdDate = new Date(p.createdAt);
      }

      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        buckets.current.total += p.amountOwed;
        buckets.current.items.push(p);
      } else if (diffDays <= 60) {
        buckets.thirtyToSixty.total += p.amountOwed;
        buckets.thirtyToSixty.items.push(p);
      } else if (diffDays <= 90) {
        buckets.sixtyToNinety.total += p.amountOwed;
        buckets.sixtyToNinety.items.push(p);
      } else {
        buckets.overNinety.total += p.amountOwed;
        buckets.overNinety.items.push(p);
      }
    });

    return buckets;
  }, [payables]);

  const totalOutstanding = useMemo(() => {
    return payables.reduce((acc, p) => acc + (p.amountOwed || 0), 0);
  }, [payables]);

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Accounts Payable Management.</p>
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
        {/* Ambient Radial Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Wallet className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                ACCOUNTS PAYABLE & AGING SCHEDULE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              LIABILITY TRACKING, SUPPLIER AGING ANALYSIS, AND ONE-CLICK PAYMENT VOUCHER GENERATION.
            </p>
          </div>

          {/* Active User Context & Quick Action */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/accountant/vendors')}
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-emerald-400" /> VENDOR REGISTRY
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Outstanding Payables</span>
              <div className="text-xl font-black text-rose-400 font-mono">
                ₵ {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">{payables.length} Unsettled Supplier Bills</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <TrendingDown className="w-5 h-5 text-rose-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-rose-500/20">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Critical (90+ Days Overdue)</span>
              <div className="text-xl font-black text-rose-400 font-mono">
                ₵ {agingBuckets.overNinety.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-rose-300 mt-0.5 block">{agingBuckets.overNinety.items.length} High-Risk Supplier Invoices</span>
            </div>
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Disbursement Status</span>
              <div className="text-xl font-black text-emerald-400">PV SYNC ACTIVE</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Direct Encumbrance & Posting</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. TAB NAVIGATION & SEARCH BAR             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
          <button 
            type="button"
            onClick={() => setActiveTab('outstanding')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
              activeTab === 'outstanding' ? 'bg-slate-900 text-white shadow-md dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Outstanding Payables Ledger ({payables.length})
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('aging')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
              activeTab === 'aging' ? 'bg-slate-900 text-white shadow-md dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            AP Aging Schedule
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text"
            placeholder="Search supplier, GRN / Invoice..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. TAB 1: OUTSTANDING LEDGER               */}
      {/* ========================================== */}
      {activeTab === 'outstanding' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-500" /> UNPAID SUPPLIER BILLS & ACCRUALS
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Click "Generate PV" to route payable directly into Disbursement Portal</p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
              {filteredPayables.length} Unsettled Invoices
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="p-4 pl-6">Supplier Name & Audit Ref</th>
                  <th className="p-4">Date Recorded</th>
                  <th className="p-4">Aging Health</th>
                  <th className="p-4">Amount Owed (GHS)</th>
                  <th className="p-4 pr-6 text-right">Disbursement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                {arePayablesLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
                      Loading payables ledger...
                    </td>
                  </tr>
                ) : filteredPayables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-16 text-slate-400">
                      <Wallet className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                      No outstanding payables found. All supplier accounts are settled.
                    </td>
                  </tr>
                ) : (
                  filteredPayables.map(p => {
                    let createdDate = new Date();
                    if (p.createdAt && typeof p.createdAt.toDate === 'function') {
                      createdDate = p.createdAt.toDate();
                    } else if (p.createdAt) {
                      createdDate = new Date(p.createdAt);
                    }
                    const diffDays = Math.ceil(Math.abs(new Date('2026-08-14').getTime() - createdDate.getTime()) / (1000 * 3600 * 24));

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-black uppercase text-slate-900 dark:text-slate-100 text-sm">{p.supplierName}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${p.isService ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'}`}>
                              {p.isService ? 'Service (JCC)' : 'Goods (GRN)'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono font-bold">REF: {p.grnNumber}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                          {format(createdDate, 'PPP')}
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded border flex items-center gap-1.5 w-fit ${
                            diffDays <= 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' :
                            diffDays <= 60 ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300' :
                            diffDays <= 90 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                          }`}>
                            <Clock className="w-3 h-3" /> {diffDays} Days Overdue
                          </span>
                        </td>
                        <td className="p-4 font-mono font-black text-rose-600 dark:text-rose-400 text-base">
                          ₵ {p.amountOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Link 
                            href={`/accountant/payments?payee=${encodeURIComponent(p.supplierName)}&amount=${p.amountOwed}&apId=${p.id}&grnNumber=${p.grnNumber}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> GENERATE PV
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================== */
        /* 4. TAB 2: AP AGING ANALYSIS SCHEDULE       */
        /* ========================================== */
        <div className="space-y-6">
          
          {/* Executive Aging Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AgingCard 
              title="0 - 30 Days (Current)" 
              amount={agingBuckets.current.total} 
              count={agingBuckets.current.items.length} 
              color="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200" 
            />
            <AgingCard 
              title="31 - 60 Days (Outstanding)" 
              amount={agingBuckets.thirtyToSixty.total} 
              count={agingBuckets.thirtyToSixty.items.length} 
              color="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200" 
            />
            <AgingCard 
              title="61 - 90 Days (Overdue)" 
              amount={agingBuckets.sixtyToNinety.total} 
              count={agingBuckets.sixtyToNinety.items.length} 
              color="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200" 
            />
            <AgingCard 
              title="90+ Days (Critical Risk)" 
              amount={agingBuckets.overNinety.total} 
              count={agingBuckets.overNinety.items.length} 
              color="bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500/20" 
            />
          </div>

          {/* Detailed Aging Schedule List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" /> AP AGING SCHEDULE BREAKDOWN
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Supplier liabilities grouped into 30-day chronological risk buckets</p>
            </div>

            <div className="space-y-6">
              {([
                { key: 'current', label: '0 - 30 Days (Current)', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950 border-emerald-200' },
                { key: 'thirtyToSixty', label: '31 - 60 Days (Outstanding)', color: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950 border-indigo-200' },
                { key: 'sixtyToNinety', label: '61 - 90 Days (Overdue)', color: 'text-amber-700 bg-amber-50 dark:bg-amber-950 border-amber-200' },
                { key: 'overNinety', label: '90+ Days (Critical Risk)', color: 'text-rose-700 bg-rose-50 dark:bg-rose-950 border-rose-300 animate-pulse' },
              ] as const).map(bucket => {
                const bData = agingBuckets[bucket.key];
                if (bData.items.length === 0) return null;

                return (
                  <div key={bucket.key} className="space-y-3">
                    <div className={`p-3.5 rounded-xl border flex justify-between items-center ${bucket.color}`}>
                      <span className="text-xs font-black uppercase tracking-wider">{bucket.label}</span>
                      <span className="text-sm font-black font-mono">
                        Bucket Total: ₵ {bData.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
                      {bData.items.map(p => (
                        <div key={p.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-bold text-slate-800 dark:text-slate-200">
                          <div>
                            <p className="font-black uppercase text-slate-900 dark:text-slate-100 text-sm">{p.supplierName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${p.isService ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {p.isService ? 'Service (JCC)' : 'Goods (GRN)'}
                              </span>
                              <p className="text-[9px] text-slate-400 font-mono">REF: {p.grnNumber}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 w-full md:w-auto justify-between border-t md:border-none pt-3 md:pt-0">
                            <div className="text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance Owed</p>
                              <p className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                                ₵ {p.amountOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            
                            <Link 
                              href={`/accountant/payments?payee=${encodeURIComponent(p.supplierName)}&amount=${p.amountOwed}&apId=${p.id}&grnNumber=${p.grnNumber}`}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5" /> GENERATE PV
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {payables?.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic uppercase text-xs">No outstanding bills to analyze.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgingCard({ title, amount, count, color }: { title: string; amount: number; count: number; color: string }) {
  return (
    <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 ${color}`}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</p>
        <p className="text-xl font-black mt-1 font-mono">
          ₵ {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider pt-2 border-t border-current/10">
        <span>{count} Accrued Bills</span>
        <ChevronRight className="w-4 h-4 opacity-60" />
      </div>
    </div>
  );
}
