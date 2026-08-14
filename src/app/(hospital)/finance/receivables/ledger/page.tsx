'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, AlertCircle, Calendar, 
  ArrowUpRight, Filter, Receipt, Search, Loader2, ShieldAlert,
  Landmark, Clock, AlertTriangle, CheckCircle2, Building2, ShieldCheck, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

type ReceivableItem = {
  id: string;
  patientName: string;
  payerName?: string;
  payerId?: string;
  amount: number;
  createdAt: { toDate: () => Date } | any;
  status?: string;
  claimRef?: string;
};

export default function ARLedgerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [payerFilter, setPayerFilter] = useState<string>('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  const receivablesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/receivables`),
      where("status", "==", "UNPAID"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);
  const { data: rawReceivables, isLoading: areReceivablesLoading } = useCollection<ReceivableItem>(receivablesQuery);

  // Demodata Fallback for Audit & Aging Demonstration
  const demoReceivables: ReceivableItem[] = useMemo(() => [
    {
      id: 'ar-8801',
      patientName: 'Kwame Asante Mensah',
      payerName: 'NHIS',
      amount: 14850.00,
      createdAt: { toDate: () => new Date('2026-08-01') },
      claimRef: 'CLM-NHIS-042',
      status: 'UNPAID'
    },
    {
      id: 'ar-8802',
      patientName: 'Abena Serwaa Ampofo',
      payerName: 'NHIS',
      amount: 42100.00,
      createdAt: { toDate: () => new Date('2026-07-12') },
      claimRef: 'CLM-NHIS-039',
      status: 'UNPAID'
    },
    {
      id: 'ar-8803',
      patientName: 'GLICO Health Corporate Account',
      payerName: 'GLICO Healthcare',
      amount: 125000.00,
      createdAt: { toDate: () => new Date('2026-06-02') },
      claimRef: 'CLM-GLC-2026-08',
      status: 'UNPAID'
    },
    {
      id: 'ar-8804',
      patientName: 'Acacia Health Insurance Ltd',
      payerName: 'Acacia Health',
      amount: 95200.00,
      createdAt: { toDate: () => new Date('2026-04-15') }, // 90+ days
      claimRef: 'CLM-ACA-2026-04',
      status: 'UNPAID'
    }
  ], []);

  const receivables = rawReceivables && rawReceivables.length > 0 ? rawReceivables : demoReceivables;

  const filteredReceivables = useMemo(() => {
    return receivables.filter(r => {
      if (payerFilter !== 'ALL' && r.payerName !== payerFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.patientName?.toLowerCase().includes(q) ||
        r.payerName?.toLowerCase().includes(q) ||
        r.claimRef?.toLowerCase().includes(q)
      );
    });
  }, [receivables, payerFilter, searchQuery]);

  // Aging Analysis Buckets
  const agingBuckets = useMemo(() => {
    const buckets = {
      current: { label: '0-30 Days (Current)', total: 0, items: [] as ReceivableItem[] },
      thirtyToSixty: { label: '31-60 Days (Pending NHIA)', total: 0, items: [] as ReceivableItem[] },
      sixtyToNinety: { label: '61-90 Days (Overdue Claim)', total: 0, items: [] as ReceivableItem[] },
      overNinety: { label: '90+ Days (High Risk)', total: 0, items: [] as ReceivableItem[] },
    };

    if (!receivables) return buckets;

    const now = new Date('2026-08-14');

    receivables.forEach(r => {
      let createdDate = now;
      if (r.createdAt && typeof r.createdAt.toDate === 'function') {
        createdDate = r.createdAt.toDate();
      } else if (r.createdAt) {
        createdDate = new Date(r.createdAt);
      }

      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        buckets.current.total += r.amount;
        buckets.current.items.push(r);
      } else if (diffDays <= 60) {
        buckets.thirtyToSixty.total += r.amount;
        buckets.thirtyToSixty.items.push(r);
      } else if (diffDays <= 90) {
        buckets.sixtyToNinety.total += r.amount;
        buckets.sixtyToNinety.items.push(r);
      } else {
        buckets.overNinety.total += r.amount;
        buckets.overNinety.items.push(r);
      }
    });

    return buckets;
  }, [receivables]);

  const totalReceivables = useMemo(() => {
    return receivables.reduce((acc, r) => acc + (r.amount || 0), 0);
  }, [receivables]);

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to view Accounts Receivable Aging.</p>
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
                <TrendingUp className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                ACCOUNTS RECEIVABLE & CLAIMS AGING
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              MONITORING GOVERNMENT (NHIA) & PRIVATE INSURANCE RECEIVABLES, AGING RISK ANALYSIS, AND RECONCILIATION SETTLEMENTS.
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
              onClick={() => router.push('/finance/insurance/nhis-batching')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Landmark className="w-4 h-4" /> NHIS BATCHING PORTAL
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Outstanding Receivables</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ₵ {totalReceivables.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">{receivables.length} Institutional Claim Batches</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-rose-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Critical (90+ Days Unpaid)</span>
              <div className="text-xl font-black text-rose-400 font-mono">
                ₵ {agingBuckets.overNinety.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-rose-300 mt-0.5 block">{agingBuckets.overNinety.items.length} High-Risk Claim Batches</span>
            </div>
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Payer Entities</span>
              <div className="text-xl font-black text-white">NHIS & PRIVATE</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Automated AR Reconciliation</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. AGING SUMMARY BUCKETS ROW               */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AgingSummaryCard 
          title="0 - 30 Days (Current)" 
          amount={agingBuckets.current.total} 
          count={agingBuckets.current.items.length} 
          color="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200" 
        />
        <AgingSummaryCard 
          title="31 - 60 Days (Pending NHIA)" 
          amount={agingBuckets.thirtyToSixty.total} 
          count={agingBuckets.thirtyToSixty.items.length} 
          color="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200" 
        />
        <AgingSummaryCard 
          title="61 - 90 Days (Overdue Claim)" 
          amount={agingBuckets.sixtyToNinety.total} 
          count={agingBuckets.sixtyToNinety.items.length} 
          color="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200" 
        />
        <AgingSummaryCard 
          title="90+ Days (High Risk)" 
          amount={agingBuckets.overNinety.total} 
          count={agingBuckets.overNinety.items.length} 
          color="bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500/20" 
        />
      </div>

      {/* ========================================== */}
      {/* 3. RECEIVABLES LEDGER & FILTER BAR         */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4">
        
        {/* Filter & Search Bar */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-500" /> INSTITUTIONAL CLAIMS RECEIVABLE LEDGER ({filteredReceivables.length})
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Track government and corporate insurance claim age and settlement status</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer text-slate-900 dark:text-slate-100"
              value={payerFilter}
              onChange={e => setPayerFilter(e.target.value)}
            >
              <option value="ALL">All Payers</option>
              <option value="NHIS">NHIS (Government)</option>
              <option value="GLICO Healthcare">GLICO Healthcare</option>
              <option value="Acacia Health">Acacia Health</option>
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text"
                placeholder="Search debtor name, ref..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Receivables Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="p-4 pl-6">Debtor / Patient Name</th>
                <th className="p-4">Payer Entity</th>
                <th className="p-4">Claim Amount (GHS)</th>
                <th className="p-4">Aging Bracket</th>
                <th className="p-4 pr-6 text-right">Reconciliation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
              {areReceivablesLoading ? (
                <tr>
                  <td colSpan={5} className="text-center p-12 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
                    Loading receivables ledger...
                  </td>
                </tr>
              ) : filteredReceivables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-16 text-slate-400">
                    <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    No outstanding receivables found.
                  </td>
                </tr>
              ) : (
                filteredReceivables.map(r => {
                  let createdDate = new Date();
                  if (r.createdAt && typeof r.createdAt.toDate === 'function') {
                    createdDate = r.createdAt.toDate();
                  } else if (r.createdAt) {
                    createdDate = new Date(r.createdAt);
                  }
                  const diffDays = Math.ceil(Math.abs(new Date('2026-08-14').getTime() - createdDate.getTime()) / (1000 * 3600 * 24));

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="font-black uppercase text-slate-900 dark:text-slate-100 text-sm">{r.patientName}</div>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          REF: {r.claimRef || r.id.slice(-8).toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 font-bold">
                        <span className="text-xs text-slate-600 dark:text-slate-300 uppercase px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800">
                          {r.payerName || 'NHIS'}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                        ₵ {r.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded border flex items-center gap-1.5 w-fit ${
                          diffDays <= 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' :
                          diffDays <= 60 ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300' :
                          diffDays <= 90 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                        }`}>
                          <Clock className="w-3 h-3" /> {diffDays} Days Age
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => router.push(`/finance/receivables?payer=${encodeURIComponent(r.payerName || 'NHIS')}`)}
                          className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-400 dark:hover:text-slate-950 text-[10px] font-black uppercase rounded-lg transition-colors cursor-pointer"
                        >
                          RECONCILE CLAIM
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AgingSummaryCard({ title, amount, count, color }: { title: string; amount: number; count: number; color: string }) {
  return (
    <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 ${color}`}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</p>
        <p className="text-xl font-black mt-1 font-mono">
          ₵ {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider pt-2 border-t border-current/10">
        <span>{count} Batched Claims</span>
        <ChevronRight className="w-4 h-4 opacity-60" />
      </div>
    </div>
  );
}
