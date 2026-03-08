'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, increment } from 'firebase/firestore';
import { Calculator, CheckCircle2, AlertTriangle, Loader2, History, Landmark, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDoc, useMemoFirebase } from '@/firebase';


export default function SmartDepreciationEngine() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetchingAssets, setFetchingAssets] = useState(true);
  const [period, setPeriod] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [periodStatus, setPeriodStatus] = useState<'OPEN' | 'POSTED'>('OPEN');
  const [eligibleAssets, setEligibleAssets] = useState<any[]>([]);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole);

  const periodKey = `${period.year}-${String(period.month + 1).padStart(2, '0')}`;

  useEffect(() => {
    if (!hospitalId || !firestore) return;

    const checkPeriodAndAssets = async () => {
      setFetchingAssets(true);
      
      const assetSnap = await getDocs(query(
        collection(firestore, "hospitals", hospitalId, "assets")
      ));

      const unprocessed = assetSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((a: any) => a.lastDepreciationPeriod !== periodKey);

      setEligibleAssets(unprocessed);
      setPeriodStatus(unprocessed.length === 0 && assetSnap.docs.length > 0 ? 'POSTED' : 'OPEN');
      setFetchingAssets(false);
    };

    checkPeriodAndAssets();
  }, [hospitalId, firestore, periodKey]);

  const calculateMonthlyDep = (asset: any) => {
    if (!asset.usefulLife || asset.usefulLife <= 0) return 0;
    const yearlyDep = (asset.purchasePrice - (asset.salvageValue || 0)) / asset.usefulLife;
    return yearlyDep / 12;
  };

  const totalMonthlyDepreciation = useMemo(() => {
    return eligibleAssets.reduce((acc, curr) => acc + calculateMonthlyDep(curr), 0);
  }, [eligibleAssets]);

  const runSmartDepreciation = async () => {
    if (eligibleAssets.length === 0) {
      toast({ title: "All assets are already up to date for this period." });
      return;
    }
    if (!user || !hospitalId || !firestore) {
      toast({ variant: "destructive", title: "System error: Not authenticated." });
      return;
    }

    setLoading(true);
    const batch = writeBatch(firestore);

    try {
      const coaRef = collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`);
      const expenseAccountQuery = query(coaRef, where("accountCode", "==", "5005"));
      const contraAssetAccountQuery = query(coaRef, where("accountCode", "==", "1099"));
      
      const [expenseSnap, contraAssetSnap] = await Promise.all([
        getDocs(expenseAccountQuery),
        getDocs(contraAssetAccountQuery)
      ]);

      if (expenseSnap.empty) throw new Error("Depreciation Expense Account (5005) not found.");
      if (contraAssetSnap.empty) throw new Error("Accumulated Depreciation Account (1099) not found.");

      const expenseAccRef = expenseSnap.docs[0].ref;
      const contraAssetAccRef = contraAssetSnap.docs[0].ref;

      const jvRef = doc(collection(firestore, `hospitals/${hospitalId}/journal_entries`));
      const jvNumber = `JV-DEP-${periodKey}`;
      batch.set(jvRef, {
        jvNumber,
        narration: `Automated Depreciation Charge for ${periodKey} (${eligibleAssets.length} new/updated assets)`,
        totalAmount: totalMonthlyDepreciation,
        hospitalId,
        createdBy: user.uid,
        createdByName: user.displayName,
        createdAt: serverTimestamp(),
        type: 'DEPRECIATION',
        status: 'POSTED',
        lines: [
            { accountId: expenseAccRef.id, accountName: 'Depreciation Expense', debit: totalMonthlyDepreciation, credit: 0 },
            { accountId: contraAssetAccRef.id, accountName: 'Accumulated Depreciation', debit: 0, credit: totalMonthlyDepreciation }
        ]
      });

      batch.update(expenseAccRef, { currentBalance: increment(totalMonthlyDepreciation) });
      batch.update(contraAssetAccRef, { currentBalance: increment(totalMonthlyDepreciation) });

      eligibleAssets.forEach(asset => {
        const monthlyDep = calculateMonthlyDep(asset);
        const assetRef = doc(firestore, `hospitals/${hospitalId}/assets`, asset.id);
        
        batch.update(assetRef, {
          lastDepreciationPeriod: periodKey,
          accumulatedDepreciation: increment(monthlyDep)
        });

        const historyRef = doc(collection(firestore, `hospitals/${hospitalId}/depreciation_history`));
        batch.set(historyRef, {
          assetId: asset.id,
          assetName: asset.name,
          assetCategory: asset.category,
          subDivision: asset.subDivision || null,
          hospitalId,
          period: periodKey,
          amount: monthlyDep,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      toast({ title: `Success: ${periodKey} Depreciation Finalized.` });
      // Manually refetch and update state after commit
      const assetSnap = await getDocs(query(collection(firestore, "hospitals", hospitalId, "assets")));
      const unprocessed = assetSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((a: any) => a.lastDepreciationPeriod !== periodKey);
      setEligibleAssets(unprocessed);
      setPeriodStatus(unprocessed.length === 0 ? 'POSTED' : 'OPEN');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Accounting Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading || fetchingAssets;
  
  if (pageIsLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center p-20">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  if (!isAuthorized) {
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
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Depreciation <span className="text-primary">Engine</span></h1>
          <p className="text-muted-foreground font-bold text-xs uppercase italic">Automated Ledger Adjustments for Asset Wear & Tear.</p>
        </div>
      </div>

      <div className={`p-10 rounded-[50px] shadow-2xl space-y-6 border-4 ${periodStatus === 'POSTED' ? 'border-green-600 bg-green-50 text-green-900' : 'border-slate-900 bg-[#0f172a] text-white'}`}>
        {periodStatus === 'POSTED' ? (
          <div className="text-center space-y-4">
             <CheckCircle2 size={64} className="mx-auto text-green-600" />
             <h2 className="text-2xl font-black uppercase">Period Closed</h2>
             <p className="text-sm font-bold text-green-800 uppercase">Depreciation for {periodKey} has been fully committed to the ledger.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center relative z-10">
              <p className="text-xs font-black uppercase text-blue-400">Assets Awaiting Processing: {eligibleAssets.length}</p>
              <div className="bg-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase">Active Period</div>
            </div>

            <div className="relative">
                <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                    <Landmark size={200} />
                </div>
                <div className="grid grid-cols-2 gap-8 border-t border-slate-800 pt-8">
                    <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Eligible Assets</p>
                    <p className="text-3xl font-black italic">{eligibleAssets.length}</p>
                    </div>
                    <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Pending Expense</p>
                    <p className="text-3xl font-black italic text-primary">₵ {totalMonthlyDepreciation.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 flex items-start gap-4">
                <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                <p className="text-[10px] font-bold text-slate-300 leading-relaxed uppercase">
                    This engine will only process assets not yet stamped for the current period ({periodKey}). This prevents double-charging.
                </p>
            </div>
             
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={loading || eligibleAssets.length === 0}
                  className="w-full bg-primary hover:bg-white hover:text-black text-white py-6 rounded-[30px] font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                  Commit Depreciation for {eligibleAssets.length} Assets
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Depreciation Run</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will post a total depreciation expense of{' '}
                    <span className="font-bold text-foreground">
                      GHS {totalMonthlyDepreciation.toFixed(2)}
                    </span>{' '}
                    for the period of{' '}
                    <span className="font-bold text-foreground">
                      {new Date(period.year, period.month).toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
                    </span>
                    . This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={runSmartDepreciation}>Confirm & Post to Ledger</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </div>
        )}
      </div>

      <div className="space-y-4">
         <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <History size={16} className="text-primary"/> Depreciation Audit Trail
         </h3>
         <div className="bg-card rounded-[40px] border shadow-sm p-8 text-center text-muted-foreground italic text-xs uppercase">
            Historical analysis is available on the Asset Schedule page.
         </div>
      </div>
    </div>
  );
}
    