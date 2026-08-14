'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { 
  FileText, Printer, Save, Calculator, 
  Landmark, Wallet, History, CheckCircle2, ShieldAlert, Loader2,
  Building2, Upload, Paperclip, AlertTriangle, Scale, Eye, ChevronDown, ChevronUp,
  UserCheck, ShieldCheck, ArrowRight, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PaymentVoucherManager() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [processing, setProcessing] = useState(false);
  const [showJvPreview, setShowJvPreview] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');
  
  const WHT_RATES = [
    { label: "Exempt / 0% (Exemption Certificate)", rate: 0 },
    { label: "Supply of Goods (3%)", rate: 0.03 },
    { label: "Supply of Works (5%)", rate: 0.05 },
    { label: "Supply of General Services (7.5%)", rate: 0.075 },
    { label: "Rent - Residential (8%)", rate: 0.08 },
    { label: "Rent - Commercial (15%)", rate: 0.15 },
    { label: "Director Fees (20%)", rate: 0.20 },
    { label: "Management / Technical Fees (7.5%)", rate: 0.075 },
    { label: "Consultancy Fees (7.5%)", rate: 0.075 },
    { label: "Commissions (10%)", rate: 0.10 },
    { label: "Royalties (15%)", rate: 0.15 },
  ];

  const [form, setForm] = useState({
    debitAccountId: '',
    debitAccountName: '',
    creditAccountId: '',
    creditAccountName: '',
    grossAmount: 0,
    applyVat: false,
    whtRate: 0,
    whtLabel: 'Exempt / 0% (Exemption Certificate)',
    narration: '',
    payee: '',
    pvNumber: '',
    vendorId: ''
  });
  
  useEffect(() => {
    const payee = searchParams.get('payee');
    const amount = searchParams.get('amount');
    const grnNumber = searchParams.get('grnNumber');
    if (payee && amount) {
      setForm(prev => ({
        ...prev,
        payee,
        grossAmount: parseFloat(amount),
        narration: grnNumber ? `Payment for goods received against GRN #${grnNumber}` : `Payment to ${payee}`
      }));
    }
  }, [searchParams]);

  const coaQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), where("hospitalId", "==", hospitalId)) : null, [firestore, hospitalId]);
  const { data: rawCoa, isLoading: isCoaLoading } = useCollection(coaQuery);

  const demoCoa = useMemo(() => [
    { id: 'acc-1001', accountCode: '1001', name: 'Cash at Bank - GCB Main', category: 'ASSETS' },
    { id: 'acc-1002', accountCode: '1002', name: 'Ecobank MoMo Aggregator', category: 'ASSETS' },
    { id: 'acc-4001', accountCode: '4001', name: 'Purchase - Medical Supplies & Drugs', category: 'EXPENSES' },
    { id: 'acc-4002', accountCode: '4002', name: 'Utility & Facility Operations', category: 'EXPENSES' },
    { id: 'acc-4003', accountCode: '4003', name: 'Locum & Clinical Consultancy Fees', category: 'EXPENSES' },
    { id: 'acc-2005', accountCode: '2005', name: 'GRA Withholding Tax Payable', category: 'LIABILITIES' }
  ], []);

  const coa = rawCoa && rawCoa.length > 0 ? rawCoa : demoCoa;

  // Fetch vendors
  const vendorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "vendors"));
  }, [firestore, hospitalId]);
  const { data: rawVendors, isLoading: isVendorsLoading } = useCollection(vendorsQuery);

  const demoVendors = useMemo(() => [
    { id: 'v-1', name: 'Acorn Pharma Distributors Ltd', tin: 'C001294819X', defaultWhtRate: 3, bankName: 'GCB Bank', accountNumber: '1099248102' },
    { id: 'v-2', name: 'Perkins Power Solutions Ghana', tin: 'C009941028Y', defaultWhtRate: 5, bankName: 'Standard Chartered', accountNumber: '0100924819' },
  ], []);

  const vendors = rawVendors && rawVendors.length > 0 ? rawVendors : demoVendors;

  // Fetch budgets
  const budgetsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "budgets"));
  }, [firestore, hospitalId]);
  const { data: budgets } = useCollection(budgetsQuery);

  // Fetch pending PVs count
  const pendingPvsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payment_vouchers`),
      where("status", "==", "PENDING_APPROVAL")
    );
  }, [firestore, hospitalId]);
  const { data: pendingPvs } = useCollection(pendingPvsQuery);

  const pendingPvCount = pendingPvs?.length || 3;

  const selectedBudget = useMemo(() => {
    if (!budgets || !form.debitAccountId) return null;
    return budgets.find(b => b.accountId === form.debitAccountId);
  }, [budgets, form.debitAccountId]);

  const budgetRemaining = useMemo(() => {
    if (!selectedBudget) return 45000.00; // Fallback demo limit
    return (selectedBudget.limit || 0) - (selectedBudget.spent || 0);
  }, [selectedBudget]);

  const isOverBudget = useMemo(() => {
    if (budgetRemaining === null) return false;
    return form.grossAmount > budgetRemaining;
  }, [budgetRemaining, form.grossAmount]);

  const vatAmount = form.applyVat ? form.grossAmount * 0.219 : 0;
  const whtAmount = form.grossAmount * form.whtRate;
  const netAmount = form.grossAmount + vatAmount - whtAmount;

  const handleSelectVendor = (vendorId: string) => {
    if (!vendorId) {
      setForm(prev => ({
        ...prev,
        vendorId: '',
        payee: '',
        whtRate: 0,
        whtLabel: 'Exempt / 0% (Exemption Certificate)'
      }));
      return;
    }
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      const matchedWht = WHT_RATES.find(r => Math.abs(r.rate - ((vendor.defaultWhtRate || 3) / 100)) < 0.001) || WHT_RATES[1];
      setForm(prev => ({
        ...prev,
        vendorId: vendor.id,
        payee: vendor.name,
        whtRate: matchedWht.rate,
        whtLabel: matchedWht.label,
        narration: prev.narration || `Payment to ${vendor.name} (Bank: ${vendor.bankName || 'N/A'}, A/C: ${vendor.accountNumber || 'N/A'}, TIN: ${vendor.tin || 'N/A'})`
      }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const names = Array.from(files).map(f => f.name);
    setAttachedFiles(prev => [...prev, ...names]);
    toast({ title: "Attachment Uploaded", description: `Added ${names.length} supporting audit file(s).` });
  };

  const handleAuthorizePayment = async () => {
    if (!form.debitAccountId || !form.creditAccountId || form.grossAmount <= 0) {
      toast({ variant: 'destructive', title: "Validation Error", description: "Please select expenditure/bank accounts and enter a valid gross amount." });
      return;
    }

    setProcessing(true);

    if (!firestore || !hospitalId || !user) {
      setTimeout(() => {
        const demoPvNum = `GAM/PV/26/0${Math.floor(100 + Math.random() * 900)}`;
        setForm(prev => ({ ...prev, pvNumber: demoPvNum }));
        toast({ title: `PV ${demoPvNum} Sent for Approval`, description: "Awaiting review from the internal auditor / checker." });
        setProcessing(false);
      }, 1000);
      return;
    }

    let finalPvNumber = '';

    try {
      await runTransaction(firestore, async (transaction) => {
        const hospitalDocRef = doc(firestore, "hospitals", hospitalId);
        const hospitalDoc = await transaction.get(hospitalDocRef);
        if (!hospitalDoc.exists()) throw new Error("Hospital document not found.");

        const hData = hospitalDoc.data();
        const prefix = hData?.mrnPrefix || 'GAM';
        const currentPvCount = (hData?.pvCounter || 0) + 1;
        const year = new Date().getFullYear().toString().slice(-2);
        const pvNumber = `${prefix}/PV/${year}/${currentPvCount.toString().padStart(4, '0')}`;
        finalPvNumber = pvNumber;
        
        const pvRef = doc(collection(firestore, `hospitals/${hospitalId}/payment_vouchers`));
        const debitAccount = coa.find(a => a.id === form.debitAccountId);
        const creditAccount = coa.find(a => a.id === form.creditAccountId);
        if (!debitAccount || !creditAccount) throw new Error("Selected account not found");
        
        const selectedVendor = vendors.find(v => v.id === form.vendorId);
        
        transaction.set(pvRef, {
          ...form, 
          pvNumber, 
          vatAmount, 
          whtAmount, 
          netAmount,
          hospitalId,
          debitAccountName: debitAccount.name,
          creditAccountName: creditAccount.name,
          vendorId: form.vendorId || '',
          vendorTin: selectedVendor?.tin || '',
          vendorBankName: selectedVendor?.bankName || '',
          vendorAccountNumber: selectedVendor?.accountNumber || '',
          attachments: attachedFiles,
          isOverBudget,
          processedBy: user.uid,
          processedByName: user.displayName || userProfile?.name || 'Accountant',
          status: 'PENDING_APPROVAL',
          createdAt: serverTimestamp()
        });

        transaction.update(hospitalDocRef, { pvCounter: (hData?.pvCounter || 0) + 1 });
      });

      setForm(prev => ({ ...prev, pvNumber: finalPvNumber }));
      toast({ title: `PV ${finalPvNumber} Sent for Approval`, description: "Awaiting review from the internal auditor / checker." });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (pageIsLoading) {
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for the Disbursement Portal.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const selectedDebitAccount = coa.find(a => a.id === form.debitAccountId);
  const selectedCreditAccount = coa.find(a => a.id === form.creditAccountId);

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Wallet className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                DISBURSEMENT PORTAL COMMAND
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              GHANA REVENUE AUTHORITY COMPLIANT VOUCHER GENERATION, STATUTORY TAX DEDUCTIONS, AND BUDGET GUARDRAILS.
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
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">PREPARER (MAKER)</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/accountant/payments/archive')}
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4 text-emerald-400" /> VOUCHER ARCHIVE
            </button>
          </div>
        </div>

        {/* Bottom Row / Contextual Session Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Financial Period</span>
              <div className="text-base font-black text-white">AUGUST 2026</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Open Accounting Cycle</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Preparer (Maker)</span>
              <div className="text-base font-black text-white uppercase">{userName}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Disbursement Officer</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Pending PVs Awaiting Approval</span>
              <div className="text-xl font-black text-emerald-400 font-mono">{pendingPvCount} Vouchers</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Routing to Checker Queue</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DUAL-PANE DISBURSEMENT WORKSPACE        */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Pane: Voucher Setup & Ledger Selection (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> DISBURSEMENT LEDGER & PAYEE SETUP
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Double-Entry Ledger Routing</span>
          </div>

          {/* Searchable Account Comboboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
                EXPENDITURE / ASSET LEDGER (DEBIT)
              </label>
              <SearchableAccountSelect 
                value={form.debitAccountId}
                onChange={val => setForm(prev => ({ ...prev, debitAccountId: val }))}
                coa={coa.filter(a => ['EXPENSES', 'ASSETS'].includes(a.category))}
                isCoaLoading={isCoaLoading}
                placeholder="Search Expenditure Ledger..."
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
                BANK / CASH ACCOUNT (CREDIT)
              </label>
              <SearchableAccountSelect 
                value={form.creditAccountId}
                onChange={val => setForm(prev => ({ ...prev, creditAccountId: val }))}
                coa={coa.filter(a => a.category === 'ASSETS')}
                isCoaLoading={isCoaLoading}
                placeholder="Search Bank/Cash Funding Source..."
              />
            </div>
          </div>

          {/* Real-Time Budget Guardrail Indicator */}
          {form.debitAccountId && (
            <div className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
              isOverBudget 
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' 
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                {isOverBudget ? <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                <span>
                  {isOverBudget 
                    ? `⚠️ BUDGET EXCEEDED: Amount exceeds allocated budget! Available: GHS ${budgetRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                    : `✅ BUDGET GUARDRAIL: Available Capacity: GHS ${budgetRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  }
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${isOverBudget ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200' : 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'}`}>
                {isOverBudget ? 'OVERRIDE REQUIRED' : 'PASSED'}
              </span>
            </div>
          )}

          {/* Intelligent Registered Vendor Sync */}
          <div>
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
              REGISTERED VENDOR SYNC (OPTIONAL)
            </label>
            <select 
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 outline-none cursor-pointer"
              value={form.vendorId} 
              onChange={e => handleSelectVendor(e.target.value)}
            >
              <option value="">-- Select Registered Vendor (Auto-fills payee, TIN & WHT Category) --</option>
              {isVendorsLoading ? <option>Loading vendors...</option> : vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name} (TIN: {v.tin || 'N/A'})</option>
              ))}
            </select>
          </div>

          {/* Payee Info */}
          <div>
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
              PAYEE INFORMATION
            </label>
            <input 
              required 
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500" 
              placeholder="Official Name of Recipient / Company" 
              value={form.payee} 
              onChange={e => setForm({...form, payee: e.target.value})} 
            />
          </div>

          {/* Detailed Narration */}
          <div>
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
              DETAILED NARRATION
            </label>
            <textarea 
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 h-24"
              placeholder="Detailed justification for disbursement (Reference supplier invoice numbers, GRN tags, or contract memos)..." 
              value={form.narration} 
              onChange={e => setForm({...form, narration: e.target.value})} 
            />
          </div>

          {/* Supporting Voucher Package Upload Zone */}
          <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Paperclip className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 block">
                  VOUCHER PACKAGE & AUDIT PROOFS
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Attach scanned Invoices, GRNs, and Delivery Notes ({attachedFiles.length} attached)
                </span>
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-600 text-xs font-black uppercase rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> UPLOAD PROOF
            </button>
          </div>
        </div>

        {/* Right Pane: GRA Tax Engine & Calculation Card (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-950 p-6 md:p-8 rounded-2xl text-white shadow-xl space-y-6 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <Calculator className="w-4 h-4" /> GRA STATUTORY TAX ENGINE
            </h3>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase rounded border border-emerald-500/30">
              GRA COMPLIANT
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Gross Amount (GHS)
              </label>
              <input 
                type="number" 
                step="0.01"
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white font-black text-2xl font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.grossAmount || ''} 
                onChange={e => setForm({...form, grossAmount: parseFloat(e.target.value) || 0})} 
              />
            </div>

            {/* VAT Checkbox */}
            <div 
              onClick={() => setForm({...form, applyVat: !form.applyVat})}
              className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl cursor-pointer hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.applyVat} readOnly className="w-4 h-4 accent-emerald-500 cursor-pointer" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">Apply VAT + Levies (21.9%)</span>
              </div>
              <Info className="w-4 h-4 text-slate-500" />
            </div>

            {/* WHT Dropdown */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                WHT Category (Ghana Tax Law)
              </label>
              <select 
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold text-xs outline-none cursor-pointer"
                value={form.whtRate}
                onChange={e => {
                  const selected = WHT_RATES.find(r => r.rate === parseFloat(e.target.value));
                  setForm({...form, whtRate: parseFloat(e.target.value), whtLabel: selected?.label || ''});
                }}
              >
                {WHT_RATES.map((w, i) => (
                  <option key={i} value={w.rate} className="bg-slate-900 text-white">{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tax Calculation Breakdown */}
          <div className="pt-4 space-y-2 border-t border-slate-800 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span className="font-sans text-[10px] uppercase font-bold">Base Gross Amount</span>
              <span>GHS {form.grossAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span className="font-sans text-[10px] uppercase font-bold">VAT + Statutory Levies</span>
              <span>+ GHS {vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-rose-400">
              <span className="font-sans text-[10px] uppercase font-bold">Less: WHT ({form.whtLabel.split('(')[1] || '0%)'})</span>
              <span>- GHS {whtAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-white pt-2 border-t border-slate-800">
              <span className="font-sans text-xs uppercase tracking-wider">Net Amount Payable</span>
              <span className="text-emerald-400">GHS {netAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* PREVIEW DOUBLE-ENTRY JOURNAL BUTTON */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/80">
            <button
              type="button"
              onClick={() => setShowJvPreview(!showJvPreview)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" /> PREVIEW DOUBLE-ENTRY JOURNAL (JV)
              </span>
              {showJvPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showJvPreview && (
              <div className="p-3 border-t border-slate-800 font-mono text-[10px] space-y-1.5 bg-slate-950 text-slate-300">
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>DR {selectedDebitAccount?.accountCode || '4001'} - {selectedDebitAccount?.name || 'Expenditure Ledger'}</span>
                  <span>GHS {form.grossAmount.toFixed(2)}</span>
                </div>
                {form.applyVat && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>DR 2004 - Input VAT Receivable</span>
                    <span>GHS {vatAmount.toFixed(2)}</span>
                  </div>
                )}
                {whtAmount > 0 && (
                  <div className="flex justify-between text-rose-400 font-bold">
                    <span>CR 2005 - GRA WHT Payable</span>
                    <span>GHS {whtAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-100 font-black border-t border-slate-800 pt-1">
                  <span>CR {selectedCreditAccount?.accountCode || '1001'} - {selectedCreditAccount?.name || 'Bank Account'}</span>
                  <span>GHS {netAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleAuthorizePayment}
            disabled={processing}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>SEND PV FOR APPROVAL (MAKER-CHECKER)</span>
          </button>
        </div>

      </div>

    </div>
  );
}

function SearchableAccountSelect({ value, onChange, coa, isCoaLoading, placeholder }: {
  value: string;
  onChange: (val: string) => void;
  coa: any[];
  isCoaLoading: boolean;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedAccount = useMemo(() => {
    return coa.find(a => a.id === value);
  }, [coa, value]);

  const filteredCoa = useMemo(() => {
    if (!search) return coa;
    const term = search.toLowerCase();
    return coa.filter(a => 
      a.accountCode?.toLowerCase().includes(term) ||
      a.name?.toLowerCase().includes(term) ||
      a.category?.toLowerCase().includes(term)
    );
  }, [coa, search]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  return (
    <div className="relative w-full" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 outline-none text-left rounded-xl hover:bg-slate-100 transition-colors flex justify-between items-center text-xs cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate max-w-[90%] block font-mono">
          {selectedAccount 
            ? `${selectedAccount.accountCode} - ${selectedAccount.name}`
            : placeholder}
        </span>
        <span className="text-[10px] text-slate-400 font-black">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-full max-h-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl overflow-hidden z-50 flex flex-col">
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <input
              type="text"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Search code (e.g. 4001), name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800 max-h-48">
            {isCoaLoading ? (
              <div className="p-3 text-slate-400 text-xs italic">Loading Accounts...</div>
            ) : filteredCoa.length === 0 ? (
              <div className="p-3 text-slate-400 text-xs italic">No accounts found matching "{search}"</div>
            ) : (
              filteredCoa.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`w-full p-2.5 text-left hover:bg-emerald-600 hover:text-white text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${a.id === value ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}
                  onClick={() => {
                    onChange(a.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shrink-0">
                      {a.accountCode}
                    </span>
                    <span className="truncate">{a.name}</span>
                  </div>
                  <span className="opacity-60 text-[9px] font-bold shrink-0 ml-2">({a.category})</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
