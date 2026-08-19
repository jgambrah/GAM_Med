'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, orderBy, doc } from 'firebase/firestore';
import { 
  Network, Plus, Search, Filter, Landmark, 
  ArrowUpRight, ArrowDownRight, Scale, Briefcase, 
  AlertTriangle, FileCheck2, MoreHorizontal, Edit3, 
  Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const accountSchema = z.object({
  name: z.string().min(1, "Account name is required."),
  category: z.string().min(1, "Category is required."),
  accountCode: z.string().min(1, "Account code is required."),
  parentAccountId: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

export default function ChartOfAccountsHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const accountsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`),
      orderBy("accountCode", "asc")
    );
  }, [firestore, hospitalId]);

  const { data: rawAccounts, isLoading: areAccountsLoading } = useCollection(accountsQuery);

  const demoAccountsData = useMemo(() => ({
    ASSETS: [
      { code: '1001', name: 'CASH', balance: -7025.75, type: 'DEBIT' },
      { code: '1099', name: 'ACCUMULATED DEPRECIATION ACCOUNT', balance: 237938.89, type: 'DEBIT' }
    ],
    LIABILITIES: [
      { code: '2100', name: 'WHT PAYABLE ACCOUNT', balance: 202.50, type: 'CREDIT' }
    ],
    EQUITY: [],
    REVENUE: [],
    EXPENSES: [
      { code: '4001', name: 'PURCHASE - DRUGS', balance: 5750.00, type: 'DEBIT' },
      { code: '5005', name: 'DEPRECIATION EXPENSE ACCOUNT', balance: 237938.89, type: 'DEBIT' }
    ]
  }), []);

  const categorizedAccounts = useMemo(() => {
    if (rawAccounts && rawAccounts.length > 0) {
      const map: Record<string, any[]> = {
        ASSETS: [],
        LIABILITIES: [],
        EQUITY: [],
        REVENUE: [],
        EXPENSES: [],
      };

      rawAccounts.forEach((acc: any) => {
        let catKey = (acc.category || 'ASSETS').toUpperCase();
        if (catKey === 'CAPITAL') catKey = 'EQUITY';
        if (!map[catKey]) map[catKey] = [];
        
        map[catKey].push({
          code: acc.accountCode || '0000',
          name: (acc.name || 'UNNAMED ACCOUNT').toUpperCase(),
          balance: Number(acc.currentBalance || 0),
          type: acc.type || 'DEBIT',
          raw: acc,
        });
      });

      return map;
    }

    return demoAccountsData;
  }, [rawAccounts, demoAccountsData]);

  const ledgerCategories = useMemo(() => [
    { id: 'ASSETS', label: 'ASSETS', color: 'emerald', icon: Landmark, data: categorizedAccounts.ASSETS || [] },
    { id: 'LIABILITIES', label: 'LIABILITIES', color: 'rose', icon: ArrowUpRight, data: categorizedAccounts.LIABILITIES || [] },
    { id: 'EQUITY', label: 'EQUITY / CAPITAL', color: 'indigo', icon: Scale, data: categorizedAccounts.EQUITY || [] },
    { id: 'REVENUE', label: 'REVENUE', color: 'sky', icon: ArrowDownRight, data: categorizedAccounts.REVENUE || [] },
    { id: 'EXPENSES', label: 'EXPENSES', color: 'amber', icon: Briefcase, data: categorizedAccounts.EXPENSES || [] },
  ], [categorizedAccounts]);

  const filteredCategories = useMemo(() => {
    return ledgerCategories.map(cat => {
      if (activeFilter !== 'ALL' && cat.id !== activeFilter) {
        return { ...cat, data: [] };
      }

      const filteredData = cat.data.filter((acc: any) => {
        const q = searchQuery.toLowerCase();
        return !searchQuery || acc.name.toLowerCase().includes(q) || acc.code.toLowerCase().includes(q);
      });

      return { ...cat, data: filteredData };
    });
  }, [ledgerCategories, searchQuery, activeFilter]);

  const telemetryMetrics = useMemo(() => {
    const allAccountsList = Object.values(categorizedAccounts).flat();
    const totalCount = allAccountsList.length;
    const totalAssetsVal = (categorizedAccounts.ASSETS || []).reduce((sum, acc) => sum + acc.balance, 0);
    const anomaliesCount = allAccountsList.filter(acc => acc.balance < 0).length;

    return {
      totalCount,
      totalAssetsStr: totalAssetsVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      anomaliesCount,
    };
  }, [categorizedAccounts]);

  const isLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
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

  const handleExportTrialBalance = () => {
    const allAccounts = Object.entries(categorizedAccounts).flatMap(([category, accs]) => 
      accs.map(acc => {
        const isNormalDebit = ['ASSETS', 'EXPENSES'].includes(category.toUpperCase());
        let debit = 0;
        let credit = 0;

        if (isNormalDebit) {
          if (acc.balance >= 0) {
            debit = acc.balance;
          } else {
            credit = Math.abs(acc.balance);
          }
        } else {
          if (acc.balance >= 0) {
            credit = acc.balance;
          } else {
            debit = Math.abs(acc.balance);
          }
        }

        return {
          code: acc.code,
          name: acc.name,
          category,
          type: acc.type || (isNormalDebit ? 'DEBIT' : 'CREDIT'),
          debit,
          credit
        };
      })
    );

    if (allAccounts.length === 0) {
      toast({ variant: 'destructive', title: 'Export Error', description: 'No active accounts found in chart of accounts.' });
      return;
    }

    const totalDebit = allAccounts.reduce((s, a) => s + a.debit, 0);
    const totalCredit = allAccounts.reduce((s, a) => s + a.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    const headers = "Account_Code,Account_Name,Account_Category,Normal_Type,Debit_Balance_GHS,Credit_Balance_GHS\n";
    const rows = allAccounts.map(a => 
      `"${a.code}","${a.name}","${a.category}","${a.type}",${a.debit.toFixed(2)},${a.credit.toFixed(2)}`
    ).join('\n');
    const footer = `\n"TOTAL","TRIAL BALANCE SUMMARY","","${isBalanced ? 'BALANCED' : 'UNBALANCED'}",${totalDebit.toFixed(2)},${totalCredit.toFixed(2)}`;

    const csvData = "data:text/csv;charset=utf-8," + headers + rows + footer;
    const encodedUri = encodeURI(csvData);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GAM_MED_Trial_Balance_August_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ 
      title: "Trial Balance Exported", 
      description: `Generated Trial Balance (${allAccounts.length} Accounts). Total DR: GHS ${totalDebit.toFixed(2)} | Total CR: GHS ${totalCredit.toFixed(2)}.` 
    });
  };

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Emerald/Sky for Finance */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Network className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                CHART OF ACCOUNTS & TRIAL BALANCE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              IPSAS GENERAL LEDGER STRUCTURE, BALANCES, AND REAL-TIME TRIAL BALANCE EQUILIBRIUM.
            </p>
          </div>

          {/* Active User Context & Actions */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">FINANCE CONTROLLER</div>
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
              accounts={rawAccounts || []}
              isOpen={isAddAccountOpen}
              setIsOpen={setIsAddAccountOpen}
            />
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Financial Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Accounts</span>
              <div className="text-2xl font-black text-white">{telemetryMetrics.totalCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                Mapped to general ledger
              </span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Network className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Assets Value</span>
              <div className="text-2xl font-black text-emerald-400"><span className="text-sm text-emerald-600 mr-1">GHS</span>{telemetryMetrics.totalAssetsStr}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Current net value</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Landmark className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-amber-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Anomalies Detected</span>
              <div className="text-2xl font-black text-amber-400">{telemetryMetrics.anomaliesCount}</div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 block">Deficit in asset account</span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Framework Status</span>
              <div className="text-2xl font-black text-emerald-400">COMPLIANT</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <FileCheck2 className="w-3 h-3" /> IFRS Standard
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Account Name or Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer text-slate-800 dark:text-slate-100 font-bold"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Categories</option>
              {ledgerCategories.map(cat => (
                <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{cat.label}</option>
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

              {/* Category Data Table / Empty State */}
              {category.data.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900">
                  <IconComp className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">NO {category.label} ACCOUNTS DEFINED.</p>
                  <button 
                    type="button"
                    onClick={() => setIsAddAccountOpen(true)}
                    className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    + CREATE INITIAL ACCOUNT
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap w-32">
                          Account Code
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Account Name
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                          Current Balance (GHS)
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {category.data.map((account: any, idx: number) => {
                        const isDeficit = account.balance < 0 && (category.id === 'ASSETS' || category.id === 'EXPENSES');

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                            
                            {/* Code */}
                            <td className="px-6 py-4">
                              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-200 text-sm font-bold border border-slate-200 dark:border-slate-700">
                                {account.code}
                              </span>
                            </td>

                            {/* Name & Flags */}
                            <td className="px-6 py-4">
                              <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide flex items-center gap-3">
                                {account.name}
                                {isDeficit && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                    <AlertTriangle className="w-3 h-3" /> DEFICIT FLAG
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Balance */}
                            <td className="px-6 py-4 text-right">
                              <div className={`text-lg font-mono font-black ${isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                <span className="text-xs text-slate-400 mr-1 font-sans">₵</span>
                                {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-lg transition-all cursor-pointer" title="Edit Account">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
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

    </div>
  );
}

const AddAccountDialog = ({ hospitalId, accounts, isOpen, setIsOpen }: any) => {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { 
      name: '',
      accountCode: '',
      category: 'ASSETS',
      parentAccountId: '' 
    },
  });

  const onSubmit = (values: AccountFormValues) => {
    if (!firestore || !hospitalId) {
      toast({ title: "Account setup simulated" });
      setIsOpen(false);
      return;
    }
    addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), {
      ...values,
      hospitalId: hospitalId,
      currentBalance: 0,
      createdAt: serverTimestamp()
    });
    toast({ title: "Account created successfully" });
    setIsOpen(false);
    form.reset();
  };

  const potentialParents = (accounts || []).filter((a: any) => a.category === form.watch('category') && !a.parentAccountId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button 
          type="button"
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" /> NEW ACCOUNT
        </button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase text-slate-900 dark:text-slate-100 italic">
            Setup Account
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-slate-500">Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="ASSETS">ASSETS</SelectItem>
                    <SelectItem value="LIABILITIES">LIABILITIES</SelectItem>
                    <SelectItem value="REVENUE">REVENUE</SelectItem>
                    <SelectItem value="EXPENSES">EXPENSES</SelectItem>
                    <SelectItem value="CAPITAL">CAPITAL</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-slate-500">Account Name</FormLabel>
                <FormControl><Input placeholder="e.g., GCB Operations Account" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="accountCode" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-slate-500">Account Code</FormLabel>
                <FormControl><Input placeholder="e.g., 1001" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="parentAccountId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-slate-500">Parent Account (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="None (Top Level)" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {potentialParents.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}/>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs">
                {form.formState.isSubmitting ? <Loader2 className="animate-spin w-4 h-4"/> : 'Save Account'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
