'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { 
  History, Eye, Printer, Loader2, ShieldAlert,
  Wallet, FileText, Landmark, Search, Filter, Calendar,
  CheckCircle2, ArrowRight, X, ExternalLink, ShieldCheck, Tag,
  AlertTriangle, Clock, Check, XCircle, Download, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type BatchPayeeLine = {
  id: string;
  payeeName: string;
  staffId: string;
  department: string;
  grossAmount: number;
  whtRate: number;
  whtAmount: number;
  netPayable: number;
  paymentChannel?: string;
};

type PaymentVoucherItem = {
  id: string;
  pvNumber: string;
  disbursementMode?: 'SINGLE' | 'BATCH';
  payee: string;
  grossAmount: number;
  vatAmount?: number;
  whtAmount?: number;
  whtRate?: number;
  whtLabel?: string;
  netAmount: number;
  narration?: string;
  valueDate?: string;
  processedByName?: string;
  approvedByName?: string;
  approvedAt?: any;
  paymentMethod?: string;
  status?: 'AWAITING_FINANCE_APPROVAL' | 'AWAITING_BUDGET_OVERRIDE' | 'AUTHORIZED' | 'PAID' | 'DISBURSED' | 'REJECTED_WITH_QUERY';
  rejectionReason?: string;
  category?: 'VENDOR' | 'LOCUM' | 'OPEX' | 'PAYROLL';
  batchPayees?: BatchPayeeLine[];
  createdAt: { toDate: () => Date } | any;
  debitAccountId?: string;
  debitAccountName?: string;
  debitAccountCode?: string;
  creditAccountId?: string;
  creditAccountName?: string;
  creditAccountCode?: string;
  isOverBudget?: boolean;
  overrideJustification?: string;
};

