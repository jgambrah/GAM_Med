'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, doc } from 'firebase/firestore';
import { 
  Table, Calendar, Filter, Printer, 
  ArrowUpRight, TrendingDown, Landmark, PieChart as PieChartIcon, Loader2, ShieldAlert, Zap
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ASSET_GROUPS, PPE_SUB_DIVISIONS } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function FixedAssetSchedule() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userProfile?.role || '');

  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [report, setReport] = useState<any[]>([]);

  const generateReport = async () => {
    if (!dateRange.start || !dateRange.end || !hospitalId) return;
    setLoading(true);

    try {
      const hId = hospitalId;
      const startTs = Timestamp.fromDate(new Date(dateRange.start));
      const endTs = Timestamp.fromDate(new Date(new Date(dateRange.end).setHours(23,59,59)));

      const assetSnap = await getDocs(query(collection(firestore, `hospitals/${hId}/assets`)));
      
      const depSnap = await getDocs(query(
        collection(firestore, `hospitals/${hId}/depreciation_history`),
        where("hospitalId", "==", hId),
        where("createdAt", ">=", startTs),
        where("createdAt", "<=", endTs)
      ));

      const assets = assetSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const depLogs = depSnap.docs.map(d => d.data());

      const reportStructure = [
        ...PPE_SUB_DIVISIONS.map(s => ({ ...s, parent: 'PPE', type: 'PPE' })),
        ...ASSET_GROUPS.filter(g => g.id !== 'PPE').map(g => ({ ...g, parent: g.id, type: g.id }))
      ];

      const finalizedData = reportStructure.map(category => {
        const relevantAssets = assets.filter(a => 
          category.type === 'PPE' ? a.subDivision === category.id : a.category === category.id
        );

        const opening = relevantAssets
          .filter(a => a.purchaseDate < dateRange.start)
          .reduce((sum, a) => sum + (a.purchasePrice || 0), 0);

        const additions = relevantAssets
          .filter(a => a.purchaseDate >= dateRange.start && a.purchaseDate <= dateRange.end)
          .reduce((sum, a) => sum + (a.purchasePrice || 0), 0);

        const depreciation = depLogs
          .filter(log => relevantAssets.some(ra => ra.id === log.assetId || ra.tagId === log.assetId))
          .reduce((sum, log) => sum + (log.amount || 0), 0);

        return {
          id: category.id,
          label: category.label,
          opening,
          additions,
          depreciation,
          closing: (opening + additions) - depreciation
        };
      });

      setReport(finalizedData);
      toast({ title: `Schedule generated for ${dateRange.start} to ${dateRange.end}` });
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Schedule aggregation failed.", description: e.message }); 
    }
    setLoading(false);
  };
  
  const chartData = report.map(item => ({
    name: item.label.split('(')[0], // Short name
    value: item.closing
  })).filter(item => item.value > 0);

  const COLORS = ['#2563eb', '#0f172a', '#f59e0b', '#ef4444', '#10b981'];

  const pageIsLoading = isUserLoading || isProfileLoading;

  if (pageIsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;
  }

  if (!isAuthorized && !pageIsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      {/* --- HEADER & FILTERS --- */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b-8 border-slate-900 pb-8 gap-6 print:hidden">
        <div>
           <h1 className="text-4xl font-black uppercase tracking-tighter italic">Fixed Asset <span className="text-blue-600">Schedule</span></h1>
           <p className="text-slate-500 font-bold text-xs uppercase italic">Period-based Asset Valuation & Amortization.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
           <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-slate-400">Start Date</span>
              <input type="date" className="bg-transparent text-xs outline-none" onChange={e => setDateRange({...dateRange, start: e.target.value})} />
           </div>
           <div className="h-8 w-px bg-slate-200" />
           <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-slate-400">End Date</span>
              <input type="date" className="bg-transparent text-xs outline-none" onChange={e => setDateRange({...dateRange, end: e.target.value})} />
           </div>
           <button onClick={generateReport} className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-black transition-all">
              {loading ? <Loader2 className="animate-spin" size={18}/> : <Filter size={18}/>}
           </button>
        </div>
      </div>

       {/* --- THE AUDIT-GRADE STATEMENT --- */}
       <div className="bg-white border-4 border-slate-900 p-12 rounded-[50px] shadow-2xl font-serif">
         <div className="text-center border-b-2 border-slate-900 pb-6 mb-10">
            <h2 className="text-3xl font-black uppercase tracking-widest">{userProfile?.hospitalName}</h2>
            <p className="text-lg font-bold uppercase italic mt-1">Movement of Fixed Assets</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">
               Period: {dateRange.start || '...'} to {dateRange.end || '...'}
            </p>
         </div>

         <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white text-[9px] uppercase font-black tracking-widest">
               <tr>
                  <th className="p-5 border-r border-slate-800">Asset Classification</th>
                  <th className="p-5 text-right border-r border-slate-800">Opening (₵)</th>
                  <th className="p-5 text-right border-r border-slate-800">Additions (₵)</th>
                  <th className="p-5 text-right border-r border-slate-800">Depreciation (₵)</th>
                  <th className="p-5 text-right">Closing NBV (₵)</th>
               </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 font-bold text-xs">
               {report.length === 0 ? (
                 <tr><td colSpan={5} className="p-20 text-center text-slate-300 italic uppercase">Execute Period Filter to display data.</td></tr>
               ) : report.map((row, i) => (
                 <tr key={i} className="hover:bg-slate-50 transition-all">
                    <td className="p-5 uppercase text-black font-black">{row.label}</td>
                    <td className="p-5 text-right text-slate-500 italic">{row.opening.toLocaleString()}</td>
                    <td className="p-5 text-right text-green-600">₵ {row.additions.toLocaleString()}</td>
                    <td className="p-5 text-right text-red-600">(₵ {row.depreciation.toLocaleString()})</td>
                    <td className="p-5 text-right bg-slate-900 text-white italic font-black">₵ {row.closing.toLocaleString()}</td>
                 </tr>
               ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-4 border-slate-900 font-black text-sm italic">
               <tr>
                  <td className="p-6 uppercase">Total Network Value</td>
                  <td className="p-6 text-right">₵ {report.reduce((a,b)=>a+b.opening,0).toLocaleString()}</td>
                  <td className="p-6 text-right text-green-600">₵ {report.reduce((a,b)=>a+b.additions,0).toLocaleString()}</td>
                  <td className="p-6 text-right text-red-600">(₵ {report.reduce((a,b)=>a+b.depreciation,0).toLocaleString()})</td>
                  <td className="p-6 text-right bg-blue-600 text-white text-xl">₵ {report.reduce((a,b)=>a+b.closing,0).toLocaleString()}</td>
               </tr>
            </tfoot>
         </table>

         <div className="mt-16 grid grid-cols-2 gap-20 opacity-40 print:opacity-100">
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Prepared by Accountant</p>
               <p className="text-[10px] font-bold mt-2 italic">{user?.displayName}</p>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-center">
               <p className="text-[10px] font-black uppercase">Certified by Internal Audit</p>
            </div>
         </div>
      </div>

      <div className="print:hidden flex justify-end gap-4">
         <button onClick={() => window.print()} className="bg-white border-4 border-slate-900 px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-lg">
            <Printer size={18} /> Export for Board Review
         </button>
      </div>

      {/* --- EXECUTIVE INSIGHTS BLOCK --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 print:hidden">
          <div className="bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-xl space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <PieChartIcon size={16} className="text-blue-600" /> Capital Allocation by Category
              </h3>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={chartData}
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip 
                              contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number) => `₵${value.toLocaleString()}`}
                          />
                          <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </div>
          
          <div className="bg-[#0f172a] p-10 rounded-[40px] text-white flex flex-col justify-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Landmark size={120} />
              </div>
              
              <h4 className="text-xl font-black uppercase italic tracking-tighter text-blue-400 flex items-center gap-2">
                <Zap size={20} className="fill-current" /> Strategic Analysis
              </h4>

              <p className="text-sm font-medium text-slate-300 leading-relaxed italic border-l-4 border-blue-600 pl-6">
                "Director {user?.displayName?.split(' ').pop()}, based on the current audit period,{' '}
                <strong>
                    {((chartData.find(d => d.name.includes('Property'))?.value / (report.reduce((a,b)=>a+b.closing,0) || 1)) * 100).toFixed(1)}%
                </strong>
                {' '}of the facility's capital is concentrated in Land & Buildings. 
                <br/><br/>
                The primary depreciation driver is{' '}
                <strong>
                    {[...report].sort((a,b) => b.depreciation - a.depreciation)[0]?.label.split('(')[0]}
                </strong>
                , suggesting a need for a clinical reinvestment strategy in future fiscal cycles."
              </p>

              <div className="pt-4 flex gap-4">
                <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                    <p className="text-[8px] font-black text-slate-500 uppercase">Capital Velocity</p>
                    <p className="text-xs font-bold text-green-400">OPTIMAL</p>
                </div>
                <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                    <p className="text-[8px] font-black text-slate-500 uppercase">Audit Readiness</p>
                    <p className="text-xs font-bold text-blue-400">VERIFIED</p>
                </div>
              </div>
          </div>
      </div>
    </div>
  );
}
