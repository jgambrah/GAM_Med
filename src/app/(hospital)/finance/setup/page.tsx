'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Cog, Plus, Loader2, ShieldAlert, Package, Trash2, Search, 
  Building2, BedDouble, Stethoscope, CheckCircle2, AlertTriangle, 
  Wrench, Activity, Landmark, User, RefreshCw, Sparkles, Layers,
  DollarSign, FileSpreadsheet, Lock, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type GLAccountNode = {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  category: string;
  balance: number;
  currency: string;
  isSystemLocked?: boolean;
  linkedDepartment?: string;
};

type DepartmentNode = {
  id: string;
  name: string;
  code: string;
  revenueAccountCode: string;
  expenseAccountCode: string;
  headOfDepartment: string;
  status: 'ACTIVE' | 'INACTIVE';
};

type HospitalBedNode = {
  id: string;
  departmentId: string;
  wardName: string;
  bedNumber: string;
  bedType: 'GENERAL' | 'VIP' | 'ICU' | 'INCUBATOR';
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  activePatientId?: string;
  dailyTariffCode: string;
  dailyRate: number;
};

type ServiceBridgeNode = {
  id: string;
  name: string;
  clinicalModule: string;
  tariffCode: string;
  price: number;
  nhisCap: number;
  autoBillOnComplete: boolean;
};