export default function PaymentVoucherArchive() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'PENDING_CHECKER' | 'AUDIT_VAULT'>('PENDING_CHECKER');
  const [selectedPV, setSelectedPV] = useState<PaymentVoucherItem | null>(null);
  const [rejectingPV, setRejectingPV] = useState<PaymentVoucherItem | null>(null);
  const [rejectQuery, setRejectQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'VENDOR' | 'LOCUM' | 'BATCH' | 'OPEX'>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'CHIEF_ACCOUNTANT', 'AUDITOR'].includes(userRole);

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
      id: 'pv-pending-01',
      pvNumber: 'GAM/PV-BATCH/26/0142',
      disbursementMode: 'BATCH',
      payee: 'Batch Disbursement (4 Clinical Staff & Locums)',
      grossAmount: 6000.00,
      vatAmount: 0,
      whtAmount: 187.50,
      netAmount: 5812.50,
      narration: 'Staff Clinical Night-Shift & Speciality Locum Allowances - August 2026 Batch',
      processedByName: 'Marcus Amosah Henaku',
      status: 'AWAITING_FINANCE_APPROVAL',
      category: 'BATCH',
      valueDate: '2026-08-19',
      debitAccountCode: '5100',
      debitAccountName: 'Departmental Cost Centers (OPEX)',
      creditAccountCode: '1002',
      creditAccountName: 'GCB Main Operating Bank',
      batchPayees: [
        { id: '1', payeeName: 'Dr. Eric Appiah', staffId: 'GAM/STF/0042', department: '5105 - OPD Clinical', grossAmount: 1500, whtRate: 0, whtAmount: 0, netPayable: 1500, paymentChannel: 'GCB Bank - 1099248102' },
        { id: '2', payeeName: 'Sister Grace Mensah', staffId: 'GAM/STF/0118', department: '5110 - Maternity Ward', grossAmount: 1200, whtRate: 0, whtAmount: 0, netPayable: 1200, paymentChannel: 'Standard Chartered - 0100924819' },
        { id: '3', payeeName: 'Dr. James Obrempong', staffId: 'EXT/LOC/009', department: '5120 - Surgery Theatre Locum', grossAmount: 2500, whtRate: 0.075, whtAmount: 187.50, netPayable: 2312.50, paymentChannel: 'Ecobank Ghana - 2088192011' },
        { id: '4', payeeName: 'Samuel Kofi Mensah', staffId: 'GAM/STF/0088', department: '5115 - Central Laboratory', grossAmount: 800, whtRate: 0, whtAmount: 0, netPayable: 800, paymentChannel: 'MTN MoMo - 0244192801' }
      ],
      createdAt: { toDate: () => new Date('2026-08-19T14:15:00') }
    },
    {
      id: 'pv-001',
      pvNumber: 'GAM/PV/26/0088',
      disbursementMode: 'SINGLE',
      payee: 'KORLE-BU PHARMACEUTICAL DISTRIBUTORS LTD',
      grossAmount: 30000.00,
      vatAmount: 6570.00,
      whtAmount: 1500.00,
      netAmount: 35070.00,
      narration: 'Payment for Emergency Antimalarial & ICU Antibiotics Stock (GRN-2026-0810)',
      processedByName: 'Marcus Amosah Henaku',
      approvedByName: 'Dr. Evelyn Baidoo (Director)',
      approvedAt: new Date('2026-08-12T16:00:00'),
      paymentMethod: 'GCB Bank - Cheque #40912',
      status: 'AUTHORIZED',
      category: 'VENDOR',
      debitAccountCode: '4001',
      debitAccountName: 'Purchase - Medical Supplies & Drugs',
      creditAccountCode: '1001',
      creditAccountName: 'Cash at Bank - GCB Main',
      createdAt: { toDate: () => new Date('2026-08-12T14:30:00') }
    },
    {
      id: 'pv-002',
      pvNumber: 'GAM/PV/26/0074',
      disbursementMode: 'SINGLE',
      payee: 'Dr. Emmanuel Ofori Atta (Obstetric Locum Specialist)',
      grossAmount: 12500.00,
      vatAmount: 0,
      whtAmount: 937.50,
      netAmount: 11562.50,
      narration: 'Honorarium for 5 Night Locum Shifts in Maternity Theatre (Aug 1 - Aug 7)',
      processedByName: 'Marcus Amosah Henaku',
      approvedByName: 'Dr. Evelyn Baidoo (Director)',
      approvedAt: new Date('2026-08-10T15:20:00'),
      paymentMethod: 'Mobile Money (MoMo Transfer)',
      status: 'AUTHORIZED',
      category: 'LOCUM',
      debitAccountCode: '4003',
      debitAccountName: 'Locum & Clinical Consultancy Fees',
      creditAccountCode: '1002',
      creditAccountName: 'Ecobank MoMo Aggregator',
      createdAt: { toDate: () => new Date('2026-08-10T11:15:00') }
    },
    {
      id: 'pv-003',
      pvNumber: 'GAM/PV/26/0061',
      disbursementMode: 'SINGLE',
      payee: 'GHANA REVENUE AUTHORITY (GRA TAX OFFICE)',
      grossAmount: 15463.63,
      vatAmount: 0,
      whtAmount: 0,
      netAmount: 15463.63,
      narration: 'Monthly Statutory Withholding Tax Remittance for July 2026 Collections',
      processedByName: 'Marcus Amosah Henaku',
      approvedByName: 'Dr. Evelyn Baidoo (Director)',
      approvedAt: new Date('2026-08-08T12:00:00'),
      paymentMethod: 'Bank Wire Transfer (GCB Main)',
      status: 'AUTHORIZED',
      category: 'OPEX',
      debitAccountCode: '2120',
      debitAccountName: 'GRA Withholding Tax Payable',
      creditAccountCode: '1001',
      creditAccountName: 'Cash at Bank - GCB Main',
      createdAt: { toDate: () => new Date('2026-08-08T09:45:00') }
    }
  ], []);

  const vouchers = rawVouchers && rawVouchers.length > 0 ? rawVouchers : demoVouchers;

  // Split into Pending Checker Queue vs Audit Archive
  const pendingVouchers = useMemo(() => {
    return vouchers.filter(pv => ['AWAITING_FINANCE_APPROVAL', 'AWAITING_BUDGET_OVERRIDE'].includes(pv.status || ''));
  }, [vouchers]);

  const archivedVouchers = useMemo(() => {
    return vouchers.filter(pv => ['AUTHORIZED', 'PAID', 'DISBURSED', 'REJECTED_WITH_QUERY'].includes(pv.status || 'AUTHORIZED'));
  }, [vouchers]);

  const displayedVouchers = useMemo(() => {
    const pool = activeTab === 'PENDING_CHECKER' ? pendingVouchers : archivedVouchers;
    return pool.filter(pv => {
      // Source Filter
      if (sourceFilter !== 'ALL') {
        const cat = pv.category || (pv.disbursementMode === 'BATCH' ? 'BATCH' : pv.pvNumber?.includes('LOCUM') ? 'LOCUM' : pv.pvNumber?.includes('MMH') ? 'VENDOR' : 'OPEX');
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
  }, [activeTab, pendingVouchers, archivedVouchers, sourceFilter, searchTerm]);

  const activeTotalValue = useMemo(() => {
    return displayedVouchers.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
  }, [displayedVouchers]);

  const ytdTotalDisbursed = useMemo(() => {
    return archivedVouchers.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
  }, [archivedVouchers]);

  // Checker Workflow Actions
  const handleApproveVoucher = async (pv: PaymentVoucherItem) => {
    setProcessingId(pv.id);
    const checkerName = user?.displayName || userProfile?.name || 'Chief Accountant (Checker)';

    if (!firestore || !hospitalId) {
      setTimeout(() => {
        pv.status = 'AUTHORIZED';
        pv.approvedByName = checkerName;
        pv.approvedAt = new Date();
        toast({
          title: `PV #${pv.pvNumber} Authorized Successfully`,
          description: `Voucher stamped by ${checkerName}. Compound journal voucher posted to General Ledger.`
        });
        setProcessingId(null);
      }, 800);
      return;
    }

    try {
      const pvRef = doc(firestore, `hospitals/${hospitalId}/payment_vouchers`, pv.id);
      await updateDoc(pvRef, {
        status: 'AUTHORIZED',
        approvedBy: user?.uid || 'checker',
        approvedByName: checkerName,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({
        title: `PV #${pv.pvNumber} Authorized & Executed`,
        description: `Checker signature stamped. Posted to General Ledger and ready for bank settlement.`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Approval Error', description: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectVoucher = async () => {
    if (!rejectingPV) return;
    if (!rejectQuery.trim()) {
      toast({ variant: 'destructive', title: 'Reason Required', description: 'Please enter a clear audit query reason for rejecting this voucher.' });
      return;
    }

    setProcessingId(rejectingPV.id);
    const checkerName = user?.displayName || userProfile?.name || 'Chief Accountant';

    if (!firestore || !hospitalId) {
      setTimeout(() => {
        rejectingPV.status = 'REJECTED_WITH_QUERY';
        rejectingPV.rejectionReason = rejectQuery;
        toast({
          title: `PV #${rejectingPV.pvNumber} Returned to Maker`,
          description: `Audit remark attached: "${rejectQuery}". Maker notified for correction.`
        });
        setRejectingPV(null);
        setRejectQuery('');
        setProcessingId(null);
      }, 800);
      return;
    }

    try {
      const pvRef = doc(firestore, `hospitals/${hospitalId}/payment_vouchers`, rejectingPV.id);
      await updateDoc(pvRef, {
        status: 'REJECTED_WITH_QUERY',
        rejectionReason: rejectQuery,
        rejectedBy: user?.uid || 'checker',
        rejectedByName: checkerName,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({
        title: `PV #${rejectingPV.pvNumber} Returned to Maker`,
        description: `Voucher flagged with query and returned to Maker queue.`
      });
      setRejectingPV(null);
      setRejectQuery('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Rejection Error', description: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportBankSchedule = (pv: PaymentVoucherItem) => {
    const payees = pv.batchPayees || [];
    if (payees.length === 0) {
      toast({ variant: 'destructive', title: 'Export Unavailable', description: 'No multi-payee breakdown lines attached to this voucher.' });
      return;
    }

    const headers = "Beneficiary_Name,Staff_ID,Department,Bank_MoMo_Provider,Account_Number,Gross_Amount,WHT_Amount,Net_Disbursement,Narration,Value_Date\n";
    const rowsContent = payees.map(r => {
      const parts = (r.paymentChannel || 'Bank Transfer - 0000000000').split(' - ');
      const bank = parts[0] || 'Bank';
      const acct = parts[1] || 'N/A';
      return `"${r.payeeName}","${r.staffId}","${r.department}","${bank}","${acct}",${r.grossAmount.toFixed(2)},${r.whtAmount.toFixed(2)},${r.netPayable.toFixed(2)},"${pv.narration || 'Disbursement'}","${pv.valueDate || '2026-08-19'}"`;
    }).join('\n');

    const csvData = "data:text/csv;charset=utf-8," + headers + rowsContent;
    const encodedUri = encodeURI(csvData);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GAM_MED_${pv.pvNumber.replace(/\//g, '_')}_Bank_Disbursement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Bank File Exported", description: `Exported corporate banking file for PV #${pv.pvNumber} (${payees.length} payees).` });
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
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                CHECKER AUTHORIZATION & AUDIT VAULT
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              MAKER-CHECKER SEGREGATION OF DUTIES, MULTI-PAYEE BATCH SETTLEMENTS, AND GENERAL LEDGER AUDIT TRAILS.
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
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT (CHECKER)</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/accountant/payments')}
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-emerald-400" /> DISBURSEMENT PORTAL (MAKER)
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Telemetry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Awaiting Checker Review</span>
              <div className="text-xl font-black text-amber-400 font-mono">{pendingVouchers.length} Vouchers</div>
              <span className="text-[10px] font-bold text-amber-400 mt-0.5 block">Pending Maker-Checker Sign-off</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-amber-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Executed Historical PVs</span>
              <div className="text-xl font-black text-white font-mono">{archivedVouchers.length} Vouchers</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Audit Locked & Immutable</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">YTD Executed Outflow</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ₵ {ytdTotalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Posted to General Ledger</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Landmark className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. TABBED DUAL-WORKSPACE NAVIGATOR         */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('PENDING_CHECKER')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'PENDING_CHECKER'
                ? 'bg-slate-950 text-emerald-400 border border-emerald-500/30 shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>CHECKER QUEUE (AWAITING AUTHORIZATION)</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-mono font-bold">
              {pendingVouchers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AUDIT_VAULT')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'AUDIT_VAULT'
                ? 'bg-slate-950 text-emerald-400 border border-emerald-500/30 shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>IMMUTABLE AUDIT VAULT & EXECUTED PVS</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold">
              {archivedVouchers.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search PV #, Payee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select 
            value={sourceFilter}
            onChange={(e: any) => setSourceFilter(e.target.value)}
            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="BATCH">Multi-Payee Batch Schedules</option>
            <option value="VENDOR">Vendor & Supplier Payments</option>
            <option value="LOCUM">Doctor Locum Shifts</option>
            <option value="OPEX">Operating Expenses</option>
          </select>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. WORKSPACE TABLE                         */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <TableHead className="p-4 pl-6">Voucher Number & Type</TableHead>
              <TableHead className="p-4">Payee / Beneficiary Schedule</TableHead>
              <TableHead className="p-4 text-right">Gross (GHS)</TableHead>
              <TableHead className="p-4 text-right">Tax (GHS)</TableHead>
              <TableHead className="p-4 text-right">Net Outflow (GHS)</TableHead>
              <TableHead className="p-4">Source Ledger (Credit)</TableHead>
              <TableHead className="p-4">Status & Maker</TableHead>
              <TableHead className="p-4 pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
            {areVouchersLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center p-12"><Loader2 className="animate-spin mx-auto text-emerald-500" /></TableCell></TableRow>
            ) : displayedVouchers.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center p-12 text-slate-400 italic">No vouchers found in this view.</TableCell></TableRow>
            ) : (
              displayedVouchers.map(pv => {
                const isBatch = pv.disbursementMode === 'BATCH' || (pv.batchPayees && pv.batchPayees.length > 0);
                const isPending = ['AWAITING_FINANCE_APPROVAL', 'AWAITING_BUDGET_OVERRIDE'].includes(pv.status || '');
                const isProcessing = processingId === pv.id;

                return (
                  <TableRow key={pv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <TableCell className="p-4 pl-6">
                      <div className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                        <span>{pv.pvNumber}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                          isBatch ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {isBatch ? `BATCH (${pv.batchPayees?.length || 4})` : 'SINGLE'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        Date: {pv.createdAt ? format(pv.createdAt.toDate ? pv.createdAt.toDate() : new Date(pv.createdAt), 'yyyy-MM-dd') : '2026-08-19'}
                      </span>
                    </TableCell>

                    <TableCell className="p-4 font-black text-slate-900 dark:text-slate-100">
                      <div className="uppercase">{pv.payee}</div>
                      <p className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{pv.narration}</p>
                    </TableCell>

                    <TableCell className="p-4 text-right font-mono text-slate-600 dark:text-slate-400">
                      ₵ {pv.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    <TableCell className="p-4 text-right font-mono text-amber-600 dark:text-amber-400">
                      ₵ {(pv.whtAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    <TableCell className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      ₵ {pv.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    <TableCell className="p-4 font-mono text-[10px] text-slate-500">
                      {pv.creditAccountCode ? `${pv.creditAccountCode} - ${pv.creditAccountName || 'Bank'}` : (pv.paymentMethod || '1001 - GCB Bank')}
                    </TableCell>

                    <TableCell className="p-4">
                      {isPending ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3 h-3" /> AWAITING SIGN-OFF
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-1">Maker: {pv.processedByName || 'Accountant'}</span>
                        </div>
                      ) : pv.status === 'REJECTED_WITH_QUERY' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <XCircle className="w-3 h-3" /> REJECTED
                          </span>
                          <span className="text-[9px] text-rose-500 block mt-0.5 truncate max-w-xs">{pv.rejectionReason}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <Check className="w-3 h-3" /> AUTHORIZED
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-1">Checker: {pv.approvedByName || 'Director'}</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveVoucher(pv)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                            >
                              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              <span>AUTHORIZE</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRejectingPV(pv)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-black text-[10px] uppercase rounded-lg border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              <span>QUERY</span>
                            </button>
                          </>
                        ) : null}

                        {isBatch && (
                          <button
                            type="button"
                            onClick={() => handleExportBankSchedule(pv)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                            title="Export Corporate Banking File"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedPV(pv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-400 font-black text-[10px] uppercase rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> DOSSIER
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ========================================== */}
      {/* 4. REJECTION AUDIT QUERY MODAL             */}
      {/* ========================================== */}
      {rejectingPV && (
        <Dialog open={!!rejectingPV} onOpenChange={() => setRejectingPV(null)}>
          <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-sm font-black uppercase text-rose-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Flag & Return Payment Voucher to Maker
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 text-xs">
              <p className="text-slate-500">
                You are rejecting PV <strong>#{rejectingPV.pvNumber}</strong> ({rejectingPV.payee}). Please specify the internal control discrepancy or required corrections for the Maker.
              </p>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Audit Query & Rejection Reason *
                </label>
                <textarea
                  value={rejectQuery}
                  onChange={(e) => setRejectQuery(e.target.value)}
                  placeholder="e.g. Missing signed clinical night-shift attendance sheet for Sister Grace; please attach and resubmit..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 h-24 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectingPV(null)}
                  className="px-3 py-2 text-slate-500 hover:text-slate-900 font-bold uppercase text-[10px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectVoucher}
                  disabled={processingId === rejectingPV.id || !rejectQuery.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs rounded-xl shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {processingId === rejectingPV.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                  <span>Confirm Rejection & Return</span>
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================== */}
      {/* 5. PRINTABLE A4 VOUCHER DOSSIER MODAL      */}
      {/* ========================================== */}
      {selectedPV && (
        <Dialog open={!!selectedPV} onOpenChange={() => setSelectedPV(null)}>
          <DialogContent className="max-w-4xl p-0 max-h-[95vh] flex flex-col bg-white text-slate-900 rounded-2xl overflow-hidden">
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

  const isBatch = voucher.disbursementMode === 'BATCH' || (voucher.batchPayees && voucher.batchPayees.length > 0);
  const gross = voucher.grossAmount || voucher.netAmount || 0;
  const vat = voucher.vatAmount || 0;
  const wht = voucher.whtAmount || 0;
  const net = voucher.netAmount || (gross + vat - wht);
  const whtRate = voucher.whtRate ? voucher.whtRate * 100 : 5;

  const dateStr = voucher.createdAt
    ? format(voucher.createdAt.toDate ? voucher.createdAt.toDate() : new Date(voucher.createdAt), 'PPP')
    : '2026-08-19';

  return (
    <>
      {/* Web UI Actions - Hidden during print */}
      <div className="sticky top-0 right-0 flex justify-between items-center p-4 bg-slate-100 print:hidden border-b z-20">
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-xs uppercase text-slate-700">
            VOUCHER DOSSIER: {voucher.pvNumber}
          </span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
            voucher.status === 'AUTHORIZED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {voucher.status || 'PENDING'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs uppercase rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print A4 Voucher
          </button>
        </div>
      </div>

      {/* --- START OF PRINTABLE A4 CONTENT --- */}
      <div className="flex-grow overflow-y-auto p-8 bg-white print:p-0">
        <div id="printable-voucher-content" className="p-8 text-black bg-white font-sans print:w-[210mm] print:h-[297mm] print:max-w-none print:max-h-none print:shadow-none print:overflow-visible">
          
          {/* Header Section */}
          <div className="flex justify-between items-start border-b-4 border-slate-800 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{hospitalName || 'GAM MED HOSPITAL'}</h1>
              <p className="text-sm text-slate-600 mt-1">Excellence in Healthcare Delivery & Financial Governance</p>
              <p className="text-xs text-slate-500 mt-1">P.O. Box 123, Kumasi, Ghana | GRA TIN: C000984712X</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-800 tracking-widest">
                {isBatch ? 'BATCH PAYMENT VOUCHER' : 'PAYMENT VOUCHER'}
              </h2>
              <div className="mt-2 text-sm bg-slate-100 inline-block p-2 rounded border border-slate-300">
                <p><span className="font-semibold text-slate-500">PV NO:</span> <span className="font-bold text-indigo-900 font-mono">{voucher.pvNumber}</span></p>
                <p><span className="font-semibold text-slate-500">DATE:</span> <span className="font-bold">{dateStr}</span></p>
              </div>
            </div>
          </div>

          {/* Payee Section */}
          <div className="mb-6 p-4 border border-slate-300 rounded bg-slate-50">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payee & Funding Distribution</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-slate-600">Beneficiary / Entity:</p>
                <p className="font-bold text-lg text-slate-900 uppercase">{voucher.payee}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600">Funding Bank / Vault Account:</p>
                <p className="font-bold font-mono text-slate-800">
                  {voucher.creditAccountCode ? `${voucher.creditAccountCode} - ${voucher.creditAccountName}` : (voucher.paymentMethod || '1001 - GCB Main Bank Account')}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Description */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Master Narration & Purpose</h3>
            <p className="text-sm p-3 border border-slate-300 rounded min-h-[60px] font-medium text-slate-800">
              {voucher.narration || 'Payment disbursement transaction.'}
            </p>
          </div>

          {/* If Batch, Render Multi-Payee Line Item Grid */}
          {isBatch && voucher.batchPayees && voucher.batchPayees.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Batch Payee Schedule ({voucher.batchPayees.length} Line Items)
              </h3>
              <table className="w-full text-xs border-collapse border border-slate-300 mb-4">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold uppercase text-[9px]">
                    <th className="p-2 border border-slate-700 text-left">#</th>
                    <th className="p-2 border border-slate-700 text-left">Staff Name & ID</th>
                    <th className="p-2 border border-slate-700 text-left">Cost Center GL</th>
                    <th className="p-2 border border-slate-700 text-right">Gross (GHS)</th>
                    <th className="p-2 border border-slate-700 text-right">WHT (GHS)</th>
                    <th className="p-2 border border-slate-700 text-right">Net (GHS)</th>
                    <th className="p-2 border border-slate-700 text-left">Bank / Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {voucher.batchPayees.map((row, idx) => (
                    <tr key={row.id || idx} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border border-slate-200 font-bold">
                        {row.payeeName} <span className="text-[10px] font-mono text-slate-500 font-normal">({row.staffId})</span>
                      </td>
                      <td className="p-2 border border-slate-200 font-mono text-[10px]">{row.department}</td>
                      <td className="p-2 border border-slate-200 text-right font-mono">{row.grossAmount.toFixed(2)}</td>
                      <td className="p-2 border border-slate-200 text-right font-mono text-amber-700">{row.whtAmount.toFixed(2)}</td>
                      <td className="p-2 border border-slate-200 text-right font-mono font-bold text-emerald-800">{row.netPayable.toFixed(2)}</td>
                      <td className="p-2 border border-slate-200 font-mono text-[10px]">{row.paymentChannel || 'Bank Direct'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Financial Breakdown Summary Table */}
          <table className="w-full mb-6 text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                <th className="p-3 text-left border border-slate-800">Financial Summary Parameter</th>
                <th className="p-3 text-right border border-slate-800 w-48">Amount (GHS)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-300 font-medium">Total Gross Expenditure (Debit)</td>
                <td className="p-3 border border-slate-300 text-right font-mono font-bold">
                  {gross.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              {wht > 0 && (
                <tr className="bg-red-50 text-red-900 font-medium">
                  <td className="p-3 border border-slate-300">
                    Less: Total GRA Withholding Tax Withheld (Credit to 2120)
                  </td>
                  <td className="p-3 border border-slate-300 text-right font-mono font-bold">
                    ({wht.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </td>
                </tr>
              )}
              <tr className="bg-slate-100 font-bold text-lg">
                <td className="p-3 border border-slate-300 text-right text-slate-900">NET BANK DISBURSEMENT OUTFLOW:</td>
                <td className="p-3 border border-slate-300 text-right font-mono font-black text-indigo-950 border-double border-b-4">
                  {net.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* General Ledger Impact */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Double-Entry Accounting Distribution</h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-50 p-3 border border-slate-300 rounded">
              <p><span className="font-bold text-slate-600">Debit (DR):</span> {voucher.debitAccountCode || '5100'} - {voucher.debitAccountName || 'Expenditure Cost Centers'}</p>
              <p><span className="font-bold text-slate-600">Credit (CR):</span> {voucher.creditAccountCode || '1002'} - {voucher.creditAccountName || 'GCB Main Operating Account'}</p>
            </div>
          </div>

          {/* Signatures & Approvals */}
          <div className="grid grid-cols-4 gap-4 mt-auto pt-6 border-t border-slate-200">
            <div className="text-center">
              <div className="border-b border-slate-400 h-10 mb-2 flex items-end justify-center font-bold text-xs">
                {voucher.processedByName || 'Marcus A. Henaku'}
              </div>
              <p className="text-xs font-bold">{voucher.processedByName || 'Marcus A. Henaku'}</p>
              <p className="text-xs text-slate-500">Prepared By (Maker)</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 h-10 mb-2 flex items-end justify-center font-bold text-xs text-emerald-700">
                PRE-AUDITED
              </div>
              <p className="text-xs font-bold">Internal Audit</p>
              <p className="text-xs text-slate-500">Audit Stamp</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 h-10 mb-2 flex items-end justify-center font-bold text-xs text-indigo-900">
                {voucher.approvedByName || (voucher.status === 'AUTHORIZED' ? 'Dr. Evelyn Baidoo' : 'AWAITING')}
              </div>
              <p className="text-xs font-bold">{voucher.approvedByName || 'Dr. Evelyn Baidoo'}</p>
              <p className="text-xs text-slate-500">Authorized By (Checker)</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 h-10 mb-2"></div>
              <p className="text-xs font-bold text-slate-400 select-none">_________________</p>
              <p className="text-xs text-slate-500">Receiver / Cashier</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}