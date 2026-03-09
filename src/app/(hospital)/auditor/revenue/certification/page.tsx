'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { 
  ShieldCheck, Landmark, Banknote, Smartphone, 
  Printer, CheckCircle2, AlertTriangle, Loader2,
  FileText, BarChart3, TrendingUp, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DailyRevenueCertification() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState<any>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'AUDITOR'].includes(userProfile?.role || '');

  // This query will fetch the data based on the selectedDate
  const verifiedTillsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !selectedDate) return null;
    return query(
      collection(firestore, "hospitals", hospitalId, "cash_tills"),
      where("status", "==", "VERIFIED"),
      where("dateString", "==", selectedDate)
    );
  }, [firestore, hospitalId, selectedDate]);
  
  const { data: verifiedTills, isLoading: tillsLoading } = useCollection(verifiedTillsQuery);
  
  useEffect(() => {
    if (verifiedTills) {
       const totals = verifiedTills.reduce((acc, curr) => ({
        cash: acc.cash + curr.cashSales,
        momo: acc.momo + curr.momoSales,
        shortage: acc.shortage + (curr.shortageAmount || 0),
        count: acc.count + 1
      }), { cash: 0, momo: 0, shortage: 0, count: 0 });
      setSummary(totals);
    }
  }, [verifiedTills]);

  const handleCertifyRevenue = async () => {
    if (!summary || !user || !userProfile || !firestore || !hospitalId) return;
    const confirmSign = confirm(`I hereby certify that ₵ ${(summary.cash + summary.momo).toFixed(2)} has been reconciled and banked for ${selectedDate}. Proceed?`);
    if (!confirmSign) return;

    setLoading(true);
    try {
      const reportId = `DRR-${hospitalId.slice(-4)}-${selectedDate.replace(/-/g, '')}`;
      
      const certificateRef = doc(firestore, "revenue_certificates", reportId);
      // 2. CREATE THE PERMANENT AUDIT CERTIFICATE
      await addDocumentNonBlocking(certificateRef, {
        date: selectedDate,
        hospitalId: hospitalId,
        totalRevenue: summary.cash + summary.momo,
        cashComponent: summary.cash,
        momoComponent: summary.momo,
        totalShortages: summary.shortage,
        certifiedBy: user.uid,
        certifiedByName: userProfile.fullName,
        timestamp: serverTimestamp(),
        status: 'CERTIFIED'
      });

      // 3. LOG FOR CEO FORENSIC AUDIT
      const auditRef = doc(collection(firestore, "global_audit_logs"));
      await addDocumentNonBlocking(auditRef, {
        type: 'FINANCIAL',
        action: 'DAILY_REVENUE_CERTIFIED',
        hospitalId: hospitalId,
        actorId: user.uid,
        actorName: userProfile.fullName,
        details: `Revenue for ${selectedDate} (₵${(summary.cash + summary.momo).toFixed(2)}) formally certified by Internal Audit.`,
        timestamp: serverTimestamp()
      });

      toast({ title: `Revenue for ${selectedDate} has been locked and certified.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: e.message });
    } finally {
      setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  if (!isAuthorized) {
       return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have clearance for Revenue Certification.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-black font-bold">
      <div className="flex flex-col md:flex-row justify-between items-end border-b-8 border-slate-900 pb-6 print:hidden">
        <div>
           <h1 className="text-4xl font-black uppercase tracking-tighter italic">Revenue <span className="text-blue-600">Certification</span></h1>
           <p className="text-slate-500 font-bold text-xs uppercase italic">Vetting of Daily Cash and Electronic Liquidity.</p>
        </div>
        <div className="flex gap-3">
           <input 
             type="date" 
             className="p-3 border-4 border-slate-900 rounded-2xl bg-white font-black uppercase text-xs outline-none"
             value={selectedDate}
             onChange={(e) => setSelectedDate(e.target.value)}
           />
        </div>
      </div>

      {tillsLoading && <div className="text-center p-10"><Loader2 className="animate-spin text-primary" /></div>}
      
      {!tillsLoading && !summary && <div className="p-20 text-center italic text-muted-foreground">Select a date to generate the revenue report.</div>}
       {!tillsLoading && summary && verifiedTills?.length === 0 && <div className="p-20 text-center italic text-muted-foreground">No verified tills found for {selectedDate}.</div>}

      {summary && verifiedTills && verifiedTills.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard label="Total Physical Cash" value={`₵ ${summary.cash.toFixed(2)}`} icon={<Banknote/>} color="green" />
              <SummaryCard label="Total MoMo (Electronic)" value={`₵ ${summary.momo.toFixed(2)}`} icon={<Smartphone/>} color="blue" />
              <SummaryCard label="Audit Discrepancies" value={`₵ ${summary.shortage.toFixed(2)}`} icon={<AlertTriangle/>} color="red" />
           </div>

           <div className="bg-white border-4 border-slate-900 p-12 rounded-[50px] shadow-2xl font-serif">
              <div className="text-center border-b-2 border-slate-900 pb-6 mb-10">
                 <h2 className="text-3xl font-black uppercase tracking-widest">{userProfile?.hospitalName}</h2>
                 <p className="text-lg font-bold uppercase italic mt-1">Daily Revenue & Banking Certificate</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Value Date: {selectedDate}</p>
              </div>

              <div className="space-y-6">
                 <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="font-bold uppercase">Consolidated System Revenue</span>
                    <span className="font-black">₵ {(summary.cash + summary.momo + summary.shortage).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm border-b pb-2 text-red-600">
                    <span className="font-bold uppercase">Less: Verified Staff Shortages</span>
                    <span className="font-black italic">(₵ {summary.shortage.toFixed(2)})</span>
                 </div>
                 <div className="flex justify-between items-center p-6 bg-slate-900 text-white rounded-3xl">
                    <span className="text-lg font-black uppercase italic">Net Bankable Revenue</span>
                    <span className="text-3xl font-black italic">₵ {(summary.cash + summary.momo).toFixed(2)}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-20 mt-24">
                 <div className="border-t-2 border-slate-900 pt-2 text-center">
                    <p className="text-[10px] font-black uppercase">Prepared by Accountant</p>
                    <div className="h-10"></div>
                 </div>
                 <div className="border-t-4 border-blue-600 pt-2 text-center">
                    <p className="text-[10px] font-black uppercase text-blue-600">Internal Audit (Final Sign-off)</p>
                    <p className="text-[9px] font-bold mt-2 italic uppercase">{userProfile?.fullName}</p>
                 </div>
              </div>
           </div>

           <div className="flex gap-4 print:hidden">
              <button onClick={() => window.print()} className="flex-1 bg-white border-4 border-slate-900 py-4 rounded-3xl font-black uppercase text-xs flex items-center justify-center gap-3">
                 <Printer size={18}/> Print Certified Report
              </button>
              <button 
                onClick={handleCertifyRevenue}
                disabled={loading}
                className="flex-[2] bg-blue-600 text-white py-4 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
              >
                 {loading ? <Loader2 className="animate-spin"/> : <ShieldCheck size={20}/>}
                 Authorize & Close Revenue for Date
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: any) {
  const colors: any = {
    green: "bg-green-50 border-green-200 text-green-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    red: "bg-red-50 border-red-200 text-red-700",
  };
  return (
    <div className={`p-8 rounded-[40px] border-2 shadow-sm flex items-center justify-between ${colors[color]}`}>
       <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
          <p className="text-2xl font-black italic">{value}</p>
       </div>
       <div className="p-4 bg-white/50 rounded-3xl">{icon}</div>
    </div>
  );
}
