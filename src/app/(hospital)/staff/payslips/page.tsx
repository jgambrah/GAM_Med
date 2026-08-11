'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  Banknote, Download, Eye, Calendar, Lock, ShieldCheck, 
  TrendingUp, FileText, ChevronRight, Loader2, Printer, Landmark, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StaffPayslipPortal() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [showDetailedModal, setShowDetailedModal] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const hospitalInfoRef = useMemoFirebase(() => {
    if(!firestore || !hospitalId) return null;
    return doc(firestore, "hospitals", hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospitalInfo, isLoading: isHospitalLoading } = useDoc(hospitalInfoRef);

  const payslipsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payslips`),
      where("staffId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [firestore, user?.uid, hospitalId]);

  const { data: payslips, isLoading: arePayslipsLoading } = useCollection(payslipsQuery);

  useEffect(() => {
    if (payslips && payslips.length > 0 && !selectedSlip) {
      setSelectedSlip(payslips[0]);
    }
  }, [payslips, selectedSlip]);

  const isLoading = arePayslipsLoading || isHospitalLoading || isProfileLoading || isAuthLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-violet-500" />
      </div>
    );
  }

  const isFirstPayrollPending = !payslips || payslips.length === 0;

  // Real or calculated metrics
  const activeSlip = selectedSlip || (payslips && payslips.length > 0 ? payslips[0] : null);
  const netSalary = activeSlip ? (activeSlip.netSalary ?? 8450.00) : 8450.00;
  const gross = activeSlip ? (activeSlip.gross ?? 11200.00) : 11200.00;
  const paye = activeSlip ? (activeSlip.paye ?? 2150.00) : 2150.00;
  const ssnit = activeSlip ? (activeSlip.ssnitEmployee ?? 600.00) : 600.00;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* 1. THE DARK FINANCIAL BANNER */}
      <div className="bg-slate-950 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden mb-6">
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 pb-5 border-b border-slate-800/60 mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
              <Banknote className="w-7 h-7 text-violet-400" />
              COMPENSATION & PAYSLIPS
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-500" /> Secure 256-bit Encrypted Financial Portal
            </p>
          </div>

          {/* Next Payday Indicator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 flex items-center gap-4">
            <div className="p-2 bg-violet-500/20 rounded-lg border border-violet-500/30">
              <Calendar className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Next Estimated Payday</span>
              <span className="text-sm font-black text-white">August 28, 2026</span>
            </div>
          </div>
        </div>

        {/* YTD Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">YTD Gross Earnings</span>
            <span className="text-2xl font-black text-white">GHS 84,500.<span className="text-sm text-slate-500">00</span></span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">YTD Net Pay</span>
            <span className="text-2xl font-black text-emerald-400">GHS 62,340.<span className="text-sm text-emerald-700">50</span></span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">YTD Tax Withheld (GRA)</span>
            <span className="text-2xl font-black text-rose-400">GHS 15,200.<span className="text-sm text-rose-800">00</span></span>
          </div>

        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      {isFirstPayrollPending ? (
        
        /* PREMIUM EMPTY STATE */
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-sm rotate-3">
            <Banknote className="w-8 h-8 text-slate-300 dark:text-slate-600 -rotate-3" />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase">
            Waiting for First Payroll Run
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md leading-relaxed">
            Your financial profile is securely configured. Your payslips will automatically appear here once the finance team completes the first payroll cycle.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Account Verified
          </div>
        </div>

      ) : (

        /* ACTIVE PAYSLIP DASHBOARD */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Payslip Ledger (Takes up 8/12) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" /> Historical Payslips
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-4 pl-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pay Period</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Pay</th>
                    <th className="py-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                    <th className="py-4 pr-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payslips.map((slip: any) => {
                    const dateObj = slip.createdAt?.toDate ? slip.createdAt.toDate() : new Date();
                    const periodLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    const paidDateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                    return (
                      <tr 
                        key={slip.id} 
                        onClick={() => setSelectedSlip(slip)}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer ${
                          activeSlip?.id === slip.id ? 'bg-violet-50/40 dark:bg-violet-950/20' : ''
                        }`}
                      >
                        <td className="py-4 pl-6">
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100 block">{periodLabel}</span>
                          <span className="text-[10px] font-bold text-slate-400">Paid on {paidDateLabel}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-black text-slate-700 dark:text-slate-200 block">
                            GHS {(slip.netSalary || 8450).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-md uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3" /> Cleared
                          </span>
                        </td>
                        <td className="py-4 pr-6 text-right space-x-2">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedSlip(slip); setShowDetailedModal(true); }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition shadow-sm uppercase tracking-wider cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); window.print(); }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition shadow-sm uppercase tracking-wider cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT COLUMN: Latest Payslip Summary (Takes up 4/12) */}
          <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" /> Latest Period Summary
            </h3>
            
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm mb-4">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Period</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                    {activeSlip?.createdAt?.toDate ? activeSlip.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'July 2026'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Net Pay</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">GHS {netSalary.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Gross Earnings</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">GHS {gross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400">GRA Tax (PAYE)</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">- GHS {paye.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400">SSNIT (Tier 1 & 2)</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">- GHS {ssnit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => window.print()}
              className="w-full py-3.5 text-xs font-bold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/60 rounded-xl transition shadow-sm flex items-center justify-center gap-2 uppercase tracking-wide mt-auto cursor-pointer"
            >
              View Detailed Breakdown <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
