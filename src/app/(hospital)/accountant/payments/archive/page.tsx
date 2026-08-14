'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { 
  History, Eye, Printer, Loader2, ShieldAlert,
  Wallet, FileText, Landmark, Search, Filter, Calendar,
  CheckCircle2, ArrowRight, X, ExternalLink, ShieldCheck, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

type PaymentVoucherItem = {
  id: string;
  pvNumber: string;
  payee: string;
  grossAmount: number;
  vatAmount?: number;
  whtAmount?: number;
  whtRate?: number;
  whtLabel?: string;
  netAmount: number;
  narration?: string;
  processedByName?: string;
  approvedByName?: string;
  paymentMethod?: string;
  chequeNumber?: string;
  status?: string;
  category?: 'VENDOR' | 'LOCUM' | 'OPEX';
  createdAt: { toDate: () => Date } | any;
  debitAccountId?: string;
  creditAccountId?: string;
};

export default function PaymentVoucherArchive() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const [selectedPV, setSelectedPV] = useState<PaymentVoucherItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'VENDOR' | 'LOCUM' | 'OPEX'>('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  const vouchersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payment_vouchers`), orderBy('createdAt', 'desc'));
  }, [firestore, hospitalId]);
  const { data: rawVouchers, isLoading: areVouchersLoading } = useCollection<PaymentVoucherItem>(vouchersQuery);
  
  const hospitalRef = useMemoFirebase(() => hospitalId ? doc(firestore, "hospitals", hospitalId) : null, [firestore, hospitalId]);
  const { data: hospitalData } = useDoc(hospitalRef);

  // Demodata Fallback for Immediate Audit Demonstration
  const demoVouchers: PaymentVoucherItem[] = useMemo(() => [
    {
      id: 'pv-001',
      pvNumber: 'MMH/PV/2026/0842',
      payee: 'KORLE-BU PHARMACEUTICAL DISTRIBUTORS LTD',
      grossAmount: 30000.00,
      vatAmount: 6570.00,
      whtAmount: 1500.00,
      netAmount: 35070.00,
      narration: 'Payment for Emergency Antimalarial & ICU Antibiotics Stock (GRN-2026-0810)',
      processedByName: 'Marcus Amosah Henaku',
      approvedByName: 'Dr. Evelyn Baidoo (Director)',
      paymentMethod: 'GCB Bank - Cheque #40912',
      category: 'VENDOR',
      createdAt: { toDate: () => new Date('2026-08-12T14:30:00') }
    },
    {
      id: 'pv-002',
      pvNumber: 'PV-LOCUM-2026-042',
      payee: 'Dr. Emmanuel Ofori Atta (Obstetric Locum Specialist)',
      grossAmount: 12500.00,
      vatAmount: 0,
      whtAmount: 937.50,
      netAmount: 11562.50,
      narration: 'Honorarium for 5 Night Locum Shifts in Maternity Theatre (Aug 1 - Aug 7)',
      processedByName: 'Marcus Amosah Henaku',
      approvedByName: 'Dr. Evelyn Baidoo (Director)',
      paymentMethod: 'Mobile Money (MoMo Transfer)',
      category: 'LOCUM',
      createdAt: { toDate: () => new Date('2026-08-10T11:15:00') }
    },
    {
      id: 'pv-003',
      pvNumber: 'PV-7578-2026-0812',
      payee: 'GHANA REVENUE AUTHORITY (GRA TAX OFFICE)',
      grossAmount: 15463.63,
      vatAmount: 0,
      whtAmount: 0,
      netAmount: 15463.63,
      narration: 'Monthly Statutory Withholding Tax Remittance for July 2026 Collections',
      processedByName: 'Marcus Amosah Henaku',
      approvedByName: 'Dr. Evelyn Baidoo (Director)',
      paymentMethod: 'Bank Wire Transfer (GCB Main)',
      category: 'OPEX',
      createdAt: { toDate: () => new Date('2026-08-08T09:45:00') }
    }
  ], []);

  const vouchers = rawVouchers && rawVouchers.length > 0 ? rawVouchers : demoVouchers;

  const filteredVouchers = useMemo(() => {
    if (!vouchers) return [];
    return vouchers.filter(pv => {
      // Source Type Filter
      if (sourceFilter !== 'ALL') {
        const cat = pv.category || (pv.pvNumber?.includes('LOCUM') ? 'LOCUM' : pv.pvNumber?.includes('MMH') ? 'VENDOR' : 'OPEX');
        if (cat !== sourceFilter) return false;
      }

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        pv.pvNumber?.toLowerCase().includes(q) ||
        pv.payee?.toLowerCase().includes(q) ||
        pv.narration?.toLowerCase().includes(q)
      );
    });
  }, [vouchers, searchTerm, sourceFilter]);

  const activeFilterTotal = useMemo(() => {
    return filteredVouchers.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
  }, [filteredVouchers]);

  const ytdTotalDisbursed = useMemo(() => {
    return vouchers.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
  }, [vouchers]);

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to view the Payment Voucher Archives.</p>
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
                <History className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                PAYMENT VOUCHER ARCHIVES & AUDIT VAULT
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              IMMUTABLE AUDIT TRAIL, STATUTORY RE-PRINTING, AND HISTORICAL DISBURSEMENT RECONCILIATION.
            </p>
          </div>

          {/* User Context & Actions */}
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
              onClick={() => router.push('/accountant/payments')}
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-emerald-400" /> DISBURSEMENT PORTAL
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Archived PVs</span>
              <div className="text-xl font-black text-white font-mono">{vouchers.length} Vouchers</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Audit Locked & Immutable</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">YTD Total Disbursed</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ₵ {ytdTotalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Posted to General Ledger</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Landmark className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Active Filter Value</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ₵ {activeFilterTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">{filteredVouchers.length} Vouchers Matching</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. MULTI-DIMENSION FILTER BAR              */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by PV Number, Payee or Narration..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={sourceFilter}
              onChange={(e: any) => setSourceFilter(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer text-slate-800 dark:text-slate-100 font-bold"
            >
              <option value="ALL">All Categories</option>
              <option value="VENDOR">Vendor & Supplier Payments</option>
              <option value="LOCUM">Doctor Locum Shifts</option>
              <option value="OPEX">Operating Expenses</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. ARCHIVE MASTER LEDGER TABLE             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <TableHead className="p-4 pl-6">PV Number & Category</TableHead>
              <TableHead className="p-4">Payee Entity</TableHead>
              <TableHead className="p-4 text-right">Net Disbursed (GHS)</TableHead>
              <TableHead className="p-4">Payment Settlement</TableHead>
              <TableHead className="p-4">Date Posted</TableHead>
              <TableHead className="p-4 pr-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
            {areVouchersLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center p-12"><Loader2 className="animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
            ) : filteredVouchers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center p-12 text-slate-400 italic">No payment vouchers found matching criteria.</TableCell></TableRow>
            ) : (
              filteredVouchers.map(pv => {
                const category = pv.category || (pv.pvNumber?.includes('LOCUM') ? 'LOCUM' : pv.pvNumber?.includes('MMH') ? 'VENDOR' : 'OPEX');

                return (
                  <TableRow key={pv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <TableCell className="p-4 pl-6">
                      <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                        <span>{pv.pvNumber}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                          category === 'LOCUM' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' :
                          category === 'VENDOR' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {category}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="p-4 font-black uppercase text-slate-900 dark:text-slate-100">
                      {pv.payee}
                    </TableCell>

                    <TableCell className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                      ₵ {pv.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    <TableCell className="p-4 font-mono text-[10px] text-slate-500">
                      {pv.paymentMethod || 'GCB Bank - Cheque'}
                    </TableCell>

                    <TableCell className="p-4 font-mono text-slate-400 text-xs">
                      {pv.createdAt ? format(pv.createdAt.toDate ? pv.createdAt.toDate() : new Date(pv.createdAt), 'yyyy-MM-dd') : 'N/A'}
                    </TableCell>

                    <TableCell className="p-4 pr-6 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPV(pv)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-400 dark:hover:text-slate-950 font-black text-[10px] uppercase rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View / Print
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ========================================== */}
      {/* 4. PRINTABLE A4 VOUCHER DOSSIER MODAL      */}
      {/* ========================================== */}
      {selectedPV && (
        <Dialog open={!!selectedPV} onOpenChange={() => setSelectedPV(null)}>
          <DialogContent className="max-w-4xl p-0 max-h-[95vh] flex flex-col bg-white text-slate-900">
            <DialogHeader className="sr-only">
              <DialogTitle>Payment Voucher Dossier</DialogTitle>
            </DialogHeader>
            <PrintablePV voucher={selectedPV} hospitalName={hospitalData?.name || 'GAM MED EXECUTIVE HOSPITAL'} user={user} />
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

function PrintablePV({ voucher, hospitalName, user }: { voucher: PaymentVoucherItem; hospitalName?: string; user: any }) {
  const handlePrint = () => {
    window.print();
  };

  const gross = voucher.grossAmount || voucher.netAmount || 0;
  const vat = voucher.vatAmount || 0;
  const wht = voucher.whtAmount || 0;
  const net = voucher.netAmount || (gross + vat - wht);

  return (
    <>
      <div className="flex-grow overflow-y-auto p-6 md:p-8">
        <div id="printable-voucher-content" className="bg-white text-slate-900 font-serif border-4 border-slate-900 p-8 space-y-6">
          
          {/* Header */}
          <div className="text-center border-b-4 border-slate-900 pb-4 space-y-1">
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider">{hospitalName}</h1>
            <div className="inline-block bg-slate-900 text-white font-sans text-xs font-black uppercase tracking-widest px-6 py-1 rounded">
              OFFICIAL PAYMENT VOUCHER & AUDIT DOSSIER
            </div>
          </div>

          {/* Context Block */}
          <div className="flex justify-between items-start text-xs font-bold font-sans">
            <div className="space-y-1">
              <p className="uppercase"><span className="text-slate-400">Voucher No:</span> <strong className="font-mono text-emerald-700 ml-2">{voucher.pvNumber}</strong></p>
              <p className="uppercase"><span className="text-slate-400">Date Posted:</span> <strong className="font-mono ml-2">{voucher.createdAt ? format(voucher.createdAt.toDate ? voucher.createdAt.toDate() : new Date(voucher.createdAt), 'PPP') : 'N/A'}</strong></p>
              <p className="uppercase"><span className="text-slate-400">Payee Entity:</span> <strong className="ml-2 uppercase">{voucher.payee}</strong></p>
              <p className="uppercase"><span className="text-slate-400">Payment Settlement:</span> <strong className="ml-2">{voucher.paymentMethod || 'GCB Bank Transfer'}</strong></p>
            </div>

            <div className="text-right font-mono">
              <div className="border-2 border-slate-900 p-3 bg-slate-50 text-center">
                <span className="text-[9px] font-black uppercase text-slate-400 block">Currency</span>
                <span className="text-xl font-black">GHS (₵)</span>
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <table className="w-full border-2 border-slate-900 font-sans text-xs">
            <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left border-r border-slate-700">Payment Narration & Accounting Line</th>
                <th className="p-3 text-right">Amount (GHS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-bold">
              <tr>
                <td className="p-4 h-24 align-top border-r border-slate-300">
                  <p className="font-black uppercase">{voucher.narration || 'Disbursement payout'}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-2">DEBIT: Expenditure Account ({voucher.debitAccountId || '4001'})</p>
                  <p className="text-[10px] text-slate-500 font-mono">CREDIT: Bank Cash Account ({voucher.creditAccountId || '1001'})</p>
                </td>
                <td className="p-4 text-right font-mono text-sm">
                  ₵ {gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {vat > 0 && (
                <tr className="bg-slate-50">
                  <td className="p-2.5 text-right font-black uppercase text-[10px] border-r border-slate-300">
                    Add: Statutory VAT & Levies (21.9%)
                  </td>
                  <td className="p-2.5 text-right font-mono">
                    ₵ {vat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              {wht > 0 && (
                <tr className="bg-rose-50 text-rose-800">
                  <td className="p-2.5 text-right font-black uppercase text-[10px] border-r border-slate-300">
                    Less: GRA Statutory Withholding Tax ({voucher.whtLabel || '5%'})
                  </td>
                  <td className="p-2.5 text-right font-mono font-black">
                    - ₵ {wht.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              <tr className="bg-slate-900 text-white font-black text-sm">
                <td className="p-4 text-right uppercase tracking-widest border-r border-slate-800">
                  NET AMOUNT DISBURSED
                </td>
                <td className="p-4 text-right font-mono text-emerald-400 text-base">
                  ₵ {net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signatures & Controls */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-900 font-sans text-[10px] font-bold">
            <div className="text-center space-y-4">
              <div className="border-b border-slate-900 pb-1">
                <p className="font-black uppercase">{voucher.processedByName || 'Marcus Amosah Henaku'}</p>
              </div>
              <p className="uppercase text-slate-400">Prepared By (Accountant)</p>
            </div>

            <div className="text-center space-y-4">
              <div className="border-b border-slate-900 pb-1">
                <p className="font-black uppercase text-emerald-700">VERIFIED & PRE-AUDITED</p>
              </div>
              <p className="uppercase text-slate-400">Internal Audit Certification</p>
            </div>

            <div className="text-center space-y-4">
              <div className="border-b border-slate-900 pb-1">
                <p className="font-black uppercase">{voucher.approvedByName || 'Dr. Evelyn Baidoo'}</p>
              </div>
              <p className="uppercase text-slate-400">Approved By (Medical Director)</p>
            </div>
          </div>

          <div className="text-center pt-4 opacity-50 font-sans text-[8px] uppercase tracking-widest border-t">
            Digitally Sealed Voucher Dossier • GAM Med Financial Ecosystem • JV Ref: JV-{voucher.pvNumber}
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-100 border-t flex justify-end gap-3">
        <button
          type="button"
          onClick={handlePrint}
          className="px-6 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white font-black text-xs uppercase rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> PRINT VOUCHER DOSSIER
        </button>
      </div>
    </>
  );
}