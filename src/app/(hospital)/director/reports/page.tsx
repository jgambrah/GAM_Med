'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { 
  TrendingUp, TrendingDown, DollarSign, 
  Printer, Calendar, ShieldCheck, Activity, 
  PieChart, BarChart3, Building2, Loader2 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format } from 'date-fns';

export default function PerformanceDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [claims, setClaims] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const [financials, setFinancials] = useState({
    income: { total: 0, consultation: 0, pharmacy: 0, lab: 0, scans: 0, other: 0 },
    expense: { total: 0, payroll: 0, suppliers: 0, wastage: 0, maintenance: 0 },
    netProfit: 0,
    margin: 0
  });

  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((token) => {
        setClaims(token.claims);
      });
    }
  }, [user]);

  useEffect(() => {
    const hospitalId = claims?.hospitalId;
    if (!hospitalId || !firestore) {
      setLoading(false);
      return;
    }

    const fetchPLData = async () => {
      setLoading(true);
      const hId = hospitalId;
      
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
      const startTs = Timestamp.fromDate(start);
      const endTs = Timestamp.fromDate(end);

      try {
        const [paySnap, pvSnap, wasteSnap] = await Promise.all([
          getDocs(query(
            collection(firestore, `hospitals/${hId}/payments`), 
            where("hospitalId", "==", hId), where("createdAt", ">=", startTs), where("createdAt", "<=", endTs)
          )),
          getDocs(query(
            collection(firestore, `hospitals/${hId}/payment_vouchers`),
            where("hospitalId", "==", hId), where("status", "==", "PAID"),
            where("createdAt", ">=", startTs), where("createdAt", "<=", endTs)
          )),
          getDocs(query(
            collection(firestore, `hospitals/${hId}/disposal_logs`),
            where("hospitalId", "==", hId),
            where("createdAt", ">=", startTs), where("createdAt", "<=", endTs)
          ))
        ]);

        let inc = { total: 0, consultation: 0, pharmacy: 0, lab: 0, scans: 0, other: 0 };
        paySnap.forEach(d => {
          const val = d.data().totalAmount || 0;
          inc.total += val;
          inc.other += val;
        });

        let exp = { total: 0, payroll: 0, suppliers: 0, wastage: 0, maintenance: 0 };
        pvSnap.forEach(d => {
          const val = d.data().netAmount || 0;
          exp.total += val;
          if (d.data().narration?.toLowerCase().includes('salar') || d.data().narration?.toLowerCase().includes('payroll')) {
            exp.payroll += val;
          } else {
            exp.suppliers += val;
          }
        });
        wasteSnap.forEach(d => {
          const val = d.data().lossValue || 0;
          exp.total += val;
          exp.wastage += val;
        });

        const net = inc.total - exp.total;
        const margin = inc.total > 0 ? (net / inc.total) * 100 : 0;

        setFinancials({ income: inc, expense: exp, netProfit: net, margin: margin });

        const monthsData = [];
        for (let i = 5; i >= 0; i--) {
          const targetMonth = new Date(selectedYear, selectedMonth - i, 1);
          const sDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
          const eDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59);
          
          const sTs = Timestamp.fromDate(sDate);
          const eTs = Timestamp.fromDate(eDate);

          const [pSnap, vSnap, wSnap] = await Promise.all([
            getDocs(query(
              collection(firestore, `hospitals/${hId}/payments`), 
              where("hospitalId", "==", hId), where("createdAt", ">=", sTs), where("createdAt", "<=", eTs)
            )),
            getDocs(query(
              collection(firestore, `hospitals/${hId}/payment_vouchers`),
              where("hospitalId", "==", hId), where("status", "==", "PAID"),
              where("createdAt", ">=", sTs), where("createdAt", "<=", eTs)
            )),
            getDocs(query(
              collection(firestore, `hospitals/${hId}/disposal_logs`),
              where("hospitalId", "==", hId),
              where("createdAt", ">=", sTs), where("createdAt", "<=", eTs)
            ))
          ]);

          let pTotal = 0;
          pSnap.forEach(d => { pTotal += d.data().totalAmount || 0; });

          let eTotal = 0;
          vSnap.forEach(d => { eTotal += d.data().netAmount || 0; });
          wSnap.forEach(d => { eTotal += d.data().lossValue || 0; });

          monthsData.push({
            name: format(sDate, 'MMM yy'),
            Revenue: pTotal,
            Expenses: eTotal,
            Profit: pTotal - eTotal,
          });
        }
        setTrendData(monthsData);

      } catch (e) {
        console.error("P&L Engine Error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchPLData();
  }, [claims, firestore, selectedMonth, selectedYear]);

  const monthsList = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

  const incomeBreakdown = [
    { label: 'CONSULTATION REVENUE', amount: financials.income.consultation.toFixed(2), color: 'text-sky-600', bg: 'bg-sky-500' },
    { label: 'PHARMACY / CONSUMABLES', amount: financials.income.pharmacy.toFixed(2), color: 'text-indigo-600', bg: 'bg-indigo-500' },
    { label: 'LABORATORY & SCANS', amount: financials.income.lab.toFixed(2), color: 'text-violet-600', bg: 'bg-violet-500' },
    { label: 'GENERAL / OTHER PAYMENTS', amount: financials.income.other.toFixed(2), color: 'text-slate-600', bg: 'bg-slate-500' },
  ];

  const expenseBreakdown = [
    { label: 'STAFF SALARIES (PAYROLL)', amount: financials.expense.payroll.toFixed(2), color: 'text-rose-600', bg: 'bg-rose-500' },
    { label: 'SUPPLIER PAYMENTS', amount: financials.expense.suppliers.toFixed(2), color: 'text-amber-600', bg: 'bg-amber-500' },
    { label: 'INVENTORY WASTAGE (LOSS)', amount: financials.expense.wastage.toFixed(2), color: 'text-red-600', bg: 'bg-red-500' },
  ];

  const userName = user?.displayName || claims?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Emerald/Sky for Finance */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and User Context/Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                MONTHLY P&L STATEMENT
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              EXECUTIVE BUSINESS INTELLIGENCE & CONSOLIDATED FINANCIAL EARNINGS.
            </p>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-4 self-start xl:self-auto">
            
            {/* Active User Badge */}
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">EXECUTIVE / DIRECTOR</div>
              </div>
            </div>

            {/* Date Selectors */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-black uppercase tracking-widest text-slate-200 transition-colors">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent focus:outline-none appearance-none cursor-pointer text-slate-100"
                >
                  {monthsList.map((m, idx) => (
                    <option key={idx} value={idx} className="bg-slate-900 text-white">{m}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-black uppercase tracking-widest text-slate-200 transition-colors">
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent focus:outline-none appearance-none cursor-pointer text-slate-100"
                >
                  <option value={2026} className="bg-slate-900 text-white">2026</option>
                  <option value={2025} className="bg-slate-900 text-white">2025</option>
                  <option value={2024} className="bg-slate-900 text-white">2024</option>
                </select>
              </div>
            </div>

            {/* Print Action */}
            <button 
              type="button"
              onClick={() => window.print()}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Executive Telemetry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          
          {/* Revenue */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Total Revenue (Inflow)
              </span>
              <div className="text-3xl font-black text-sky-400">
                <span className="text-lg text-sky-600 mr-1">GHS</span>{financials.income.total.toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <TrendingUp className="w-7 h-7" />
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Total Expenditure (Outflow)
              </span>
              <div className="text-3xl font-black text-rose-400">
                <span className="text-lg text-rose-600 mr-1">GHS</span>{financials.expense.total.toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <TrendingDown className="w-7 h-7" />
            </div>
          </div>

          {/* Profit */}
          <div className="bg-slate-900 border border-emerald-500/30 p-5 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
                Net Cash Profit
              </span>
              <div className="text-3xl font-black text-emerald-400">
                <span className="text-lg text-emerald-600 mr-1">GHS</span>{financials.netProfit.toFixed(2)}
              </div>
              <span className="inline-block mt-1.5 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-full">
                {financials.margin.toFixed(1)}% PROFIT MARGIN
              </span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <DollarSign className="w-7 h-7" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. CHART & DATA BREAKDOWNS                 */}
      {/* ========================================== */}
      <div className="space-y-6">
        
        {/* Trend Chart Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> 6-MONTH CLINICAL-FINANCIAL TREND
            </h2>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><div className="w-3 h-3 rounded bg-sky-500" /> REVENUE</span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><div className="w-3 h-3 rounded bg-rose-500" /> EXPENSES</span>
            </div>
          </div>
          
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData.length > 0 ? trendData : [
                { name: 'Mar 26', Revenue: 0, Expenses: 0, Profit: 0 },
                { name: 'Apr 26', Revenue: 0, Expenses: 0, Profit: 0 },
                { name: 'May 26', Revenue: 0, Expenses: 0, Profit: 0 },
                { name: 'Jun 26', Revenue: 0, Expenses: 0, Profit: 0 },
                { name: 'Jul 26', Revenue: 0, Expenses: 0, Profit: 0 },
                { name: 'Aug 26', Revenue: 0, Expenses: 0, Profit: 0 },
              ]}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 16, fontWeight: 'bold', backgroundColor: '#0f172a', color: '#fff', borderColor: '#334155' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Revenue" stroke="#0284c7" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                <Area type="monotone" dataKey="Expenses" stroke="#e11d48" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Ledgers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Income Analysis */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <PieChart className="w-4 h-4 text-sky-600 dark:text-sky-400" /> INCOME ANALYSIS
            </h2>
            <div className="space-y-3">
              {incomeBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 rounded-full ${item.bg}`} />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">{item.label}</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                    <span className="text-[10px] text-slate-400 mr-1">GHS</span>{item.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Analysis */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" /> EXPENSE ANALYSIS
            </h2>
            <div className="space-y-3">
              {expenseBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 rounded-full ${item.bg}`} />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">{item.label}</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                    <span className="text-[10px] text-slate-400 mr-1">GHS</span>{item.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Authenticity Footer */}
        <div className="mt-8 p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300 mb-1">
              OFFICIAL FINANCIAL AUTHENTICITY
            </h4>
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 leading-relaxed max-w-4xl">
              This Profit & Loss statement is an automated clinical-financial consolidation. It reflects all authorized transactions within the <strong className="font-bold">GAM Med ERP</strong> ecosystem for the selected period. Unverified or pending ledger entries are excluded from this report.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
