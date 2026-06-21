'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, doc, collectionGroup } from 'firebase/firestore';
import { 
  FileDown, ShieldCheck, ClipboardList, Activity, 
  Users, Skull, Baby, Download, Printer, Loader2, Landmark, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Cell, PieChart, Pie, Legend
} from 'recharts';

function TallyBox({ id, label, count, color }: any) {
  const colors: any = {
    blue: "border-blue-600 text-blue-600 bg-blue-50/50 shadow-[4px_4px_0px_0px_rgba(37,99,235,1)]",
    pink: "border-pink-600 text-pink-600 bg-pink-50/50 shadow-[4px_4px_0px_0px_rgba(219,39,119,1)]",
    red: "border-red-600 text-red-600 bg-red-50/50 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]",
    green: "border-green-600 text-green-700 bg-green-50/50 shadow-[4px_4px_0px_0px_rgba(22,163,74,1)]",
  };
  return (
    <div id={id} className={`p-6 border-4 rounded-3xl ${colors[color]} flex flex-col items-center justify-center transition-all hover:-translate-y-1 hover:shadow-md animate-in zoom-in-95`}>
      <span className="text-[10px] font-black uppercase tracking-wider mb-2 text-slate-500">{label}</span>
      <span className="text-4xl font-black italic tracking-tighter">{count}</span>
    </div>
  );
}

