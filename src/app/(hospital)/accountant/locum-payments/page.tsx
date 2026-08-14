'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  Stethoscope, Wallet, Receipt, Clock, Search, Filter, 
  CheckCircle2, FileText, Calculator, UserCheck, 
  CalendarDays, Loader2, ShieldAlert, AlertTriangle, Layers, CheckSquare, Square
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

type LocumVoucher = {
  id: string;
  staffId: string;
  name: string;
  role: string;
  tin?: string;
  totalHours: number;
  derivedRate: number;
  grossPayable: number;
  whtAmount: number;
  netPayable: number;
  shifts: Array<{ id: string; date: string; type: string; duration: string; raw?: any }>;
  status: string;
  rawShifts?: any[];
};

export default function LocumPaymentsHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('UNPAID');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'HR_MANAGER', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  // Fetch unpaid locum attendance logs
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/attendance_logs`),
      where("contractType", "==", "LOCUM"),
      where("paymentStatus", "==", "UNPAID")
    );
  }, [firestore, hospitalId]);
  const { data: unpaidLogs, isLoading: logsLoading } = useCollection(attendanceQuery);

  // Fetch salary profiles
  const salariesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/salary_profiles`));
  }, [firestore, hospitalId]);
  const { data: salaryProfiles, isLoading: salariesLoading } = useCollection(salariesQuery);

  // Demodata Fallback for Immediate Statutory Locum Demonstration
  const demoVouchers: LocumVoucher[] = useMemo(() => [
    {
      id: 'LOC-DOC-089',
      staffId: 'd1',
      name: 'DR. JAMES OBREMPONG',
      role: 'LOCUM MEDICAL OFFICER',
      tin: 'C0001920412', // Valid GRA TIN
      totalHours: 3.63,
      derivedRate: 46.88,
      grossPayable: 169.93,
      whtAmount: 12.74, // 7.5% WHT
      netPayable: 157.19,
      shifts: [
        { id: 's1', date: '14th Jun, 2026', type: 'MORNING SHIFT', duration: '1.81 Hrs' },
        { id: 's2', date: '14th Jun, 2026', type: 'AFTERNOON SHIFT', duration: '1.82 Hrs' }
      ],
      status: 'PENDING VOUCHER'
    },
    {
      id: 'LOC-NRS-042',
      staffId: 'n1',
      name: 'TRACY GAMBRAH',
      role: 'FREELANCE LOCUM NURSE',
      tin: 'C0008829104', // Valid GRA TIN
      totalHours: 12.00,
      derivedRate: 25.00,
      grossPayable: 300.00,
      whtAmount: 22.50, // 7.5% WHT
      netPayable: 277.50,
      shifts: [
        { id: 's3', date: '15th Jun, 2026', type: 'NIGHT SHIFT', duration: '12.00 Hrs' }
      ],
      status: 'PENDING VOUCHER'
    },
    {
      id: 'LOC-DOC-099',
      staffId: 'd2',
      name: 'DR. SAMUEL KPONOR',
      role: 'LOCUM ICU INTENSIVIST',
      tin: undefined, // MISSING TIN
      totalHours: 24.00,
      derivedRate: 90.00,
      grossPayable: 2160.00,
      whtAmount: 162.00, // 7.5% WHT
      netPayable: 1998.00,
      shifts: [
        { id: 's4', date: '13th Jun, 2026', type: 'WEEKEND ICU COVER', duration: '24.00 Hrs' }
      ],
      status: 'PENDING VOUCHER'
    }
  ], []);

  // Process raw Firestore logs into statutory WHT vouchers
  const locumPayrollData: LocumVoucher[] = useMemo(() => {
    if (unpaidLogs && unpaidLogs.length > 0 && salaryProfiles) {
      const logsByStaff = unpaidLogs.reduce((acc, log) => {
        const staffId = log.staffId;
        if (!acc[staffId]) acc[staffId] = [];
        acc[staffId].push(log);
        return acc;
      }, {} as Record<string, any[]>);

      return Object.entries(logsByStaff).map(([staffId, shifts]) => {
        const typedShifts = shifts as any[];
        const staffName = (typedShifts[0]?.staffName || 'UNKNOWN LOCUM').toUpperCase();
        const staffRole = (typedShifts[0]?.specialty || typedShifts[0]?.role || 'LOCUM CLINICIAN').toUpperCase();
        const salaryInfo = salaryProfiles.find(p => p.staffId === staffId);
        
        const basicSalary = Number(salaryInfo?.basicSalary) || 0;
        const hourlyRateRaw = basicSalary > 0 
          ? (basicSalary / 192) 
          : (Number(salaryInfo?.hourlyRate) || 80);

        const totalHoursRaw = typedShifts.reduce((sum, shift) => sum + (Number(shift.hoursWorked) || 0), 0);
        const grossRaw = totalHoursRaw * hourlyRateRaw;
        const whtRaw = grossRaw * 0.075;
        const netRaw = grossRaw - whtRaw;

        const formattedShifts = typedShifts.map((s, sIdx) => {
          let dateStr = 'N/A';
          if (s.clockInTime?.toDate) {
            dateStr = format(s.clockInTime.toDate(), 'do MMM, yyyy');
          }
          const durRaw = Number(s.hoursWorked || 0);
          return {
            id: s.id || `shift-${sIdx}`,
            date: dateStr,
            type: (s.shiftName || 'GENERAL SHIFT').toUpperCase(),
            duration: `${durRaw.toFixed(2)} Hrs`,
            raw: s,
          };
        });

        return {
          id: `LOC-${staffId.slice(0, 6).toUpperCase()}`,
          staffId,
          name: staffName,
          role: staffRole,
          tin: salaryInfo?.tin || typedShifts[0]?.tin,
          totalHours: Number(totalHoursRaw.toFixed(2)),
          derivedRate: Number(hourlyRateRaw.toFixed(2)),
          grossPayable: Number(grossRaw.toFixed(2)),
          whtAmount: Number(whtRaw.toFixed(2)),
          netPayable: Number(netRaw.toFixed(2)),
          shifts: formattedShifts,
          status: 'PENDING VOUCHER',
          rawShifts: typedShifts,
        };
      });
    }

    return demoVouchers;
  }, [unpaidLogs, salaryProfiles, demoVouchers]);

  const filteredVouchers = useMemo(() => {
    return locumPayrollData.filter(v => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || 
        v.name.toLowerCase().includes(q) || 
        v.id.toLowerCase().includes(q) || 
        v.role.toLowerCase().includes(q);

      if (!matchQuery) return false;
      if (activeFilter === 'PROCESSED' && v.status !== 'GENERATED / PAID') return false;
      return true;
    });
  }, [locumPayrollData, searchQuery, activeFilter]);

  const telemetryMetrics = useMemo(() => {
    const pendingCount = locumPayrollData.length;
    const grossSum = locumPayrollData.reduce((sum, v) => sum + v.grossPayable, 0);
    const whtSum = locumPayrollData.reduce((sum, v) => sum + v.whtAmount, 0);
    const netSum = locumPayrollData.reduce((sum, v) => sum + v.netPayable, 0);
    const missingTinCount = locumPayrollData.filter(v => !v.tin).length;

    return {
      pendingCount,
      grossSum,
      whtSum,
      netSum,
      missingTinCount,
    };
  }, [locumPayrollData]);

  const toggleSelectVoucher = (id: string) => {
    setSelectedVoucherIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedVoucherIds.length === locumPayrollData.length) {
      setSelectedVoucherIds([]);
    } else {
      setSelectedVoucherIds(locumPayrollData.map(v => v.id));
    }
  };

  const processLocumPay = async (locumData: LocumVoucher) => {
    if (!locumData.tin) {
      toast({
        variant: "destructive",
        title: "Disbursement Blocked",
        description: `Cannot generate PV for ${locumData.name}. Missing GRA Tax Identification Number (TIN).`
      });
      return;
    }

    setProcessingId(locumData.staffId);

    try {
      if (firestore && hospitalId) {
        const functions = getFunctions();
        const locumFn = httpsCallable(functions, 'processLocumShiftDisbursement');

        const shiftIds = locumData.shifts.map(s => s.id);

        const res: any = await locumFn({
          hospitalId,
          locumStaffId: locumData.staffId,
          staffName: locumData.name,
          totalHours: locumData.totalHours,
          derivedRate: locumData.derivedRate,
          shiftIds
        });

        toast({
          title: "Statutory Locum PV Created",
          description: res.data?.message || `PV generated for ${locumData.name}. Net: GHS ${locumData.netPayable.toFixed(2)}, GRA 7.5% WHT: GHS ${locumData.whtAmount.toFixed(2)}.`
        });
      } else {
        toast({
          title: "Locum PV Generated (Simulation)",
          description: `Generated PV for ${locumData.name}. Gross: GHS ${locumData.grossPayable.toFixed(2)}, WHT 7.5%: GHS ${locumData.whtAmount.toFixed(2)}, Net: GHS ${locumData.netPayable.toFixed(2)}.`
        });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Voucher Generation Failed", description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  const processBatchLocumPay = async () => {
    if (selectedVoucherIds.length === 0) return;
    setIsBatchProcessing(true);

    try {
      const eligibleVouchers = locumPayrollData.filter(v => selectedVoucherIds.includes(v.id) && v.tin);
      
      if (eligibleVouchers.length === 0) {
        toast({
          variant: "destructive",
          title: "Batch Generation Failed",
          description: "All selected clinicians are missing GRA TINs. Update profiles to proceed."
        });
        return;
      }

      toast({
        title: "Batch Voucher Processing Initiated",
        description: `Processing ${eligibleVouchers.length} locum disbursements with 7.5% GRA WHT deductions...`
      });

      for (const v of eligibleVouchers) {
        await processLocumPay(v);
      }

      setSelectedVoucherIds([]);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || logsLoading || salariesLoading;
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Locum Shift Disbursement.</p>
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
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                LOCUM DOCTOR & SHIFT DISBURSEMENT ENGINE
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CONSOLIDATED SHIFT ACCRUALS, STATUTORY 7.5% GRA WITHHOLDING TAX, AND AUTOMATED DOUBLE-ENTRY JOURNAL SPLIT.
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

        {/* Bottom Row / Contextual Locum Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Gross Locum Liability</span>
              <div className="text-xl font-black text-white font-mono">
                ₵ {telemetryMetrics.grossSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">{telemetryMetrics.pendingCount} Pending Vouchers</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Calculator className="w-5 h-5 text-indigo-400" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">GRA 7.5% WHT Withheld</span>
              <div className="text-xl font-black text-amber-400 font-mono">
                ₵ {telemetryMetrics.whtSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-amber-400 mt-0.5 block">Statutory Tax Reserve</span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Net Payable to Clinicians</span>
              <div className="text-xl font-black text-emerald-400 font-mono">
                ₵ {telemetryMetrics.netSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">After WHT Deduction</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-rose-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Compliance Holds</span>
              <div className="text-xl font-black text-rose-400 font-mono">{telemetryMetrics.missingTinCount} Missing TIN</div>
              <span className="text-[10px] font-bold text-rose-400 mt-0.5 block">Disbursement Blocked</span>
            </div>
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. ACTION BAR & BATCH PROCESSOR            */}
      {/* ========================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
          >
            {selectedVoucherIds.length === locumPayrollData.length ? (
              <CheckSquare className="w-4 h-4 text-emerald-500" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Select All ({locumPayrollData.length})</span>
          </button>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search clinician name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={processBatchLocumPay}
            disabled={selectedVoucherIds.length === 0 || isBatchProcessing}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer flex items-center gap-2"
          >
            {isBatchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            <span>BATCH GENERATE VOUCHERS ({selectedVoucherIds.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. CONSOLIDATED LOCUM DISBURSEMENT CARDS   */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredVouchers.map((voucher) => {
          const isSelected = selectedVoucherIds.includes(voucher.id);
          const isMissingTin = !voucher.tin;

          return (
            <div
              key={voucher.id}
              className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all p-6 space-y-4 shadow-sm relative overflow-hidden ${
                isMissingTin
                  ? 'border-rose-300 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10'
                  : isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSelectVoucher(voucher.id)}
                    className="cursor-pointer text-slate-400 hover:text-emerald-500"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div>
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-base uppercase">
                      {voucher.name}
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                      {voucher.role} • {voucher.id}
                    </span>
                  </div>
                </div>

                {isMissingTin ? (
                  <span className="px-3 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-black text-[9px] uppercase rounded-lg border border-rose-300 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-500" /> MISSING TIN
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-[9px] uppercase rounded-lg border border-emerald-300 font-mono">
                    TIN: {voucher.tin}
                  </span>
                )}
              </div>

              {/* Shift Attendance Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                  <span>Shift Date & Type</span>
                  <span>Duration</span>
                </div>
                {voucher.shifts.map((s) => (
                  <div key={s.id} className="flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-slate-800 dark:text-slate-200">{s.date}</span>
                      <span className="text-[9px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded uppercase">
                        {s.type}
                      </span>
                    </div>
                    <span className="font-mono text-slate-600 dark:text-slate-400">{s.duration}</span>
                  </div>
                ))}
              </div>

              {/* Statutory Tax Breakdown */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-400 uppercase text-[10px] font-black">Gross Accrued ({voucher.totalHours.toFixed(2)} hrs @ ₵{voucher.derivedRate.toFixed(2)}):</span>
                  <span className="font-black text-white">₵ {voucher.grossPayable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-mono text-amber-400 border-t border-slate-800 pt-1.5">
                  <span className="uppercase text-[10px] font-black">Less 7.5% GRA Statutory WHT:</span>
                  <span className="font-black">- ₵ {voucher.whtAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-mono text-emerald-400 border-t border-slate-800 pt-1.5 text-sm font-black">
                  <span className="uppercase text-[10px] font-black">Net Payable to Clinician:</span>
                  <span>₵ {voucher.netPayable.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Control */}
              <button
                type="button"
                onClick={() => processLocumPay(voucher)}
                disabled={isMissingTin || processingId === voucher.staffId}
                className={`w-full py-3 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2 ${
                  isMissingTin
                    ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed border border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                }`}
              >
                {processingId === voucher.staffId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span>
                  {isMissingTin ? 'DISBURSEMENT RESTRICTED (MISSING TIN)' : 'GENERATE STATUTORY PAYMENT VOUCHER'}
                </span>
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
