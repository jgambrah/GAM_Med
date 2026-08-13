'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { 
  Stethoscope, Wallet, Receipt, Clock, Search, Filter, 
  CheckCircle2, FileText, Calculator, UserCheck, 
  CalendarDays, Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function LocumPaymentsHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('UNPAID');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  
  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'HR_MANAGER', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  // 1. Fetch unpaid locum attendance logs
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/attendance_logs`), 
      where("contractType", "==", "LOCUM"),
      where("paymentStatus", "==", "UNPAID")
    );
  }, [firestore, hospitalId]);
  const { data: unpaidLogs, isLoading: logsLoading } = useCollection(attendanceQuery);

  // 2. Fetch salary profiles
  const salariesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/salary_profiles`));
  }, [firestore, hospitalId]);
  const { data: salaryProfiles, isLoading: salariesLoading } = useCollection(salariesQuery);
  
  const demoVouchers = useMemo(() => [
    {
      id: 'LOC-DOC-089',
      staffId: 'd1',
      name: 'JAMES OBREMPONG',
      role: 'MEDICAL OFFICER',
      totalHours: 3.63,
      derivedRate: 46.88,
      grossPayable: 169.93,
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
      role: 'LOCUM NURSE',
      totalHours: 12.00,
      derivedRate: 25.00,
      grossPayable: 300.00,
      shifts: [
        { id: 's3', date: '15th Jun, 2026', type: 'NIGHT SHIFT', duration: '12.00 Hrs' }
      ],
      status: 'PENDING VOUCHER'
    }
  ], []);

  // 3. Process and group raw cloud data with strict 2-decimal rounding
  const locumPayrollData = useMemo(() => {
    if (unpaidLogs && unpaidLogs.length > 0 && salaryProfiles) {
      const logsByStaff = unpaidLogs.reduce((acc, log) => {
        const staffId = log.staffId;
        if (!acc[staffId]) {
          acc[staffId] = [];
        }
        acc[staffId].push(log);
        return acc;
      }, {} as Record<string, any[]>);

      return Object.entries(logsByStaff).map(([staffId, shifts], idx) => {
        const typedShifts = shifts as any[];
        const staffName = (typedShifts[0]?.staffName || 'UNKNOWN LOCUM').toUpperCase();
        const staffRole = (typedShifts[0]?.specialty || typedShifts[0]?.role || 'LOCUM CLINICIAN').toUpperCase();
        const salaryInfo = salaryProfiles.find(p => p.staffId === staffId);
        
        const basicSalary = Number(salaryInfo?.basicSalary) || 0;
        const hourlyRateRaw = basicSalary > 0 
          ? (basicSalary / 192) 
          : (Number(salaryInfo?.hourlyRate) || 80);

        const totalHoursRaw = typedShifts.reduce((sum, shift) => sum + (Number(shift.hoursWorked) || 0), 0);
        const totalOwedRaw = totalHoursRaw * hourlyRateRaw;

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
          totalHours: Number(totalHoursRaw.toFixed(2)),
          derivedRate: Number(hourlyRateRaw.toFixed(2)),
          grossPayable: Number(totalOwedRaw.toFixed(2)),
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
    const grossLiabilitySum = locumPayrollData.reduce((sum, v) => sum + v.grossPayable, 0);
    const uniqueClinicians = new Set(locumPayrollData.map(v => v.name)).size;

    return {
      pendingCount,
      grossLiabilityStr: grossLiabilitySum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      uniqueClinicians,
    };
  }, [locumPayrollData]);

  const processLocumPay = async (locumData: any) => {
    if (!firestore || !user || !hospitalId) {
      toast({ title: "Voucher Generated (Simulation)", description: `Generated PV for ${locumData.name}. 7.5% WHT deducted.` });
      return;
    }
    setProcessingId(locumData.staffId);
    
    const batch = writeBatch(firestore);
    
    const grossAmount = locumData.grossPayable;
    const whtAmount = Number((grossAmount * 0.075).toFixed(2));
    const netAmount = Number((grossAmount - whtAmount).toFixed(2));
    
    const pvNumber = `PV-LOCUM-${Date.now().toString().slice(-5)}`;

    try {
      const pvRef = doc(collection(firestore, `hospitals/${hospitalId}/payment_vouchers`));
      batch.set(pvRef, {
        pvNumber,
        payee: locumData.name,
        narration: `Payment for ${locumData.shifts.length} Locum shifts (${locumData.totalHours.toFixed(2)} hrs) in ${new Date().toLocaleString('en-GB', {month: 'long', year: 'numeric'})}`,
        grossAmount,
        whtRate: 0.075,
        whtAmount,
        netAmount,
        debitAccountId: '5001',
        creditAccountId: '1000',
        hospitalId: hospitalId,
        status: 'PENDING_APPROVAL',
        processedBy: user.uid,
        processedByName: user.displayName || user.email || 'FINANCE CONTROLLER',
        createdAt: serverTimestamp()
      });

      const apDocRef = doc(collection(firestore, `hospitals/${hospitalId}/accounts_payable`));
      batch.set(apDocRef, {
        supplierName: `${locumData.name} (LOCUM)`,
        amountOwed: netAmount,
        category: "PAYROLL",
        status: 'UNPAID',
        hospitalId: hospitalId,
        description: `Locum payment net payable for ${locumData.shifts.length} shifts (${locumData.totalHours.toFixed(2)} hrs)`,
        pvId: pvRef.id,
        pvNumber: pvNumber,
        createdAt: serverTimestamp()
      });

      const whtapDocRef = doc(collection(firestore, `hospitals/${hospitalId}/accounts_payable`));
      batch.set(whtapDocRef, {
        supplierName: "GHANA REVENUE AUTHORITY (LOCUM WHT)",
        amountOwed: whtAmount,
        category: "STATUTORY",
        status: 'UNPAID',
        hospitalId: hospitalId,
        description: `7.5% Professional Service WHT for ${locumData.name} (${pvNumber})`,
        pvId: pvRef.id,
        pvNumber: pvNumber,
        createdAt: serverTimestamp()
      });

      if (locumData.rawShifts && locumData.rawShifts.length > 0) {
        locumData.rawShifts.forEach((s: any) => {
          if (s.id) {
            const shiftRef = doc(firestore, `hospitals/${hospitalId}/attendance_logs`, s.id);
            batch.update(shiftRef, { paymentStatus: 'PAID', pvReference: pvNumber });
          }
        });
      }

      await batch.commit();
      toast({ title: "Locum PV Generated", description: `Deducted 7.5% WHT for ${locumData.name}. Awaiting Director approval.` });
    } catch (e: any) { 
      toast({ variant: 'destructive', title: 'PV Generation Failed', description: e.message });
    } finally {
      setProcessingId(null);
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized for locum payment consolidation.</p>
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
                <Receipt className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                LOCUM PAYMENT CONSOLIDATION
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              AUDIT UNPAID SHIFTS AND GENERATE COMPLIANT FINANCIAL VOUCHERS FOR FREELANCE CLINICIANS.
            </p>
          </div>

          {/* Active User Context & Actions */}
          <div className="flex flex-wrap items-center gap-4 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-black text-emerald-400 text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">FINANCE CONTROLLER</div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => router.push('/accountant/payments')}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-4 h-4" /> VOUCHER ARCHIVE
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Financial Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Pending Consolidations</span>
              <div className="text-2xl font-black text-white">{telemetryMetrics.pendingCount}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                Awaiting voucher generation
              </span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-amber-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Total Gross Liability</span>
              <div className="text-2xl font-black text-amber-400"><span className="text-sm text-amber-600 mr-1">GHS</span>{telemetryMetrics.grossLiabilityStr}</div>
              <span className="text-[10px] font-bold text-amber-400 mt-1 block">Accumulated unpaid shifts</span>
            </div>
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Processed YTD</span>
              <div className="text-2xl font-black text-emerald-400"><span className="text-sm text-emerald-600 mr-1">GHS</span>12.4K</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Total locum payouts</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Locums</span>
              <div className="text-2xl font-black text-sky-400">{telemetryMetrics.uniqueClinicians}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Clinicians awaiting pay</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
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
            placeholder="Search by Clinician Name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer text-slate-800 dark:text-slate-100"
            >
              <option value="UNPAID" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pending Vouchers</option>
              <option value="PROCESSED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Generated / Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. VOUCHER CONSOLIDATION LEDGERS           */}
      {/* ========================================== */}
      <div className="space-y-6">
        {logsLoading || salariesLoading ? (
          <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
            Loading unpaid locum claims...
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-bold">All locum claims are settled for this category.</p>
          </div>
        ) : (
          filteredVouchers.map((voucher, idx) => (
            <div key={voucher.id || idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col xl:flex-row">
              
              {/* Left Side: Identity & Shifts */}
              <div className="flex-1 p-6 border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">
                        {voucher.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                          {voucher.id}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          • {voucher.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded text-[9px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-800">
                    {voucher.status}
                  </span>
                </div>

                {/* Shift Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> SHIFTS INCLUDED IN VOUCHER
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {voucher.shifts.map((shift: any, sIdx: number) => (
                      <div key={shift.id || sIdx} className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-24">
                          {shift.date}
                        </div>
                        <div className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 w-28 uppercase">
                          {shift.type}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 font-mono">
                          {shift.duration}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: Financial Calculation & Action */}
              <div className="w-full xl:w-96 bg-slate-50 dark:bg-slate-800/40 p-6 flex flex-col justify-between">
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Derived Hours</span>
                    <span className="text-sm font-mono font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                      {voucher.totalHours.toFixed(2)} HRS
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Agreed Rate / Hr</span>
                    <span className="text-sm font-mono font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                      ₵ {voucher.derivedRate.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Gross Payable</span>
                    <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                      <span className="text-sm text-emerald-600/70 dark:text-emerald-400/70 mr-1">₵</span>
                      {voucher.grossPayable.toFixed(2)}
                    </div>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => processLocumPay(voucher)}
                  disabled={processingId === voucher.staffId}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {processingId === voucher.staffId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Receipt className="w-4 h-4" /> GENERATE PAYMENT VOUCHER
                    </>
                  )}
                </button>

              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
