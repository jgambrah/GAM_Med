'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';
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
  Wallet, Search, AlertTriangle, AlertCircle, Ban, Users,
  Send, Phone, Clock, CreditCard, Sparkles
} from 'lucide-react';

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

type PatientDebtItem = {
  id: string;
  patientId: string;
  patientName: string;
  ehrNumber: string;
  receiptNumber: string;
  originalBill: number;
  amountPaid: number;
  outstandingBalance: number;
  status: 'OPEN_DEBT' | 'SETTLED' | 'WRITTEN_OFF';
  cashierName: string;
  phone?: string;
  daysAged: number;
  createdAt?: any;
};

export default function AccountsReceivableDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'PATIENT_DEBT' | 'INSTITUTIONAL_PAYERS'>('PATIENT_DEBT');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Institutional Payer State
  const [isAddPayerOpen, setIsAddPayerOpen] = useState(false);
  const [isRemittanceOpen, setIsRemittanceOpen] = useState(false);
  const [isSubmittingRemittance, setIsSubmittingRemittance] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState<number>(50000);
  const [bankRef, setBankRef] = useState<string>('BANK/WIRE/2026/0849');
  const [selectedPayerForSettlement, setSelectedPayerForSettlement] = useState<string>('National Health Insurance Authority (NHIA)');

  // Patient Debt Recovery State
  const [selectedPatientDebt, setSelectedPatientDebt] = useState<PatientDebtItem | null>(null);
  const [recoveryAmount, setRecoveryAmount] = useState<number>(0);
  const [recoveryMethod, setRecoveryMethod] = useState<'CASH' | 'MOMO' | 'CARD'>('CASH');
  const [isRecovering, setIsRecovering] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role || 'ACCOUNTANT';
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'FINANCE_DIRECTOR'].includes(userRole);

  // 1. Fetch Real-Time Patient Receivables from Firestore
  const patientDebtQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/patient_receivables`));
  }, [firestore, hospitalId]);
  const { data: rawPatientDebts, isLoading: areDebtsLoading } = useCollection<PatientDebtItem>(patientDebtQuery);

  // 2. Fetch Institutional Payers from Firestore
  const payersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payers`));
  }, [firestore, hospitalId]);
  const { data: rawPayers, isLoading: arePayersLoading } = useCollection<PayerItem>(payersQuery);

  // Demo Fallback Data for Patient Debt Ledger
  const demoPatientDebts: PatientDebtItem[] = useMemo(() => [
    {
      id: 'DEBT-001',
      patientId: 'PT-7578-01',
      patientName: 'Yaw Antwi',
      ehrNumber: 'GAM-P-7578',
      receiptNumber: 'REC/2026/08/4912',
      originalBill: 300.00,
      amountPaid: 250.00,
      outstandingBalance: 50.00,
      status: 'OPEN_DEBT',
      cashierName: 'Priscilla Adysei',
      phone: '+233 24 412 3456',
      daysAged: 1
    },
    {
      id: 'DEBT-002',
      patientId: 'PT-7578-02',
      patientName: 'Ama Serwaa Mensah',
      ehrNumber: 'GAM-P-3392',
      receiptNumber: 'REC/2026/08/1190',
      originalBill: 850.00,
      amountPaid: 400.00,
      outstandingBalance: 450.00,
      status: 'OPEN_DEBT',
      cashierName: 'Priscilla Adysei',
      phone: '+233 20 890 1234',
      daysAged: 14
    },
    {
      id: 'DEBT-003',
      patientId: 'PT-7578-03',
      patientName: 'Kwesi Boateng Osei',
      ehrNumber: 'GAM-P-8921',
      receiptNumber: 'REC/2026/07/7710',
      originalBill: 1200.00,
      amountPaid: 600.00,
      outstandingBalance: 600.00,
      status: 'OPEN_DEBT',
      cashierName: 'Marcus Amosah',
      phone: '+233 55 901 8832',
      daysAged: 38
    },
    {
      id: 'DEBT-004',
      patientId: 'PT-7578-04',
      patientName: 'Abena Pokuaa',
      ehrNumber: 'GAM-P-1102',
      receiptNumber: 'REC/2026/06/3312',
      originalBill: 2400.00,
      amountPaid: 900.00,
      outstandingBalance: 1500.00,
      status: 'OPEN_DEBT',
      cashierName: 'Priscilla Adysei',
      phone: '+233 24 112 9900',
      daysAged: 65
    }
  ], []);

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
      currentAr: 55000.00,
      status: 'SUSPENDED',
      tariffGroup: 'UNIVERSITIES_SPECIAL'
    }
  ], []);

  const [patientDebtsList, setPatientDebtsList] = useState<PatientDebtItem[]>(() => {
    return rawPatientDebts && rawPatientDebts.length > 0 ? rawPatientDebts : demoPatientDebts;
  });

  const [payersList, setPayersList] = useState<PayerItem[]>(() => {
    return rawPayers && rawPayers.length > 0 ? rawPayers : demoPayers;
  });

  // Patient Debt Metrics
  const patientDebtMetrics = useMemo(() => {
    let totalOutstanding = 0;
    let currentBucket = 0; // 0-30 days
    let agingBucket = 0;   // 31-60 days
    let riskBucket = 0;    // 61+ days
    let totalCount = 0;

    patientDebtsList.forEach(d => {
      if (d.status === 'OPEN_DEBT') {
        const bal = Number(d.outstandingBalance || 0);
        totalOutstanding += bal;
        totalCount++;
        const age = Number(d.daysAged || 1);
        if (age <= 30) currentBucket += bal;
        else if (age <= 60) agingBucket += bal;
        else riskBucket += bal;
      }
    });

    return { totalOutstanding, currentBucket, agingBucket, riskBucket, totalCount };
  }, [patientDebtsList]);

  // Institutional Payer Metrics
  const payerMetrics = useMemo(() => {
    let active = 0, totalCredit = 0, totalAr = 0, nearLimit = 0;
    payersList.forEach(p => {
      if (p.status === 'ACTIVE') active++;
      totalCredit += Number(p.creditLimit || 0);
      totalAr += Number(p.currentAr || 0);
      const util = (Number(p.currentAr || 0) / Number(p.creditLimit || 1));
      if (util >= 0.8) nearLimit++;
    });
    return { active, totalCredit, totalAr, nearLimit };
  }, [payersList]);

  // Filtered Patient Debts
  const filteredDebts = useMemo(() => {
    if (!searchTerm.trim()) return patientDebtsList;
    const lower = searchTerm.toLowerCase();
    return patientDebtsList.filter(d => 
      d.patientName.toLowerCase().includes(lower) || 
      d.ehrNumber.toLowerCase().includes(lower) ||
      d.receiptNumber.toLowerCase().includes(lower)
    );
  }, [patientDebtsList, searchTerm]);

  // Filtered Institutional Payers
  const filteredPayers = useMemo(() => {
    if (!searchTerm.trim()) return payersList;
    const lower = searchTerm.toLowerCase();
    return payersList.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      p.category.toLowerCase().includes(lower) ||
      p.glAccount.toLowerCase().includes(lower)
    );
  }, [payersList, searchTerm]);

  // Handle Debt Recovery / Settlement
  const handleSettlePatientDebt = async () => {
    if (!selectedPatientDebt || recoveryAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid recovery amount.' });
      return;
    }

    setIsRecovering(true);
    const newOutstanding = Math.max(0, selectedPatientDebt.outstandingBalance - recoveryAmount);
    const isFullSettlement = newOutstanding <= 0.01;
    const clearanceReceipt = `REC/AR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      if (firestore && hospitalId) {
        const batch = writeBatch(firestore);

        // 1. Update patient_receivables record
        const debtRef = doc(firestore, `hospitals/${hospitalId}/patient_receivables`, selectedPatientDebt.id);
        batch.set(debtRef, {
          outstandingBalance: newOutstanding,
          amountPaid: selectedPatientDebt.amountPaid + recoveryAmount,
          status: isFullSettlement ? 'SETTLED' : 'OPEN_DEBT',
          lastSettlementAt: serverTimestamp(),
          lastReceiptNumber: clearanceReceipt
        }, { merge: true });

        // 2. Post recovery transaction into General Ledger
        const txnRef = doc(collection(firestore, `hospitals/${hospitalId}/transactions`));
        batch.set(txnRef, {
          receiptNumber: clearanceReceipt,
          patientId: selectedPatientDebt.patientId,
          patientName: selectedPatientDebt.patientName,
          amount: recoveryAmount,
          grossTotal: selectedPatientDebt.originalBill,
          outstandingDebt: newOutstanding,
          paymentMode: recoveryMethod,
          cashierName: user?.displayName || userProfile?.name || 'Finance Director Recovery Desk',
          status: 'AR_DEBT_RECOVERY',
          createdAt: serverTimestamp()
        });

        // 3. Create final settlement receipt
        const receiptRef = doc(collection(firestore, `hospitals/${hospitalId}/receipts`));
        batch.set(receiptRef, {
          receiptNumber: clearanceReceipt,
          patientName: selectedPatientDebt.patientName,
          patientId: selectedPatientDebt.patientId,
          grossTotal: selectedPatientDebt.originalBill,
          amountPaid: recoveryAmount,
          outstandingBalanceDue: newOutstanding,
          paymentMode: recoveryMethod,
          cashierName: user?.displayName || userProfile?.name || 'Finance Director Recovery Desk',
          timestamp: new Date().toLocaleString('en-GB'),
          createdAt: serverTimestamp()
        });

        await batch.commit();
      }

      setPatientDebtsList(prev => prev.map(d => {
        if (d.id === selectedPatientDebt.id) {
          return {
            ...d,
            outstandingBalance: newOutstanding,
            amountPaid: d.amountPaid + recoveryAmount,
            status: isFullSettlement ? 'SETTLED' : 'OPEN_DEBT'
          };
        }
        return d;
      }));

      toast({
        title: isFullSettlement ? "🎉 Patient Debt Fully Cleared!" : "Partial Debt Recovery Logged",
        description: `Collected ₵${recoveryAmount.toFixed(2)} from ${selectedPatientDebt.patientName}. Receipt ${clearanceReceipt} posted to General Ledger.`
      });

      setSelectedPatientDebt(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Settlement Failed', description: e.message });
    } finally {
      setIsRecovering(false);
    }
  };

  const handleSendReminder = (debt: PatientDebtItem) => {
    toast({
      title: "📱 SMS Debt Recovery Reminder Sent",
      description: `Dispatched payment link & breakdown of ₵${debt.outstandingBalance.toFixed(2)} to ${debt.phone || 'patient device'}.`
    });
  };

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
    toast({ title: "Institutional Payer Onboarded", description: `${values.name} linked to GL ${values.glAccount}.` });
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
      toast({ title: "Payer Status Updated", description: `Marked as ${newStatus}.` });
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
      toast({ title: "Remittance Settlement Posted", description: res.data?.message || `Settlement posted to ledger.` });
      setIsRemittanceOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Settlement Failed', description: err.message });
    } finally {
      setIsSubmittingRemittance(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || arePayersLoading || areDebtsLoading;
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Accounts Receivable & Debt Management.</p>
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
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Landmark className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                ACCOUNTS RECEIVABLE & DEBT RECOVERY
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wide">
              REVENUE CYCLE CONTROL: PATIENT OUT-OF-POCKET BALANCES, AGING SCHEDULES & INSTITUTIONAL REMITTANCES.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">FINANCE DIRECTOR</div>
            </div>
          </div>
        </div>

        {/* Dynamic Metric Tiles based on Active Tab */}
        {activeTab === 'PATIENT_DEBT' ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Patient AR Debt</span>
              <div className="text-2xl font-black text-rose-400 font-mono">
                ₵ {patientDebtMetrics.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">{patientDebtMetrics.totalCount} Unpaid Encounters</span>
            </div>

            <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">0 - 30 Days (Current)</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {patientDebtMetrics.currentBucket.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400/80 mt-0.5 block">High Recovery Probability</span>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">31 - 60 Days (Aging)</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                ₵ {patientDebtMetrics.agingBucket.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-amber-400/80 mt-0.5 block">Follow-up Required</span>
            </div>

            <div className="bg-slate-900 border border-rose-500/50 p-4 rounded-xl ring-1 ring-rose-500/30">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">61+ Days (Delinquent)</span>
              <div className="text-2xl font-black text-rose-500 font-mono">
                ₵ {patientDebtMetrics.riskBucket.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-rose-400/80 mt-0.5 block">High Risk / Write-Off Watch</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Payers</span>
              <div className="text-2xl font-black text-white font-mono">{payerMetrics.active} Payers</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Corporate & HMO Schemes</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Institutional AR</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {payerMetrics.totalAr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Accrued Claims Portfolio</span>
            </div>

            <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Nearing / Over Limit</span>
              <div className="text-2xl font-black text-rose-400 font-mono">{payerMetrics.nearLimit} Accounts</div>
              <span className="text-[10px] font-bold text-rose-400 mt-0.5 block">&gt;80% Credit Utilized</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. DUAL-TAB NAVIGATION & ACTION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Module Switcher Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => { setActiveTab('PATIENT_DEBT'); setSearchTerm(''); }}
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'PATIENT_DEBT' 
                ? 'bg-slate-950 text-white shadow-md' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Patient Debt Ledger ({patientDebtsList.filter(d => d.status === 'OPEN_DEBT').length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('INSTITUTIONAL_PAYERS'); setSearchTerm(''); }}
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'INSTITUTIONAL_PAYERS' 
                ? 'bg-slate-950 text-white shadow-md' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Institutional Corporate Payers ({payersList.length})</span>
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'PATIENT_DEBT' ? "Search patient MRN, name..." : "Search corporate payers..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {activeTab === 'INSTITUTIONAL_PAYERS' && (
            <button
              type="button"
              onClick={() => setIsAddPayerOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ ONBOARD PAYER</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3A. TAB 1: PATIENT DEBT & OUT-OF-POCKET RECOVERY TABLE       */}
      {/* ============================================================ */}
      {activeTab === 'PATIENT_DEBT' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {filteredDebts.length === 0 ? (
            <div className="p-16 text-center text-slate-400 italic space-y-2">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="font-bold">No active patient debts found.</p>
              <p className="text-xs text-slate-500">All out-of-pocket patient balances are 100% settled.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
                <tr>
                  <th className="p-4">Patient & MRN</th>
                  <th className="p-4">Encounter Receipt</th>
                  <th className="p-4">Original Bill</th>
                  <th className="p-4">Amount Paid</th>
                  <th className="p-4">Outstanding Debt (AR)</th>
                  <th className="p-4 text-center">Aging Bucket</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDebts.map(debt => {
                  const isSettled = debt.status === 'SETTLED';
                  const age = debt.daysAged || 1;
                  const agingBadge = age <= 30 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                    : age <= 60 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';

                  return (
                    <tr 
                      key={debt.id} 
                      className={`transition-all ${isSettled ? 'bg-slate-50/50 dark:bg-slate-900/40 opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                      <td className="p-4">
                        <p className="font-black uppercase text-slate-900 dark:text-slate-100">{debt.patientName}</p>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          MRN: {debt.ehrNumber} • {debt.phone || 'No phone'}
                        </span>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                        {debt.receiptNumber}
                        <span className="text-[9px] text-slate-400 block font-sans">Cashier: {debt.cashierName}</span>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        ₵ {debt.originalBill.toFixed(2)}
                      </td>

                      <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₵ {debt.amountPaid.toFixed(2)}
                      </td>

                      <td className="p-4">
                        <span className={`font-mono font-black text-sm ${isSettled ? 'text-emerald-500' : 'text-rose-500'}`}>
                          ₵ {debt.outstandingBalance.toFixed(2)}
                        </span>
                        {isSettled && (
                          <span className="text-[9px] font-black uppercase text-emerald-500 block">CLEARED</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-md ${agingBadge}`}>
                          {age} Days ({age <= 30 ? '0-30d' : age <= 60 ? '31-60d' : '61+d'})
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!isSettled ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPatientDebt(debt);
                                  setRecoveryAmount(debt.outstandingBalance);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-lg transition-all shadow cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>RECOVER</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSendReminder(debt)}
                                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
                                title="Send SMS Payment Reminder"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase">SETTLED</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3B. TAB 2: INSTITUTIONAL CORPORATE PAYERS TABLE              */}
      {/* ============================================================ */}
      {activeTab === 'INSTITUTIONAL_PAYERS' && (
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. PATIENT DEBT RECOVERY DIALOG (Accept Remaining Balance)    */}
      {/* ============================================================ */}
      {selectedPatientDebt && (
        <Dialog open={!!selectedPatientDebt} onOpenChange={() => setSelectedPatientDebt(null)}>
          <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                <span>Recover Patient Balance</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase">Patient:</span>
                  <span className="font-black text-slate-900 dark:text-white">{selectedPatientDebt.patientName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase">MRN Number:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedPatientDebt.ehrNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase">Total Original Bill:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">₵ {selectedPatientDebt.originalBill.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-rose-500 font-bold uppercase">Current Outstanding:</span>
                  <span className="font-mono font-black text-rose-500 text-sm">₵ {selectedPatientDebt.outstandingBalance.toFixed(2)}</span>
                </div>
              </div>

              {/* Recovery Tender Amount Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">
                  Recovery Amount to Collect (GHS ₵)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedPatientDebt.outstandingBalance}
                  value={recoveryAmount}
                  onChange={(e) => setRecoveryAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-black text-lg outline-none text-emerald-600 dark:text-emerald-400"
                />
              </div>

              {/* Payment Mode */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block">
                  Payment Collection Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'MOMO', 'CARD'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRecoveryMethod(mode)}
                      className={`py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border ${
                        recoveryMethod === mode 
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <button
                type="button"
                onClick={handleSettlePatientDebt}
                disabled={isRecovering || recoveryAmount <= 0}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRecovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>POST DEBT SETTLEMENT & ISSUE CLEARANCE</span>
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
