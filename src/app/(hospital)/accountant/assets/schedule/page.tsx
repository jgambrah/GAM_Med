'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, doc } from 'firebase/firestore';
import { 
  Table, Calendar, Filter, Printer, 
  ArrowUpRight, TrendingDown, Landmark, PieChart as PieChartIcon, Loader2, ShieldAlert
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ASSET_GROUPS } from '@/lib/constants';
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
  const [schedule, setSchedule] = useState<any[]>([]);

  const generateSchedule = async () => {
    if (!dateRange.start || !dateRange.end || !hospitalId) return;
    setLoading(true);

    try {
      const hId = hospitalId;
      // For Firestore Timestamps
      const startTs = Timestamp.fromDate(new Date(dateRange.start));
      const endTs = Timestamp.fromDate(new Date(new Date(dateRange.end).setHours(23, 59, 59)));

      // 1. FETCH ADDITIONS (Filter by Purchase Date String)
      const additionsSnap = await getDocs(query(
        collection(firestore, `hospitals/${hId}/assets`),
        where("purchaseDate", ">=", dateRange.start),
        where("purchaseDate", "<=", dateRange.end)
      ));

      // 2. FETCH DEPRECIATION LOGS (Filter by Log Timestamp)
      const depLogsSnap = await getDocs(query(
        collection(firestore, `hospitals/${hId}/depreciation_history`),
        where("createdAt", ">=", startTs),
        where("createdAt", "<=", endTs)
      ));

      // 3. AGGREGATE DATA
      const newReport = ASSET_GROUPS.map(group => {
        // Sum Additions for this category
        const additions = additionsSnap.docs
          .filter(d => d.data().category === group.id)
          .reduce((sum, d) => sum + (d.data().purchasePrice || 0), 0);

        // Sum Depreciation Logs for this category
        const depreciation = depLogsSnap.docs
          .filter(d => d.data().assetCategory === group.id)
          .reduce((sum, d) => sum + (d.data().amount || 0), 0);

        return {
          ...group,
          additions,
          depreciation,
          netChange: additions - depreciation
        };
      });

      setSchedule(newReport);
      toast({ title: `Schedule generated for ${dateRange.start} to ${dateRange.end}` });
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: "Query Error", description: "Check if Firestore Indexes are enabled." });
    } finally {
      setLoading(false);
    }
  };
  
  const chartData = schedule.map(item => ({
    name: item.label.split('(')[0], // Short name
    value: item.netChange > 0 ? item.netChange : 0
  })).filter(item => item.value > 0);

  const COLORS = ['#2563eb', '#0f172a', '#f59e0b', '#ef4444', '#10b981'];

  const totalAssets = schedule.reduce((acc, curr) => acc + curr.netChange, 0);

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
           <button onClick={generateSchedule} className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-black transition-all">
              {loading ? <Loader2 className="animate-spin" size={18}/> : <Filter size={18}/>}
           </button>
        </div>
      </div>

      {/* --- THE SCHEDULE TABLE --- */}
      <div className="bg-white rounded-[40px] border-4 border-slate-900 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-[0.2em]">
            <tr>
              <th className="p-6">Asset Category</th>
              <th className="p-6 text-right">Additions (₵)</th>
              <th className="p-6 text-right">Depreciation (₵)</th>
              <th className="p-6 text-right">Net Impact (₵)</th>
            </tr>
          </thead>
          <tbody className="divide-y-4 divide-slate-50">
            {schedule.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-slate-300 italic uppercase">Select a period to generate analysis.</td></tr>
            ) : schedule.map((row) => (
              <tr key={row.id} className="hover:bg-blue-50/30 transition-all">
                <td className="p-6">
                   <p className="text-sm font-black uppercase">{row.label}</p>
                   <p className="text-[8px] text-blue-600 font-bold uppercase tracking-widest mt-1">Audit Code: {row.id}</p>
                </td>
                <td className="p-6 text-right text-green-600 font-black">
                   ₵ {row.additions.toLocaleString()}
                </td>
                <td className="p-6 text-right text-red-600 font-black italic">
                   (₵ {row.depreciation.toLocaleString()})
                </td>
                <td className="p-6 text-right">
                   <div className="inline-block px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-black italic">
                      ₵ {row.netChange.toLocaleString()}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t-4 border-slate-900">
             <tr className="text-lg font-black italic">
                <td className="p-6 text-right uppercase text-xs">Total for Period</td>
                <td className="p-6 text-right text-green-600">₵ {schedule.reduce((a,b) => a + b.additions, 0).toLocaleString()}</td>
                <td className="p-6 text-right text-red-600">(₵ {schedule.reduce((a,b) => a + b.depreciation, 0).toLocaleString()})</td>
                <td className="p-6 text-right border-l-4 border-slate-900 bg-blue-50 text-blue-900">
                   ₵ {schedule.reduce((a,b) => a + b.netChange, 0).toLocaleString()}
                </td>
             </tr>
          </tfoot>
        </table>
      </div>

      <div className="print:hidden flex justify-end gap-4">
         <button onClick={() => window.print()} className="bg-white border-4 border-slate-900 px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-lg">
            <Printer size={18} /> Export for Board Review
         </button>
      </div>

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

          <div className="bg-[#0f172a] p-8 rounded-[40px] text-white flex flex-col justify-center space-y-6 shadow-2xl">
              <h4 className="text-xl font-black uppercase italic tracking-tighter text-blue-400">Executive Summary</h4>
              <p className="text-sm font-medium text-slate-400 leading-relaxed italic">
                  "Dr. Gambrah, {((chartData.find(d => d.name.includes('Property'))?.value / totalAssets) * 100 || 0).toFixed(1)}% of your hospital's long-term wealth is currently locked in Land & Buildings. Your highest depreciating category is Equipment, requiring a GHC {schedule.find(r => r.id === 'EQUIPMENT')?.depreciation.toLocaleString() || '0'} cash reserve for future replacement."
              </p>
          </div>
      </div>
    </div>
  );
}
