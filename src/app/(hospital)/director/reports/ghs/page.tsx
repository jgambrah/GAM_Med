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

function TallyBox({ label, count, color }: any) {
  const colors: any = {
    blue: "border-blue-600 text-blue-600 bg-blue-50",
    pink: "border-pink-600 text-pink-600 bg-pink-50",
    red: "border-red-600 text-red-600 bg-red-50",
    green: "border-green-600 text-green-700 bg-green-50",
  };
  return (
    <div className={`p-4 border-b-8 rounded-2xl ${colors[color]} flex flex-col items-center justify-center transition-all animate-in zoom-in`}>
      <span className="text-[9px] font-black uppercase tracking-tighter mb-1">{label}</span>
      <span className="text-3xl font-black">{count}</span>
    </div>
  );
}

function ReportStat({ label, value, icon: Icon, color }: any) {
  return (
    <div className={`bg-white p-4 rounded-2xl border-l-8 ${color} shadow-sm`}>
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6" />
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase">{label}</p>
          <p className="text-2xl font-black text-black">{value}</p>
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
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    // Redirect SUPER_ADMIN to their global health dashboard
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
    
    // Aggregate Maternal Health
    const ancVisits = (encounters || []).filter(doc => doc.type === 'ANC Visit');
    const malariaInPregnancy = ancVisits.filter(doc => doc.diagnosis?.toLowerCase().includes('malaria')).length;
    
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
      maternalDeaths: 0, // Placeholder
      mortalityCount: mortality?.length || 0,
      totalANC: ancVisits.length,
      malariaInPregnancy,
      svdCount,
      csCount,
      totalDeliveries: deliveries?.length || 0,
      anc1: 0, // Placeholder
      anc4: 0, // Placeholder
    };
  }, [encounters, mortality, admissions, deliveries]);

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
    ];
  
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (isProfileLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  // This page is not for SUPER_ADMIN, they are redirected.
  // This check is for other roles who might navigate here directly.
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

  // Don't render the rest of the component if the user is a super admin, as they will be redirected.
  if (userProfile?.role === 'SUPER_ADMIN') {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }


  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto text-black font-bold">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b-8 border-slate-900 pb-8 gap-6">
        <div>
           <div className="flex items-center gap-3 text-blue-600 mb-2">
              <Landmark size={32} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Government & Regulatory Affairs</span>
           </div>
           <h1 className="text-5xl font-black uppercase tracking-tighter italic">Statutory <span className="text-blue-600">Returns</span></h1>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-4 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
           <select 
             className="bg-transparent font-black uppercase text-xs outline-none"
             value={period.month} onChange={e => setPeriod({...period, month: Number(e.target.value)})}
           >
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => <option key={i} value={i}>{m}</option>)}
           </select>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-2xl">
        <h3 className="text-xl font-black uppercase italic mb-6 flex items-center gap-2">
          <Activity className="text-blue-600" /> Live GHS Tally Sheet (Current Month)
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TallyBox label="OPD Attendance" count={reportData.totalOPD} color="blue" />
          <TallyBox label="SVD Deliveries" count={reportData.svdCount} color="pink" />
          <TallyBox label="C-Sections" count={reportData.csCount} color="red" />
          <TallyBox label="Total Births" count={reportData.totalDeliveries} color="green" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* EXPORT OPTIONS SIDEBAR */}
        <div className="space-y-4">
           <ExportCard title="GHS Form 1 (Monthly)" desc="Outpatient Morbidity Returns" icon={<ClipboardList className="text-blue-600"/>} />
           <ExportCard title="Mortality Return" desc="HeFRA/GHS Death Certification List" icon={<Skull className="text-red-600"/>} />
           <ExportCard title="Maternal Health" desc="ANC & Delivery Statistics" icon={<Baby className="text-pink-600"/>} />
           <ExportCard title="DHIMS2 Export" desc="CSV formatted for Bulk Upload" icon={<FileDown className="text-green-600"/>} />
        </div>

        {/* PREVIEW OF AGGREGATED DATA */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[50px] border-4 border-slate-100 shadow-sm space-y-8">
           <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">GHS Morbidity Preview (Top Diseases)</h3>
              <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-4 py-1 rounded-full uppercase italic">Live Data Feed</span>
           </div>

           <div className="space-y-4">
              {isLoading ? (
                <div className="p-20 text-center"><Loader2 className="animate-spin text-primary" /></div>
              ) : reportData.morbidity.length === 0 ? (
                <div className="p-20 text-center text-slate-300 italic uppercase text-xs">No morbidity data for this period.</div>
              ) : (
                reportData.morbidity.map((m, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-blue-100 transition-all">
                     <span className="text-sm uppercase font-black">{m.name}</span>
                     <div className="flex items-center gap-4">
                        <div className="h-2 w-32 bg-slate-200 rounded-full overflow-hidden">
                           <div className="bg-blue-600 h-full" style={{ width: `${(m.count / reportData.totalOPD) * 100}%` }} />
                        </div>
                        <span className="text-lg font-black text-blue-600">{m.count}</span>
                     </div>
                  </div>
                ))
              )}
           </div>

           <div className="pt-8 border-t border-dashed">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">GHS Form 1B: Maternal & Newborn Health</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ReportStat label="Total ANC Visits" value={reportData.totalANC} icon={Users} color="border-pink-500" />
                    <ReportStat label="Total Deliveries" value={reportData.totalDeliveries} icon={Baby} color="border-pink-500" />
                    <ReportStat label="SVD / CS" value={`${reportData.svdCount} / ${reportData.csCount}`} icon={Activity} color="border-blue-500" />
                    <ReportStat label="Malaria in Preg." value={reportData.malariaInPregnancy} icon={AlertTriangle} color="border-red-500" />
                </div>
           </div>

           <div className="pt-8 flex gap-4 border-t border-dashed">
              <button className="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                 <Printer size={18}/> Print GHS Return
              </button>
              <button onClick={exportToDHIMS2} className="flex-1 bg-white border-4 border-slate-900 text-black py-5 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all">
                 <Download size={18}/> Download DHIMS2 CSV
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function ExportCard({ title, desc, icon }: any) {
    return (
        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm hover:border-blue-600 transition-all cursor-pointer group">
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
