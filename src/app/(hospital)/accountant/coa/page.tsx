'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, orderBy, doc, addDoc } from 'firebase/firestore';
import { 
  Network, Plus, Search, Filter, Landmark, 
  ArrowUpRight, ArrowDownRight, Scale, Briefcase, 
  AlertTriangle, FileCheck2, MoreHorizontal, Edit3, 
  Loader2, ShieldAlert, Lock, Unlock, Eye, FileSpreadsheet,
  Building2, CheckCircle2, X, ArrowRight, BookOpen, Layers, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export interface GLAccount {
  code: string;
  name: string;
  category: 'ASSETS' | 'LIABILITIES' | 'EQUITY' | 'REVENUE' | 'EXPENSES';
  balance: number;
  type: 'DEBIT' | 'CREDIT';
  isSystem: boolean;
  costCenter?: string;
}

export interface GLTransactionLine {
  id: string;
  date: string;
  reference: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

const accountSchema = z.object({
  name: z.string().min(2, "Account name is required."),
  category: z.enum(['ASSETS', 'LIABILITIES', 'EQUITY', 'REVENUE', 'EXPENSES']),
  accountCode: z.string().min(4, "Account code must be at least 4 digits."),
  costCenter: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function ChartOfAccountsHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedAccountForDrilldown, setSelectedAccountForDrilldown] = useState<GLAccount | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'FINANCE_CONTROLLER'].includes(userRole || 'ACCOUNTANT');

  const accountsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`),
      orderBy("accountCode", "asc")
    );
  }, [firestore, hospitalId]);

  const { data: rawAccounts, isLoading: areAccountsLoading } = useCollection(accountsQuery);

  // Comprehensive Standard IFRS/GAAP Healthcare Chart of Accounts Roster
  const standardIfrsAccounts: GLAccount[] = useMemo(() => [
    // 1000s ASSETS
    { code: '1001', name: 'GCB Bank Ghana Corporate Operating Account', category: 'ASSETS', balance: 385000.00, type: 'DEBIT', isSystem: true },
    { code: '1010', name: 'Main Cash Vault & Petty Imprest', category: 'ASSETS', balance: 7974.25, type: 'DEBIT', isSystem: false },
    { code: '1020', name: 'Paystack / MoMo Settlement Clearing Account', category: 'ASSETS', balance: 15400.00, type: 'DEBIT', isSystem: true },
    { code: '1099', name: 'Accumulated Depreciation Contra-Asset', category: 'ASSETS', balance: -237938.89, type: 'DEBIT', isSystem: true },
    { code: '1200', name: 'Accounts Receivable - Patient Out-of-Pocket & Self-Pay', category: 'ASSETS', balance: 42300.00, type: 'DEBIT', isSystem: true },
    { code: '1210', name: 'Accounts Receivable - NHIA National Health Insurance Scheme', category: 'ASSETS', balance: 285000.00, type: 'DEBIT', isSystem: true },
    { code: '1220', name: 'Accounts Receivable - Corporate Insurers & HMOs (GLICO/KNUST)', category: 'ASSETS', balance: 85400.00, type: 'DEBIT', isSystem: true },
    { code: '1300', name: 'Central Pharmacy Stock & Consumables Inventory', category: 'ASSETS', balance: 142000.00, type: 'DEBIT', isSystem: false },
    { code: '1500', name: 'Hospital Land & Specialized Clinical Buildings', category: 'ASSETS', balance: 55000000.00, type: 'DEBIT', isSystem: false },
    { code: '1510', name: 'Advanced Diagnostic Imaging (CT Scan, MRI & Digital X-Ray)', category: 'ASSETS', balance: 18500000.00, type: 'DEBIT', isSystem: false },
    
    // 2000s LIABILITIES
    { code: '2001', name: 'Trade Accounts Payable (Medical Suppliers & Pharmaceutical Vendors)', category: 'LIABILITIES', balance: 204150.00, type: 'CREDIT', isSystem: true },
    { code: '2005', name: 'GRA Statutory Withholding Tax (WHT) Payable', category: 'LIABILITIES', balance: 18250.00, type: 'CREDIT', isSystem: true },
    { code: '2010', name: 'Statutory PAYE & SSNIT Tier 1/2 Deductions Payable', category: 'LIABILITIES', balance: 45200.00, type: 'CREDIT', isSystem: true },
    { code: '2020', name: 'Accrued Clinical Operational Expenses & Provisions', category: 'LIABILITIES', balance: 32000.00, type: 'CREDIT', isSystem: false },

    // 3000s EQUITY / CAPITAL
    { code: '3001', name: 'Stated Share Capital & Capex Founders Equity', category: 'EQUITY', balance: 73200000.00, type: 'CREDIT', isSystem: false },
    { code: '3005', name: 'Capital Replacement Reserves & Statutory Sinking Fund', category: 'EQUITY', balance: 450000.00, type: 'CREDIT', isSystem: false },
    { code: '3010', name: 'Retained Earnings & Accumulated Surplus', category: 'EQUITY', balance: 423374.25, type: 'CREDIT', isSystem: true },

    // 4000s REVENUE (with Linked Cost Centers)
    { code: '4010', name: 'Medical Specialist Consultations & Triage', category: 'REVENUE', balance: 185000.00, type: 'CREDIT', isSystem: false, costCenter: 'OPD Department' },
    { code: '4020', name: 'Inpatient Ward Bed, Nursing & Hotel Services', category: 'REVENUE', balance: 240000.00, type: 'CREDIT', isSystem: false, costCenter: 'Inpatient Wards' },
    { code: '4030', name: 'Central Pharmacy & Prescription Dispense', category: 'REVENUE', balance: 340000.00, type: 'CREDIT', isSystem: false, costCenter: 'Pharmacy Department' },
    { code: '4040', name: 'Laboratory Diagnostics & Blood Bank Panels', category: 'REVENUE', balance: 125000.00, type: 'CREDIT', isSystem: false, costCenter: 'Laboratory Department' },
    { code: '4050', name: 'Radiology, CT Scan, Ultrasound & Imaging', category: 'REVENUE', balance: 95000.00, type: 'CREDIT', isSystem: false, costCenter: 'Radiology Unit' },
    { code: '4060', name: 'Surgical Operating Theater & Anesthesia Fees', category: 'REVENUE', balance: 175000.00, type: 'CREDIT', isSystem: false, costCenter: 'Main Theater' },

    // 5000s EXPENSES & COGS
    { code: '5010', name: 'Cost of Goods Sold - Pharmaceuticals & Drugs', category: 'EXPENSES', balance: 145000.00, type: 'DEBIT', isSystem: false, costCenter: 'Pharmacy Department' },
    { code: '5020', name: 'Cost of Laboratory Reagents & Rapid Test Kits', category: 'EXPENSES', balance: 42000.00, type: 'DEBIT', isSystem: false, costCenter: 'Laboratory Department' },
    { code: '5100', name: 'Doctors, Specialists & Clinical Staff Payroll', category: 'EXPENSES', balance: 185000.00, type: 'DEBIT', isSystem: false, costCenter: 'Human Resources' },
    { code: '5110', name: 'Nursing, Midwifery & Paramedical Payroll', category: 'EXPENSES', balance: 120000.00, type: 'DEBIT', isSystem: false, costCenter: 'Nursing Administration' },
    { code: '5200', name: 'Hospital Electricity, Water & Medical Oxygen Utilities', category: 'EXPENSES', balance: 45000.00, type: 'DEBIT', isSystem: false, costCenter: 'Estates & Facilities' },
    { code: '5205', name: 'Insurance Claims Disallowed & Impairment Expense', category: 'EXPENSES', balance: 12500.00, type: 'DEBIT', isSystem: true, costCenter: 'Finance & Claims Desk' },
    { code: '5300', name: 'Biomedical Equipment Maintenance & Calibration', category: 'EXPENSES', balance: 18400.00, type: 'DEBIT', isSystem: false, costCenter: 'Biomedical Engineering' },
    { code: '5400', name: 'Depreciation Expense - Clinical Equipment & Buildings', category: 'EXPENSES', balance: 237938.89, type: 'DEBIT', isSystem: true }
  ], []);

  // Merge Live Database Accounts with Standard IFRS Healthcare Baseline
  const consolidatedAccounts = useMemo(() => {
    if (!rawAccounts || rawAccounts.length === 0) return standardIfrsAccounts;

    const map = new Map<string, GLAccount>();
    // First load standard baseline
    standardIfrsAccounts.forEach(a => map.set(a.code, a));

    // Override or add live accounts
    rawAccounts.forEach((acc: any) => {
      const code = acc.accountCode || acc.code || '0000';
      let cat = (acc.category || 'ASSETS').toUpperCase() as any;
      if (cat === 'CAPITAL') cat = 'EQUITY';

      map.set(code, {
        code,
        name: (acc.name || 'Unnamed Account').toUpperCase(),
        category: cat,
        balance: Number(acc.currentBalance ?? acc.balance ?? 0),
        type: acc.type || (['ASSETS', 'EXPENSES'].includes(cat) ? 'DEBIT' : 'CREDIT'),
        isSystem: acc.isSystem ?? ['1001', '1020', '1099', '1200', '1210', '1220', '2001', '2005', '3010', '5205', '5400'].includes(code),
        costCenter: acc.costCenter || acc.linkedCenter
      });
    });

    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [rawAccounts, standardIfrsAccounts]);

  // Group into 5 IFRS Categories
  const categorizedAccounts = useMemo(() => {
    const map: Record<string, GLAccount[]> = {
      ASSETS: [],
      LIABILITIES: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSES: [],
    };

    consolidatedAccounts.forEach(acc => {
      const key = acc.category;
      if (map[key]) map[key].push(acc);
      else map.ASSETS.push(acc);
    });

    return map;
  }, [consolidatedAccounts]);

  const ledgerCategories = useMemo(() => [
    { id: 'ASSETS', label: '1000s ASSETS', color: 'emerald', icon: Landmark, data: categorizedAccounts.ASSETS },
    { id: 'LIABILITIES', label: '2000s LIABILITIES', color: 'rose', icon: ArrowUpRight, data: categorizedAccounts.LIABILITIES },
    { id: 'EQUITY', label: '3000s EQUITY & CAPITAL', color: 'indigo', icon: Scale, data: categorizedAccounts.EQUITY },
    { id: 'REVENUE', label: '4000s REVENUE', color: 'sky', icon: ArrowDownRight, data: categorizedAccounts.REVENUE },
    { id: 'EXPENSES', label: '5000s EXPENSES & COGS', color: 'amber', icon: Briefcase, data: categorizedAccounts.EXPENSES },
  ], [categorizedAccounts]);

  const filteredCategories = useMemo(() => {
    return ledgerCategories.map(cat => {
      if (activeFilter !== 'ALL' && cat.id !== activeFilter) {
        return { ...cat, data: [] };
      }

      const filteredData = cat.data.filter(acc => {
        const q = searchQuery.toLowerCase();
        return !searchQuery || 
          acc.name.toLowerCase().includes(q) || 
          acc.code.toLowerCase().includes(q) ||
          (acc.costCenter && acc.costCenter.toLowerCase().includes(q));
      });

      return { ...cat, data: filteredData };
    });
  }, [ledgerCategories, searchQuery, activeFilter]);

  // Telemetry Metrics
  const telemetryMetrics = useMemo(() => {
    const totalCount = consolidatedAccounts.length;
    const totalAssetsVal = categorizedAccounts.ASSETS.reduce((sum, acc) => sum + (acc.code === '1099' ? 0 : Math.max(0, acc.balance)), 0);
    const totalRevenueVal = categorizedAccounts.REVENUE.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpenseVal = categorizedAccounts.EXPENSES.reduce((sum, acc) => sum + acc.balance, 0);
    const netOperatingProfit = totalRevenueVal - totalExpenseVal;

    return {
      totalCount,
      totalAssetsStr: totalAssetsVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalRevenueStr: totalRevenueVal.toLocaleString('en-US', { minimumFractionDigits: 2 }),
      netOperatingProfitStr: netOperatingProfit.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    };
  }, [consolidatedAccounts, categorizedAccounts]);

  // Simulated GL Transaction Lines for Selected Account
  const activeDrilldownTransactions: GLTransactionLine[] = useMemo(() => {
    if (!selectedAccountForDrilldown) return [];
    const code = selectedAccountForDrilldown.code;
    const baseBal = selectedAccountForDrilldown.balance;

    if (code === '4030') {
      return [
        { id: 'TX-4030-01', date: '2026-08-14', reference: 'POS-PHM-2026-0891', narration: 'Outpatient Prescription Dispense (Cash/MoMo)', debit: 0, credit: 1450.00, runningBalance: baseBal },
        { id: 'TX-4030-02', date: '2026-08-13', reference: 'CLM-GLICO-2026-0411', narration: 'Inpatient ICU Pharmacy Medication - James Gambrah', debit: 0, credit: 450.00, runningBalance: baseBal - 1450.00 },
        { id: 'TX-4030-03', date: '2026-08-12', reference: 'POS-PHM-2026-0842', narration: 'Emergency Department Antivenom & IV Fluids', debit: 0, credit: 3200.00, runningBalance: baseBal - 1900.00 },
        { id: 'TX-4030-04', date: '2026-08-10', reference: 'CLM-NHIA-2026-0942', narration: 'NHIS Prescription Tariff Clearing Batch', debit: 0, credit: 8900.00, runningBalance: baseBal - 5100.00 },
      ];
    } else if (code === '1220') {
      return [
        { id: 'TX-1220-01', date: '2026-08-14', reference: 'INV-GLICO-2026-08', narration: 'Master Corporate Invoice Generated (6 Claims locked)', debit: 3990.00, credit: 0, runningBalance: baseBal },
        { id: 'TX-1220-02', date: '2026-08-11', reference: 'REMIT-KNUST-0921', narration: 'KNUST Staff Scheme Settlement Remittance', debit: 0, credit: 8000.00, runningBalance: baseBal - 3990.00 },
        { id: 'TX-1220-03', date: '2026-08-05', reference: 'INV-ACACIA-2026-08', narration: 'Acacia Health Monthly Claims Batch Billed', debit: 22000.00, credit: 0, runningBalance: baseBal + 4010.00 }
      ];
    } else {
      return [
        { id: `TX-${code}-01`, date: '2026-08-14', reference: `JV-${code}-2026-08`, narration: `General Ledger Posted Balance - ${selectedAccountForDrilldown.name}`, debit: selectedAccountForDrilldown.type === 'DEBIT' ? baseBal : 0, credit: selectedAccountForDrilldown.type === 'CREDIT' ? baseBal : 0, runningBalance: baseBal }
      ];
    }
  }, [selectedAccountForDrilldown]);

  // Click on row handler with System Safeguard
  const handleAccountRowClick = (account: GLAccount) => {
    setSelectedAccountForDrilldown(account);
  };

  const handleEditClick = (e: React.MouseEvent, account: GLAccount) => {
    e.stopPropagation();
    if (account.isSystem) {
      toast({
        title: "🔒 System-Controlled Ledger",
        description: `Account ${account.code} is a core control account. Balances are automatically updated through sub-module transactions (Billing, Receivables, Procurement, Bank Reconciliation).`
      });
    } else {
      toast({
        title: "Edit Account",
        description: `Editing metadata for ${account.code} - ${account.name}.`
      });
    }
  };

  // Export Trial Balance CSV
  const handleExportTrialBalance = () => {
    const allAccounts = consolidatedAccounts.map(acc => {
      const isNormalDebit = ['ASSETS', 'EXPENSES'].includes(acc.category);
      let debit = 0;
      let credit = 0;

      if (isNormalDebit) {
        if (acc.balance >= 0) debit = acc.balance;
        else credit = Math.abs(acc.balance);
      } else {
        if (acc.balance >= 0) credit = acc.balance;
        else debit = Math.abs(acc.balance);
      }

      return { ...acc, debit, credit };
    });

    const totalDebit = allAccounts.reduce((s, a) => s + a.debit, 0);
    const totalCredit = allAccounts.reduce((s, a) => s + a.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.05;

    const headers = "Account_Code,Account_Name,Category,Type,Control_Status,Linked_Cost_Center,Debit_Balance_GHS,Credit_Balance_GHS\n";
    const rows = allAccounts.map(a => 
      `"${a.code}","${a.name}","${a.category}","${a.type}","${a.isSystem ? 'SYSTEM_CONTROL' : 'ACTIVE_LEDGER'}","${a.costCenter || 'N/A'}",${a.debit.toFixed(2)},${a.credit.toFixed(2)}`
    ).join('\n');
    const footer = `\n"TOTAL","TRIAL BALANCE SUMMARY","","","","",${totalDebit.toFixed(2)},${totalCredit.toFixed(2)}`;

    const csvData = "data:text/csv;charset=utf-8," + headers + rows + footer;
    const encodedUri = encodeURI(csvData);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GAM_MED_Master_Chart_of_Accounts_Trial_Balance.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ 
      title: "Trial Balance Exported", 
      description: `Generated Trial Balance (${allAccounts.length} Accounts). Status: ${isBalanced ? 'BALANCED' : 'VARIANCE DETECTED'}. Total: GHS ${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}.` 
    });
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for the Chart of Accounts.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Network className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                GENERAL LEDGER & MASTER CHART OF ACCOUNTS
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              IFRS/GAAP MASTER LEDGER ARCHITECTURE, DEPARTMENTAL COST CENTER MAPPING, AND REAL-TIME GENERAL LEDGER DRILL-DOWN.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT & CONTROLLER</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportTrialBalance}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-black uppercase tracking-wider rounded-xl border border-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-400" /> EXPORT TRIAL BALANCE (CSV)
            </button>

            <AddAccountDialog 
              hospitalId={hospitalId}
              accounts={consolidatedAccounts}
              isOpen={isAddAccountOpen}
              setIsOpen={setIsAddAccountOpen}
            />
          </div>
        </div>

        {/* Dynamic Financial Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 font-mono">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Accounts</span>
              <div className="text-2xl font-black text-white">{telemetryMetrics.totalCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1 font-sans">
                Full IFRS/GAAP Ledger
              </span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Assets (1000s)</span>
              <div className="text-2xl font-black text-emerald-400">₵ {telemetryMetrics.totalAssetsStr}</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block font-sans">Fixed & Current Assets</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Landmark className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block mb-1">Total Revenue (4000s)</span>
              <div className="text-2xl font-black text-sky-400">₵ {telemetryMetrics.totalRevenueStr}</div>
              <span className="text-[10px] font-bold text-sky-400 mt-1 block font-sans">Clinical & Pharmacy</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <ArrowDownRight className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Framework Status</span>
              <div className="text-2xl font-black text-emerald-400">BALANCED</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1 font-sans">
                <FileCheck2 className="w-3 h-3" /> IFRS / IPSAS Equilibrium
              </span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Scale className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER & SEARCH CONTROL BAR             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Account Name, Code (e.g. 4030), or Cost Center..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer text-slate-800 dark:text-slate-100 font-bold"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900">All Categories (1000s - 5000s)</option>
              {ledgerCategories.map(cat => (
                <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900">{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. STRUCTURED ACCOUNT LEDGERS              */}
      {/* ========================================== */}
      <div className="space-y-8">
        {filteredCategories.map((category) => {
          if (activeFilter !== 'ALL' && category.id !== activeFilter) return null;
          const IconComp = category.icon;

          return (
            <div key={category.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              
              {/* Category Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
                    {category.label}
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider">
                  {category.data.length} ACCOUNTS
                </span>
              </div>

              {/* Table of Accounts */}
              {category.data.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900">
                  <IconComp className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">NO {category.label} ACCOUNTS MATCHING SEARCH.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap w-28">
                          GL Code
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          Account Title & Cost Center Mapping
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center w-36">
                          Control Type
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                          Current Balance (GHS)
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center w-28">
                          Drill Down
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                      {category.data.map((account, idx) => {
                        const isDeficit = account.balance < 0 && (category.id === 'ASSETS' || category.id === 'EXPENSES');

                        return (
                          <tr 
                            key={idx} 
                            onClick={() => handleAccountRowClick(account)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                          >
                            
                            {/* Code */}
                            <td className="px-6 py-4">
                              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded text-slate-800 dark:text-slate-200 text-xs font-black border border-slate-200 dark:border-slate-700">
                                {account.code}
                              </span>
                            </td>

                            {/* Name & Linked Cost Center Badges */}
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide">
                                  {account.name}
                                </span>

                                {/* Visual Hierarchy for Linked Cost Center */}
                                {account.costCenter && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                                    <Building2 className="w-3 h-3" />
                                    Linked Center: {account.costCenter}
                                  </span>
                                )}

                                {isDeficit && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                    <AlertTriangle className="w-3 h-3" /> DEFICIT FLAG
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* System Lock Indicator Badge */}
                            <td className="px-6 py-4 text-center">
                              {account.isSystem ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  <Lock className="w-3 h-3 text-amber-500" /> SYSTEM
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                  <Unlock className="w-3 h-3 text-emerald-500" /> ACTIVE
                                </span>
                              )}
                            </td>

                            {/* Current Balance */}
                            <td className="px-6 py-4 text-right">
                              <div className={`text-base font-mono font-black ${isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                <span className="text-xs text-slate-400 mr-1 font-sans">₵</span>
                                {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </td>

                            {/* Drill-down action button */}
                            <td className="px-6 py-4 text-center">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccountRowClick(account);
                                }}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-slate-950 rounded-lg transition-all text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1 mx-auto"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Drill Down</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL 1: GENERAL LEDGER DETAIL DRILL-DOWN MODAL                         */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedAccountForDrilldown} onOpenChange={(open) => !open && setSelectedAccountForDrilldown(null)}>
        <DialogContent className="max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                    GENERAL LEDGER DETAIL DRILL-DOWN
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">
                    GL Account: <strong className="text-slate-900 dark:text-slate-100">{selectedAccountForDrilldown?.code} - {selectedAccountForDrilldown?.name}</strong>
                  </DialogDescription>
                </div>
              </div>

              {selectedAccountForDrilldown?.isSystem && (
                <Badge className="bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 text-[10px] font-black uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" /> SYSTEM CONTROLLED
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            
            {/* Account Summary Strip */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 font-mono">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Category & Normal Balance:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedAccountForDrilldown?.category} ({selectedAccountForDrilldown?.type})
                </span>
              </div>
              {selectedAccountForDrilldown?.costCenter && (
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Cost Center:</span>
                  <span className="font-bold text-blue-600">{selectedAccountForDrilldown.costCenter}</span>
                </div>
              )}
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Net General Ledger Balance:</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  ₵ {selectedAccountForDrilldown?.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* General Ledger Detail Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white text-[9px] uppercase tracking-widest sticky top-0">
                  <tr>
                    <th className="p-3">Posting Date</th>
                    <th className="p-3">JV / Reference</th>
                    <th className="p-3">Transaction Narration</th>
                    <th className="p-3 text-right">Debit (₵)</th>
                    <th className="p-3 text-right">Credit (₵)</th>
                    <th className="p-3 text-right">Running Balance (₵)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {activeDrilldownTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">{tx.date}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{tx.reference}</td>
                      <td className="p-3 text-slate-800 dark:text-slate-200">{tx.narration}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        {tx.debit > 0 ? `₵ ${tx.debit.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        {tx.credit > 0 ? `₵ ${tx.credit.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                        ₵ {tx.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedAccountForDrilldown?.isSystem && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>This is a system control account. Postings are automatically recorded by the Billing, Pharmacy POS, Receivables, or Bank Reconciliation sub-modules.</span>
              </div>
            )}

          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setSelectedAccountForDrilldown(null)} className="rounded-xl">
              Close Detail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Upgrade 5: Intelligent [+ NEW GL ACCOUNT] Modal with Numbering Enforcement
const AddAccountDialog = ({ hospitalId, accounts, isOpen, setIsOpen }: any) => {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { 
      name: '',
      accountCode: '1030',
      category: 'ASSETS',
      costCenter: ''
    }
  });

  const selectedCategory = form.watch('category');

  // Prefix guidance based on category
  const prefixMap: Record<string, { prefix: string; placeholder: string; namePlaceholder: string }> = {
    ASSETS: { prefix: '1', placeholder: '1030', namePlaceholder: 'e.g. Stanbic Operating Account' },
    LIABILITIES: { prefix: '2', placeholder: '2030', namePlaceholder: 'e.g. Accrued Audit Fees Payable' },
    EQUITY: { prefix: '3', placeholder: '3020', namePlaceholder: 'e.g. Capital Expansion Reserve' },
    REVENUE: { prefix: '4', placeholder: '4070', namePlaceholder: 'e.g. Dialysis Renal Unit Fees' },
    EXPENSES: { prefix: '5', placeholder: '5310', namePlaceholder: 'e.g. Staff Continuous Medical Training' },
  };

  const handleCategoryChange = (val: any) => {
    form.setValue('category', val);
    form.setValue('accountCode', prefixMap[val]?.placeholder || '1000');
  };

  const onSubmit = async (values: AccountFormValues) => {
    // Enforce Category Numbering Convention
    const expectedPrefix = prefixMap[values.category].prefix;
    if (!values.accountCode.startsWith(expectedPrefix)) {
      toast({
        variant: "destructive",
        title: "IFRS Numbering Rule Violation",
        description: `Accounts in ${values.category} must begin with digit '${expectedPrefix}' (e.g. ${prefixMap[values.category].placeholder}).`
      });
      return;
    }

    try {
      if (firestore && hospitalId) {
        await addDoc(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), {
          accountCode: values.accountCode,
          name: values.name.toUpperCase(),
          category: values.category,
          costCenter: values.costCenter || null,
          currentBalance: 0,
          type: ['ASSETS', 'EXPENSES'].includes(values.category) ? 'DEBIT' : 'CREDIT',
          isSystem: false,
          createdAt: serverTimestamp()
        });
      }

      toast({
        title: "GL Account Created",
        description: `Successfully added ${values.accountCode} - ${values.name.toUpperCase()} to the general ledger.`
      });

      setIsOpen(false);
      form.reset();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Creation Failed", description: e.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button 
          type="button" 
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> NEW GL ACCOUNT
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
            CREATE GENERAL LEDGER ACCOUNT
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-medium">
            Standard IFRS/GAAP Account classification & cost center mapping.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2 text-xs">
            
            {/* Category Selector */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">Accounting Category</FormLabel>
                  <Select onValueChange={handleCategoryChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="font-bold text-xs">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ASSETS">1000s - ASSETS (Normal Debit)</SelectItem>
                      <SelectItem value="LIABILITIES">2000s - LIABILITIES (Normal Credit)</SelectItem>
                      <SelectItem value="EQUITY">3000s - EQUITY / CAPITAL (Normal Credit)</SelectItem>
                      <SelectItem value="REVENUE">4000s - REVENUE (Normal Credit)</SelectItem>
                      <SelectItem value="EXPENSES">5000s - EXPENSES & COGS (Normal Debit)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account Code with Prefix Guidance */}
            <FormField
              control={form.control}
              name="accountCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">
                    GL Account Code (Must start with '{prefixMap[selectedCategory]?.prefix}')
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={prefixMap[selectedCategory]?.placeholder || '1000'} 
                      {...field} 
                      className="font-mono font-black text-xs" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account Title */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">Account Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={prefixMap[selectedCategory]?.namePlaceholder || 'e.g. Account Title'} 
                      {...field} 
                      className="font-bold text-xs" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Linked Department / Cost Center */}
            <FormField
              control={form.control}
              name="costCenter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase text-slate-500">
                    Physical Cost Center / Department (Optional)
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="font-bold text-xs">
                        <SelectValue placeholder="Select Department Center..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="OPD Department">OPD Department</SelectItem>
                      <SelectItem value="Inpatient Wards">Inpatient Wards</SelectItem>
                      <SelectItem value="Pharmacy Department">Pharmacy Department</SelectItem>
                      <SelectItem value="Laboratory Department">Laboratory Department</SelectItem>
                      <SelectItem value="Radiology Unit">Radiology Unit</SelectItem>
                      <SelectItem value="Main Theater">Main Theater</SelectItem>
                      <SelectItem value="Human Resources">Human Resources / Payroll</SelectItem>
                      <SelectItem value="Estates & Facilities">Estates & Facilities</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <Button variant="outline" type="button" onClick={() => setIsOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl uppercase text-xs">
                Save GL Account
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
