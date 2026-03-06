'use client';

import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { Loader2, ShieldAlert, Building2, Users, Wallet, Zap, Map, TrendingUp, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import Link from 'next/link';

export default function CEOMasterAnalytics() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [claims, setClaims] = useState<any>(null);
  const [isClaimsLoading, setIsClaimsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult(true).then((idTokenResult) => {
        setClaims(idTokenResult.claims);
        setIsClaimsLoading(false);
      });
    } else if (!isUserLoading) {
        setIsClaimsLoading(false);
    }
  }, [user, isUserLoading]);
  
  const isSuperAdmin = claims?.role === 'SUPER_ADMIN';

  // --- Data Fetching ---
  const hospitalsQuery = useMemoFirebase(() => isSuperAdmin && firestore ? query(collection(firestore, "hospitals"), orderBy("createdAt", "desc")) : null, [firestore, isSuperAdmin]);
  const { data: hospitals, isLoading: areHospitalsLoading } = useCollection(hospitalsQuery);
  
  const platformConfigRef = useMemoFirebase(() => isSuperAdmin && firestore ? doc(firestore, 'platform_config', 'summary') : null, [firestore, isSuperAdmin]);
  const { data: platformConfig, isLoading: isConfigLoading } = useDoc(platformConfigRef);

  const pricingPlansQuery = useMemoFirebase(() => isSuperAdmin && firestore ? collection(firestore, 'pricing_plans') : null, [firestore, isSuperAdmin]);
  const { data: pricingPlans } = useCollection(pricingPlansQuery);

  const regionalData = useMemo(() => {
    if (!platformConfig?.regionalBreakdown) return [];
    return Object.entries(platformConfig.regionalBreakdown).map(([name, value]) => ({ name, value: value as number }));
  }, [platformConfig]);

  const projectedARR = useMemo(() => {
    if (!hospitals || !pricingPlans) return 0;
    const mrr = hospitals
        .filter(h => h.status === 'active')
        .reduce((total, hospital) => {
            const plan = pricingPlans.find(p => p.id === hospital.subscriptionPlan);
            const priceValue = plan?.monthlyPrice || 0;
            return total + priceValue;
    }, 0);
    return mrr * 12;
  }, [hospitals, pricingPlans]);
  
  const isLoading = isUserLoading || isClaimsLoading || areHospitalsLoading || isConfigLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
     return (
         <div className="flex flex-1 items-center justify-center bg-background p-4">
            <div className="text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have SUPER_ADMIN privileges.</p>
                 <Button onClick={() => router.push('/')} className="mt-4">Return to Login</Button>
            </div>
         </div>
    );
  }

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto text-black font-bold">
      {/* --- CEO HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-8 border-slate-900 pb-8">
        <div>
           <div className="flex items-center gap-3 text-blue-600 mb-2">
              <Zap size={32} className="fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Gam IT Solutions • Proprietary System</span>
           </div>
           <h1 className="text-6xl font-black uppercase tracking-tighter italic leading-none">Global <span className="text-blue-600">Command</span></h1>
        </div>
        <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-2xl flex items-center gap-6">
           <div className="text-right">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Platform Status</p>
              <p className="text-xl font-black uppercase italic">Healthy / Online</p>
           </div>
           <div className="w-12 h-12 rounded-full border-4 border-green-500 flex items-center justify-center animate-pulse">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
           </div>
        </div>
      </div>

      {/* --- MASTER KPI GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <GlobalCard label="Total Network Facilities" value={platformConfig?.totalFacilities?.toString() ?? '0'} icon={<Building2/>} color="blue" />
        <GlobalCard label="Total Lives Managed" value={platformConfig?.totalPatients?.toLocaleString() ?? '0'} icon={<Users/>} color="purple" />
        <GlobalCard label="Annual Recurring Revenue (ARR)" value={`₵ ${projectedARR.toLocaleString()}`} icon={<Wallet/>} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* --- REGIONAL HEATMAP (GHANA) --- */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[50px] border-4 border-slate-100 shadow-sm space-y-8">
           <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Map size={18} className="text-blue-600" /> Regional Density Heatmap
              </h3>
              <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-4 py-1 rounded-full uppercase">Ghana Operations</span>
           </div>
           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionalData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'black'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'black'}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)'}} />
                  <Bar dataKey="value" radius={[15, 15, 0, 0]} barSize={50}>
                    {regionalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2563eb' : '#0f172a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* --- SUBSCRIPTION REVENUE QUEUE --- */}
        <div className="space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-2">
              <CreditCard size={18} className="text-green-600" /> SaaS Billing Status
           </h3>
           <div className="bg-white rounded-[40px] border-4 border-slate-900 overflow-hidden shadow-2xl divide-y-4 divide-slate-900">
              {hospitals?.slice(0, 5).map(h => {
                const plan = pricingPlans?.find(p => p.id === h.subscriptionPlan);
                const price = plan?.monthlyPrice || 0;
                return (
                    <div key={h.id} className="p-6 space-y-3">
                       <div className="flex justify-between items-center">
                          <p className="font-black text-xs uppercase text-black truncate w-40">{h.name}</p>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${h.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {h.status}
                          </span>
                       </div>
                       <div className="flex justify-between items-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">Tier: {h.subscriptionPlan || 'PRO'}</p>
                          <p className="text-xs font-black text-blue-600">₵ {price.toLocaleString()}/mo</p>
                       </div>
                    </div>
                )
              })}
              <div className="p-6 bg-slate-900">
                 <Link href="/app-ceo/billing">
                  <Button variant="outline" className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all">
                      Open Billing Manager
                  </Button>
                </Link>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function GlobalCard({ label, value, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-600 text-white shadow-blue-200",
    purple: "bg-slate-900 text-white shadow-slate-200",
    green: "bg-emerald-500 text-white shadow-emerald-200",
  };
  return (
    <div className={`${colors[color]} p-10 rounded-[50px] shadow-2xl transition-all hover:-translate-y-2 relative overflow-hidden group`}>
       <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform">
          {icon && <div className="w-32 h-32">{icon}</div>}
       </div>
       <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{label}</p>
       <h3 className="text-4xl font-black tracking-tighter italic">{value}</h3>
       <div className="mt-6 flex items-center gap-2">
          <TrendingUp size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Global Live Growth</span>
       </div>
    </div>
  );
}
