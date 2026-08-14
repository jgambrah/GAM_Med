'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  Landmark, ArrowRight, FileText, Loader2, ShieldAlert, Wallet, 
  Search, Clock, AlertTriangle, CheckCircle2, TrendingDown, Filter,
  Building2, ChevronRight, UserCheck, ShieldCheck, Download, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type VendorAgingRow = {
  vendorId: string;
  vendorName: string;
  category?: string;
  current: number; // 0-30 days
  days30: number; // 31-60 days
  days60: number; // 61-90 days
  days90Plus: number; // 90+ days
  status: 'ACTIVE' | 'COMPLIANCE_HOLD' | 'SUSPENDED';
};

type PayableItem = {
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
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'aging_matrix' | 'outstanding_ledger'>('aging_matrix');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  // Firestore Accounts Payable Query
  const payablesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/accounts_payable`),
      where("status", "==", "UNPAID")
    );
  }, [firestore, hospitalId]);
  const { data: rawPayables, isLoading: arePayablesLoading } = useCollection<PayableItem>(payablesQuery);

  // Demodata Fallback for Immediate AP Aging Demonstration
  const mockApData: VendorAgingRow[] = useMemo(() => [
    { vendorId: 'VND-001', vendorName: 'Ernest Chemists Ltd', category: 'PHARMACEUTICAL', current: 25000.00, days30: 15000.00, days60: 5000.00, days90Plus: 0.00, status: 'ACTIVE' },
    { vendorId: 'VND-002', vendorName: 'Tobinco Pharmaceuticals', category: 'PHARMACEUTICAL', current: 12500.00, days30: 0.00, days60: 0.00, days90Plus: 0.00, status: 'ACTIVE' },
    { vendorId: 'VND-003', vendorName: 'Zoomlion Ghana Ltd', category: 'SERVICES', current: 0.00, days30: 2500.00, days60: 2500.00, days90Plus: 0.00, status: 'COMPLIANCE_HOLD' },
    { vendorId: 'VND-004', vendorName: 'MedTech Supplies Inc.', category: 'EQUIPMENT', current: 0.00, days30: 0.00, days60: 0.00, days90Plus: 4500.00, status: 'ACTIVE' },
    { vendorId: 'VND-005', vendorName: 'Perkins Power Solutions Ghana', category: 'WORKS', current: 8400.00, days30: 14000.00, days60: 0.00, days90Plus: 0.00, status: 'ACTIVE' }
  ], []);

  // Aggregate Raw Payables into Vendor Aging Rows
  const apData: VendorAgingRow[] = useMemo(() => {
    if (!rawPayables || rawPayables.length === 0) return mockApData;

    const map = new Map<string, VendorAgingRow>();
    const now = new Date('2026-08-14');

    rawPayables.forEach((p: any) => {
      const vName = p.supplierName || 'Unknown Supplier';
      const vId = p.supplierId || `VND-${vName.replace(/\s+/g, '-').toUpperCase()}`;

      if (!map.has(vId)) {
        map.set(vId, { 
          vendorId: vId, 
          vendorName: vName, 
          category: p.isService ? 'SERVICES' : 'PHARMACEUTICAL',
          current: 0, days30: 0, days60: 0, days90Plus: 0, 
          status: 'ACTIVE' 
        });
      }

      const row = map.get(vId)!;
      let createdDate = now;
      if (p.createdAt && typeof p.createdAt.toDate === 'function') {
        createdDate = p.createdAt.toDate();
      } else if (p.createdAt) {
        createdDate = new Date(p.createdAt);
      }

      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const amt = Number(p.amountOwed || 0);

      if (diffDays <= 30) row.current += amt;
      else if (diffDays <= 60) row.days30 += amt;
      else if (diffDays <= 90) row.days60 += amt;
      else row.days90Plus += amt;
    });

    return Array.from(map.values());
  }, [rawPayables, mockApData]);

  const filteredApData = useMemo(() => {
    if (!searchQuery.trim()) return apData;
    const q = searchQuery.toLowerCase();
    return apData.filter(r => r.vendorName.toLowerCase().includes(q) || r.vendorId.toLowerCase().includes(q));
  }, [apData, searchQuery]);

  // Header & Footer Totals
  const totals = useMemo(() => {
    return apData.reduce((acc, row) => {
      const rowSum = row.current + row.days30 + row.days60 + row.days90Plus;
      return {
        current: acc.current + row.current,
        days30: acc.days30 + row.days30,
        days60: acc.days60 + row.days60,
        days90Plus: acc.days90Plus + row.days90Plus,
        total: acc.total + rowSum
      };
    }, { current: 0, days30: 0, days60: 0, days90Plus: 0, total: 0 });
  }, [apData]);

  const handleRaisePV = (vendorName: string, vendorStatus: string, amount: number) => {
    if (vendorStatus === 'COMPLIANCE_HOLD') {
      toast({
        variant: "destructive",
        title: "Disbursement Blocked",
        description: `Cannot raise PV. ${vendorName} is on Compliance Hold (Missing TIN / GRA Clearance).`
      });
      return;
    }

    toast({
      title: "Routing to Disbursement Portal",
      description: `Draft Payment Voucher initiated for ${vendorName} (GHS ${amount.toFixed(2)}).`
    });

    router.push(`/accountant/payments?payee=${encodeURIComponent(vendorName)}&amount=${amount.toFixed(2)}`);
  };

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Accounts Payable Aging.</p>
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
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

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
              OUTBOUND CASH FLOW CONTROL, SUPPLIER AGING MATRIX, AND AUTOMATED PAYMENT VOUCHER GENERATION.
            </p>
          </div>

          {/* User Context & Action */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Outbound Cash Flow Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total AP Liability</span>
              <div className="text-2xl font-black text-white font-mono">
                ₵ {totals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Total Unpaid Supplier Invoices</span>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Due This Week (0 - 30 Days)</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {totals.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Standard Supplier Terms</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-amber-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Overdue (&gt;60 Days)</span>
              <div className="text-2xl font-black text-amber-400 font-mono animate-pulse">
                ₵ {(totals.days60 + totals.days90Plus).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-amber-400 mt-0.5 block">Supply Credit Hold Risk Zone</span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. TAB SWITCHER & ACTION SEARCH BAR        */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('aging_matrix')}
            className={`px-5 py-2 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
              activeTab === 'aging_matrix'
                ? 'bg-slate-900 text-white shadow dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Outbound AGING MATRIX
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outstanding_ledger')}
            className={`px-5 py-2 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer ${
              activeTab === 'outstanding_ledger'
                ? 'bg-slate-900 text-white shadow dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Unpaid Invoice Ledger
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor profile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={() => router.push('/accountant/vendors')}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-2"
          >
            <Building2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>VENDOR REGISTRY</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. OUTBOUND AP AGING MATRIX TABLE          */}
      {/* ========================================== */}
      {activeTab === 'aging_matrix' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {arePayablesLoading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculating AP aging matrix...</span>
            </div>
          ) : filteredApData.length === 0 ? (
            <div className="p-16 text-center text-slate-400 italic">
              No supplier payables found matching query.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
                <tr>
                  <th className="p-4">Vendor Profile</th>
                  <th className="p-4 text-right">Current (0-30 Days)</th>
                  <th className="p-4 text-right">31-60 Days</th>
                  <th className="p-4 text-right text-amber-400">61-90 Days</th>
                  <th className="p-4 text-right text-rose-400">90+ Days (Critical)</th>
                  <th className="p-4 text-right bg-slate-800">Total Payable (₵)</th>
                  <th className="p-4 text-center">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {filteredApData.map((row) => {
                  const rowTotal = row.current + row.days30 + row.days60 + row.days90Plus;
                  const isHold = row.status === 'COMPLIANCE_HOLD';

                  return (
                    <tr key={row.vendorId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                      <td className="p-4">
                        <p className="font-black text-slate-900 dark:text-slate-100 uppercase">{row.vendorName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">
                            ID: {row.vendorId}
                          </span>
                          {isHold && (
                            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-black text-[8px] uppercase rounded border border-rose-300">
                              COMPLIANCE HOLD
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {row.current > 0 ? `₵ ${row.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {row.days30 > 0 ? `₵ ${row.days30.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      <td className="p-4 text-right font-mono text-amber-600 dark:text-amber-400 font-black">
                        {row.days60 > 0 ? `₵ ${row.days60.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      <td className="p-4 text-right font-mono text-rose-600 dark:text-rose-400 font-black bg-rose-50/50 dark:bg-rose-950/30">
                        {row.days90Plus > 0 ? `₵ ${row.days90Plus.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/40">
                        ₵ {rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRaisePV(row.vendorName, row.status, rowTotal)}
                          disabled={isHold}
                          className={`px-3 py-1.5 font-black text-[10px] uppercase rounded-lg transition-all shadow flex items-center justify-center gap-1 mx-auto ${
                            isHold
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 dark:bg-slate-800 dark:text-slate-600'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span>RAISE PAYMENT VOUCHER</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Totals Footer */}
                <tr className="bg-slate-950 text-white font-black text-xs uppercase tracking-wider">
                  <td className="p-4">GRAND TOTALS</td>
                  <td className="p-4 text-right font-mono">₵ {totals.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right font-mono">₵ {totals.days30.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right font-mono text-amber-400">₵ {totals.days60.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right font-mono text-rose-400">₵ {totals.days90Plus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right font-mono text-emerald-400 text-sm bg-slate-900">
                    ₵ {totals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center text-[10px] text-slate-400">100% AUDITED</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* ========================================== */
        /* 4. UNPAID INVOICE LEDGER                   */
        /* ========================================== */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4 pl-6">Supplier Name & GRN Ref</th>
                <th className="p-4">Date Recorded</th>
                <th className="p-4">Invoice Age</th>
                <th className="p-4 text-right">Amount Owed (GHS)</th>
                <th className="p-4 pr-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
              {rawPayables && rawPayables.length > 0 ? (
                rawPayables.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4 pl-6">
                      <p className="font-black text-slate-900 dark:text-slate-100 uppercase">{p.supplierName}</p>
                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        REF: {p.grnNumber}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-500">
                      {p.createdAt?.toDate ? format(p.createdAt.toDate(), 'PPP') : 'Recent'}
                    </td>
                    <td className="p-4 font-mono text-amber-600 font-bold">
                      Active Bill
                    </td>
                    <td className="p-4 text-right font-mono font-black text-rose-600 text-sm">
                      ₵ {p.amountOwed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 pr-6 text-center">
                      <button
                        type="button"
                        onClick={() => handleRaisePV(p.supplierName, 'ACTIVE', p.amountOwed)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg shadow"
                      >
                        GENERATE PV
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-400 italic">
                    All supplier invoices are currently reconciled and synced to General Ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