export default function GeneralServicesSetupPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'CHART_OF_ACCOUNTS' | 'DEPARTMENTS' | 'BED_MATRIX' | 'SERVICE_NODES'>('CHART_OF_ACCOUNTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  // New GL Account Form State
  const [newAccCode, setNewAccCode] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'>('REVENUE');
  const [newAccCategory, setNewAccCategory] = useState('Operating Revenue');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'ADMIN' || userRole === 'ACCOUNTANT' || userRole === 'SUPER_ADMIN' || userRole === 'FINANCE_DIRECTOR';

  // Demo Fallback Data for Chart of Accounts (COA)
  const initialChartOfAccounts: GLAccountNode[] = useMemo(() => [
    // 1000 - ASSETS
    { code: '1010', name: 'Cash in Vault & Cashier Tills', type: 'ASSET', category: 'Cash & Cash Equivalents', balance: 1200.00, currency: 'GHS', isSystemLocked: true },
    { code: '1020', name: 'Paystack MoMo Settlement Clearing', type: 'ASSET', category: 'Digital Gateway Clearing', balance: 3450.00, currency: 'GHS', isSystemLocked: true },
    { code: '1030', name: 'Bank Operating Account (Ecobank Ghana)', type: 'ASSET', category: 'Cash & Bank Balances', balance: 125000.00, currency: 'GHS', isSystemLocked: true },
    { code: '1200', name: 'Accounts Receivable (AR) - Patient Out-of-Pocket Debt', type: 'ASSET', category: 'Receivables', balance: 4850.00, currency: 'GHS', isSystemLocked: true },
    { code: '1210', name: 'Accounts Receivable (AR) - NHIA Claims Portfolio', type: 'ASSET', category: 'Receivables', balance: 345000.00, currency: 'GHS', isSystemLocked: true },
    { code: '1220', name: 'Accounts Receivable (AR) - Private HMOs & Corporate', type: 'ASSET', category: 'Receivables', balance: 137000.00, currency: 'GHS', isSystemLocked: true },
    
    // 2000 - LIABILITIES
    { code: '2010', name: 'Accounts Payable (AP) - Pharmaceutical Suppliers', type: 'LIABILITY', category: 'Trade Payables', balance: 85000.00, currency: 'GHS' },
    { code: '2050', name: 'Unearned Revenue / Patient Advance Deposits', type: 'LIABILITY', category: 'Deferred Income', balance: 12400.00, currency: 'GHS' },
    
    // 4000 - REVENUE CENTERS
    { code: '4010', name: 'OPD Consultation & Clinical Examination Revenue', type: 'REVENUE', category: 'Clinical Services', balance: 280000.00, currency: 'GHS', linkedDepartment: 'OPD' },
    { code: '4020', name: 'Diagnostic Imaging & Radiology Revenue', type: 'REVENUE', category: 'Clinical Services', balance: 195000.00, currency: 'GHS', linkedDepartment: 'RAD' },
    { code: '4030', name: 'Pharmacy & Medication Dispensing Revenue', type: 'REVENUE', category: 'Pharmaceuticals', balance: 340000.00, currency: 'GHS', linkedDepartment: 'PHARM' },
    { code: '4040', name: 'Inpatient Ward Bed Accommodation Fees', type: 'REVENUE', category: 'Inpatient Care', balance: 110000.00, currency: 'GHS', linkedDepartment: 'IPD' },
    { code: '4050', name: 'Mortuary & Pathology Preservation Revenue', type: 'REVENUE', category: 'Pathology & Mortuary', balance: 65000.00, currency: 'GHS', linkedDepartment: 'MORT' },
  ], []);

  const [chartOfAccounts, setChartOfAccounts] = useState<GLAccountNode[]>(initialChartOfAccounts);

  // Demo Fallback Data for Departments
  const demoDepartments: DepartmentNode[] = useMemo(() => [
    { id: 'dep-01', name: 'Outpatient Department (OPD)', code: 'OPD', revenueAccountCode: '4010', expenseAccountCode: '5001', headOfDepartment: 'Dr. Kwabena Frimpong', status: 'ACTIVE' },
    { id: 'dep-02', name: 'Maternity & Antenatal Ward', code: 'MAT', revenueAccountCode: '4040', expenseAccountCode: '5002', headOfDepartment: 'Dr. Abena Osei', status: 'ACTIVE' },
    { id: 'dep-03', name: 'Diagnostic Radiology & Imaging', code: 'RAD', revenueAccountCode: '4020', expenseAccountCode: '5003', headOfDepartment: 'Dr. Michael Taylor', status: 'ACTIVE' },
    { id: 'dep-04', name: 'Main Clinical Laboratory', code: 'LAB', revenueAccountCode: '4020', expenseAccountCode: '5004', headOfDepartment: 'Dr. Sarah Kwarteng', status: 'ACTIVE' },
    { id: 'dep-05', name: 'Intensive Care Unit (ICU)', code: 'ICU', revenueAccountCode: '4040', expenseAccountCode: '5005', headOfDepartment: 'Dr. Marcus Amosah', status: 'ACTIVE' }
  ], []);

  // Demo Fallback Data for Hospital Beds
  const demoBeds: HospitalBedNode[] = useMemo(() => [
    { id: 'bed-mat-01', departmentId: 'dep-02', wardName: 'Maternity Ward A', bedNumber: '01', bedType: 'GENERAL', status: 'AVAILABLE', dailyTariffCode: 'ACC-GEN-01', dailyRate: 150.00 },
    { id: 'bed-mat-02', departmentId: 'dep-02', wardName: 'Maternity Ward A', bedNumber: '02', bedType: 'GENERAL', status: 'OCCUPIED', activePatientId: 'P-99201 (Abena M.)', dailyTariffCode: 'ACC-GEN-01', dailyRate: 150.00 },
    { id: 'bed-mat-03', departmentId: 'dep-02', wardName: 'Maternity Ward A', bedNumber: '03', bedType: 'VIP', status: 'OCCUPIED', activePatientId: 'P-88402 (Grace A.)', dailyTariffCode: 'ACC-VIP-01', dailyRate: 450.00 },
    { id: 'bed-icu-01', departmentId: 'dep-05', wardName: 'ICU High Dependency', bedNumber: 'ICU-01', bedType: 'ICU', status: 'OCCUPIED', activePatientId: 'P-77109 (Kofi O.)', dailyTariffCode: 'ACC-ICU-01', dailyRate: 850.00 },
    { id: 'bed-icu-02', departmentId: 'dep-05', wardName: 'ICU High Dependency', bedNumber: 'ICU-02', bedType: 'ICU', status: 'AVAILABLE', dailyTariffCode: 'ACC-ICU-01', dailyRate: 850.00 }
  ], []);

  // Demo Fallback Data for Service Bridge Nodes
  const demoServices: ServiceBridgeNode[] = useMemo(() => [
    { id: 'srv-01', name: 'Specialist OPD Consultation', clinicalModule: 'Consultation', tariffCode: 'CON-001', price: 150.00, nhisCap: 80.00, autoBillOnComplete: true },
    { id: 'srv-02', name: 'Abdominal Ultrasound Scan', clinicalModule: 'Radiology', tariffCode: 'RAD-004', price: 250.00, nhisCap: 120.00, autoBillOnComplete: true },
    { id: 'srv-03', name: 'Full Blood Count Automated Panel', clinicalModule: 'Laboratory', tariffCode: 'LAB-012', price: 120.00, nhisCap: 45.00, autoBillOnComplete: true }
  ], []);

  // Filtered Chart of Accounts
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return chartOfAccounts;
    const lower = searchQuery.toLowerCase();
    return chartOfAccounts.filter(acc => 
      acc.code.toLowerCase().includes(lower) || 
      acc.name.toLowerCase().includes(lower) ||
      acc.category.toLowerCase().includes(lower) ||
      acc.type.toLowerCase().includes(lower)
    );
  }, [chartOfAccounts, searchQuery]);

  // Executive COA Metrics
  const coaMetrics = useMemo(() => {
    let totalAssets = 0, totalLiabilities = 0, totalRevenue = 0;
    chartOfAccounts.forEach(acc => {
      if (acc.type === 'ASSET') totalAssets += acc.balance;
      if (acc.type === 'LIABILITY') totalLiabilities += acc.balance;
      if (acc.type === 'REVENUE') totalRevenue += acc.balance;
    });
    return { totalAssets, totalLiabilities, totalRevenue };
  }, [chartOfAccounts]);

  const handleCreateGLAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccCode || !newAccName) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Account code and name are required.' });
      return;
    }

    const newAcc: GLAccountNode = {
      code: newAccCode,
      name: newAccName,
      type: newAccType,
      category: newAccCategory,
      balance: 0,
      currency: 'GHS'
    };

    if (firestore && hospitalId) {
      addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), {
        ...newAcc,
        createdAt: serverTimestamp()
      });
    }

    setChartOfAccounts(prev => [...prev, newAcc]);
    toast({
      title: "GL Account Created",
      description: `Account ${newAccCode} - ${newAccName} registered into Master Ledger.`
    });

    setNewAccCode('');
    setNewAccName('');
    setIsAddAccountOpen(false);
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Master Financial Setup.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. EXECUTIVE COMMAND BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Landmark className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                GENERAL LEDGER & MASTER FINANCIAL SETUP
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wide">
              CHART OF ACCOUNTS (COA), REVENUE STREAM MAPPINGS, AND INFRASTRUCTURE COST CENTERS.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF FINANCIAL OFFICER</div>
            </div>
          </div>
        </div>

        {/* Top Financial Balance Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Master Assets</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {coaMetrics.totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Vault Cash, MoMo, Bank & AR Ledgers</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Recognized Revenue (YTD)</span>
              <div className="text-2xl font-black text-sky-400 font-mono">
                ₵ {coaMetrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-sky-400 mt-0.5 block">Clinical, Pharmacy & Diagnostics</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active COA Sub-Ledgers</span>
              <div className="text-2xl font-black text-indigo-400 font-mono">{chartOfAccounts.length} Accounts</div>
              <span className="text-[10px] font-bold text-indigo-400 mt-0.5 block">Fully Audited Double-Entry Nodes</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION BAR & ACTION ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Module Switcher Tabs */}
        <div className="flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('CHART_OF_ACCOUNTS')}
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'CHART_OF_ACCOUNTS' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-4 h-4 text-emerald-400" />
            <span>Chart of Accounts ({chartOfAccounts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DEPARTMENTS')}
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'DEPARTMENTS' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>Departments ({demoDepartments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BED_MATRIX')}
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'BED_MATRIX' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BedDouble className="w-4 h-4 text-amber-400" />
            <span>Bed Wards ({demoBeds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SERVICE_NODES')}
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'SERVICE_NODES' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Service Bridges ({demoServices.length})</span>
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, name, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {activeTab === 'CHART_OF_ACCOUNTS' && (
            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ NEW GL ACCOUNT</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-emerald-500" />
                    <span>Create General Ledger Sub-Account</span>
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleCreateGLAccount} className="space-y-4 pt-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">GL Account Code</label>
                    <input
                      type="text"
                      value={newAccCode}
                      onChange={(e) => setNewAccCode(e.target.value)}
                      placeholder="e.g. 4060 or 1040"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs font-bold outline-none text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Account Title</label>
                    <input
                      type="text"
                      value={newAccName}
                      onChange={(e) => setNewAccName(e.target.value)}
                      placeholder="e.g. Mortuary Ambulance Transport Revenue"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 block">Account Type</label>
                      <select
                        value={newAccType}
                        onChange={(e: any) => setNewAccType(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-slate-100"
                      >
                        <option value="ASSET">1000 - Asset</option>
                        <option value="LIABILITY">2000 - Liability</option>
                        <option value="EQUITY">3000 - Equity</option>
                        <option value="REVENUE">4000 - Revenue</option>
                        <option value="EXPENSE">5000 - Expense</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500 block">Category</label>
                      <input
                        type="text"
                        value={newAccCategory}
                        onChange={(e) => setNewAccCategory(e.target.value)}
                        placeholder="e.g. Operating Revenue"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-4">
                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer"
                    >
                      SAVE GL ACCOUNT TO MASTER LEDGER
                    </button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3A. TAB 1: CHART OF ACCOUNTS (COA) MASTER HUB                */}
      {/* ============================================================ */}
      {activeTab === 'CHART_OF_ACCOUNTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">GL Code</th>
                <th className="p-4">Account Title & Ledger Description</th>
                <th className="p-4">Type</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Current Balance (GHS)</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAccounts.map(acc => {
                const isAsset = acc.type === 'ASSET';
                const isRev = acc.type === 'REVENUE';
                const isLiab = acc.type === 'LIABILITY';

                return (
                  <tr key={acc.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                    <td className="p-4 font-mono font-black text-sm text-slate-900 dark:text-white">
                      {acc.code}
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{acc.name}</p>
                      {acc.linkedDepartment && (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5">
                          Linked Center: {acc.linkedDepartment} Department
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md ${
                        isAsset ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        isRev ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {acc.type}
                      </span>
                    </td>

                    <td className="p-4 text-slate-500 font-medium">
                      {acc.category}
                    </td>

                    <td className="p-4 text-right font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                      ₵ {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="p-4 text-center">
                      {acc.isSystemLocked ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3" /> SYSTEM
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                          ACTIVE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3B. TAB 2: DEPARTMENTS MAPPING                               */}
      {/* ============================================================ */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Department Name</th>
                <th className="p-4">Code</th>
                <th className="p-4">Revenue GL Account</th>
                <th className="p-4">Head of Department</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {demoDepartments.map(dep => (
                <tr key={dep.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                  <td className="p-4 font-black uppercase text-slate-900 dark:text-slate-100">
                    {dep.name}
                  </td>
                  <td className="p-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                    {dep.code}
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                    GL #{dep.revenueAccountCode}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                    {dep.headOfDepartment}
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {dep.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3C. TAB 3: BED MATRIX & WARDS                                */}
      {/* ============================================================ */}
      {activeTab === 'BED_MATRIX' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Hospital Ward Infrastructure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoBeds.map(bed => (
              <div key={bed.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">{bed.wardName}</span>
                  <p className="text-base font-black text-slate-900 dark:text-white">Bed #{bed.bedNumber} ({bed.bedType})</p>
                  <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1">₵{bed.dailyRate.toFixed(2)} / night</p>
                </div>
                <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md ${
                  bed.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {bed.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3D. TAB 4: SERVICE BRIDGES                                   */}
      {/* ============================================================ */}
      {activeTab === 'SERVICE_NODES' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Service Bridge</th>
                <th className="p-4">Clinical Module</th>
                <th className="p-4">Tariff Code</th>
                <th className="p-4 text-right">Standard Price</th>
                <th className="p-4 text-right">NHIS Payer Cap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {demoServices.map(srv => (
                <tr key={srv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                  <td className="p-4 font-black text-slate-900 dark:text-slate-100">{srv.name}</td>
                  <td className="p-4 text-slate-500 font-bold">{srv.clinicalModule}</td>
                  <td className="p-4 font-mono font-bold text-sky-600">{srv.tariffCode}</td>
                  <td className="p-4 text-right font-mono font-bold">₵ {srv.price.toFixed(2)}</td>
                  <td className="p-4 text-right font-mono text-emerald-600 font-bold">₵ {srv.nhisCap.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
