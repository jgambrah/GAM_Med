'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { 
  Activity, AlertTriangle, ShieldAlert, 
  CheckCircle2, Search, ChevronRight, Clock, 
  X, ShieldCheck, Loader2, TrendingUp, DollarSign, 
  Users, Building2, PhoneCall, ArrowUpRight, 
  ArrowRight, Sparkles, Layers, FileText, Bell
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

type BottleneckDetail = {
  dept: string;
  waiting: number;
  status: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  leadName: string;
  leadPhone: string;
  staffOnDuty: number;
  avgWaitMins: number;
  primaryCause: string;
};

// SVG Sparkline Component
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 28;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function ExecutiveDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [timeRange, setTimeRange] = useState('TODAY');
  const [selectedBottleneck, setSelectedBottleneck] = useState<BottleneckDetail | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId || 'GAM-GAR-7578';
  const directorName = userProfile?.name || user?.displayName || 'Dr. Marcus Amosah';

  // Financial & Operational Dataset
  const dashboardData = {
    date: 'August 24, 2026',
    financials: {
      grossRevenue: 142500.00,
      revenue7Day: [98000, 112000, 125000, 118000, 134000, 139000, 142500],
      cashCollected: 85200.00,
      cash7Day: [62000, 71000, 78000, 74000, 81000, 83000, 85200],
      liquidityRatio: 59.8, // 85.2k / 142.5k = 59.8%
      receivablesNHIS: 32000.00,
      receivablesCorporate: 25300.00,
      arOver90Days: 12400.00,
      arCurrent: 44900.00,
      pendingPayables: 45000.00,
      pvCount: 6
    },
    clinical: {
      totalEncounters: 312,
      admissions: 14,
      discharges: 9,
      bedOccupancy: 82,
      averageWaitTime: '42 mins'
    },
    bottlenecks: [
      { 
        dept: 'Outpatient Pharmacy Dispensing', 
        waiting: 34, 
        status: 'CRITICAL' as const,
        leadName: 'Pharm. Richard Donkor (Chief Pharmacist)',
        leadPhone: '+233 24 456 7891',
        staffOnDuty: 2,
        avgWaitMins: 48,
        primaryCause: 'High influx of evening discharge prescriptions and single dispensing counter active.'
      },
      { 
        dept: 'Laboratory / Phlebotomy Intake', 
        waiting: 18, 
        status: 'ELEVATED' as const,
        leadName: 'Ebenezer Mensah (Senior Lab Tech)',
        leadPhone: '+233 20 889 1234',
        staffOnDuty: 3,
        avgWaitMins: 24,
        primaryCause: 'Morning Fasting Blood Glucose & Lipid profiles batch processing.'
      },
      { 
        dept: 'General OPD Triage & Vitals', 
        waiting: 8, 
        status: 'NORMAL' as const,
        leadName: 'Sister Patricia Mensah (Nursing Officer)',
        leadPhone: '+233 27 112 3456',
        staffOnDuty: 5,
        avgWaitMins: 12,
        primaryCause: 'Standard patient flow within expected turnaround time SLA.'
      }
    ]
  };

  const handlePageLead = (lead: BottleneckDetail) => {
    toast({
      title: `📣 Department Lead Paged`,
      description: `High-priority dispatch sent to ${lead.leadName} (${lead.leadPhone}) regarding ${lead.waiting} waiting patients.`
    });
    setSelectedBottleneck(null);
  };

  const isLoading = isUserLoading || isProfileLoading;
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
      </div>
    );
  }

  const liquidityRatio = dashboardData.financials.liquidityRatio;
  const liquidityColor = liquidityRatio >= 70 ? 'bg-emerald-500' : liquidityRatio >= 50 ? 'bg-sky-500' : 'bg-amber-500';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE DARK COMMAND BANNER (TOP)                                    */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 relative overflow-hidden space-y-6">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Header Title & Identity */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    C-Suite Executive Terminal
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    • Institutional Telemetry & Liquidity Deck
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white mt-0.5">
                  Hospital Executive Command Center
                </h1>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl font-medium">
              Real-time revenue realization, liquid working capital, clinical throughput, and active departmental bottlenecks for <strong className="text-white">{directorName}</strong> (Hospital Director).
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            <div className="flex bg-slate-950/90 border border-slate-800 rounded-2xl p-1">
              {['TODAY', 'THIS WEEK', 'THIS MONTH', 'YTD'].map(range => (
                <button 
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    timeRange === range 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. WORKING CAPITAL & FINANCIAL TELEMETRY CARDS (NO PASTELS)               */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" /> Working Capital, Liquidity & Revenue Realization
          </h3>
          <span className="text-[10px] font-mono font-bold text-slate-400">
            Updated Live • 7-Day Velocity
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Gross Billed Revenue */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Gross Billed Revenue
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  +12.4% vs Avg
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
                ₵ {(dashboardData.financials.grossRevenue || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">7-Day Trend</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  ₵ 142.5k Peak
                </span>
              </div>
              <MiniSparkline data={dashboardData.financials.revenue7Day || []} color="#10b981" />
            </div>
          </div>

          {/* Card 2: Liquid Cash Collected */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Liquid Cash Collected
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-mono">
                  {liquidityRatio}% Ratio
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                ₵ {(dashboardData.financials.cashCollected || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className={`${liquidityColor} h-2 rounded-full transition-all`} style={{ width: `${liquidityRatio}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>In Vault & Bank Accounts</span>
                <MiniSparkline data={dashboardData.financials.cash7Day || []} color="#0ea5e9" />
              </div>
            </div>
          </div>

          {/* Card 3: Accounts Receivable (A/R) with Aging Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  A/R: NHIS & Corporate
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-mono">
                  Unrealized
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
                ₵ {((dashboardData.financials.receivablesNHIS || 0) + (dashboardData.financials.receivablesCorporate || 0)).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* A/R Aging Sub-Metric (Defensive Context) */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1 text-[10px] font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Current (&lt;90d):</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  ₵ {(dashboardData.financials.arCurrent || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                <span className="font-sans">⚠️ Aging &gt; 90 Days (At Risk):</span>
                <span>₵ {(dashboardData.financials.arOver90Days || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Approved Payables (PVs) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Approved Payables (PVs)
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                  {dashboardData.financials.pvCount} PVs
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-2">
                ₵ {(dashboardData.financials.pendingPayables || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Chief Accountant Queue</span>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  Awaiting Bank Remittance
                </span>
              </div>
              <Link 
                href="/accountant/payable"
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition text-slate-600 dark:text-slate-300"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CLINICAL THROUGHPUT & LIVE BOTTLENECK RADAR                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Clinical Throughput Telemetry */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-500" /> Real-Time Clinical Throughput & Bed Census
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400">Live OPD/IPD</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-3xl md:text-4xl font-black font-mono text-slate-900 dark:text-slate-100 block">
                {dashboardData.clinical.totalEncounters}
              </span>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-1 block">
                Total OPD / Clinical Encounters
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-3xl md:text-4xl font-black font-mono text-indigo-600 dark:text-indigo-400 block">
                {dashboardData.clinical.admissions}
              </span>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-1 block">
                Inpatient Admissions Today
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center sm:col-span-1 col-span-2">
              <span className="text-3xl md:text-4xl font-black font-mono text-sky-500 block">
                {dashboardData.clinical.bedOccupancy}%
              </span>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-1 block">
                Active Inpatient Bed Occupancy
              </span>
            </div>

          </div>

          {/* Average Wait Time Banner */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-xl text-sky-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-300 block">Facility Average Wait Time SLA</span>
                <span className="text-[10px] text-slate-400">From Triage arrival to Physician Encounter</span>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-xl font-black text-sky-400">{dashboardData.clinical.averageWaitTime}</span>
              <span className="text-[9px] text-slate-400 block font-sans">Target: &lt;45 mins</span>
            </div>
          </div>
        </div>

        {/* Right: Live Departmental Bottlenecks with Strict Severity Coding */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Live Departmental Bottlenecks
            </h3>
            <span className="text-[10px] font-mono font-bold text-rose-500 animate-pulse">● Live Alert Radar</span>
          </div>

          <div className="space-y-3">
            {dashboardData.bottlenecks.map((item, idx) => {
              const isCritical = item.status === 'CRITICAL';
              const isElevated = item.status === 'ELEVATED';

              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedBottleneck(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-sm ${
                    isCritical
                      ? 'bg-rose-950/30 border-rose-600/80 hover:bg-rose-950/50 ring-1 ring-rose-500/30'
                      : isElevated
                      ? 'bg-amber-950/20 border-amber-500/60 hover:bg-amber-950/40'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isCritical && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      )}
                      <h4 className={`text-xs font-black uppercase tracking-wide ${
                        isCritical ? 'text-rose-400' : isElevated ? 'text-amber-400' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {item.dept}
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Lead: {item.leadName.split('(')[0]}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-[10px] font-black rounded-full font-mono uppercase tracking-wider ${
                      isCritical
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                        : isElevated
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {item.waiting} WAITING
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTLENECK DRILL-DOWN & PAGE LEAD MODAL                                 */}
      {/* ========================================================================= */}
      {selectedBottleneck && (
        <Dialog open={!!selectedBottleneck} onOpenChange={() => setSelectedBottleneck(null)}>
          <DialogContent className="bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${selectedBottleneck.status === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500'}`} />
                <span>Department Operational Bottleneck</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Executive root-cause analysis and direct leadership intervention.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3 text-xs">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Department:</span>
                  <span className="font-bold text-white">{selectedBottleneck.dept}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Queue Depth:</span>
                  <span className="font-mono font-black text-rose-400">{selectedBottleneck.waiting} Patients Waiting</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Staff on Active Shift:</span>
                  <span className="font-mono text-white font-bold">{selectedBottleneck.staffOnDuty} Staff Members</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Average Turnaround:</span>
                  <span className="font-mono text-amber-400 font-bold">{selectedBottleneck.avgWaitMins} Minutes / Patient</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Root-Cause Intelligence</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedBottleneck.primaryCause}
                </p>
              </div>

              <div className="p-4 bg-indigo-950/30 border border-indigo-800/40 rounded-2xl space-y-1">
                <span className="text-[10px] font-black uppercase text-indigo-400 block">Department Lead on Duty</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">{selectedBottleneck.leadName}</span>
                  <span className="font-mono text-indigo-300">{selectedBottleneck.leadPhone}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedBottleneck(null)} 
                className="text-slate-400 hover:text-white"
              >
                Close
              </Button>
              <Button 
                onClick={() => handlePageLead(selectedBottleneck)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl px-6 flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4" /> PAGE DEPARTMENT LEAD &rarr;
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
