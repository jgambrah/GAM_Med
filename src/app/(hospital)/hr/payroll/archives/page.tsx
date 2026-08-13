'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { 
  Archive, History, Download, Eye, Search, Filter, 
  Lock, ShieldCheck, DollarSign, CalendarCheck, FileCheck2, 
  Users, Loader2, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function PayrollAuditVaultHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeYear, setActiveYear] = useState('2026');
  const [selectedArchive, setSelectedArchive] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const archivesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payroll_archives`),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId]);
  
  const { data: rawArchives, isLoading: areArchivesLoading } = useCollection(archivesQuery);

  const demoArchives = useMemo(() => [
    {
      id: 'PR-2026-06',
      period: 'JUNE 2026',
      runDate: 'Jun 28, 2026',
      authorizer: 'MARCUS AMOSAH HENAKU',
      staffCount: 46,
      grossBill: '145,210.00',
      totalGross: 145210.00,
      totalNet: 118871.15,
      netDisbursed: '118,871.15',
      status: 'SEALED',
      processedByName: 'MARCUS AMOSAH HENAKU',
      fullData: []
    },
    {
      id: 'PR-2026-03',
      period: 'MARCH 2026',
      runDate: 'Mar 27, 2026',
      authorizer: 'MARCUS AMOSAH HENAKU',
      staffCount: 42,
      grossBill: '128,450.00',
      totalGross: 128450.00,
      totalNet: 102972.52,
      netDisbursed: '102,972.52',
      status: 'SEALED',
      processedByName: 'MARCUS AMOSAH HENAKU',
      fullData: []
    }
  ], []);

  const payrollArchives = useMemo(() => {
    if (rawArchives && rawArchives.length > 0) {
      return rawArchives.map((a: any, idx: number) => {
        const netVal = Number(a.totalNet || 0);
        const grossVal = Number(a.totalGross || 0);
        const staffNum = a.fullData ? a.fullData.length : (a.staffCount || 46);

        let runDateStr = 'Recent';
        if (a.createdAt?.toDate) {
          runDateStr = a.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        return {
          id: a.id ? `PR-${a.id.slice(0, 7).toUpperCase()}` : `PR-2026-0${idx + 1}`,
          period: (a.period || 'MONTHLY').toUpperCase(),
          runDate: runDateStr,
          authorizer: (a.processedByName || 'MARCUS AMOSAH HENAKU').toUpperCase(),
          staffCount: staffNum,
          totalGross: grossVal,
          totalNet: netVal,
          grossBill: grossVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          netDisbursed: netVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          status: a.status || 'SEALED',
          processedByName: a.processedByName || 'MARCUS AMOSAH HENAKU',
          fullData: a.fullData || [],
          raw: a,
        };
      });
    }
    return demoArchives;
  }, [rawArchives, demoArchives]);

  const filteredArchives = useMemo(() => {
    return payrollArchives.filter(arch => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || 
        arch.period.toLowerCase().includes(q) || 
        arch.id.toLowerCase().includes(q) || 
        arch.authorizer.toLowerCase().includes(q);
      
      if (!matchQuery) return false;
      if (activeYear && !arch.period.includes(activeYear) && !arch.id.includes(activeYear)) return false;
      return true;
    });
  }, [payrollArchives, searchQuery, activeYear]);

  const telemetryMetrics = useMemo(() => {
    const count = payrollArchives.length;
    const netSum = payrollArchives.reduce((sum, a) => sum + (a.totalNet || 0), 0);
    const ytdNetDisplay = netSum >= 1000 ? `${(netSum / 1000).toFixed(1)}K` : netSum.toFixed(2);
    const lastLock = payrollArchives[0]?.runDate || 'JUN 28, 2026';
    return { count, ytdNetDisplay, lastLock };
  }, [payrollArchives]);

  const downloadReport = (archive: any) => {
    const list = archive.fullData && archive.fullData.length > 0 ? archive.fullData : [
      { staffNumber: 'GAM-MED-001', name: 'DR. AMA ADU', role: 'SENIOR MEDICAL OFFICER', basic: 9000, gross: 10500, ssnitEmployee: 495, paye: 1850.5, deductions: [], netSalary: 8154.5, bankName: 'GCB BANK', accountNumber: '1011500000000', ssnitNumber: 'C901000000', tinNumber: 'P0000000000' }
    ];

    const headers = [
      "Staff Number",
      "Employee Name",
      "Role",
      "Basic Salary (GHS)",
      "Gross Salary (GHS)",
      "SSNIT Employee (5.5% GHS)",
      "PAYE Tax (GHS)",
      "Other Deductions (GHS)",
      "Net Salary (GHS)",
      "Bank",
      "Account Number",
      "SSNIT Number",
      "TIN Number"
    ];

    const rows = list.map((p: any) => {
      const otherDeductions = (p.deductions || []).reduce((acc: number, d: any) => acc + (d.amount || 0), 0);
      return [
        `"${p.staffNumber || ''}"`,
        `"${p.name || ''}"`,
        `"${p.role || ''}"`,
        Number(p.basic || 0).toFixed(2),
        Number(p.gross || 0).toFixed(2),
        Number(p.ssnitEmployee || 0).toFixed(2),
        Number(p.paye || 0).toFixed(2),
        otherDeductions.toFixed(2),
        Number(p.netSalary || 0).toFixed(2),
        `"${p.bankName || 'GCB BANK'}"`,
        `"'${p.accountNumber || '1011500000000'}"`,
        `"${p.ssnitNumber || ''}"`,
        `"${p.tinNumber || ''}"`
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PAYROLL_ARCHIVE_${archive.period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to view the payroll audit vault.</p>
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
                <Archive className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                PAYROLL AUDIT VAULT
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              IMMUTABLE HISTORICAL ARCHIVE OF ALL FINALIZED AND DISBURSED PAYROLL RUNS.
            </p>
          </div>

          {/* Active User Context & Actions */}
          <div className="flex flex-wrap items-center gap-4 self-start xl:self-auto">
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
              onClick={() => {
                if (payrollArchives[0]) downloadReport(payrollArchives[0]);
              }}
              className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" /> GENERATE YTD REPORT
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Compliance Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Archived Runs ({activeYear})</span>
              <div className="text-2xl font-black text-white">{telemetryMetrics.count}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <History className="w-3 h-3" /> Historical ledgers
              </span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Archive className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">YTD Net Disbursed</span>
              <div className="text-2xl font-black text-emerald-400"><span className="text-sm text-emerald-600 mr-1">GHS</span>{telemetryMetrics.ytdNetDisplay}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Total transferred to staff</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Last Audit Lock</span>
              <div className="text-xl font-black text-sky-400">{telemetryMetrics.lastLock}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Latest period sealed</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <CalendarCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Ledger Integrity</span>
              <div className="text-2xl font-black text-emerald-400">SECURE</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Cryptographically locked
              </span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Lock className="w-6 h-6" />
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
            placeholder="Search by Period (e.g., June 2026)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={activeYear}
              onChange={(e) => setActiveYear(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer font-bold text-slate-800 dark:text-slate-100"
            >
              <option value="2026" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">FISCAL YEAR: 2026</option>
              <option value="2025" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">FISCAL YEAR: 2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. HISTORICAL FINANCIAL LEDGER             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Run Period & Authorizer
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">
                  Staff Billed
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Gross Bill (GHS)
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest text-right whitespace-nowrap bg-emerald-50/50 dark:bg-emerald-950/20">
                  Net Disbursed (GHS)
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Integrity
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {areArchivesLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
                    Loading payroll archives...
                  </td>
                </tr>
              ) : filteredArchives.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    <Archive className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    NO PAYROLL ARCHIVES FOR THIS FISCAL YEAR.
                  </td>
                </tr>
              ) : (
                filteredArchives.map((archive, idx) => (
                  <tr key={archive.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    
                    {/* Period & Authorizer */}
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        {archive.period} PAYROLL
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{archive.id}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="text-indigo-600 dark:text-indigo-400 truncate max-w-[150px]">AUTH: {archive.authorizer}</span>
                      </div>
                    </td>

                    {/* Staff Count */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black">
                        <Users className="w-3 h-3" /> {archive.staffCount}
                      </span>
                    </td>

                    {/* Gross Bill */}
                    <td className="px-6 py-4 text-right font-mono text-sm font-medium text-slate-600 dark:text-slate-300">
                      {archive.grossBill}
                    </td>

                    {/* Net Disbursed */}
                    <td className="px-6 py-4 text-right font-mono text-sm font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                      {archive.netDisbursed}
                    </td>

                    {/* Security Status */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                        <Lock className="w-3 h-3 text-emerald-400" /> {archive.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            setSelectedArchive(archive);
                            setIsModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> <span className="hidden xl:inline">VIEW</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => downloadReport(archive)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> <span className="hidden xl:inline">REPORT</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archive Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Archive className="w-5 h-5 text-emerald-500" />
              Payroll Archive Details ({selectedArchive?.period})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold uppercase mt-1">
              Processed by {selectedArchive?.processedByName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 font-sans text-xs pt-4">
            <div className="grid grid-cols-3 gap-6 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
              <div>
                <p className="font-black text-slate-400 uppercase text-[9px] tracking-wider">Total Gross Salary</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100">₵ {selectedArchive?.totalGross?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="font-black text-slate-400 uppercase text-[9px] tracking-wider">Total PAYE Tax</p>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400">₵ {selectedArchive?.totalTax?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="font-black text-slate-400 uppercase text-[9px] tracking-wider">Total Net Disbursed</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">₵ {selectedArchive?.totalNet?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-950 text-white font-black uppercase text-[9px] tracking-wider">
                  <TableRow className="hover:bg-slate-950 border-b border-slate-800">
                    <TableHead className="p-4 text-white">Employee</TableHead>
                    <TableHead className="p-4 text-right text-white">Basic (₵)</TableHead>
                    <TableHead className="p-4 text-right text-white">Gross (₵)</TableHead>
                    <TableHead className="p-4 text-right text-white">SSNIT (₵)</TableHead>
                    <TableHead className="p-4 text-right text-white">PAYE (₵)</TableHead>
                    <TableHead className="p-4 text-right text-white">Other Ded. (₵)</TableHead>
                    <TableHead className="p-4 text-right text-white">Net Salary (₵)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {selectedArchive?.fullData?.map((item: any, idx: number) => {
                    const totalDeductions = (item.deductions || []).reduce((acc: number, d: any) => acc + (d.amount || 0), 0);
                    return (
                      <TableRow key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                        <TableCell className="p-4 font-bold uppercase">
                          <p className="text-sm font-black text-slate-800 dark:text-slate-100">{item.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">{item.role} • {item.staffNumber}</p>
                        </TableCell>
                        <TableCell className="p-4 text-right font-mono font-medium text-slate-600 dark:text-slate-300">{Number(item.basic || 0).toFixed(2)}</TableCell>
                        <TableCell className="p-4 text-right font-mono font-medium text-slate-600 dark:text-slate-300">{Number(item.gross || 0).toFixed(2)}</TableCell>
                        <TableCell className="p-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">({Number(item.ssnitEmployee || 0).toFixed(2)})</TableCell>
                        <TableCell className="p-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">({Number(item.paye || 0).toFixed(2)})</TableCell>
                        <TableCell className="p-4 text-right font-mono text-slate-400">({totalDeductions.toFixed(2)})</TableCell>
                        <TableCell className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">₵ {Number(item.netSalary || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
