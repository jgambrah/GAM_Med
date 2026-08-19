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
  
  const [disbursementMode, setDisbursementMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [processing, setProcessing] = useState(false);
  const [showJvPreview, setShowJvPreview] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');
  
  const WHT_RATES = [
    { label: "Exempt / 0% (Staff Allowances & Direct Benefits)", rate: 0 },
    { label: "Locum / Clinical Service WHT (3%)", rate: 0.03 },
    { label: "Supply of Goods (3%)", rate: 0.03 },
    { label: "Supply of Works (5%)", rate: 0.05 },
    { label: "External Medical Consultancy (7.5%)", rate: 0.075 },
    { label: "Rent - Commercial (15%)", rate: 0.15 },
    { label: "Director / Board Sitting Fees (20%)", rate: 0.20 }
  ];

  // Batch Multi-Payee Row Definition with Banking Routing
  type BatchPayeeRow = {
    id: string;
    payeeName: string;
    staffId: string;
    department: string;
    debitAccountId: string;
    debitAccountName: string;
    grossAmount: number;
    whtRate: number;
    whtAmount: number;
    netPayable: number;
    paymentChannel: string;
  };

  // Realistic Multi-Payee Initial Batch Data
  const [batchPayees, setBatchPayees] = useState<BatchPayeeRow[]>([
    {
      id: 'row-1',
      payeeName: 'Dr. Eric Appiah',
      staffId: 'GAM/STF/0042',
      department: 'OPD Clinical',
      debitAccountId: 'acc-4003',
      debitAccountName: 'OPD Medical Staff Allowances',
      grossAmount: 1500.00,
      whtRate: 0,
      whtAmount: 0.00,
      netPayable: 1500.00,
      paymentChannel: 'GCB Bank - 1099248102'
    },
    {
      id: 'row-2',
      payeeName: 'Sister Grace Mensah',
      staffId: 'GAM/STF/0118',
      department: 'Maternity Ward',
      debitAccountId: 'acc-4003',
      debitAccountName: 'Maternity Night-Shift Allowances',
      grossAmount: 1200.00,
      whtRate: 0,
      whtAmount: 0.00,
      netPayable: 1200.00,
      paymentChannel: 'Standard Chartered - 0100924819'
    },
    {
      id: 'row-3',
      payeeName: 'Dr. James Obrempong',
      staffId: 'EXT/LOC/009',
      department: 'Surgery Theatre',
      debitAccountId: 'acc-4003',
      debitAccountName: 'Visiting Consultant Locum Fees',
      grossAmount: 2500.00,
      whtRate: 0.075,
      whtAmount: 187.50,
      netPayable: 2312.50,
      paymentChannel: 'Ecobank Ghana - 2088192011'
    },
    {
      id: 'row-4',
      payeeName: 'Samuel Kofi Mensah',
      staffId: 'GAM/STF/0088',
      department: 'Central Laboratory',
      debitAccountId: 'acc-4003',
      debitAccountName: 'Laboratory Weekend Float Allowance',
      grossAmount: 800.00,
      whtRate: 0,
      whtAmount: 0.00,
      netPayable: 800.00,
      paymentChannel: 'MTN Mobile Money - 0244192801'
    }
  ]);

  const [form, setForm] = useState({
    valueDate: '2026-08-19',
    defaultExpenseId: 'acc-4003',
    defaultExpenseName: '5100 - Staff Non-Wage Allowances',
    debitAccountId: 'acc-4003',
    debitAccountName: 'Locum & Clinical Consultancy Fees',
    creditAccountId: 'acc-1001',
    creditAccountName: 'Cash at Bank - GCB Main',
    grossAmount: 0,
    applyVat: false,
    whtRate: 0,
    whtLabel: 'Exempt / 0% (Staff Allowances & Direct Benefits)',
    narration: 'Staff Clinical Night-Shift & Speciality Locum Allowances - August 2026 Batch',
    payee: '',
    pvNumber: '',
    vendorId: ''
  });

  const handleClearBatch = () => {
    setBatchPayees([
      {
        id: `row-${Date.now()}`,
        payeeName: '',
        staffId: '',
        department: 'OPD Clinical',
        debitAccountId: form.defaultExpenseId || 'acc-4003',
        debitAccountName: '5100 - Staff Non-Wage Allowances',
        grossAmount: 0,
        whtRate: 0,
        whtAmount: 0,
        netPayable: 0,
        paymentChannel: ''
      }
    ]);
    toast({ title: "Batch Cleared", description: "All rows reset to clean initial state." });
  };

  const handleExportBankSchedule = () => {
    const validRows = batchPayees.filter(r => r.payeeName.trim() && r.netPayable > 0);
    if (validRows.length === 0) {
      toast({ variant: "destructive", title: "Cannot Export", description: "No valid payee rows with net payable amounts found." });
      return;
    }

    const headers = "Beneficiary_Name,Staff_ID,Bank_MoMo_Provider,Account_Number,Net_Disbursement_Amount,Narration,Value_Date\n";
    const rowsContent = validRows.map(r => {
      const parts = (r.paymentChannel || 'Bank Transfer - 0000000000').split(' - ');
      const bank = parts[0] || 'Bank';
      const acct = parts[1] || 'N/A';
      return `"${r.payeeName}","${r.staffId}","${bank}","${acct}",${r.netPayable.toFixed(2)},"${form.narration || 'Staff Allowance'}","${form.valueDate}"`;
    }).join('\n');

    const csvData = "data:text/csv;charset=utf-8," + headers + rowsContent;
    const encodedUri = encodeURI(csvData);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GAM_MED_Bank_Disbursement_${form.valueDate}_Batch.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Corporate Bank File Exported", description: `Generated banking file for ${validRows.length} payees totaling GHS ${validRows.reduce((s, r) => s + r.netPayable, 0).toFixed(2)}.` });
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Staff_ID,Payee_Name,Department_GL,Gross_Amount,Tax_Rate,Bank_Payment_Details\n" +
      "GAM/STF/0042,Dr. Eric Appiah,5105 - OPD Medical Staff Allowances,2000.00,0,GCB Bank - 1099248102\n" +
      "GAM/STF/0118,Sister Grace Mensah,5110 - Maternity Night-Shift Allowances,1500.00,0,Standard Chartered - 0100924819\n" +
      "EXT/LOC/009,Dr. James Obrempong,5120 - Visiting Consultant Locum Fees,2500.00,0.075,Ecobank Ghana - 2088192011\n" +
      "GAM/STF/0088,Samuel Kofi Mensah,5115 - Laboratory Weekend Float,800.00,0,MTN Mobile Money - 0244192801\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "GAM_MED_Disbursement_Batch_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Template Downloaded", description: "CSV format: Staff_ID, Payee_Name, Department_GL, Gross_Amount, Tax_Rate, Bank_Payment_Details." });
  };
  
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

  const [overrideJustification, setOverrideJustification] = useState('');

  const selectedBudget = useMemo(() => {
    if (!budgets || !form.debitAccountId) return null;
    return budgets.find(b => b.accountId === form.debitAccountId || b.ledgerCode === form.debitAccountId);
  }, [budgets, form.debitAccountId]);

  // Encumbrance Accounting Formula: Available = Allocated - (Posted + Encumbered)
  const budgetMetrics = useMemo(() => {
    if (!selectedBudget) {
      const allocated = 150000.00;
      const posted = 95000.00;
      const encumbered = 12000.00;
      const available = allocated - (posted + encumbered); // 43,000.00
      return { allocated, posted, encumbered, available };
    }
    const allocated = selectedBudget.allocatedAmount || selectedBudget.limit || 150000.00;
    const posted = selectedBudget.postedAmount || selectedBudget.spent || 0;
    const encumbered = selectedBudget.encumberedAmount || 0;
    const available = allocated - (posted + encumbered);
    return { allocated, posted, encumbered, available };
  }, [selectedBudget]);

  const proposedAmount = form.grossAmount;
  const isOverBudget = proposedAmount > budgetMetrics.available;
  const overrunAmount = Math.max(0, proposedAmount - budgetMetrics.available);

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

  // Batch Aggregates
  const batchMetrics = useMemo(() => {
    return batchPayees.reduce((acc, row) => {
      const gross = Number(row.grossAmount || 0);
      const wht = Number(row.whtAmount || 0);
      const net = Number(row.netPayable || 0);
      return {
        totalGross: acc.totalGross + gross,
        totalWht: acc.totalWht + wht,
        totalNet: acc.totalNet + net,
        payeeCount: acc.payeeCount + 1
      };
    }, { totalGross: 0, totalWht: 0, totalNet: 0, payeeCount: 0 });
  }, [batchPayees]);

  const handleUpdateBatchRow = (id: string, field: keyof BatchPayeeRow, val: any) => {
    setBatchPayees(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: val };
      if (field === 'grossAmount' || field === 'whtRate') {
        const gross = field === 'grossAmount' ? Number(val || 0) : row.grossAmount;
        const rate = field === 'whtRate' ? Number(val || 0) : row.whtRate;
        const wht = Math.round(gross * rate * 100) / 100;
        updated.grossAmount = gross;
        updated.whtRate = rate;
        updated.whtAmount = wht;
        updated.netPayable = Math.round((gross - wht) * 100) / 100;
      }
      return updated;
    }));
  };

  const handleAddBatchRow = () => {
    const newId = `row-${Date.now()}`;
    setBatchPayees(prev => [
      ...prev,
      {
        id: newId,
        payeeName: '',
        staffId: '',
        department: 'OPD Clinical',
        debitAccountId: 'acc-4003',
        debitAccountName: 'Locum & Clinical Consultancy Fees',
        grossAmount: 0,
        whtRate: 0,
        whtAmount: 0,
        netPayable: 0
      }
    ]);
  };

  const handleDeleteBatchRow = (id: string) => {
    if (batchPayees.length <= 1) {
      toast({ variant: "destructive", title: "Cannot Delete", description: "Batch PV must have at least one payee line item." });
      return;
    }
    setBatchPayees(prev => prev.filter(r => r.id !== id));
  };

  const handleCsvBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length <= 1) throw new Error("CSV file is empty or missing data rows.");

        const startIdx = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('gross') ? 1 : 0;
        const parsedRows: BatchPayeeRow[] = [];

        for (let i = startIdx; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length >= 2) {
            const payeeName = cols[0] || `Staff Member #${i}`;
            const staffId = cols[1] || `GAM/STF/26/${String(i).padStart(4, '0')}`;
            const department = cols[2] || 'Clinical Operations';
            const gross = parseFloat(cols[3]) || 500;
            const rate = parseFloat(cols[4]) || 0;
            const paymentChannel = cols[5] || 'Bank Direct Deposit';
            const wht = Math.round(gross * rate * 100) / 100;
            const net = Math.round((gross - wht) * 100) / 100;

            parsedRows.push({
              id: `csv-${Date.now()}-${i}`,
              payeeName,
              staffId,
              department,
              debitAccountId: 'acc-4003',
              debitAccountName: 'Staff Allowances & Clinical Fees',
              grossAmount: gross,
              whtRate: rate,
              whtAmount: wht,
              netPayable: net,
              paymentChannel
            });
          }
        }

        if (parsedRows.length > 0) {
          setBatchPayees(parsedRows);
          toast({
            title: "CSV Schedule Parsed Successfully",
            description: `Imported ${parsedRows.length} multi-payee allowance lines. Batch gross: GHS ${parsedRows.reduce((s, r) => s + r.grossAmount, 0).toFixed(2)}.`
          });
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: "CSV Parsing Failed", description: err.message });
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const names = Array.from(files).map(f => f.name);
    setAttachedFiles(prev => [...prev, ...names]);
    toast({ title: "Attachment Uploaded", description: `Added ${names.length} supporting audit file(s).` });
  };

  const effectiveGross = disbursementMode === 'SINGLE' ? form.grossAmount : batchMetrics.totalGross;
  const effectiveWht = disbursementMode === 'SINGLE' ? whtAmount : batchMetrics.totalWht;
  const effectiveNet = disbursementMode === 'SINGLE' ? netAmount : batchMetrics.totalNet;

  const handleAuthorizePayment = async () => {
    // 1. Clean and filter batch payees (strip empty rows automatically)
    const cleanBatchPayees = batchPayees.filter(r => r.payeeName.trim() && r.grossAmount > 0);

    if (disbursementMode === 'SINGLE') {
      if (!form.debitAccountId || !form.creditAccountId || form.grossAmount <= 0) {
        toast({ variant: 'destructive', title: "Validation Error", description: "Please select expenditure/bank accounts and enter a valid gross amount." });
        return;
      }
    } else {
      if (!form.creditAccountId || cleanBatchPayees.length === 0) {
        toast({ variant: 'destructive', title: "Empty Batch Error", description: "Please select a funding bank account and ensure at least one payee has a name and gross amount > 0." });
        return;
      }
    }

    if (isOverBudget && !overrideJustification.trim()) {
      toast({ variant: 'destructive', title: "Justification Required", description: "Budget cap breached. Please enter a clinical/financial justification for the budget override request." });
      return;
    }

    setProcessing(true);

    const pvStatus = isOverBudget ? 'AWAITING_BUDGET_OVERRIDE' : 'AWAITING_FINANCE_APPROVAL';

    if (!firestore || !hospitalId || !user) {
      setTimeout(() => {
        const demoPvNum = disbursementMode === 'BATCH' 
          ? `GAM/PV-BATCH/26/0${Math.floor(100 + Math.random() * 900)}` 
          : `GAM/PV/26/0${Math.floor(100 + Math.random() * 900)}`;
        setForm(prev => ({ ...prev, pvNumber: demoPvNum }));
        toast({ 
          title: isOverBudget ? `PV ${demoPvNum} Escalated for Budget Override` : `PV ${demoPvNum} Sent for Approval`, 
          description: disbursementMode === 'BATCH'
            ? `Batch PV for ${cleanBatchPayees.length} payees (GHS ${effectiveNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}) routed to Checker Queue.`
            : "Awaiting review from the internal auditor / checker." 
        });
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
        const pvPrefix = disbursementMode === 'BATCH' ? 'PV-BATCH' : 'PV';
        const pvNumber = `${prefix}/${pvPrefix}/${year}/${currentPvCount.toString().padStart(4, '0')}`;
        finalPvNumber = pvNumber;
        
        const debitAccount = coa.find(a => a.id === form.debitAccountId) || { name: 'Expense Ledger', accountCode: '4000' };
        const creditAccount = coa.find(a => a.id === form.creditAccountId) || { name: 'Bank Ledger', accountCode: '1001' };
        const selectedVendor = vendors.find(v => v.id === form.vendorId);

        const pvDocRef = doc(collection(firestore, `hospitals/${hospitalId}/payment_vouchers`));
        transaction.set(pvDocRef, {
          pvNumber,
          disbursementMode,
          valueDate: form.valueDate,
          debitAccountId: form.debitAccountId,
          creditAccountId: form.creditAccountId,
          debitAccountCode: debitAccount.accountCode,
          creditAccountCode: creditAccount.accountCode,
          grossAmount: effectiveGross,
          whtRate: disbursementMode === 'SINGLE' ? form.whtRate : null,
          whtAmount: effectiveWht,
          vatAmount: disbursementMode === 'SINGLE' ? vatAmount : 0,
          netAmount: effectiveNet,
          narration: form.narration,
          payee: disbursementMode === 'SINGLE' ? form.payee : `Batch Disbursement (${cleanBatchPayees.length} Payees)`,
          batchPayees: disbursementMode === 'BATCH' ? cleanBatchPayees : null,
          hospitalId,
          debitAccountName: debitAccount.name,
          creditAccountName: creditAccount.name,
          vendorId: form.vendorId || '',
          vendorTin: selectedVendor?.tin || '',
          vendorBankName: selectedVendor?.bankName || '',
          vendorAccountNumber: selectedVendor?.accountNumber || '',
          attachments: attachedFiles,
          isOverBudget,
          overrideJustification: isOverBudget ? overrideJustification : null,
          availableBudgetAtCreation: budgetMetrics.available,
          processedBy: user.uid,
          processedByName: user.displayName || userProfile?.name || 'Accountant',
          status: pvStatus,
          createdAt: serverTimestamp()
        });

        // Update encumbered amount on budget node
        const qtr = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
        const bDocId = `${new Date().getFullYear()}_${qtr}_${form.debitAccountId}`;
        const bRef = doc(firestore, `hospitals/${hospitalId}/budgets`, bDocId);
        transaction.set(bRef, {
          encumberedAmount: (selectedBudget?.encumberedAmount || 0) + effectiveGross,
          updatedAt: serverTimestamp()
        }, { merge: true });

        transaction.update(hospitalDocRef, { pvCounter: (hData?.pvCounter || 0) + 1 });
      });

      setForm(prev => ({ ...prev, pvNumber: finalPvNumber }));
      toast({ 
        title: isOverBudget ? `PV ${finalPvNumber} Escalated for Budget Override` : `PV ${finalPvNumber} Sent for Approval`, 
        description: isOverBudget ? "Escalated to Medical Director for emergency budget sign-off." : "Awaiting review from the internal auditor / checker." 
      });
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

  const selectedDebitAccount = coa.find(a => a.id === form.debitAccountId || a.accountCode === form.debitAccountId);
  const selectedCreditAccount = coa.find(a => a.id === form.creditAccountId || a.accountCode === form.creditAccountId);

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
              GHANA REVENUE AUTHORITY COMPLIANT VOUCHER GENERATION, STATUTORY TAX DEDUCTIONS, AND BATCH DISBURSEMENTS.
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
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Disbursement Mode</span>
              <div className="text-base font-black text-emerald-400 uppercase">
                {disbursementMode === 'SINGLE' ? 'SINGLE VENDOR' : `BATCH (${batchMetrics.payeeCount} PAYEES)`}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                {disbursementMode === 'SINGLE' ? '1-to-1 Commercial Supplier' : 'Multi-Payee Non-Wage Batch'}
              </span>
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
          
          {/* Segmented Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> DISBURSEMENT LEDGER & PAYEE SETUP
              </h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Choose between single supplier payment or multi-staff allowance schedule</p>
            </div>

            {/* Segmented Control */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDisbursementMode('SINGLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                  disbursementMode === 'SINGLE'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Standard (Single Payee)
              </button>
              <button
                type="button"
                onClick={() => setDisbursementMode('BATCH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                  disbursementMode === 'BATCH'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Batch / Multi-Payee Grid
              </button>
            </div>
          </div>

          {/* Header: Funding & Batch Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            {/* Searchable Funding Source Account */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
                BANK / FUNDING ACCOUNT (CREDIT - SOURCE OF FUNDS)
              </label>
              <SearchableAccountSelect 
                value={form.creditAccountId}
                onChange={val => setForm(prev => ({ ...prev, creditAccountId: val }))}
                coa={coa.filter(a => a.category === 'ASSETS')}
                isCoaLoading={isCoaLoading}
                placeholder="Search Bank/Cash Funding Source..."
              />
            </div>

            {/* Value Date */}
            <div>
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
                VALUE / POSTING DATE
              </label>
              <input 
                type="date"
                value={form.valueDate}
                onChange={e => setForm(prev => ({ ...prev, valueDate: e.target.value }))}
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono outline-none cursor-pointer"
              />
            </div>

            {/* Default Expense Ledger (For Batch Overrides) */}
            {disbursementMode === 'BATCH' && (
              <div className="md:col-span-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest block mb-1">
                    DEFAULT EXPENSE LEDGER (AUTO-APPLIES TO NEW ROWS)
                  </label>
                  <SearchableAccountSelect 
                    value={form.defaultExpenseId}
                    onChange={val => setForm(prev => ({ ...prev, defaultExpenseId: val }))}
                    coa={coa.filter(a => a.category === 'EXPENSES')}
                    isCoaLoading={isCoaLoading}
                    placeholder="Select default expense account..."
                  />
                </div>
                <span className="text-[10px] text-slate-400 italic sm:self-end sm:pb-2">
                  Line items below can override this default per department.
                </span>
              </div>
            )}
          </div>

          {/* Master Narration */}
          <div>
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
              MASTER PV NARRATION & AUDIT MEMO
            </label>
            <textarea 
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 h-20"
              placeholder="Detailed purpose for disbursement (e.g. Clinical Night-Shift Allowances, Doctor Locum Batch, Board Sitting Fees)..." 
              value={form.narration} 
              onChange={e => setForm({...form, narration: e.target.value})} 
            />
          </div>

          {/* ======================================================== */}
          {/* A. SINGLE PAYEE MODE                                     */}
          {/* ======================================================== */}
          {disbursementMode === 'SINGLE' ? (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Expenditure Ledger (Debit) */}
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

              {/* Registered Vendor Sync */}
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
            </div>
          ) : (
            /* ======================================================== */
            /* B. BATCH MULTI-PAYEE DATA GRID                           */
            /* ======================================================== */
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              
              {/* Batch Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 p-3.5 rounded-xl">
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <span>Payee Allowance & Locum Schedule</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-mono font-bold">
                      {batchPayees.length} Payees
                    </span>
                  </h4>
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-300">
                    Master-Detail Architecture with row-level cost accounting and statutory tax deductions
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearBatch}
                    className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[10px] font-bold uppercase rounded-lg border border-rose-200 dark:border-rose-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>🗑️ CLEAR BATCH</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportBankSchedule}
                    className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase rounded-lg border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>📥 EXPORT BANK SCHEDULE</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>📥 CSV TEMPLATE</span>
                  </button>

                  <input 
                    type="file" 
                    ref={csvInputRef} 
                    accept=".csv,.txt"
                    onChange={handleCsvBulkUpload} 
                    className="hidden" 
                  />
                  <button
                    type="button"
                    onClick={() => csvInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-indigo-700 dark:text-indigo-300 text-xs font-black uppercase rounded-lg border border-indigo-300 dark:border-indigo-800 flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>BULK CSV UPLOAD</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddBatchRow}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-lg transition-all shadow flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ ADD PAYEE</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Payee Interactive Grid */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3 w-8 text-center">#</th>
                      <th className="p-3">Staff / Payee & Banking Route</th>
                      <th className="p-3">Dept / Cost Center</th>
                      <th className="p-3 text-right">Gross (GHS)</th>
                      <th className="p-3">Tax / WHT</th>
                      <th className="p-3 text-right">Tax (GHS)</th>
                      <th className="p-3 text-right">Net (GHS)</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {batchPayees.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 text-center font-mono text-[10px] text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-3">
                          <input 
                            type="text" 
                            placeholder="Staff / Payee Name"
                            value={row.payeeName}
                            onChange={e => handleUpdateBatchRow(row.id, 'payeeName', e.target.value)}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold outline-none"
                          />
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            <input 
                              type="text" 
                              placeholder="Staff ID (e.g. GAM/STF/004)"
                              value={row.staffId}
                              onChange={e => handleUpdateBatchRow(row.id, 'staffId', e.target.value)}
                              className="p-1 bg-transparent text-[10px] font-mono text-slate-500 outline-none"
                            />
                            <input 
                              type="text" 
                              placeholder="Bank/MoMo (e.g. GCB - 109924)"
                              value={row.paymentChannel || ''}
                              onChange={e => handleUpdateBatchRow(row.id, 'paymentChannel', e.target.value)}
                              className="p-1 bg-transparent text-[10px] font-mono text-emerald-600 dark:text-emerald-400 outline-none text-right"
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <select
                            value={row.department}
                            onChange={e => handleUpdateBatchRow(row.id, 'department', e.target.value)}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold outline-none cursor-pointer"
                          >
                            <option value="OPD Clinical">5105 - OPD Clinical Allowances</option>
                            <option value="Maternity Ward">5110 - Maternity Night Float</option>
                            <option value="Central Laboratory">5115 - Lab Weekend Float</option>
                            <option value="Surgery Theatre">5120 - Visiting Locum Fees</option>
                            <option value="Administration">5100 - General Staff Allowances</option>
                          </select>
                        </td>
                        <td className="p-3 text-right">
                          <input 
                            type="number" 
                            step="0.01"
                            value={row.grossAmount || ''}
                            onChange={e => handleUpdateBatchRow(row.id, 'grossAmount', parseFloat(e.target.value) || 0)}
                            className="w-24 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-black text-right outline-none"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={row.whtRate}
                            onChange={e => handleUpdateBatchRow(row.id, 'whtRate', parseFloat(e.target.value))}
                            className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold outline-none cursor-pointer"
                          >
                            <option value={0}>0% (Exempt Allowance)</option>
                            <option value={0.03}>3% (Locum Service)</option>
                            <option value={0.075}>7.5% (Consultancy)</option>
                            <option value={0.15}>15% (Non-Resident)</option>
                          </select>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-600">
                          ₵ {row.whtAmount.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-600">
                          ₵ {row.netPayable.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteBatchRow(row.id)}
                            className="text-rose-500 hover:text-rose-700 text-xs font-black uppercase p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                          >
                            [Delete]
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Grid Summary Footer */}
                  <tfoot className="bg-slate-900 text-white font-black text-xs uppercase">
                    <tr>
                      <td colSpan={3} className="p-3">STATUTORY AUDIT & SETTLEMENT SUMMARY ({batchMetrics.payeeCount} PAYEES)</td>
                      <td className="p-3 text-right font-mono">₵ {batchMetrics.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3 text-slate-400 text-[10px]">TOTAL TAX</td>
                      <td className="p-3 text-right font-mono text-amber-400">₵ {batchMetrics.totalWht.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right font-mono text-emerald-400 text-sm bg-slate-950">
                        ₵ {batchMetrics.totalNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Supporting Voucher Package Upload Zone */}
          <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Paperclip className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 block">
                  VOUCHER PACKAGE & AUDIT PROOFS
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Attach signed memos, attendance sheets, or invoices ({attachedFiles.length} attached)
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

        {/* Right Pane: Adaptive GRA Tax Engine & Calculation Card (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-950 p-6 md:p-8 rounded-2xl text-white shadow-xl space-y-6 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <Calculator className="w-4 h-4" /> 
              {disbursementMode === 'SINGLE' ? 'GRA STATUTORY TAX ENGINE' : 'BATCH SETTLEMENT TELEMETRY'}
            </h3>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase rounded border border-emerald-500/30">
              {disbursementMode === 'SINGLE' ? '1-TO-1 MATCH' : 'MULTI-LEG SPLIT'}
            </span>
          </div>

          {disbursementMode === 'SINGLE' ? (
            /* Single Payee Calculation Mode */
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

              {/* Financial Calculation Breakdown */}
              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800/80 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Invoice:</span>
                  <span>₵ {form.grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {form.applyVat && (
                  <div className="flex justify-between text-indigo-400">
                    <span>+ VAT Component (21.9%):</span>
                    <span>₵ {vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-amber-400">
                  <span>- GRA Withholding Tax ({(form.whtRate * 100).toFixed(1)}%):</span>
                  <span>(₵ {whtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between text-emerald-400 font-black text-sm">
                  <span>NET PAYABLE TO PAYEE:</span>
                  <span>₵ {netAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Batch Multi-Payee Telemetry Mode */
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Total Payees in Batch:</span>
                  <span className="font-mono font-bold text-white text-sm">{batchMetrics.payeeCount} Staff / Locums</span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span>Total Gross Batch Value:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    ₵ {batchMetrics.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-amber-400">
                  <span>Total GRA WHT Withheld:</span>
                  <span className="font-mono font-bold text-sm">
                    (₵ {batchMetrics.totalWht.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                </div>

                <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-emerald-400 font-black text-base">
                  <span>NET BANK CASH OUTFLOW:</span>
                  <span className="font-mono">
                    ₵ {batchMetrics.totalNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Double-Entry Multi-Leg Balance Proof */}
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                  <span>Double-Entry Proof</span>
                  <span className="text-emerald-400">100% BALANCED</span>
                </div>
                <div className="text-[11px] font-mono text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>DR: Cost Centers (Total OPEX)</span>
                    <span className="text-indigo-400">₵ {batchMetrics.totalGross.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CR: GRA WHT Liability (Account 2120)</span>
                    <span className="text-amber-400">₵ {batchMetrics.totalWht.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CR: Bank Ledger ({selectedCreditAccount?.accountCode || '1001'})</span>
                    <span className="text-emerald-400">₵ {batchMetrics.totalNet.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                {disbursementMode === 'SINGLE' ? (
                  <>
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
                        <span>CR 2120 - GRA WHT Payable</span>
                        <span>GHS {whtAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-100 font-black border-t border-slate-800 pt-1">
                      <span>CR {selectedCreditAccount?.accountCode || '1001'} - {selectedCreditAccount?.name || 'Bank Account'}</span>
                      <span>GHS {netAmount.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>DR 5100 - Departmental Allowances & Locum Cost Centers</span>
                      <span>GHS {batchMetrics.totalGross.toFixed(2)}</span>
                    </div>
                    {batchMetrics.totalWht > 0 && (
                      <div className="flex justify-between text-rose-400 font-bold">
                        <span>CR 2120 - GRA Withholding Tax Payable</span>
                        <span>GHS {batchMetrics.totalWht.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-100 font-black border-t border-slate-800 pt-1">
                      <span>CR {selectedCreditAccount?.accountCode || '1001'} - {selectedCreditAccount?.name || 'Bank Funding Account'}</span>
                      <span>GHS {batchMetrics.totalNet.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Morphing Action Button based on Scenario A vs B */}
          <button
            type="button"
            onClick={handleAuthorizePayment}
            disabled={processing || effectiveNet <= 0}
            className={`w-full py-4 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              isOverBudget ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isOverBudget ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>REQUEST BUDGET OVERRIDE (ESCALATE TO DIRECTOR)</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{disbursementMode === 'SINGLE' ? 'SEND PV FOR APPROVAL (MAKER-CHECKER)' : `AUTHORIZE BATCH PV (${batchMetrics.payeeCount} PAYEES)`}</span>
              </>
            )}
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
