'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { 
  TrendingUp, TrendingDown, DollarSign, 
  Printer, Target, Loader2, CheckCircle2, ShieldCheck, Landmark
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { format } from 'date-fns';

export default function ExecutivePLReport() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [claims, setClaims] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  
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
    if (!hospitalId || !firestore) return;

    const fetchPLData = async () => {
      setLoading(true);
      const hId = hospitalId;
      
      // Selected month boundary
      const start = new Date(period.year, period.month, 1);
      const end = new Date(period.year, period.month + 1, 0, 23, 59, 59);
      const startTs = Timestamp.fromDate(start);
      const endTs = Timestamp.fromDate(end);

      try {
        // 1. Fetch current selected month's granular detail
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
          inc.other += val; // Simplified categorization fallback
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

        // 2. Fetch rolling 6 months history for Visual Trends
        const monthsData = [];
        for (let i = 5; i >= 0; i--) {
          const targetMonth = new Date(period.year, period.month - i, 1);
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
  }, [claims, firestore, period]);

  // Expenses categories breakdown pie chart data
  const pieExpenseData = useMemo(() => {
    return [
      { name: 'Salaries', value: financials.expense.payroll, fill: '#ef4444' },
      { name: 'Suppliers', value: financials.expense.suppliers, fill: '#3b82f6' },
      { name: 'Wastage', value: financials.expense.wastage, fill: '#f97316' },
    ].filter(d => d.value > 0);
  }, [financials.expense]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 italic text-muted-foreground">Generating Monthly Statement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b-4 border-foreground pb-8 gap-6 print:hidden">
        <div>
           <div className="flex items-center gap-3 text-primary mb-2">
              <Target size={32} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Executive Business Intelligence</span>
           </div>
           <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Monthly <span className="text-primary">P&L Statement</span></h1>
        </div>
        
        <div className="flex items-center gap-3 bg-card p-4 rounded-3xl border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
           <select 
             className="bg-transparent font-black uppercase text-xs outline-none cursor-pointer"
             value={period.month} onChange={e => setPeriod({...period, month: Number(e.target.value)})}
           >
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => <option key={i} value={i}>{m}</option>)}
           </select>
           <div className="h-4 w-px bg-muted" />
           <select 
             className="bg-transparent font-black uppercase text-xs outline-none cursor-pointer"
             value={period.year} onChange={e => setPeriod({...period, year: Number(e.target.value)})}
           >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
           </select>
           <div className="h-4 w-px bg-muted" />
           <button onClick={() => window.print()} className="hover:text-primary transition-colors cursor-pointer"><Printer size={20}/></button>
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <SummaryCard label="Total Revenue (Inflow)" value={`GHS ${financials.income.total.toLocaleString()}`} icon={<TrendingUp/>} color="blue" />
        <SummaryCard label="Total Expenditure (Outflow)" value={`GHS ${financials.expense.total.toLocaleString()}`} icon={<TrendingDown/>} color="red" />
        <SummaryCard 
          label="Net Cash Profit" 
          value={`GHS ${financials.netProfit.toLocaleString()}`} 
          icon={<DollarSign/>} 
          color={financials.netProfit >= 0 ? "green" : "red"} 
          footer={`${financials.margin.toFixed(1)}% Profit Margin`}
        />
      </div>

      {/* 6-MONTH TRENDS VISUALIZATION - HIDDEN ON PRINT */}
      <div className="bg-card p-6 md:p-8 rounded-[48px] border-4 border-border shadow-sm print:hidden">
         <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
            <div className="w-8 h-1 bg-primary" /> 6-Month Clinical-Financial Trend
         </h3>
         <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 16, fontWeight: 'bold' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* GRANULAR ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <div className="w-8 h-1 bg-primary" /> Income Analysis
          </h3>
          <div className="bg-card p-8 rounded-[48px] border-4 border-border shadow-sm space-y-6">
             <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold uppercase">Consultation Revenue</span>
                <span className="font-black italic">GHS {financials.income.consultation.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-4">
                <span className="text-slate-500 font-bold uppercase">Pharmacy / Consumables</span>
                <span className="font-black italic">GHS {financials.income.pharmacy.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-4">
                <span className="text-slate-500 font-bold uppercase">Laboratory & Scans</span>
                <span className="font-black italic">GHS {financials.income.lab.toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-4">
                <span className="text-slate-500 font-bold uppercase">General / Other Payments</span>
                <span className="font-black italic text-primary">GHS {financials.income.other.toFixed(2)}</span>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <div className="w-8 h-1 bg-destructive" /> Expense Analysis
          </h3>
          <div className="bg-slate-900 p-8 rounded-[48px] text-white space-y-6 shadow-2xl flex flex-col justify-between">
             <div className="space-y-4">
               <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold uppercase">Staff Salaries (Payroll)</span>
                  <span className="font-black italic text-red-400">GHS {financials.expense.payroll.toFixed(2)}</span>
               </div>
               <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-4">
                  <span className="text-slate-400 font-bold uppercase">Supplier Payments</span>
                  <span className="font-black italic text-blue-400">GHS {financials.expense.suppliers.toFixed(2)}</span>
               </div>
               <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-4">
                  <span className="text-slate-400 font-bold uppercase">Inventory Wastage (Loss)</span>
                  <span className="font-black italic text-orange-400">GHS {financials.expense.wastage.toFixed(2)}</span>
               </div>
             </div>

             {/* EXPENSES PIE CHART REPRESENTATION */}
             {pieExpenseData.length > 0 && (
               <div className="h-[120px] w-full mt-6 border-t border-slate-800 pt-4 flex items-center justify-center">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={pieExpenseData}
                       cx="50%"
                       cy="50%"
                       innerRadius={25}
                       outerRadius={45}
                       paddingAngle={4}
                       dataKey="value"
                     >
                       {pieExpenseData.map((entry: any, index: number) => (
                         <Cell key={`cell-${index}`} fill={entry.fill} />
                       ))}
                     </Pie>
                     <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12, color: 'black' }} />
                     <Legend wrapperStyle={{ fontSize: 10, color: 'white' }} />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="bg-slate-100/50 p-10 rounded-[50px] text-center border-2 border-dashed border-slate-200">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-4">Official Financial Authenticity</p>
         <p className="text-sm font-medium italic text-slate-500 max-w-2xl mx-auto">
            This Profit & Loss statement is an automated clinical-financial consolidation. 
            It reflects all authorized transactions within the <strong>GamMed ERP</strong> ecosystem for the selected period.
         </p>
         <div className="mt-8 flex justify-center gap-8 opacity-45 grayscale">
            <CheckCircle2 size={32} />
            <ShieldCheck size={32} />
            <Landmark size={32} />
         </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color, footer }: any) {
  const colors: any = {
    blue: "bg-blue-50/50 border-blue-100 text-blue-700 shadow-blue-100/50",
    red: "bg-red-50/50 border-red-100 text-red-700 shadow-red-100/50",
    green: "bg-green-50/50 border-green-100 text-green-700 shadow-green-100/50",
  };
  return (
    <div className={`p-10 rounded-[48px] border-4 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl ${colors[color]}`}>
       <div className="flex justify-between items-start mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-tight">{label}</p>
          <div className="p-3 bg-white rounded-2xl shadow-sm">{icon}</div>
       </div>
       <h3 className="text-4xl font-black tracking-tighter italic">{value}</h3>
       {footer && <p className="text-[10px] font-black uppercase mt-4 tracking-widest">{footer}</p>}
    </div>
  );
}
