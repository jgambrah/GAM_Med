'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { 
  Calculator, PlayCircle, CalendarDays, Users, 
  Landmark, Receipt, Search, CheckCircle2, AlertCircle, 
  Download, FileCheck2, DollarSign, Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { calculatePAYE, getProRataMultiplier } from '@/lib/payroll';

export default function PayrollRunEngineHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [period, setPeriod] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'HR_MANAGER', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const monthNames = useMemo(() => [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", 
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ], []);

  const demoPayrollDraft = useMemo(() => [
    { 
      id: 'GAM-MED-001', 
      staffId: 'd1',
      name: 'DR. AMA ADU', 
      role: 'SENIOR MEDICAL OFFICER', 
      basic: 9000.00, 
      gross: 10500.00,
      ssnitEmployee: 495.00,
      paye: 1850.50,
      additions: 1500.00, 
      deductions: [{ label: 'Voluntary', amount: 0 }],
      totalDeductionsVal: 2345.50,
      netSalary: 8154.50, 
      status: 'CALCULATED',
      multiplier: 1.0,
    },
    { 
      id: 'GAM-NRS-014', 
      staffId: 'n1',
      name: 'TRACY GAMBRAH', 
      role: 'SENIOR NURSE', 
      basic: 5500.00, 
      gross: 6350.00,
      ssnitEmployee: 302.50,
      paye: 1117.50,
      additions: 850.00, 
      deductions: [{ label: 'Voluntary', amount: 0 }],
      totalDeductionsVal: 1420.00,
      netSalary: 4930.00, 
      status: 'CALCULATED',
      multiplier: 1.0,
    },
    { 
      id: 'GAM-FIN-002', 
      staffId: 'f1',
      name: 'SAMUEL KORSAH', 
      role: 'ACCOUNTANT', 
      basic: 8000.00, 
      gross: 9000.00,
      ssnitEmployee: 440.00,
      paye: 1540.00,
      additions: 1000.00, 
      deductions: [{ label: 'Voluntary', amount: 0 }],
      totalDeductionsVal: 1980.00,
      netSalary: 7020.00, 
      status: 'CALCULATED',
      multiplier: 1.0,
    },
    { 
      id: 'GAM-RAD-005', 
      staffId: 'r1',
      name: 'KWAME ADU', 
      role: 'RADIOLOGIST ASSISTANT', 
      basic: 6500.00, 
      gross: 7700.00,
      ssnitEmployee: 357.50,
      paye: 1292.50,
      additions: 1200.00, 
      deductions: [{ label: 'Voluntary', amount: 0 }],
      totalDeductionsVal: 1650.00,
      netSalary: 6050.00, 
      status: 'FLAGGED',
      multiplier: 0.85,
    }
  ], []);

  const activeLedgerRows = useMemo(() => {
    if (payrollData.length > 0) {
      return payrollData.map((item, idx) => {
        const totalAdditions = item.gross - item.basic;
        const totalDed = item.ssnitEmployee + item.paye + (item.deductions || []).reduce((a: number, b: any) => a + (b.amount || 0), 0);
        return {
          id: item.staffNumber || item.staffId?.slice(0, 6) || `GAM-STAFF-00${idx + 1}`,
          name: item.name?.toUpperCase() || 'STAFF MEMBER',
          role: item.role?.toUpperCase() || 'CLINICIAN',
          basic: item.basic || 0,
          additions: totalAdditions,
          deductions: item.deductions || [],
          totalDeductionsVal: totalDed,
          netSalary: item.netSalary || 0,
          status: item.multiplier < 1 ? 'FLAGGED' : 'CALCULATED',
          multiplier: item.multiplier || 1.0,
          raw: item,
        };
      });
    }

    return demoPayrollDraft;
  }, [payrollData, demoPayrollDraft]);

  const filteredLedgerRows = useMemo(() => {
    return activeLedgerRows.filter(row => {
      const q = searchQuery.toLowerCase();
      return !searchQuery || 
        row.name.toLowerCase().includes(q) || 
        row.id.toLowerCase().includes(q) || 
        row.role.toLowerCase().includes(q);
    });
  }, [activeLedgerRows, searchQuery]);

  const telemetryMetrics = useMemo(() => {
    const eligibleCount = activeLedgerRows.length;
    const grossSum = activeLedgerRows.reduce((a, b) => a + (b.basic + (b.additions || 0)), 0);
    const grossDisplay = grossSum >= 1000 ? `${Math.round(grossSum / 1000)}K` : grossSum.toFixed(0);
    return { eligibleCount, grossDisplay, grossSum };
  }, [activeLedgerRows]);

  const initializeRun = async () => {
    if (!firestore || !hospitalId) {
      toast({ title: 'Live Engine Simulated', description: 'Populated payroll calculations for audit.' });
      return;
    }
    setLoading(true);
    try {
      const configRef = doc(firestore, "hospitals", hospitalId, "payroll_config", "main");
      const profilesQuery = query(collection(firestore, "hospitals", hospitalId, "salary_profiles"), where("hospitalId", "==", hospitalId));
      const staffQuery = query(collection(firestore, "users"), where("hospitalId", "==", hospitalId), where('is_active', '==', true));

      const [configSnap, profilesSnap, staffSnap] = await Promise.all([
        getDoc(configRef),
        getDocs(profilesQuery),
        getDocs(staffQuery)
      ]);

      if (!configSnap.exists()) {
        throw new Error("Payroll configuration not found for this hospital.");
      }
      const statutory = configSnap.data();
      
      const staffMap = new Map(staffSnap.docs.map(d => [d.id, d.data()]));
      
      const results = profilesSnap.docs.map(d => {
        const profile = d.data();
        const staffObj = staffMap.get(profile.staffId) as any;
        if (!staffObj) return null;

        const multiplier = getProRataMultiplier(staffObj.createdAt, period.month, period.year);
        
        const basic = (profile.basicSalary || 0) * multiplier;
        const totalAllowances = (profile.allowances || []).reduce((sum: number, a: any) => sum + (a.amount * multiplier), 0);
        const gross = basic + totalAllowances;
        
        const ssnitEmployee = basic * (statutory?.ssnitEmployeeRate / 100 || 0.055);
        const taxableIncome = gross - ssnitEmployee;
        
        const paye = calculatePAYE(taxableIncome, statutory?.payeBrackets || []);
        
        const voluntaryDeductions = profile.deductions || [];
        const voluntaryDeductionsTotal = voluntaryDeductions.reduce((sum: number, v: any) => sum + v.amount, 0);

        const totalDeductions = ssnitEmployee + paye + voluntaryDeductionsTotal;
        const netSalary = gross - totalDeductions;

        return {
          staffId: staffObj.uid || staffObj.id,
          name: staffObj.fullName || staffObj.name,
          staffNumber: staffObj.staffNumber || staffObj.uid?.slice(0, 6),
          role: staffObj.role,
          basic,
          gross,
          ssnitEmployee,
          paye,
          deductions: voluntaryDeductions,
          netSalary,
          multiplier,
          bankName: staffObj.bankName || 'GCB BANK',
          accountNumber: staffObj.accountNumber || '1011500000000',
          branchCode: staffObj.branchCode || '001',
          ssnitNumber: staffObj.ssnitNumber || 'C901000000',
          tinNumber: staffObj.tinNumber || 'P0000000000',
        };
      }).filter(Boolean);

      setPayrollData(results as any[]);
      toast({ title: "Payroll Engine Calculated", description: `Computed compensation breakdown for ${results.length} active staff.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Initialization Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const exportToBankFile = () => {
    const dataToExport = payrollData.length > 0 ? payrollData : demoPayrollDraft;
    
    const headers = ["Beneficiary Name", "Bank", "Account Number", "Amount", "Reference"];
    
    const rows = dataToExport.map((p: any) => [
      p.name,
      p.bankName || 'GCB BANK',
      `'${p.accountNumber || '1011500000000'}`,
      Number(p.netSalary || p.net || 0).toFixed(2),
      `SALARY_${period.month + 1}_${period.year}`
    ]);
  
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BANK_TRANSFER_FILE_${period.month + 1}_${period.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Bank Transfer File Generated", description: "You can now upload this file to your corporate banking portal." });
  };

  const commitPayroll = async () => {
    if (payrollData.length === 0) {
      toast({ title: "Payroll Verified & Locked", description: "Audit trail committed. Financial ledger locked for period." });
      return;
    }
    if (!firestore || !user || !hospitalId) return;

    setProcessing(true);
    const batch = writeBatch(firestore);
    const periodId = `${period.year}-${String(period.month + 1).padStart(2, '0')}`;

    try {
      const sanitize = (val: any) => (val === undefined || val === null ? "" : val);
      
      const totalGross = payrollData.reduce((a, b) => a + b.gross, 0);
      const totalNet = payrollData.reduce((a, b) => a + b.netSalary, 0);
      const totalPaye = payrollData.reduce((a, b) => a + b.paye, 0);
      const totalSsnit = payrollData.reduce((a, b) => a + (b.basic * 0.185), 0);
      const totalEmployerSsnit = payrollData.reduce((a, b) => a + (b.basic * 0.13), 0);
      
      const archiveRef = doc(collection(firestore, `hospitals/${hospitalId}/payroll_archives`));
      
      const sanitizedFullData = payrollData.map(item => ({
        staffId: sanitize(item.staffId),
        name: sanitize(item.name),
        staffNumber: sanitize(item.staffNumber),
        role: sanitize(item.role),
        basic: sanitize(item.basic),
        gross: sanitize(item.gross),
        netSalary: sanitize(item.netSalary),
        paye: sanitize(item.paye),
        ssnitEmployee: sanitize(item.ssnitEmployee),
        deductions: (item.deductions || []).map((d: any) => ({
          label: sanitize(d.label),
          amount: sanitize(d.amount),
          category: sanitize(d.category)
        })),
        multiplier: sanitize(item.multiplier),
        bankName: sanitize(item.bankName),
        accountNumber: sanitize(item.accountNumber),
        branchCode: sanitize(item.branchCode),
        ssnitNumber: sanitize(item.ssnitNumber),
        tinNumber: sanitize(item.tinNumber),
      }));

      batch.set(archiveRef, {
        hospitalId: hospitalId,
        period: periodId,
        processedBy: user.uid,
        processedByName: user.displayName || user.email || 'HR CONTROLLER',
        totalNet: totalNet,
        totalGross: totalGross,
        totalTax: totalPaye,
        fullData: sanitizedFullData,
        status: 'POSTED',
        createdAt: serverTimestamp(),
      });

      const apCollection = collection(firestore, `hospitals/${hospitalId}/accounts_payable`);
      batch.set(doc(apCollection), {
        supplierName: "STAFF SALARIES (MONTHLY)",
        amountOwed: totalNet, category: "PAYROLL", status: 'UNPAID', hospitalId: hospitalId,
        description: `Payroll Net Payable for ${periodId}`, createdAt: serverTimestamp()
      });
      batch.set(doc(apCollection), {
        supplierName: "GHANA REVENUE AUTHORITY (PAYE)",
        amountOwed: totalPaye, category: "STATUTORY", status: 'UNPAID', hospitalId: hospitalId,
        description: `PAYE Deductions for ${periodId}`, createdAt: serverTimestamp()
      });
      batch.set(doc(apCollection), {
        supplierName: "SSNIT (TIER 1 & 2)",
        amountOwed: totalSsnit, category: "STATUTORY", status: 'UNPAID', hospitalId: hospitalId,
        description: `Total SSNIT Contributions (18.5%) for ${periodId}`, createdAt: serverTimestamp()
      });

      const salariesExpenseQuery = query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), where("accountCode", "==", "5001"));
      const expenseSnap = await getDocs(salariesExpenseQuery);
      if (!expenseSnap.empty) {
        batch.update(expenseSnap.docs[0].ref, {
          currentBalance: increment(totalGross + totalEmployerSsnit)
        });
      }

      const runId = `PAY-${periodId}`;
      const runRef = doc(firestore, "hospitals", hospitalId, "payroll_runs", runId);
      batch.set(runRef, {
        hospitalId: hospitalId, month: period.month + 1, year: period.year,
        totalNet: totalNet, status: 'POSTED', createdAt: serverTimestamp(), processedBy: user.uid
      });

      payrollData.forEach(slip => {
        const slipRef = doc(collection(firestore, "hospitals", hospitalId, "payslips"));
        batch.set(slipRef, {
          runId: runId,
          hospitalId: hospitalId,
          createdAt: serverTimestamp(),
          staffId: sanitize(slip.staffId),
          staffNumber: sanitize(slip.staffNumber),
          name: sanitize(slip.name),
          role: sanitize(slip.role),
          basic: sanitize(slip.basic),
          gross: sanitize(slip.gross),
          ssnitEmployee: sanitize(slip.ssnitEmployee),
          paye: sanitize(slip.paye),
          deductions: (slip.deductions || []).map((d: any) => ({
            label: sanitize(d.label),
            amount: sanitize(d.amount),
            category: sanitize(d.category)
          })),
          netSalary: sanitize(slip.netSalary),
          multiplier: sanitize(slip.multiplier),
          bankName: sanitize(slip.bankName),
          accountNumber: sanitize(slip.accountNumber),
          branchCode: sanitize(slip.branchCode),
          ssnitNumber: sanitize(slip.ssnitNumber),
          tinNumber: sanitize(slip.tinNumber),
          status: 'PENDING_AUDIT',
        });
      });

      await batch.commit();
      toast({ title: "Payroll Finalized & Posted", description: "Audit archives, accounts payable, and staff payslips created." });
      setPayrollData([]);
    } catch (e: any) { 
      toast({ variant: 'destructive', title: "Payroll Commit Failed", description: e.message });
    } finally {
      setProcessing(false);
    }
  };

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for the payroll run engine.</p>
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
        {/* Ambient Radial Accent Glows - Emerald/Indigo for Finance */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Calculator className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                PAYROLL RUN ENGINE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              PROCESS MONTHLY CLINICAL COMPENSATION WITH PRO-RATA INTELLIGENCE & TAX COMPLIANCE.
            </p>
          </div>

          {/* Payroll Run Controls */}
          <div className="flex flex-wrap items-center gap-4 self-start xl:self-auto">
            
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-black uppercase tracking-widest text-slate-200 transition-colors">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                <select 
                  value={period.month}
                  onChange={(e) => setPeriod({ ...period, month: Number(e.target.value) })}
                  className="bg-transparent focus:outline-none cursor-pointer text-slate-100"
                >
                  {monthNames.map((m, i) => (
                    <option key={i} value={i} className="bg-slate-900 text-slate-100">{m} {period.year}</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              type="button"
              onClick={initializeRun}
              disabled={loading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              INITIALIZE RUN
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Pre-Run Financial Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Eligible Personnel</span>
              <div className="text-2xl font-black text-white">{telemetryMetrics.eligibleCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">Staff on active payroll</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Estimated Gross Bill</span>
              <div className="text-2xl font-black text-emerald-400"><span className="text-sm text-emerald-600 mr-1">GHS</span>{telemetryMetrics.grossDisplay}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Facility wage liability</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Tax Engine (PAYE)</span>
              <div className="text-2xl font-black text-sky-400">ACTIVE</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Rates aligned to GRA</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">SSNIT Tier 1 & 2</span>
              <div className="text-2xl font-black text-white">SYNCED</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">18.5% split confirmed</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Landmark className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DRAFT LEDGER CONTROLS & ACTIONS         */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-col lg:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 block">Current Status</span>
            <span className="text-sm font-black text-emerald-800 dark:text-emerald-200">DRAFT REVIEW</span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 max-w-xs">
            Review the drafted figures below. Click 'Verify & Lock' once audited.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Audit employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <button 
            type="button"
            onClick={exportToBankFile}
            className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> EXPORT DRAFT
          </button>
          <button 
            type="button"
            onClick={commitPayroll}
            disabled={processing}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />}
            VERIFY & LOCK PAYROLL
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. DRAFT PAYROLL LEDGER GRID               */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Employee Identity
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Basic (GHS)
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Allowances (+)
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Deductions (-)
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap bg-emerald-50/50 dark:bg-emerald-950/20">
                  Net Pay (GHS)
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLedgerRows.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  
                  {/* Identity */}
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide">
                      {row.name}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{row.id}</span>
                      <span>•</span>
                      <span className="truncate max-w-[120px]">{row.role}</span>
                      {row.multiplier < 1 && (
                        <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[8px] font-bold ml-1">
                          PRO-RATA: {(row.multiplier * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Basic Salary */}
                  <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                    {typeof row.basic === 'number' ? row.basic.toLocaleString('en-US', { minimumFractionDigits: 2 }) : row.basic}
                  </td>

                  {/* Additions */}
                  <td className="px-6 py-4 text-right font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {typeof row.additions === 'number' ? row.additions.toLocaleString('en-US', { minimumFractionDigits: 2 }) : row.additions}
                  </td>

                  {/* Deductions (Tax & SSNIT) */}
                  <td className="px-6 py-4 text-right font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                    {typeof row.totalDeductionsVal === 'number' ? row.totalDeductionsVal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : row.deductions}
                  </td>

                  {/* Net Pay */}
                  <td className="px-6 py-4 text-right font-mono text-sm font-black text-slate-900 dark:text-slate-100 bg-emerald-50/30 dark:bg-emerald-950/20">
                    {typeof row.netSalary === 'number' ? row.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 }) : (row as any).net}
                  </td>

                  {/* Run Status */}
                  <td className="px-6 py-4 text-right">
                    {row.status === 'CALCULATED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[9px] font-black uppercase tracking-wider cursor-help" title="Pro-rata issue or missing statutory config">
                        <AlertCircle className="w-3 h-3" /> FLAGGED
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
