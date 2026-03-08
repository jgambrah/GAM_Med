
'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, doc, serverTimestamp } from 'firebase/firestore';
import { 
  FileText, Printer, Filter, Calculator, 
  ArrowUpRight, TrendingDown, Landmark, Search, Loader2, ShieldCheck, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { ASSET_GROUPS, PPE_SUB_DIVISIONS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

export default function AuditorAssetSchedulePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [report, setReport] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const generateReport = async () => {
    if (!dateRange.start || !dateRange.end || !hospitalId) return;
    setLoading(true);

    try {
      const hId = hospitalId;
      const startTs = Timestamp.fromDate(new Date(dateRange.start));
      const endTs = Timestamp.fromDate(new Date(new Date(dateRange.end).setHours(23, 59, 59)));

      const assetSnap = await getDocs(query(collection(firestore, "hospitals", hId, "assets")));
      const depSnap = await getDocs(query(collection(firestore, "hospitals", hId, "depreciation_history"), where("createdAt", ">=", startTs), where("createdAt", "<=", endTs)));

      const assets = assetSnap.docs.map(d => d.data());
      const depLogs = depSnap.docs.map(d => d.data());

      const classifications = [
        ...PPE_SUB_DIVISIONS.map(s => ({ ...s, parent: 'PPE' })),
        ...ASSET_GROUPS.filter(g => g.id !== 'PPE').map(g => ({ ...g, parent: g.id }))
      ];

      const finalizedData = classifications.map(cls => {
        const relevantAssets = assets.filter(a => cls.parent === 'PPE' ? a.subDivision === cls.id : a.category === cls.id);
        const opening = relevantAssets.filter(a => a.purchaseDate < dateRange.start).reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
        const additions = relevantAssets.filter(a => a.purchaseDate >= dateRange.start && a.purchaseDate <= dateRange.end).reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
        const depreciation = depLogs.filter(log => relevantAssets.some(ra => ra.tagId === log.assetId || ra.id === log.assetId)).reduce((sum, log) => sum + (log.amount || 0), 0);
        return { label: cls.label, opening, additions, depreciation, closing: (opening + additions) - depreciation };
      });

      setReport(finalizedData);
    } catch (e) {
      console.error("Report Generation Failed", e);
    } finally {
      setLoading(false);
    }
  };

  const totalClosing = report.reduce((a,b) => a + b.closing, 0);

  const handleCertifySchedule = async () => {
    if (!user || !userProfile || !firestore || !hospitalId) {
        toast({ variant: 'destructive', title: "System not ready." });
        return;
    }
    setProcessing(true);
    try {
      addDocumentNonBlocking(collection(firestore, "certified_schedules"), {
        hospitalId: hospitalId,
        type: 'FIXED_ASSETS',
        periodStart: dateRange.start,
        periodEnd: dateRange.end,
        totalValue: totalClosing,
        certifiedBy: user.uid,
        certifiedByName: userProfile.fullName,
        timestamp: serverTimestamp(),
      });
      toast({ title: "Fixed Asset Schedule Certified & Locked for Audit" });
    } catch (e: any) {
      toast({ variant: 'destructive', title: e.message });
    } finally {
      setProcessing(false);
      setIsConfirmOpen(false);
    }
  };
  
  if (isUserLoading || isProfileLoading) {
      return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black font-bold">
      <div className="print:hidden bg-white p-8 rounded-[40px] border-4 border-slate-900 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Auditor's <span className="text-blue-600">Asset Console</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Period-based Valuation & Certification.</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border">
          <div className="flex flex-col"><span className="text-[8px] font-black uppercase text-slate-400">From</span><input type="date" className="bg-transparent text-xs font-black outline-none" onChange={e => setDateRange({...dateRange, start: e.target.value})} /></div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex flex-col"><span className="text-[8px] font-black uppercase text-slate-400">To</span><input type="date" className="bg-transparent text-xs font-black outline-none" onChange={e => setDateRange({...dateRange, end: e.target.value})} /></div>
          <button onClick={generateReport} disabled={loading} className="bg-blue-600 text-white p-4 rounded-xl hover:bg-black transition-all">{loading ? <Loader2 className="animate-spin" /> : <Filter size={20} />}</button>
        </div>
      </div>

      <div className="bg-white border-4 border-slate-900 p-12 rounded-[50px] shadow-2xl font-serif">
         {/* Report Table Here */}
      </div>

       {report.length > 0 && (
         <div className="bg-white p-10 rounded-[50px] border-4 border-slate-900 shadow-2xl space-y-8 text-black font-bold">
            <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-6">
                <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl"><ShieldCheck size={32} /></div>
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic">Pre-Audit <span className="text-blue-600">Certification</span></h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fixed Asset Valuation Sign-off</p>
                </div>
            </div>
            <div className="p-6 bg-blue-50 rounded-[32px] border-2 border-dashed border-blue-200 text-center">
                <p className="text-[11px] font-bold text-blue-800 leading-relaxed uppercase">
                "I hereby certify that I have verified the additions and depreciation charges for the period above and found them to be in compliance with facility policy."
                </p>
            </div>
            <Button onClick={() => setIsConfirmOpen(true)} disabled={processing} className="w-full bg-blue-600 hover:bg-black text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3">
                {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />} Stamp & Authorize Schedule
            </Button>
         </div>
       )}
       
       <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Schedule Certification</AlertDialogTitle>
                    <AlertDialogDescription>
                       You are about to certify the Fixed Asset Schedule. This action is irreversible and creates a permanent audit record.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCertifySchedule}>I Certify This Report</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}

    