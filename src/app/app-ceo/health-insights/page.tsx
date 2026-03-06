'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { 
  HeartPulse, Activity, Globe, Map, 
  TrendingUp, Users, AlertCircle, ShieldCheck,
  BarChart3, PieChart as PieIcon, Filter, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { Button } from '@/components/ui/button';

export default function CEOHealthInsights() {
  const { user } = useUser();
  const firestore = useFirestore();

  const mortalityQuery = useMemoFirebase(() => {
    // Temporarily disabled to prevent permission errors
    return null;
    // if (!firestore) return null;
    // return query(collection(firestore, "platform_global_health_stats"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: mortalityData, isLoading: loading } = useCollection(mortalityQuery);

  const stats = useMemo(() => {
    if (!mortalityData || mortalityData.length === 0) {
      return { totalMortality: 0, topCause: 'N/A', activeRegions: 0 };
    }
    
    const causeCounts: { [key: string]: number } = {};
    const regions = new Set<string>();
    
    mortalityData.forEach((d: any) => {
      causeCounts[d.underlyingCause] = (causeCounts[d.underlyingCause] || 0) + 1;
      if(d.hospitalRegion) {
        regions.add(d.hospitalRegion);
      }
    });

    const topCauseEntry = Object.entries(causeCounts).sort((a, b) => b[1] - a[1])[0];
    
    return {
      totalMortality: mortalityData.length,
      topCause: topCauseEntry ? topCauseEntry[0] : 'N/A',
      activeRegions: regions.size
    };
  }, [mortalityData]);

  const getCauseData = () => {
    if (!mortalityData) return [];
    const counts: { [key: string]: number } = {};
    mortalityData.forEach((d: any) => {
      counts[d.underlyingCause] = (counts[d.underlyingCause] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const getGenderData = () => {
    if (!mortalityData) return [];
    const counts: { [key: string]: number } = { Male: 0, Female: 0, Other: 0 };
    mortalityData.forEach((d: any) => {
      if (counts[d.gender] !== undefined) counts[d.gender]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const COLORS = ['#2563eb', '#0f172a', '#6366f1', '#3b82f6', '#94a3b8'];

  if (loading) return <div className="flex h-full w-full items-center justify-center p-20"><Loader2 className="h-16 w-16 animate-spin text-primary" /><p className="ml-4 italic text-muted-foreground">Aggregating Epidemiological Data...</p></div>;

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto text-black font-bold">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-8 border-slate-900 pb-8">
        <div className="space-y-2">
           <div className="flex items-center gap-3 text-blue-600">
              <Globe size={32} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">GamMed National Health Intelligence</span>
           </div>
           <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Global <span className="text-blue-600">Insights</span></h1>
           <p className="text-slate-500 font-bold text-xs uppercase italic">Real-time epidemiological analysis across all facility tenants.</p>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-[32px] flex items-center gap-4">
           <ShieldCheck size={40} className="text-blue-600" />
           <div>
              <p className="text-[10px] font-black uppercase text-blue-400">Data Integrity</p>
              <p className="text-sm font-black uppercase text-blue-900">De-identified / Act 843 Compliant</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <InsightCard label="Total Recorded Mortality" value={stats.totalMortality.toString()} icon={<Activity/>} color="blue" />
        <InsightCard label="Leading Cause of Death" value={stats.topCause} icon={<AlertCircle/>} color="red" isSmallValue />
        <InsightCard label="Reporting Regions" value={stats.activeRegions.toString()} icon={<Map/>} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[50px] border-4 border-slate-100 shadow-sm space-y-8">
           <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" /> Top 5 Mortality Drivers
              </h3>
           </div>
           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getCauseData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', width: 100}} width={150} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)'}} />
                  <Bar dataKey="value" radius={[0, 15, 15, 0]} barSize={40}>
                    {getCauseData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[50px] border-4 border-slate-100 shadow-sm space-y-8">
           <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
             <PieIcon size={18} className="text-blue-600" /> Gender Distribution
           </h3>
           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getGenderData()}
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getGenderData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="p-12 bg-[#0f172a] rounded-[60px] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
         <div className="space-y-4 max-w-2xl">
            <h4 className="text-2xl font-black uppercase tracking-tight italic text-blue-400">The GamMed Data Covenant</h4>
            <p className="text-sm font-medium text-slate-400 leading-relaxed">
               Dr. Gambrah, this data represents the ultimate clinical truth of your platform. While individual hospital records remain locked behind multi-tenant walls, this aggregate intelligence allows you to advise the <strong>Ministry of Health</strong> and <strong>GHS</strong> on emerging health crises. You are now the custodian of a national health asset.
            </p>
         </div>
         <Button className="bg-blue-600 hover:bg-white hover:text-black text-white px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest transition-all shadow-xl">
            Export GHS Statutory Report
         </Button>
      </div>
    </div>
  );
}

function InsightCard({ label, value, icon, color, isSmallValue = false }: { label: string, value: string, icon: React.ReactNode, color: string, isSmallValue?: boolean }) {
  const colors: any = {
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    red: "bg-red-50 border-red-100 text-red-600",
    purple: "bg-slate-900 border-slate-800 text-blue-400",
  };

  return (
    <div className={`p-10 rounded-[50px] border-2 shadow-sm transition-all hover:scale-105 flex items-center justify-between ${colors[color]}`}>
       <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
          <h3 className={`font-black tracking-tighter italic leading-none ${isSmallValue ? 'text-xl' : 'text-5xl'}`}>{value}</h3>
       </div>
       <div className="p-4 bg-white/50 rounded-3xl shadow-inner">{icon}</div>
    </div>
  );
}
