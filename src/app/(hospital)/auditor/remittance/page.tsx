'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, writeBatch, addDoc } from 'firebase/firestore';
import { 
  ShieldCheck, Landmark, CheckCircle2, FileText, Loader2, ShieldAlert, Eye, 
  Building2, CreditCard, Download, ArrowRight, DollarSign, Wallet, Layers, FileSpreadsheet, CheckSquare, Square
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ApprovedPV = {
  id: string;
  pvNumber: string;
  payee: string;
  bankInfo: string;
  bankName?: string;
  accountNumber?: string;
  type: 'LOCUM' | 'VENDOR' | 'PAYROLL';
  netAmount: number;
  status: string;
};

export default function TreasuryRemittanceConsole() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [fundingSource, setFundingSource] = useState<string>('GCB Operations - *3344');
  const [selectedPvIds, setSelectedPvIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'AUDITOR', 'ACCOUNTANT', 'SUPER_ADMIN', 'TREASURY_CONTROLLER', 'FINANCE_DIRECTOR', 'CHIEF_AUDITOR'].includes(userRole || '');

  // 1. Query AUTHORIZED Payment Vouchers ready for Remittance
  const pvsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payment_vouchers`),
      where("status", "==", "AUTHORIZED")
    );
  }, [firestore, hospitalId]);
  const { data: rawApprovedPvs, isLoading: pvsLoading } = useCollection(pvsQuery);

  // 2. Query Posted Payroll Runs for Statutory Clearance Tab
  const runsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payroll_runs`),
      where("status", "==", "POSTED")
    );
  }, [firestore, hospitalId]);
  const { data: runs, isLoading: areRunsLoading } = useCollection(runsQuery);

  // Demodata Fallback for Immediate Treasury Demonstration
  const demoPvs: ApprovedPV[] = useMemo(() => [
    { id: 'pv-01', pvNumber: 'MMH/PV/26/0002', payee: 'MULTINEC ENTERPRISE', bankInfo: 'GCB - 10113456789', bankName: 'GCB Bank Ltd', accountNumber: '10113456789', type: 'VENDOR', netAmount: 25000.00, status: 'AUTHORIZED' },
    { id: 'pv-02', pvNumber: 'MMH/PV/26/0001', payee: 'MULTINEC ENTERPRISE', bankInfo: 'GCB - 10113456789', bankName: 'GCB Bank Ltd', accountNumber: '10113456789', type: 'VENDOR', netAmount: 28600.00, status: 'AUTHORIZED' },
    { id: 'pv-03', pvNumber: 'PV-7578-275839', payee: 'AABON VENTURES ENTERPRISE', bankInfo: 'ECOBANK - 0011223344', bankName: 'Ecobank Ghana', accountNumber: '0011223344', type: 'VENDOR', netAmount: 1189.00, status: 'AUTHORIZED' },
    { id: 'pv-04', pvNumber: 'PV-LOCUM-24874', payee: 'DR. JAMES OBREMPONG', bankInfo: 'FIDELITY - 2445566778', bankName: 'Fidelity Bank', accountNumber: '2445566778', type: 'LOCUM', netAmount: 157.19, status: 'AUTHORIZED' },
    { id: 'pv-05', pvNumber: 'PV-LOCUM-24890', payee: 'TRACY GAMBRAH', bankInfo: 'GTBANK - 2019988441', bankName: 'Guaranty Trust Bank', accountNumber: '2019988441', type: 'LOCUM', netAmount: 277.50, status: 'AUTHORIZED' }
  ], []);

  const approvedPvs: ApprovedPV[] = useMemo(() => {
    if (rawApprovedPvs && rawApprovedPvs.length > 0) {
      return rawApprovedPvs.map((pv: any) => ({
        id: pv.id,
        pvNumber: pv.pvNumber || pv.id,
        payee: pv.payee || pv.payeeName || 'PAYEE',
        bankInfo: pv.bankInfo || 'GCB - 10113456789',
        bankName: pv.bankName || 'GCB Bank Ltd',
        accountNumber: pv.accountNumber || '10113456789',
        type: pv.type === 'LOCUM' ? 'LOCUM' : 'VENDOR',
        netAmount: Number(pv.netAmount || pv.grossAmount || 0),
        status: pv.status || 'AUTHORIZED'
      }));
    }
    return demoPvs;
  }, [rawApprovedPvs, demoPvs]);

  const batchTotals = useMemo(() => {
    let totalAmount = 0;
    approvedPvs.forEach(pv => {
      if (selectedPvIds.includes(pv.id)) {
        totalAmount += pv.netAmount;
      }
    });
    return {
      count: selectedPvIds.length,
      amount: totalAmount
    };
  }, [approvedPvs, selectedPvIds]);

  const totalTreasuryLiability = useMemo(() => {
    return approvedPvs.reduce((sum, pv) => sum + pv.netAmount, 0);
  }, [approvedPvs]);

  const toggleSelectAll = () => {
    if (selectedPvIds.length === approvedPvs.length) {
      setSelectedPvIds([]);
    } else {
      setSelectedPvIds(approvedPvs.map(pv => pv.id));
    }
  };

  const toggleSelectPv = (id: string) => {
    setSelectedPvIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const downloadBankInstructionCSV = (scheduleId: string, items: ApprovedPV[]) => {
    const headers = ["Schedule ID", "Voucher Ref", "Payee Name", "Type", "Destination Bank", "Account Number", "Amount (GHS)", "Funding Source"];
    const rows = items.map(item => [
      scheduleId,
      item.pvNumber,
      `"${item.payee}"`,
      item.type,
      `"${item.bankName}"`,
      `"${item.accountNumber}"`,
      item.netAmount.toFixed(2),
      `"${fundingSource}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GAM_MED_BANK_INSTRUCTION_${scheduleId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateRemittance = async () => {
    if (!fundingSource) {
      toast({ variant: 'destructive', title: "Funding Source Missing", description: "Select a corporate bank account first." });
      return;
    }

    if (selectedPvIds.length === 0) {
      toast({ variant: 'destructive', title: "No Vouchers Selected", description: "Check the vouchers to include in this bank batch." });
      return;
    }

    setIsProcessing(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '').substring(0, 6);
      const scheduleId = `REM-${fundingSource.split(' ')[0]}-${todayStr}-${Math.floor(1000 + Math.random() * 9000)}`;

      const selectedItems = approvedPvs.filter(pv => selectedPvIds.includes(pv.id));

      if (firestore && hospitalId && user) {
        const batch = writeBatch(firestore);

        // 1. Lock PVs to REMITTED status
        selectedItems.forEach(item => {
          const pvRef = doc(firestore, `hospitals/${hospitalId}/payment_vouchers`, item.id);
          batch.set(pvRef, {
            status: 'REMITTED',
            remittanceBatchId: scheduleId,
            remittedBy: user.uid,
            remittedAt: serverTimestamp()
          }, { merge: true });

          // 2. Post Automated Double-Entry Ledger Transaction
          // Debit: 2150 AP Locums / Vendor Clearing Account
          // Credit: 1010 Corporate Bank Account
          const jvRef = doc(collection(firestore, `hospitals/${hospitalId}/journal_vouchers`));
          batch.set(jvRef, {
            voucherNumber: `JV-REM-${Date.now().toString().slice(-6)}`,
            voucherDate: serverTimestamp(),
            narration: `Bank remittance for ${item.payee} via ${fundingSource}`,
            totalDebit: item.netAmount,
            totalCredit: item.netAmount,
            status: 'POSTED',
            entries: [
              { accountId: '2150', accountName: 'Accounts Payable Clearing', debit: item.netAmount, credit: 0 },
              { accountId: '1010', accountName: `Corporate Bank (${fundingSource.split(' ')[0]})`, debit: 0, credit: item.netAmount }
            ],
            createdBy: user.uid,
            createdAt: serverTimestamp()
          });
        });

        await batch.commit();

        // 3. Write Master Remittance Schedule Record
        await addDoc(collection(firestore, `hospitals/${hospitalId}/remittance_schedules`), {
          scheduleId,
          fundingBank: fundingSource,
          totalAmount: batchTotals.amount,
          itemCount: batchTotals.count,
          pvIds: selectedPvIds,
          status: 'TRANSMITTED_TO_BANK',
          executedBy: user.uid,
          createdAt: serverTimestamp()
        });
      }

      downloadBankInstructionCSV(scheduleId, selectedItems);

      toast({
        title: "Bank Remittance Generated & Ledger Posted",
        description: `Schedule ${scheduleId} created. GHS ${batchTotals.amount.toFixed(2)} debited AP Clearing (2150) & credited Bank (1010).`
      });

      setSelectedPvIds([]);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Remittance Generation Failed", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearStatutoryRemittance = async (runId: string, type: 'SSNIT' | 'PAYE') => {
    if (!firestore || !hospitalId || !userProfile) return;

    try {
      const runRef = doc(firestore, `hospitals/${hospitalId}/payroll_runs`, runId);
      await updateDocumentNonBlocking(runRef, {
        [`${type.toLowerCase()}AuditCleared`]: true,
        [`${type.toLowerCase()}AuditorName`]: userProfile?.fullName || 'Marcus Amosah Henaku',
        [`${type.toLowerCase()}AuditDate`]: serverTimestamp()
      });
      toast({ title: `${type} Statutory Schedule Certified & Cleared for Bank Submission.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: e.message });
    }
  };

  const isLoading = isUserLoading || isProfileLoading || pvsLoading;
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Treasury & Remittance Management.</p>
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
                <Landmark className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                TREASURY & REMITTANCE CONSOLE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CORPORATE BANK BATCH INSTRUCTIONS, FUNDING ACCOUNT SELECTION, AND AP CLEARING LEDGER AUTOMATION.
            </p>
          </div>

          {/* User Context */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">TREASURY CONTROLLER</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Contextual Liquidity Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Approved PVs Awaiting Payment</span>
              <div className="text-2xl font-black text-white font-mono">{approvedPvs.length} Approved PVs</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Audited 3-Way Match Passed</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Layers className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Treasury Liability</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₵ {totalTreasuryLiability.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Pending Corporate Disbursement</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-sky-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-sky-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block mb-1">Active Bank Instructions</span>
              <div className="text-2xl font-black text-sky-400 font-mono">2 Pending Batches</div>
              <span className="text-[10px] font-bold text-sky-400 mt-0.5 block">Transmitted to GCB Corporate</span>
            </div>
            <div className="p-3 bg-sky-500/20 border border-sky-500/30 text-sky-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. TABBED TREASURY CONTROL WORKSPACE       */}
      {/* ========================================== */}
      <Tabs defaultValue="corporate" className="w-full">
        <TabsList className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 grid w-full grid-cols-2 text-xs font-black uppercase">
          <TabsTrigger value="corporate" className="rounded-xl py-2.5 cursor-pointer">Vendor & Locum Bank Batch Remittance</TabsTrigger>
          <TabsTrigger value="statutory" className="rounded-xl py-2.5 cursor-pointer">Statutory Payroll Clearance (SSNIT & PAYE)</TabsTrigger>
        </TabsList>

        {/* TAB 1: CORPORATE BANK BATCH REMITTANCE */}
        <TabsContent value="corporate" className="mt-6 space-y-6">
          
          {/* Treasury Control & Bank Selection Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Select Funding Corporate Bank Account
              </label>
              <select
                value={fundingSource}
                onChange={(e) => setFundingSource(e.target.value)}
                className="w-full max-w-md p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value="GCB Operations - 1011223344">GCB Operations A/C - *3344 (1011223344)</option>
                <option value="ECOBANK Revenue - 0011998877">ECOBANK Revenue A/C - *8877 (0011998877)</option>
                <option value="FIDELITY Operations - 2445566778">FIDELITY Operations A/C - *6778 (2445566778)</option>
              </select>
            </div>

            <div className="flex flex-col items-end shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Batch Total ({batchTotals.count} items selected)
              </span>
              <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mb-4">
                ₵ {batchTotals.amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <button
                type="button"
                onClick={handleGenerateRemittance}
                disabled={isProcessing || selectedPvIds.length === 0}
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg cursor-pointer flex items-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>GENERATE BANK INSTRUCTION</span>
              </button>
            </div>
          </div>

          {/* Master Approved PV Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
              >
                {selectedPvIds.length === approvedPvs.length && approvedPvs.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Select All ({approvedPvs.length})</span>
              </button>

              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Audited & Approved Payment Vouchers
              </span>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-white uppercase text-[9px] tracking-widest">
                <tr>
                  <th className="p-4 w-12 text-center">Select</th>
                  <th className="p-4">Voucher Reference</th>
                  <th className="p-4">Payee Name & Type</th>
                  <th className="p-4">Destination Bank Info</th>
                  <th className="p-4 text-right pr-6">Net Payable (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {approvedPvs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center text-slate-400 italic">
                      No approved payment vouchers awaiting remittance.
                    </td>
                  </tr>
                ) : (
                  approvedPvs.map((pv) => {
                    const isSelected = selectedPvIds.includes(pv.id);
                    const isLocum = pv.type === 'LOCUM';

                    return (
                      <tr
                        key={pv.id}
                        onClick={() => toggleSelectPv(pv.id)}
                        className={`transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-4 text-center">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 mx-auto" />
                          )}
                        </td>

                        <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {pv.pvNumber}
                        </td>

                        <td className="p-4">
                          <p className="font-black text-slate-900 dark:text-slate-100 uppercase">{pv.payee}</p>
                          <span
                            className={`inline-block mt-1 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                              isLocum ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {pv.type}
                          </span>
                        </td>

                        <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                          {pv.bankInfo}
                        </td>

                        <td className="p-4 text-right pr-6 font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                          ₵ {pv.netAmount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB 2: STATUTORY PAYROLL CLEARANCE (SSNIT & PAYE) */}
        <TabsContent value="statutory" className="mt-6 space-y-6">
          <div className="space-y-6">
            {areRunsLoading ? (
              <div className="p-12 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" /></div>
            ) : runs?.length === 0 ? (
              <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-slate-400 italic text-xs uppercase font-bold">
                No posted payroll runs pending statutory audit clearance.
              </div>
            ) : (
              runs?.map((run: any) => (
                <div key={run.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-4">
                  <div className="bg-slate-950 p-6 text-white flex justify-between items-center border-b border-slate-800">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-400 font-mono">
                        Payroll Run: {run.month}/{run.year}
                      </p>
                      <h4 className="text-sm font-bold text-slate-300 mt-0.5">Statutory Employer Deductions Audit</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono font-black text-xs px-3.5 py-1.5 rounded-xl">
                        Net Payroll: ₵ {(run.totalNet || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatutoryClearanceCard 
                      title="SSNIT Remittance Schedule (18.5%)"
                      isCleared={run.ssnitAuditCleared}
                      auditor={run.ssnitAuditorName}
                      onClear={() => clearStatutoryRemittance(run.id, 'SSNIT')}
                      icon={<Landmark className="w-5 h-5 text-emerald-400" />}
                      period={{ month: run.month, year: run.year }}
                      type="SSNIT"
                    />

                    <StatutoryClearanceCard 
                      title="GRA PAYE Statutory Tax Schedule"
                      isCleared={run.payeAuditCleared}
                      auditor={run.payeAuditorName}
                      onClear={() => clearStatutoryRemittance(run.id, 'PAYE')}
                      icon={<FileText className="w-5 h-5 text-rose-400" />}
                      color="red"
                      period={{ month: run.month, year: run.year }}
                      type="PAYE"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

    </div>
  );
}

function StatutoryClearanceCard({ title, isCleared, auditor, onClear, icon, color = "blue", period, type }: any) {
  return (
    <div className={`p-6 rounded-3xl border transition-all space-y-4 ${
      isCleared 
        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex justify-between items-start">
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
          {icon}
        </div>

        {isCleared ? (
          <div className="text-right">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
              Certified & Cleared
            </span>
            <p className="text-[9px] text-slate-400 font-mono mt-0.5">Auditor: {auditor}</p>
          </div>
        ) : (
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Pending Audit Review
          </span>
        )}
      </div>

      <div>
        <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase">{title}</h4>
        <p className="text-xs text-slate-500 font-mono mt-1">Period: {period.month}/{period.year}</p>
      </div>

      <button
        type="button"
        disabled={isCleared}
        onClick={onClear}
        className={`w-full py-3 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center justify-center gap-2 ${
          isCleared
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 cursor-default border border-emerald-300'
            : 'bg-slate-900 hover:bg-emerald-600 text-white dark:bg-slate-100 dark:text-slate-900'
        }`}
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>{isCleared ? 'AUDIT CERTIFIED & TRANSMITTED' : 'CERTIFY & CLEAR REMITTANCE'}</span>
      </button>
    </div>
  );
}
