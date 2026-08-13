'use client';

import { useState, useMemo, Suspense } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  FileSpreadsheet, Download, CheckCircle2, ShieldCheck, 
  Calculator, Search, Filter, Printer, FileCheck2, 
  AlertCircle, Building2, CalendarDays, Loader2, ShieldAlert
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

function SchedulesContent() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialType = searchParams.get('type');
  const initialMonth = searchParams.get('month');
  const initialYear = searchParams.get('year');
  
  const [reportType, setReportType] = useState<string>(initialType || 'SSNIT');
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>('AUGUST 2026');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [period, setPeriod] = useState({ 
    month: initialMonth ? Number(initialMonth) : new Date().getMonth() + 1, 
    year: initialYear ? Number(initialYear) : new Date().getFullYear() 
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId || 'GAM-GAR-7578';
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const deductionItemsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payroll_items`), where("type", "==", "DEDUCTION"));
  }, [firestore, hospitalId]);
  const { data: deductionItems, isLoading: areItemsLoading } = useCollection(deductionItemsQuery);

  const runId = `PAY-${period.year}-${String(period.month).padStart(2, '0')}`;

  const runRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, `hospitals/${hospitalId}/payroll_runs`, runId);
  }, [firestore, hospitalId, runId]);
  const { data: currentRun, isLoading: isRunLoading } = useDoc(runRef);

  const payslipsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payslips`), where("runId", "==", runId));
  }, [firestore, hospitalId, runId]);
  const { data: payslipData, isLoading: areSlipsLoading } = useCollection(payslipsQuery);

  const demoRawData = useMemo(() => [
    { id: 'EMP-01', name: 'SAMUEL KORSAH', ssnit: 'C901000045', basic: 8000.00 },
    { id: 'EMP-02', name: 'MARCUS AMOSAH HENAKU', ssnit: 'C901000089', basic: 15000.00 },
    { id: 'EMP-03', name: 'JOHN VITALIS', ssnit: 'C901000012', basic: 9500.00 },
    { id: 'EMP-04', name: 'JAMES OBREMPONG', ssnit: 'C901000034', basic: 8500.00 }, // Defensive calculation fix
    { id: 'EMP-05', name: 'PHILLAPA FRIMPONG', ssnit: 'C901000055', basic: 5500.00 },
    { id: 'EMP-06', name: 'JASMINE GAMBRAH', ssnit: 'C901000067', basic: 5500.00 },
    { id: 'EMP-07', name: 'KWAME ADU', ssnit: 'C901000023', basic: 4500.00 },
    { id: 'EMP-08', name: 'DR. AMA ADU', ssnit: 'C901000099', basic: 9000.00 },
  ], []);

  // Defensive calculation helper to prevent NaN errors
  const safeNumber = (val: any) => (isNaN(Number(val)) || val === null || val === undefined ? 0 : Number(val));

  const scheduleData = useMemo(() => {
    if (payslipData && payslipData.length > 0) {
      if (reportType === 'SSNIT' || reportType.includes('SSNIT')) {
        return payslipData.map((s: any) => {
          const b = safeNumber(s.basic);
          return {
            id: s.staffNumber || s.staffId?.slice(0, 6) || 'EMP-01',
            name: (s.name || "UNKNOWN STAFF").toUpperCase(),
            ssnit: s.ssnitNumber || 'C901000000',
            basic: b,
            payable: b * 0.185,
          };
        });
      }

      if (reportType === 'GRA' || reportType.includes('GRA')) {
        return payslipData.map((s: any) => {
          const b = safeNumber(s.gross || s.basic);
          const paye = safeNumber(s.paye);
          return {
            id: s.staffNumber || s.staffId?.slice(0, 6) || 'EMP-01',
            name: (s.name || "UNKNOWN STAFF").toUpperCase(),
            ssnit: s.tinNumber || 'P0000000000',
            basic: b,
            payable: paye,
          };
        });
      }

      return payslipData.map((slip: any) => {
        const specD = (slip.deductions || []).find(
          (d: any) => d.label?.trim().toUpperCase() === reportType.trim().toUpperCase()
        );
        const b = safeNumber(slip.basic);
        const amt = safeNumber(specD?.amount);
        return {
          id: slip.staffNumber || slip.staffId?.slice(0, 6) || 'EMP-01',
          name: (slip.name || "UNKNOWN STAFF").toUpperCase(),
          ssnit: slip.staffNumber || 'REF-001',
          basic: b,
          payable: amt,
        };
      });
    }

    return demoRawData.map(row => {
      const basic = safeNumber(row.basic);
      const payable = basic * 0.185;
      return { ...row, basic, payable };
    });
  }, [payslipData, reportType, demoRawData]);

  const filteredScheduleData = useMemo(() => {
    return scheduleData.filter(row => {
      const q = searchQuery.toLowerCase();
      return !searchQuery || row.name.toLowerCase().includes(q) || row.ssnit.toLowerCase().includes(q) || row.id.toLowerCase().includes(q);
    });
  }, [scheduleData, searchQuery]);

  const totalBasic = useMemo(() => filteredScheduleData.reduce((sum, row) => sum + row.basic, 0), [filteredScheduleData]);
  const totalPayable = useMemo(() => filteredScheduleData.reduce((sum, row) => sum + row.payable, 0), [filteredScheduleData]);

  const exportToCsv = () => {
    const headers = ["Staff Identity", "SSNIT / Ref Number", "Basic Salary (GHS)", "Total Payable (GHS)"];
    const rows = filteredScheduleData.map(r => [
      `"${r.name}"`,
      `"${r.ssnit}"`,
      r.basic.toFixed(2),
      r.payable.toFixed(2)
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `REMITTANCE_SCHEDULE_${reportType}_${selectedMonthStr.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = isUserLoading || isProfileLoading || areItemsLoading || areSlipsLoading || isRunLoading;

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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to view remittance schedules.</p>
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
        {/* Ambient Radial Accent Glows - Emerald/Indigo for Finance Compliance */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                REMITTANCE SCHEDULES
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              STATUTORY DEDUCTION REPORTS, PENSION ROUTING, AND TAX SCHEDULE GENERATION.
            </p>
          </div>

          {/* Active User Context & Actions */}
          <div className="flex flex-wrap items-center gap-4 self-start xl:self-auto">
            
            {/* Filter embedded in banner */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-black uppercase tracking-widest text-slate-200 transition-colors">
                <Filter className="w-4 h-4 text-emerald-400" />
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer text-slate-100"
                >
                  <option value="SSNIT" className="bg-slate-900 text-slate-100">SSNIT TIER 1 & 2 (18.5%)</option>
                  <option value="GRA" className="bg-slate-900 text-slate-100">GRA PAYE TAX</option>
                  <option value="UNION" className="bg-slate-900 text-slate-100">GMA UNION DUES</option>
                  {deductionItems?.map((item: any) => (
                    <option key={item.id} value={item.label} className="bg-slate-900 text-slate-100">{item.label} ({item.category})</option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              type="button"
              onClick={exportToCsv}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" /> SUBMIT FOR AUDIT
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Compliance Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Staff on Schedule</span>
              <div className="text-2xl font-black text-white">{filteredScheduleData.length}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                Included in export
              </span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Liability ({reportType.includes('GRA') ? 'PAYE' : '18.5%'})</span>
              <div className="text-2xl font-black text-emerald-400"><span className="text-sm text-emerald-600 mr-1">GHS</span>{totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Sum payable to Trust</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-amber-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Clearance Status</span>
              <div className="text-2xl font-black text-amber-400">PENDING</div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 block">Awaiting Auditor Approval</span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Hospital ID (Employer)</span>
              <div className="text-xl font-black text-sky-400">{hospitalId}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified Account
              </span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. REPORT CONTROLS & EXPORT BAR            */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-col lg:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <select 
              value={selectedMonthStr}
              onChange={(e) => setSelectedMonthStr(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer text-slate-800 dark:text-slate-100"
            >
              <option value="AUGUST 2026" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">AUGUST 2026</option>
              <option value="SEPTEMBER 2026" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">SEPTEMBER 2026</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <button 
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> PRINT
          </button>
          <button 
            type="button"
            onClick={exportToCsv}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> EXPORT EXCEL / CSV
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. ENTERPRISE SCHEDULE LEDGER              */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Document Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 mb-2">
            {reportType.includes('SSNIT') ? 'SSNIT REMITTANCE SCHEDULE' : `${reportType} REMITTANCE SCHEDULE`}
          </h2>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            <span>HOSPITAL ID: <span className="text-indigo-600 dark:text-indigo-400">{hospitalId}</span></span>
            <span>•</span>
            <span>PERIOD: <span className="text-emerald-600 dark:text-emerald-400">{selectedMonthStr}</span></span>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                  Staff Identity
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                  SSNIT / Ref Number
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right whitespace-nowrap">
                  Basic Salary (GHS)
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Total Payable ({reportType.includes('GRA') ? 'PAYE' : '18.5%'})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredScheduleData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  
                  {/* Staff Name */}
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide">
                      {row.name}
                    </div>
                  </td>

                  {/* SSNIT Number */}
                  <td className="px-6 py-4">
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
                      {row.ssnit}
                    </span>
                  </td>

                  {/* Basic Salary */}
                  <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                    {row.basic.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Total Payable */}
                  <td className="px-6 py-4 text-right font-mono text-sm font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                    {row.payable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              
              {/* Summary Footer Row */}
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-300 dark:border-slate-700">
                <td colSpan={2} className="px-6 py-5 text-right font-black text-sm uppercase tracking-widest text-slate-600 dark:text-slate-300">
                  SCHEDULE TOTAL
                </td>
                <td className="px-6 py-5 text-right font-mono text-base font-black text-slate-900 dark:text-slate-100">
                  <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">GHS</span>
                  {totalBasic.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-5 text-right font-mono text-base font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 mr-1">GHS</span>
                  {totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default function RemittanceSchedules() {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center p-20"><Loader2 className="animate-spin h-16 w-16 text-emerald-500"/></div>}>
      <SchedulesContent />
    </Suspense>
  );
}
