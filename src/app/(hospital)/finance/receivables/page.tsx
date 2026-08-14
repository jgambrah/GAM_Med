'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, Plus, ShieldCheck, Landmark, Loader2, 
  ShieldAlert, FileText, Printer, Calendar, ArrowUpRight, 
  ArrowDownLeft, X, ArrowLeft, Receipt, CheckCircle2, DollarSign, 
  Wallet, Search, AlertTriangle, AlertCircle, Ban
} from 'lucide-react';
import { format } from 'date-fns';

const payerSchema = z.object({
  name: z.string().min(1, "Payer name is required."),
  category: z.string().min(1, "Payer category is required."),
  glAccount: z.string().min(1, "GL Account Link is required."),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  creditLimit: z.coerce.number().min(0, "Credit Limit cannot be negative"),
  tariffGroup: z.string().default("CORPORATE_STANDARD"),
});

type PayerFormValues = z.infer<typeof payerSchema>;

type PayerItem = {
  id: string;
  name: string;
  category: string;
  glAccount: string;
  contactPerson?: string;
  phone?: string;
  creditLimit: number;
  currentAr: number;
  status: 'ACTIVE' | 'SUSPENDED';
  tariffGroup?: string;
};

export default function PayerRegistryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isAddPayerOpen, setIsAddPayerOpen] = useState(false);
  const [isRemittanceOpen, setIsRemittanceOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmittingRemittance, setIsSubmittingRemittance] = useState(false);

  // Settlement Form State
  const [settlementAmount, setSettlementAmount] = useState<number>(50000);
  const [bankRef, setBankRef] = useState<string>('BANK/WIRE/2026/0849');
  const [selectedPayerForSettlement, setSelectedPayerForSettlement] = useState<string>('National Health Insurance Authority (NHIA)');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole);

  const payersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payers`));
  }, [firestore, hospitalId]);
  const { data: rawPayers, isLoading: arePayersLoading } = useCollection<PayerItem>(payersQuery);

  // Demodata Fallback for Immediate Payer Registry Demonstration
  const demoPayers: PayerItem[] = useMemo(() => [
    {
      id: 'PAY-001',
      name: 'National Health Insurance Authority (NHIA)',
      category: 'STATE',
      glAccount: '1200-001 (AR - NHIA Scheme)',
      contactPerson: 'Director of Claims (GAR)',
      phone: '+233 302 991 002',
      creditLimit: 500000.00,
      currentAr: 345000.00,
      status: 'ACTIVE',
      tariffGroup: 'NHIS_OFFICIAL'
    },
    {
      id: 'PAY-002',
      name: 'GLICO Healthcare Ltd',
      category: 'HMO',
      glAccount: '1200-002 (AR - GLICO)',
      contactPerson: 'Dr. Mensah Okyere',
      phone: '+233 244 118 901',
      creditLimit: 100000.00,
      currentAr: 95000.00,
      status: 'ACTIVE',
      tariffGroup: 'CORPORATE_PREMIUM'
    },
    {
      id: 'PAY-003',
      name: 'Acacia Health Insurance Ltd',
      category: 'HMO',
      glAccount: '1200-003 (AR - Acacia)',
      contactPerson: 'Florence Baidoo',
      phone: '+233 208 440 192',
      creditLimit: 150000.00,
      currentAr: 42000.00,
      status: 'ACTIVE',
      tariffGroup: 'CORPORATE_STANDARD'
    },
    {
      id: 'PAY-004',
      name: 'KNUST Staff Clinic',
      category: 'CORPORATE',
      glAccount: '1200-004 (AR - KNUST)',
      contactPerson: 'Registrar Accounts',
      phone: '+233 322 060 001',
      creditLimit: 50000.00,
      currentAr: 55000.00, // OVER LIMIT
      status: 'SUSPENDED',
      tariffGroup: 'UNIVERSITIES_SPECIAL'
    }
  ], []);

  const [payersList, setPayersList] = useState<PayerItem[]>(() => {
    return rawPayers && rawPayers.length > 0 ? rawPayers : demoPayers;
  });

  const filteredPayers = useMemo(() => {
    if (!searchTerm.trim()) return payersList;
    const lower = searchTerm.toLowerCase();
    return payersList.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      p.category.toLowerCase().includes(lower) ||
      p.glAccount.toLowerCase().includes(lower)
    );
  }, [payersList, searchTerm]);

  // Contextual Metrics Calculations
  const metrics = useMemo(() => {
    let active = 0, totalCredit = 0, nearLimit = 0;
    payersList.forEach(p => {
      if (p.status === 'ACTIVE') active++;
      totalCredit += Number(p.creditLimit || 0);
      const util = (Number(p.currentAr || 0) / Number(p.creditLimit || 1));
      if (util >= 0.8) nearLimit++;
    });
    return { active, totalCredit, nearLimit };
  }, [payersList]);

  const form = useForm<PayerFormValues>({
    resolver: zodResolver(payerSchema),
    defaultValues: {
      name: '',
      category: 'HMO',
      glAccount: '1200-005',
      creditLimit: 100000.00,
      tariffGroup: 'CORPORATE_STANDARD'
    },
  });

  const handleAddPayer = (values: PayerFormValues) => {
    const newPayerObj: PayerItem = {
      id: `PAY-${Date.now().toString().slice(-4)}`,
      name: values.name,
      category: values.category,
      glAccount: values.glAccount,
      contactPerson: values.contactPerson || 'Account Officer',
      phone: values.phone || 'N/A',
      creditLimit: values.creditLimit || 100000,
      currentAr: 0,
      status: 'ACTIVE',
      tariffGroup: values.tariffGroup
    };

    if (firestore && hospitalId) {
      addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/payers`), {
        ...newPayerObj,
        hospitalId,
        createdAt: serverTimestamp(),
      });
    }

    setPayersList(prev => [newPayerObj, ...prev]);

    toast({
      title: "Institutional Payer Onboarded",
      description: `${values.name} linked to GL ${values.glAccount} with credit limit GHS ${values.creditLimit?.toFixed(2)}.`
    });

    form.reset();
    setIsAddPayerOpen(false);
  };

  const togglePayerStatus = async (payerId: string, currentStatus: 'ACTIVE' | 'SUSPENDED') => {
    const newStatus: 'ACTIVE' | 'SUSPENDED' = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    try {
      if (firestore && hospitalId) {
        const payerRef = doc(firestore, `hospitals/${hospitalId}/payers`, payerId);
        await updateDoc(payerRef, { status: newStatus });
      }

      setPayersList(prev => prev.map(p => p.id === payerId ? { ...p, status: newStatus } : p));

      toast({
        title: "Payer Status Updated",
        description: `Payer account marked as ${newStatus}. Cashier front-desk checkout updated.`
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Update Failed", description: e.message });
    }
  };

  const handlePostRemittanceSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRemittance(true);

    try {
      const functions = getFunctions();
      const postRemittanceFn = httpsCallable(functions, 'postRemittanceSettlement');

      const res: any = await postRemittanceFn({
        payerName: selectedPayerForSettlement,
        settlementAmount: parseFloat(settlementAmount.toString()),
        bankReference: bankRef
      });

      toast({
        title: "Remittance Settlement Posted",
        description: res.data?.message || `Settlement GHS ${settlementAmount.toFixed(2)} posted to ledger.`
      });

      setIsRemittanceOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Settlement Failed', description: err.message });
    } finally {
      setIsSubmittingRemittance(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || arePayersLoading;
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Payer Master Registry.</p>
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
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Building2 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                INSTITUTIONAL PAYER MASTER REGISTRY
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              MANAGEMENT OF CORPORATE & GOVERNMENT PAYER PROFILES, CREDIT LIMIT UTILIZATION, AND REMITTANCE SETTLEMENTS.
            </p>
          </div>

          {/* User Context */}
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

        {/* Bottom Row / Contextual Registry Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Payers</span>
              <div className="text-2xl font-black text-white font-mono">{metrics.active} Payers</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Approved Corporate Clients</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Authorized Credit</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {metrics.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Master Credit Limit Portfolio</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Landmark className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-rose-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Payers Nearing / Over Limit</span>
              <div className="text-2xl font-black text-rose-400 font-mono">{metrics.nearLimit} Risk Warning</div>
              <span className="text-[10px] font-bold text-rose-400 mt-0.5 block">&gt;80% Credit Limit Consumed</span>
            </div>
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. ACTION BAR & ONBOARDING DIALOGS        */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search corporate payers by name, GL code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Post Remittance Modal Trigger */}
          <Dialog open={isRemittanceOpen} onOpenChange={setIsRemittanceOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>POST REMITTANCE SETTLEMENT</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-500" />
                  <span>Post Lump-Sum Remittance Settlement</span>
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handlePostRemittanceSettlement} className="space-y-4 pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Select Target Payer</label>
                  <select
                    value={selectedPayerForSettlement}
                    onChange={(e) => setSelectedPayerForSettlement(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-slate-100"
                  >
                    {payersList.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Bank Wire / Cheque Reference</label>
                  <input
                    type="text"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    placeholder="e.g. BANK/WIRE/2026/0849"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs font-bold outline-none text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Settlement Amount (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black text-base outline-none text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <DialogFooter className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmittingRemittance}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmittingRemittance ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>ALLOCATE REMITTANCE TO LEDGER</span>
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Onboard New Payer Modal Trigger */}
          <Dialog open={isAddPayerOpen} onOpenChange={setIsAddPayerOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ ONBOARD NEW PAYER</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-500" />
                  <span>Onboard Institutional Corporate Payer</span>
                </DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddPayer)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">Payer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. GLICO Healthcare Ltd or Apex Scheme" {...field} className="rounded-xl text-xs font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">Payer Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl text-xs font-bold">
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="STATE">State / NHIS Scheme</SelectItem>
                              <SelectItem value="HMO">Private HMO Insurance</SelectItem>
                              <SelectItem value="CORPORATE">Corporate Employer Account</SelectItem>
                              <SelectItem value="EMBASSY">Embassy / Foreign Mission</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="glAccount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">GL Sub-Ledger Code</FormLabel>
                          <FormControl>
                            <Input placeholder="1200-005" {...field} className="rounded-xl font-mono text-xs font-bold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="creditLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">Authorized Credit Limit (GHS)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="100000.00" {...field} className="rounded-xl font-mono text-xs font-bold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tariffGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">Tariff Group Link</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl text-xs font-bold">
                                <SelectValue placeholder="Select Group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NHIS_OFFICIAL">NHIS Official Tariff</SelectItem>
                              <SelectItem value="CORPORATE_STANDARD">Corporate Standard Tariff</SelectItem>
                              <SelectItem value="CORPORATE_PREMIUM">Corporate Premium Tariff</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter className="pt-4">
                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer"
                    >
                      SAVE PAYER TO REGISTRY
                    </button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. PAYER REGISTRY DATA MATRIX              */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredPayers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 italic">
            No institutional payers found matching query.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Payer Details</th>
                <th className="p-4">GL Account Link</th>
                <th className="p-4 w-1/3">Credit Limit Utilization</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPayers.map(payer => {
                const limit = Number(payer.creditLimit || 1);
                const currentAr = Number(payer.currentAr || 0);
                const utilization = (currentAr / limit) * 100;
                const isOverLimit = utilization >= 100;
                const isWarning = utilization >= 80 && !isOverLimit;
                const isSuspended = payer.status === 'SUSPENDED';

                return (
                  <tr 
                    key={payer.id} 
                    className={`transition-all ${isSuspended ? 'bg-slate-50/80 dark:bg-slate-900/50 opacity-75' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <td className="p-4">
                      <p className="font-black uppercase text-slate-900 dark:text-slate-100">{payer.name}</p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 block">
                        Category: {payer.category} • {payer.contactPerson || 'Accounts'}
                      </span>
                    </td>

                    <td className="p-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {payer.glAccount}
                    </td>

                    <td className="p-4">
                      <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                        <span className="text-slate-900 dark:text-slate-100 font-mono">
                          ₵ {currentAr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-slate-400 font-mono">
                          Limit: ₵ {limit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverLimit ? 'bg-rose-600' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>

                      {isOverLimit && (
                        <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase mt-1 block flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-500" /> CREDIT LIMIT EXCEEDED - CHECKOUT RESTRICTED
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md ${
                        isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {payer.status}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => togglePayerStatus(payer.id, payer.status)}
                          className={`px-3 py-1.5 font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer shadow ${
                            isSuspended 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                        >
                          {isSuspended ? 'ACTIVATE' : 'SUSPEND'}
                        </button>

                        <button
                          type="button"
                          onClick={() => router.push(`/finance/reports/institutional-schedule`)}
                          className="px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-400 dark:hover:text-slate-950 font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer shadow"
                        >
                          DOSSIER
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