function ReportStat({ id, label, value, icon: Icon, color }: any) {
  return (
    <div id={id} className={`bg-slate-50/50 p-5 rounded-3xl border-2 border-slate-200 border-l-8 ${color} shadow-sm transition-all hover:border-slate-300`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white rounded-2xl shadow-sm">
           <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">{label}</p>
          <p className="text-2xl font-black text-slate-900 mt-1 italic tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function GHSComplianceHub() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [period, setPeriod] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  
  // Real-time states for ANC 1st/4th visit calculations
  const [anc1, setAnc1] = useState(0);
  const [anc4, setAnc4] = useState(0);
  const [loadingANCStats, setLoadingANCStats] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    if (userProfile && userProfile.role === 'SUPER_ADMIN') {
        toast({ title: "Redirecting...", description: "Accessing Global Health Insights instead." });
        router.replace('/app-ceo/health-insights');
    }
  }, [userProfile, router, toast]);
  
  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = userProfile?.role === 'DIRECTOR' || userProfile?.role === 'ADMIN';

  const { startTs, endTs } = useMemo(() => {
    const start = new Date(period.year, period.month, 1);
    const end = new Date(period.year, period.month + 1, 0, 23, 59, 59);
    return {
      startTs: Timestamp.fromDate(start),
      endTs: Timestamp.fromDate(end),
    };
  }, [period]);

  // LIVE DATA QUERIES
  const encountersQuery = useMemoFirebase(() => hospitalId ? query(collectionGroup(firestore, "encounters"), where("hospitalId", "==", hospitalId), where("createdAt", ">=", startTs), where("createdAt", "<=", endTs)) : null, [firestore, hospitalId, startTs, endTs]);
  const mortalityQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/mortality_archive`), where("createdAt", ">=", startTs), where("createdAt", "<=", endTs)) : null, [firestore, hospitalId, startTs, endTs]);
  const admissionsQuery = useMemoFirebase(() => hospitalId ? query(collection(firestore, `hospitals/${hospitalId}/admissions`), where("admittedAt", ">=", startTs), where("admittedAt", "<=", endTs)) : null, [firestore, hospitalId, startTs, endTs]);
  const deliveriesQuery = useMemoFirebase(() => hospitalId ? query(collectionGroup(firestore, "deliveries"), where("hospitalId", "==", hospitalId), where("deliveryDate", ">=", format(startTs.toDate(), 'yyyy-MM-dd')), where("deliveryDate", "<=", format(endTs.toDate(), 'yyyy-MM-dd'))) : null, [firestore, hospitalId, startTs, endTs]);

  const { data: encounters, isLoading: encountersLoading } = useCollection(encountersQuery);
  const { data: mortality, isLoading: mortalityLoading } = useCollection(mortalityQuery);
  const { data: admissions, isLoading: admissionsLoading } = useCollection(admissionsQuery);
  const { data: deliveries, isLoading: deliveriesLoading } = useCollection(deliveriesQuery);

  // Filter ANC visits
  const ancEncounters = useMemo(() => {
    return (encounters || []).filter((d: any) => d.encounterType === 'ANC Visit' || d.type === 'ANC Visit');
  }, [encounters]);

  // Dynamic ANC visit sequence tracking (ANC 1 vs ANC 4)
  useEffect(() => {
    if (!firestore || !hospitalId || !ancEncounters || ancEncounters.length === 0) {
      setAnc1(0);
      setAnc4(0);
      return;
    }

    let isMounted = true;
    const fetchAncHistory = async () => {
      setLoadingANCStats(true);
      try {
        const patientIds = Array.from(new Set(ancEncounters.map((d: any) => d.patientId).filter(Boolean)));
        
        let count1 = 0;
        let count4 = 0;

        await Promise.all(patientIds.map(async (patientId) => {
          const q = query(
            collection(firestore, `hospitals/${hospitalId}/patients/${patientId}/encounters`),
            where("encounterType", "==", "ANC Visit")
          );
          const snap = await getDocs(q);
          const history = snap.docs.map(doc => ({
            id: doc.id,
            maternityProfileId: doc.data().maternityProfileId || null,
            createdAt: doc.data().createdAt?.toDate() || new Date(0)
          })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

          const patientMonthVisits = ancEncounters.filter((d: any) => d.patientId === patientId);
          patientMonthVisits.forEach((encounter: any) => {
            const profileHistory = history.filter(h => h.maternityProfileId === encounter.maternityProfileId);
            const idx = profileHistory.findIndex(h => h.id === encounter.id);
            if (idx === 0) {
              count1++;
            } else if (idx === 3) {
              count4++;
            }
          });
        }));

        if (isMounted) {
          setAnc1(count1);
          setAnc4(count4);
        }
      } catch (err) {
        console.error("Error calculating ANC stats:", err);
      } finally {
        if (isMounted) {
          setLoadingANCStats(false);
        }
      }
    };

    fetchAncHistory();
    return () => { isMounted = false; };
  }, [ancEncounters, firestore, hospitalId]);

  // Live certified maternal deaths
  const maternalDeaths = useMemo(() => {
    return (mortality || []).filter((d: any) => d.isMaternalDeath === true).length;
  }, [mortality]);

  const reportData = useMemo(() => {
    // Aggregate Morbidity
    const morbidityMap: any = {};
    (encounters || []).forEach(doc => {
      const diagnosis = doc.diagnosis;
      if(diagnosis) {
        morbidityMap[diagnosis] = (morbidityMap[diagnosis] || 0) + 1;
      }
    });
    const sortedMorbidity = Object.entries(morbidityMap).map(([name, count]) => ({ name, count })).sort((a, b) => (b.count as number) - (a.count as number));
    
    let svdCount = 0;
    let csCount = 0;
    (deliveries || []).forEach(doc => {
        if (doc.modeOfDelivery === 'SVD') svdCount++;
        if (doc.modeOfDelivery === 'C-Section') csCount++;
    });

    return {
      morbidity: sortedMorbidity,
      totalOPD: encounters?.length || 0,
      totalIPD: admissions?.length || 0,
      maternalDeaths,
      mortalityCount: mortality?.length || 0,
      totalANC: ancEncounters.length,
      malariaInPregnancy: ancEncounters.filter(doc => doc.diagnosis?.toLowerCase().includes('malaria')).length,
      svdCount,
      csCount,
      totalDeliveries: deliveries?.length || 0,
      anc1,
      anc4,
    };
  }, [encounters, mortality, admissions, deliveries, ancEncounters, anc1, anc4, maternalDeaths]);

  const isLoading = isProfileLoading || encountersLoading || mortalityLoading || admissionsLoading || deliveriesLoading;

  const exportToDHIMS2 = () => {
    const formattedPeriod = `${period.year}${String(period.month + 1).padStart(2, '0')}`;
    const filename = `DHIMS2_Export_${hospitalId}_${formattedPeriod}.csv`;
    
    const headers = ["Data Element", "Value", "Period", "OrgUnit"];
    const rows = [
      ["OPD_Total_Attendance", reportData.totalOPD, formattedPeriod, hospitalId],
      ["ANC_1st_Visits", reportData.anc1, formattedPeriod, hospitalId],
      ["ANC_4th_Visits", reportData.anc4, formattedPeriod, hospitalId],
      ["Malaria_In_Pregnancy", reportData.malariaInPregnancy, formattedPeriod, hospitalId],
      ["Deliveries_SVD", reportData.svdCount, formattedPeriod, hospitalId],
      ["Deliveries_CS", reportData.csCount, formattedPeriod, hospitalId],
      ["Maternal_Deaths", reportData.maternalDeaths, formattedPeriod, hospitalId],
    ];
  
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "DHIMS2 CSV Downloaded", description: `Statutory file saved: ${filename}` });
  };
  
  // Recharts Morbidity Data
  const chartMorbidityData = useMemo(() => {
    return reportData.morbidity.slice(0, 5).map((m: any) => ({
      name: m.name.length > 20 ? `${m.name.slice(0, 18)}...` : m.name,
      cases: m.count,
    }));
  }, [reportData.morbidity]);

  // Recharts Delivery Mode Data
  const chartDeliveryData = useMemo(() => {
    return [
      { name: 'SVD', value: reportData.svdCount, fill: '#db2777' },
      { name: 'C-Section', value: reportData.csCount, fill: '#dc2626' },
      { name: 'Assisted', value: reportData.totalDeliveries - (reportData.svdCount + reportData.csCount), fill: '#2563eb' }
    ].filter(d => d.value > 0);
  }, [reportData.svdCount, reportData.csCount, reportData.totalDeliveries]);

  if (isProfileLoading) {
    return <div className="flex h-full w-full items-center justify-center p-20"><Loader2 className="h-16 w-16 animate-spin text-primary" /><p className="ml-4 font-bold text-muted-foreground">Authenticating session...</p></div>;
  }
  
  if (!isAuthorized && userProfile?.role !== 'SUPER_ADMIN') {
     return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized to view GHS Returns.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  if (userProfile?.role === 'SUPER_ADMIN') {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-2 md:p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      
      {/* Dynamic styling for printing return forms */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 12px !important;
          }
          .screen-only {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .page-break-before {
            page-break-before: always;
          }
        }
      `}} />

      {/* SCREEN CONTAINER - HIDDEN ON PRINT */}
      <div className="screen-only space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end border-b-8 border-slate-900 pb-8 gap-6">
          <div>
             <div className="flex items-center gap-3 text-blue-600 mb-2">
                <Landmark size={32} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Government & Regulatory Affairs</span>
             </div>
             <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Statutory <span className="text-blue-600">Returns</span></h1>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-4 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
             <select 
               id="period-month-select"
               className="bg-transparent font-black uppercase text-xs outline-none cursor-pointer"
               value={period.month} onChange={e => setPeriod({...period, month: Number(e.target.value)})}
             >
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => <option key={i} value={i}>{m}</option>)}
             </select>
             <div className="h-4 w-px bg-slate-300" />
             <select
               id="period-year-select"
               className="bg-transparent font-black uppercase text-xs outline-none cursor-pointer"
               value={period.year} onChange={e => setPeriod({...period, year: Number(e.target.value)})}
             >
               {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>
        </div>
        
        {/* LIVE STATS CARDS */}
        <div className="bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-2xl">
          <h3 className="text-xl font-black uppercase italic mb-6 flex items-center gap-2">
            <Activity className="text-blue-600" /> Live GHS Tally Sheet (Current Month)
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <TallyBox id="tally-opd" label="OPD Attendance" count={reportData.totalOPD} color="blue" />
            <TallyBox id="tally-svd" label="SVD Deliveries" count={reportData.svdCount} color="pink" />
            <TallyBox id="tally-cs" label="C-Sections" count={reportData.csCount} color="red" />
            <TallyBox id="tally-births" label="Total Births" count={reportData.totalDeliveries} color="green" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* EXPORT OPTIONS SIDEBAR */}
          <div className="space-y-4">
             <ExportCard title="GHS Form 1 (Monthly)" desc="Outpatient Morbidity Returns" icon={<ClipboardList className="text-blue-600"/>} onClick={() => window.print()} />
             <ExportCard title="Mortality Return" desc="HeFRA/GHS Death Certification List" icon={<Skull className="text-red-600"/>} onClick={() => window.print()} />
             <ExportCard title="Maternal Health" desc="ANC & Delivery Statistics" icon={<Baby className="text-pink-600"/>} onClick={() => window.print()} />
             <ExportCard title="DHIMS2 Export" desc="CSV formatted for Bulk Upload" icon={<FileDown className="text-green-600"/>} onClick={exportToDHIMS2} />
          </div>

          {/* PREVIEW & CHARTS BLOCK */}
          <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[50px] border-4 border-slate-100 shadow-sm space-y-8">
             
             {/* GHS Morbidity List */}
             <div>
               <div className="flex justify-between items-center border-b pb-4 mb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">GHS Morbidity Preview (Top Diseases)</h3>
                  <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-4 py-1 rounded-full uppercase italic">Live Data Feed</span>
               </div>

               <div className="space-y-3">
                  {isLoading ? (
                    <div className="p-12 text-center"><Loader2 className="animate-spin text-primary mx-auto" /></div>
                  ) : reportData.morbidity.length === 0 ? (
                    <div className="p-12 text-center text-slate-300 italic uppercase text-xs">No morbidity data for this period.</div>
                  ) : (
                    reportData.morbidity.slice(0, 5).map((m: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-blue-100 transition-all">
                         <span className="text-xs uppercase font-black">{m.name}</span>
                         <div className="flex items-center gap-4">
                            <div className="h-2 w-24 md:w-32 bg-slate-200 rounded-full overflow-hidden">
                               <div className="bg-blue-600 h-full" style={{ width: `${(m.count / reportData.totalOPD) * 100}%` }} />
                            </div>
                            <span className="text-base font-black text-blue-600">{m.count}</span>
                         </div>
                      </div>
                    ))
                  )}
               </div>
             </div>

             {/* CHARTS CONTAINER */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-dashed">
                
                {/* Chart 1: Morbidity BarChart */}
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">OPD Morbidity Distribution</p>
                  <div className="h-[200px]">
                     {chartMorbidityData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-slate-300 italic">No morbidity data.</div>
                     ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartMorbidityData}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                             <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                             <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                             <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12, fontWeight: 'bold' }} />
                             <Bar dataKey="cases" radius={[4, 4, 0, 0]}>
                               {chartMorbidityData.map((entry: any, index: number) => (
                                 <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                               ))}
                             </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                     )}
                  </div>
                </div>

                {/* Chart 2: Delivery Breakdown PieChart */}
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Mode of Delivery Distribution</p>
                  <div className="h-[200px] flex items-center justify-center">
                     {chartDeliveryData.length === 0 ? (
                        <div className="text-xs text-slate-300 italic">No delivery data recorded.</div>
                     ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartDeliveryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {chartDeliveryData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: 10, borderRadius: 12, fontWeight: 'bold' }} />
                            <Legend wrapperStyle={{ fontSize: 9 }} />
                          </PieChart>
                        </ResponsiveContainer>
                     )}
                  </div>
                </div>
             </div>

             {/* GHS Form 1B stats */}
             <div className="pt-8 border-t border-dashed">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">GHS Form 1B: Maternal & Newborn Health</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <ReportStat id="stat-anc" label="Total ANC Visits" value={reportData.totalANC} icon={Users} color="border-pink-500" />
                      <ReportStat id="stat-deliveries" label="Total Deliveries" value={reportData.totalDeliveries} icon={Baby} color="border-pink-500" />
                      <ReportStat id="stat-svdcs" label="SVD / CS" value={`${reportData.svdCount} / ${reportData.csCount}`} icon={Activity} color="border-blue-500" />
                      <ReportStat id="stat-malaria" label="Malaria in Preg." value={reportData.malariaInPregnancy} icon={AlertTriangle} color="border-red-500" />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      <ReportStat id="stat-anc1" label="ANC 1st Visits" value={loadingANCStats ? '...' : reportData.anc1} icon={Users} color="border-emerald-500" />
                      <ReportStat id="stat-anc4" label="ANC 4th Visits" value={loadingANCStats ? '...' : reportData.anc4} icon={Users} color="border-emerald-500" />
                      <ReportStat id="stat-deaths" label="Maternal Deaths" value={reportData.maternalDeaths} icon={Skull} color="border-red-600" />
                  </div>
             </div>

             {/* ACTIONS BUTTONS */}
             <div className="pt-8 flex gap-4 border-t border-dashed">
                <button 
                  id="print-returns-btn"
                  onClick={() => window.print()}
                  className="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-md active:scale-[0.98]"
                >
                   <Printer size={18}/> Print GHS Return
                </button>
                <button 
                  id="download-csv-btn"
                  onClick={exportToDHIMS2} 
                  className="flex-1 bg-white border-4 border-slate-900 text-black py-5 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-md active:scale-[0.98]"
                >
                   <Download size={18}/> Download DHIMS2 CSV
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* PRINT LAYOUT - VISIBLE ONLY WHEN PRINTED */}
      <div className="hidden print:block space-y-8 bg-white p-8 text-black font-serif">
         <div className="text-center border-b-4 border-black pb-4">
             <h1 className="text-3xl font-extrabold uppercase">Ghana Health Service</h1>
             <p className="text-sm font-bold uppercase tracking-widest mt-1">Statutory Monthly Return (Form 1 & 1B)</p>
             <div className="flex justify-between items-center text-xs mt-6 font-mono font-bold">
                 <span>FACILITY CODE: {hospitalId}</span>
                 <span>REPORTING PERIOD: {format(startTs.toDate(), 'MMMM yyyy').toUpperCase()}</span>
                 <span>GENERATED ON: {format(new Date(), 'dd-MM-yyyy HH:mm')}</span>
             </div>
         </div>

         {/* Form 1: Morbidity Return */}
         <div className="space-y-4 pt-4">
             <h2 className="text-base font-bold border-b-2 border-black pb-1 uppercase tracking-wider">GHS Form 1: Outpatient Morbidity Returns</h2>
             <table className="w-full text-left text-xs border-collapse">
                 <thead>
                     <tr className="border-b-2 border-black font-bold uppercase">
                         <th className="py-2 w-16">No.</th>
                         <th className="py-2">Disease Description / ICD-10 Category</th>
                         <th className="py-2 text-right w-32">Tally Count</th>
                     </tr>
                 </thead>
                 <tbody>
                     {reportData.morbidity.length === 0 ? (
                       <tr><td colSpan={3} className="py-4 text-center italic">No morbidity entries recorded.</td></tr>
                     ) : (
                       reportData.morbidity.map((m: any, idx: number) => (
                         <tr key={idx} className="border-b border-gray-300">
                             <td className="py-2 font-mono">{idx + 1}</td>
                             <td className="py-2 uppercase font-mono">{m.name}</td>
                             <td className="py-2 text-right font-mono font-bold">{m.count}</td>
                         </tr>
                       ))
                     )}
                 </tbody>
             </table>
         </div>

         {/* Form 1B: Maternal & Newborn Returns */}
         <div className="space-y-4 pt-8 page-break-before">
             <h2 className="text-base font-bold border-b-2 border-black pb-1 uppercase tracking-wider">GHS Form 1B: Maternal & Newborn Returns</h2>
             <table className="w-full text-left text-xs border-collapse">
                 <thead>
                     <tr className="border-b-2 border-black font-bold uppercase">
                         <th className="py-2">Indicator / Data Element</th>
                         <th className="py-2 text-right w-32">Reporting Value</th>
                     </tr>
                 </thead>
                 <tbody>
                     <tr className="border-b border-gray-300">
                         <td className="py-2">Total OPD Attendance</td>
                         <td className="py-2 text-right font-mono font-bold">{reportData.totalOPD}</td>
                     </tr>
                     <tr className="border-b border-gray-300">
                         <td className="py-2">Antenatal Care (ANC) Registration / 1st Visits (ANC 1)</td>
                         <td className="py-2 text-right font-mono font-bold">{loadingANCStats ? 'Loading...' : anc1}</td>
                     </tr>
                     <tr className="border-b border-gray-300">
                         <td className="py-2">Antenatal Care (ANC) 4th Visits (ANC 4)</td>
                         <td className="py-2 text-right font-mono font-bold">{loadingANCStats ? 'Loading...' : anc4}</td>
                     </tr>
                     <tr className="border-b border-gray-300">
                         <td className="py-2">Malaria in Pregnancy (diagnosed during ANC)</td>
                         <td className="py-2 text-right font-mono font-bold">{reportData.malariaInPregnancy}</td>
                     </tr>
                     <tr className="border-b border-gray-300">
                         <td className="py-2">Total Facility Deliveries</td>
                         <td className="py-2 text-right font-mono font-bold">{reportData.totalDeliveries}</td>
                     </tr>
                     <tr className="border-b border-gray-300">
                         <td className="py-2">Spontaneous Vaginal Deliveries (SVD)</td>
                         <td className="py-2 text-right font-mono font-bold">{reportData.svdCount}</td>
                     </tr>
                     <tr className="border-b border-gray-300">
                         <td className="py-2">Caesarean Section Deliveries (CS)</td>
                         <td className="py-2 text-right font-mono font-bold">{reportData.csCount}</td>
                     </tr>
                     <tr className="border-b border-gray-300">
                         <td className="py-2">Maternal Deaths (In-Facility & Postpartum)</td>
                         <td className="py-2 text-right font-mono font-bold">{maternalDeaths}</td>
                     </tr>
                 </tbody>
             </table>
         </div>

         {/* Signatures */}
         <div className="pt-20 flex justify-between text-xs">
             <div className="border-t border-black pt-2 w-64 text-center font-mono">
                 <p className="font-bold">Prepared By: {userProfile?.fullName}</p>
                 <p className="text-gray-500 uppercase tracking-widest text-[9px] mt-0.5">Records Officer / Clinician</p>
             </div>
             <div className="border-t border-black pt-2 w-64 text-center font-mono">
                 <p className="font-bold">Certified Correct: Medical Director</p>
                 <p className="text-gray-500 uppercase tracking-widest text-[9px] mt-0.5">Signature & Official Stamp</p>
             </div>
         </div>
      </div>

    </div>
  );
}

function ExportCard({ title, desc, icon, onClick }: any) {
    return (
        <div onClick={onClick} className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm hover:border-blue-600 transition-all cursor-pointer group active:scale-[0.98]">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-all">{icon}</div>
                <div>
                    <p className="text-xs font-black uppercase text-black">{title}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase italic leading-tight">{desc}</p>
                </div>
            </div>
        </div>
    );
}
