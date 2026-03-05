'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, increment } from 'firebase/firestore';
import { Calculator, CheckCircle2, AlertTriangle, Loader2, History, Landmark, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DepreciationEngine() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole);

  const assetsQuery = useMemoFirebase(() => {
    if (!hospitalId || !firestore) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/assets`));
  }, [hospitalId, firestore]);
  const { data: assets, isLoading: areAssetsLoading } = useCollection(assetsQuery);

  const calculateMonthlyDep = (asset: any) => {
    if (!asset.usefulLife || asset.usefulLife <= 0) return 0;
    const yearlyDep = (asset.purchasePrice - (asset.salvageValue || 0)) / asset.usefulLife;
    return yearlyDep / 12;
  };

  const totalMonthlyDepreciation = useMemo(() => {
    if (!assets) return 0;
    return assets.reduce((acc, curr) => acc + calculateMonthlyDep(curr), 0);
  }, [assets]);

  const runDepreciation = async () => {
    const periodKey = `${period.year}-${String(period.month + 1).padStart(2, '0')}`;
    const confirmRun = confirm(`Proceed with posting GHS ${totalMonthlyDepreciation.toFixed(2)} as depreciation for ${new Date(period.year, period.month).toLocaleString('en-GB', {month: 'long', year: 'numeric'})}?`);
    if (!confirmRun) return;

    if (!user || !hospitalId || !firestore) {
      toast({ variant: "destructive", title: "System error: Not authenticated." });
      return;
    }

    setLoading(true);
    const batch = writeBatch(firestore);

    try {
      // Query for the required accounts by code
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

      // 1. Create the Journal Entry for the Ledger
      const jvRef = doc(collection(firestore, `hospitals/${hospitalId}/journal_entries`));
      const jvNumber = `JV-DEP-${Date.now().toString().slice(-6)}`;
      
      batch.set(jvRef, {
        jvNumber,
        narration: `Monthly Depreciation Charge for ${periodKey}`,
        totalAmount: totalMonthlyDepreciation,
        hospitalId: hospitalId,
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

      // 2. FINANCIAL HANDSHAKE: Update Chart of Accounts
      batch.update(expenseAccRef, { currentBalance: increment(totalMonthlyDepreciation) });
      batch.update(contraAssetAccRef, { currentBalance: increment(totalMonthlyDepreciation) });

      // 3. Update the 'Last Depreciated' flag on the Assets to prevent double-runs
      assets?.forEach(asset => {
        const assetRef = doc(firestore, `hospitals/${hospitalId}/assets`, asset.id);
        const monthlyDep = calculateMonthlyDep(asset);
        batch.update(assetRef, {
          lastDepreciationPeriod: periodKey,
          accumulatedDepreciation: increment(monthlyDep)
        });
      });

      await batch.commit();
      toast({ title: "Depreciation Successfully Posted to Ledger" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Accounting Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading || areAssetsLoading;

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
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-foreground">Depreciation <span className="text-primary">Engine</span></h1>
          <p className="text-muted-foreground font-bold text-xs uppercase italic">Automated Ledger Adjustments for Asset Wear & Tear.</p>
        </div>
      </div>

      <div className="bg-[#0f172a] p-10 rounded-[50px] text-white shadow-2xl space-y-8 relative overflow-hidden">
         <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
            <Landmark size={200} />
         </div>

         <div className="flex justify-between items-start">
            <div className="space-y-1">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Target Period</p>
               <h2 className="text-2xl font-black uppercase italic">{new Date(period.year, period.month).toLocaleString('en-GB', {month: 'long', year: 'numeric'})}</h2>
            </div>
            <div className="p-4 bg-primary rounded-3xl shadow-xl">
               <Calculator size={32} />
            </div>
         </div>

         <div className="grid grid-cols-2 gap-8 border-t border-slate-800 pt-8">
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400">Assets to Process</p>
               <p className="text-3xl font-black italic">{assets?.length || 0}</p>
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400">Calculated Expense</p>
               <p className="text-3xl font-black italic text-primary">₵ {totalMonthlyDepreciation.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
         </div>

         <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 flex items-start gap-4">
            <AlertTriangle className="text-amber-500 shrink-0" size={24} />
            <p className="text-[10px] font-bold text-slate-300 leading-relaxed uppercase">
               Authorized Accounting Action: This will post a non-cash expense to the General Ledger. Ensure all new assets for this month have been recorded before execution.
            </p>
         </div>

         <Button 
           disabled={loading || !assets || assets.length === 0}
           onClick={runDepreciation}
           className="w-full bg-primary hover:bg-white hover:text-black text-white py-6 rounded-[30px] font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3"
         >
           {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
           Execute & Commit Depreciation
         </Button>
      </div>

      <div className="space-y-4">
         <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <History size={16} className="text-primary"/> Depreciation Audit Trail
         </h3>
         <div className="bg-card rounded-[40px] border shadow-sm p-8 text-center text-muted-foreground italic text-xs uppercase">
            No historical runs recorded in the current fiscal year.
         </div>
      </div>
    </div>
  );
}
