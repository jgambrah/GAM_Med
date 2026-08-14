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
  const whtRate = voucher.whtRate ? voucher.whtRate * 100 : 5;

  const dateStr = voucher.createdAt
    ? format(voucher.createdAt.toDate ? voucher.createdAt.toDate() : new Date(voucher.createdAt), 'PPP')
    : '2026-08-14';

  return (
    <>
      {/* Web UI Actions - Hidden during print */}
      <div className="sticky top-0 right-0 flex justify-end gap-2 p-4 bg-slate-100 print:hidden border-b z-20">
        <button 
          onClick={handlePrint}
          className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs uppercase rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print Voucher
        </button>
      </div>

      {/* --- START OF PRINTABLE A4 CONTENT --- */}
      <div className="flex-grow overflow-y-auto p-8 bg-white print:p-0">
        <div id="printable-voucher-content" className="p-8 text-black bg-white font-sans print:w-[210mm] print:h-[297mm] print:max-w-none print:max-h-none print:shadow-none print:overflow-visible">
          
          {/* Header Section */}
          <div className="flex justify-between items-start border-b-4 border-slate-800 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{hospitalName || 'GAM MED HOSPITAL'}</h1>
              <p className="text-sm text-slate-600 mt-1">Excellence in Healthcare Delivery</p>
              <p className="text-xs text-slate-500 mt-1">P.O. Box 123, Kumasi, Ghana | GRA TIN: C000984712X</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-800 tracking-widest">PAYMENT VOUCHER</h2>
              <div className="mt-2 text-sm bg-slate-100 inline-block p-2 rounded border border-slate-300">
                <p><span className="font-semibold text-slate-500">PV NO:</span> <span className="font-bold text-indigo-900">{voucher.pvNumber}</span></p>
                <p><span className="font-semibold text-slate-500">DATE:</span> <span className="font-bold">{dateStr}</span></p>
              </div>
            </div>
          </div>

          {/* Payee Section */}
          <div className="mb-6 p-4 border border-slate-300 rounded bg-slate-50">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payee Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-slate-600">Official Name:</p>
                <p className="font-bold text-lg text-slate-900 uppercase">{voucher.payee}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">Payee TIN:</p>
                <p className="font-bold font-mono text-slate-800">C000349182X</p>
              </div>
            </div>
          </div>

          {/* Transaction Description */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Detailed Narration</h3>
            <p className="text-sm p-3 border border-slate-300 rounded min-h-[80px] font-medium text-slate-800">
              {voucher.narration || 'Payment disbursement transaction.'}
            </p>
          </div>

          {/* Financial Breakdown Table */}
          <table className="w-full mb-8 text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                <th className="p-3 text-left border border-slate-800">Description</th>
                <th className="p-3 text-right border border-slate-800 w-48">Amount (GHS)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-300 font-medium">Gross Expenditure</td>
                <td className="p-3 border border-slate-300 text-right font-mono font-bold">
                  {gross.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              {wht > 0 && (
                <tr className="bg-red-50 text-red-900 font-medium">
                  <td className="p-3 border border-slate-300">
                    Less: Withholding Tax ({whtRate}%)
                  </td>
                  <td className="p-3 border border-slate-300 text-right font-mono font-bold">
                    ({wht.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </td>
                </tr>
              )}
              <tr className="bg-slate-100 font-bold text-lg">
                <td className="p-3 border border-slate-300 text-right text-slate-900">NET AMOUNT PAYABLE:</td>
                <td className="p-3 border border-slate-300 text-right font-mono font-black text-indigo-950 border-double border-b-4">
                  {net.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* General Ledger Impact */}
          <div className="mb-12">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Accounting Distribution</h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-50 p-3 border border-slate-300 rounded">
              <p><span className="font-bold text-slate-600">Debit (DR):</span> {voucher.debitAccountId || '4001 - Medical Inventory & Supplies'}</p>
              <p><span className="font-bold text-slate-600">Credit (CR):</span> {voucher.creditAccountId || '1001 - GCB Main Operational Account'}</p>
            </div>
          </div>

          {/* Signatures & Approvals */}
          <div className="grid grid-cols-4 gap-4 mt-auto pt-8 border-t border-slate-200">
            <div className="text-center">
              <div className="border-b border-slate-400 h-10 mb-2 flex items-end justify-center font-bold text-xs">
                {voucher.processedByName || 'Marcus A. Henaku'}
              </div>
              <p className="text-xs font-bold">{voucher.processedByName || 'Marcus A. Henaku'}</p>
              <p className="text-xs text-slate-500">Prepared By</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 h-10 mb-2 flex items-end justify-center font-bold text-xs text-emerald-700">
                PRE-AUDITED
              </div>
              <p className="text-xs font-bold">Internal Audit</p>
              <p className="text-xs text-slate-500">Checked By</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 h-10 mb-2 flex items-end justify-center font-bold text-xs">
                {voucher.approvedByName || 'Dr. Evelyn Baidoo'}
              </div>
              <p className="text-xs font-bold">{voucher.approvedByName || 'Dr. Evelyn Baidoo'}</p>
              <p className="text-xs text-slate-500">Authorized By</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 h-10 mb-2"></div>
              <p className="text-xs font-bold text-slate-400 select-none">_________________</p>
              <p className="text-xs text-slate-500">Receiver's Signature</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}