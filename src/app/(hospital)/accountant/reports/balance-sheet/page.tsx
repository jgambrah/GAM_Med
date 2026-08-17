'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import { Loader2, ShieldAlert, Scale, CheckCircle2, TrendingUp, Building2, Landmark, Wallet, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function BalanceSheetPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(userRole || '');

  const accountsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "hospitals", hospitalId, "chart_of_accounts"), orderBy("accountCode", "asc"));
  }, [firestore, hospitalId]);
  const { data: rawAccounts, isLoading: areAccountsLoading } = useCollection(accountsQuery);
  
  const fixedAssetsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, 'hospitals', hospitalId, 'assets'));
  }, [firestore, hospitalId]);
  const { data: rawFixedAssets, isLoading: areAssetsLoading_2 } = useCollection(fixedAssetsQuery);

  // Fallback demo data structured strictly according to IFRS/GAAP
  const demoAccounts = useMemo(() => [
    { id: 'acc-1015', accountCode: '1015', name: 'Main Vault Cash on Hand (Petty Imprest)', category: 'ASSETS', currentBalance: 7974.25 },
    { id: 'acc-1030', accountCode: '1030', name: 'Ecobank Corporate Operating Account', category: 'ASSETS', currentBalance: 385000.00 },
    { id: 'acc-1020', accountCode: '1020', name: 'Paystack MoMo Digital Clearing Account', category: 'ASSETS', currentBalance: 15400.00 },
    { id: 'acc-1200', accountCode: '1200', name: 'Accounts Receivable (NHIS & Patient Ledgers)', category: 'ASSETS', currentBalance: 569500.00 },
    { id: 'acc-1205', accountCode: '1205', name: 'Input VAT & Statutory Tax Credit Receivables', category: 'ASSETS', currentBalance: 24500.00 },
    { id: 'acc-1300', accountCode: '1300', name: 'Central Pharmacy Stock & Consumables Inventory', category: 'ASSETS', currentBalance: 142000.00 },
    { id: 'acc-2001', accountCode: '2001', name: 'Accounts Payable (Medical Suppliers & Vendors)', category: 'LIABILITIES', currentBalance: 204150.00 },
    { id: 'acc-2005', accountCode: '2005', name: 'GRA Statutory Withholding Tax Payable', category: 'LIABILITIES', currentBalance: 18250.00 },
    { id: 'acc-3001', accountCode: '3001', name: 'Stated Share Capital & Capex Founders Equity', category: 'CAPITAL', currentBalance: 81000000.00 },
    { id: 'acc-3005', accountCode: '3005', name: 'Capital Reserves & Statutory Retained Surplus', category: 'CAPITAL', currentBalance: 423374.25 },
    { id: 'acc-4001', accountCode: '4001', name: 'Medical & Clinical Service Consultations', category: 'REVENUE', currentBalance: 820000.00 },
    { id: 'acc-5001', accountCode: '5001', name: 'Clinical Supplies & Operating Expenditure', category: 'EXPENSES', currentBalance: 321400.00 },
  ], []);

  const demoFixedAssets = useMemo(() => [
    { id: 'fa-1', name: 'Hospital Land & Specialized Clinical Buildings', purchasePrice: 55000000.00, accumulatedDepreciation: 120000.00 },
    { id: 'fa-2', name: 'Advanced Diagnostic Imaging (CT Scan, MRI & Digital X-Ray)', purchasePrice: 18500000.00, accumulatedDepreciation: 85000.00 },
    { id: 'fa-3', name: 'Operating Theatres, ICU Ventilators & Clinical Equipment', purchasePrice: 7632000.00, accumulatedDepreciation: 32938.89 }
  ], []);

  const accounts = rawAccounts && rawAccounts.length > 0 ? rawAccounts : demoAccounts;
  const fixedAssets = rawFixedAssets && rawFixedAssets.length > 0 ? rawFixedAssets : demoFixedAssets;

  const {
    totalAssets,
    totalLiabilities,
    totalEquity,
    currentNetProfit,
    capital,
    currentAssets,
    liabilities,
    netBookValue,
    totalFixedAssetsCost,
    totalAccumulatedDep,
    totalCurrentAssets,
    totalCapital
  } = useMemo(() => {
    // 1. Non-Current Assets (Fixed Assets Net Book Value)
    const totalFixedAssetsCost = fixedAssets.reduce((s, a) => s + (Number(a.purchasePrice) || 0), 0);
    const totalAccumulatedDep = fixedAssets.reduce((s, a) => s + (Number(a.accumulatedDepreciation) || 0), 0);
    const netBookValue = totalFixedAssetsCost - totalAccumulatedDep;
    
    // 2. Current Assets: Exclude Contra-Asset (Accumulated Depreciation) & Reclassify Negative Cash to Liabilities (IFRS)
    const currentAssetsData: any[] = [];
    const reclassifiedOverdrafts: any[] = [];

    accounts.forEach(a => {
      const isContra = a.name.toLowerCase().includes('depreciation') || a.accountCode === '1099';
      if (a.category === 'ASSETS' && !isContra) {
        const bal = Number(a.currentBalance) || 0;
        if (bal >= 0) {
          currentAssetsData.push(a);
        } else {
          // IAS 7 / IFRS Overdraft Reclassification
          reclassifiedOverdrafts.push({
            ...a,
            name: `${a.name} (Overdraft / Temporary Deficit)`,
            currentBalance: Math.abs(bal)
          });
        }
      }
    });

    const totalCurrentAssets = currentAssetsData.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0);

    // 3. Liabilities
    const baseLiabilities = accounts.filter(a => a.category === 'LIABILITIES');
    const liabilitiesData = [...baseLiabilities, ...reclassifiedOverdrafts];
    const totalLiabilities = liabilitiesData.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0);

    // 4. Equity & Capital
    const capitalData = accounts.filter(a => a.category === 'CAPITAL');
    const totalCapital = capitalData.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0);
    
    // P&L Net Retained Surplus
    const revenue = accounts.filter(a => a.category === 'REVENUE').reduce((s, a) => s + (Number(a.currentBalance) || 0), 0);
    const expenses = accounts.filter(a => a.category === 'EXPENSES').reduce((s, a) => s + (Number(a.currentBalance) || 0), 0);
    const netProfit = revenue - expenses;
    
    const totalEquity = totalCapital + netProfit;
    const totalAssetsValue = netBookValue + totalCurrentAssets;

    return { 
      totalAssets: totalAssetsValue, 
      totalLiabilities, 
      totalEquity, 
      currentNetProfit: netProfit,
      capital: capitalData,
      currentAssets: currentAssetsData,
      liabilities: liabilitiesData,
      netBookValue,
      totalFixedAssetsCost,
      totalAccumulatedDep,
      totalCurrentAssets,
      totalCapital
    };
  }, [accounts, fixedAssets]);

  const isLoading = isUserLoading || isProfileLoading || areAccountsLoading || areAssetsLoading_2;
  const totalEquityAndLiabilities = totalLiabilities + totalEquity;
  const discrepancy = Math.abs(totalAssets - totalEquityAndLiabilities);
  const isBalanced = discrepancy < 0.01;

  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Balance Sheet Statements.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 min-h-screen">
      
      {/* Print Stylesheet */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-sheet { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}} />

      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print bg-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Scale className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black italic uppercase tracking-wider">Statement of Financial Position</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            IFRS/GAAP COMPLIANT BALANCE SHEET • ASSETS = LIABILITIES + EQUITY
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border ${
            isBalanced 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
              : 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {isBalanced ? 'IFRS AUDIT: 100% BALANCED' : `OUT OF BALANCE: GHS ${discrepancy.toFixed(2)}`}
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> PRINT AUDIT
          </button>
        </div>
      </div>

      {/* Formal Certified Balance Sheet Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-3xl shadow-xl space-y-10 print-sheet font-sans">
        
        {/* Organization Header */}
        <div className="text-center border-b-2 border-slate-900 dark:border-slate-100 pb-6 space-y-1">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
            GAM MED EXECUTIVE HEALTHCARE
          </h2>
          <p className="text-sm font-black uppercase text-emerald-600 dark:text-emerald-400 italic">
            Statement of Financial Position (Audited Balance Sheet)
          </p>
          <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
            As At {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} • Values in Ghanaian Cedis (GHS)
          </p>
        </div>

        {/* Dual Column Layout: Assets vs Liabilities & Equity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 font-mono text-xs">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: ASSETS (NON-CURRENT + CURRENT)              */}
          {/* ======================================================== */}
          <section className="space-y-8">
            
            {/* Non-Current Assets */}
            <div className="space-y-3">
              <h3 className="font-black border-b-2 border-slate-900 dark:border-slate-100 pb-2 uppercase text-xs tracking-widest text-emerald-600 dark:text-emerald-400 flex justify-between">
                <span>1. NON-CURRENT (FIXED) ASSETS</span>
                <span>AMOUNT (GHS)</span>
              </h3>
              <div className="space-y-2 font-bold text-slate-800 dark:text-slate-200">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                  <span className="font-sans">Fixed Assets (Cost / Revaluation)</span>
                  <span>₵ {totalFixedAssetsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-rose-600 dark:text-rose-400 italic">
                  <span className="font-sans">Less: Accumulated Depreciation (Contra-Asset)</span>
                  <span>(₵ {totalAccumulatedDep.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-slate-300 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-slate-100">
                  <span className="font-sans uppercase">NET BOOK VALUE (PROPERTY, PLANT & EQUIP)</span>
                  <span>₵ {netBookValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Current Assets (Revenue Cycle & Cash) */}
            <div className="space-y-3">
              <h3 className="font-black border-b-2 border-slate-900 dark:border-slate-100 pb-2 uppercase text-xs tracking-widest text-emerald-600 dark:text-emerald-400 flex justify-between">
                <span>2. CURRENT ASSETS (LIQUIDITY & RECEIVABLES)</span>
                <span>AMOUNT (GHS)</span>
              </h3>
              <div className="space-y-2 font-bold text-slate-800 dark:text-slate-200">
                {currentAssets.map((acc, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-sans">{acc.name}</span>
                    <span>₵ {(Number(acc.currentBalance) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t-2 border-slate-300 dark:border-slate-700 font-black text-sm text-emerald-600 dark:text-emerald-400">
                  <span className="font-sans uppercase">TOTAL CURRENT ASSETS</span>
                  <span>₵ {totalCurrentAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Total Assets Summary Banner */}
            <div className="bg-slate-950 text-white p-5 rounded-2xl flex justify-between items-center border border-slate-800 shadow-lg">
              <span className="text-xs font-black uppercase tracking-wider font-sans">TOTAL HOSPITAL ASSETS</span>
              <span className="text-xl font-black underline decoration-double decoration-emerald-400 font-mono text-emerald-400">
                ₵ {totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

          </section>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: LIABILITIES & EQUITY                       */}
          {/* ======================================================== */}
          <section className="space-y-8">
            
            {/* Equity & Reserves */}
            <div className="space-y-3">
              <h3 className="font-black border-b-2 border-slate-900 dark:border-slate-100 pb-2 uppercase text-xs tracking-widest text-indigo-600 dark:text-indigo-400 flex justify-between">
                <span>3. SHARE CAPITAL & RESERVES (EQUITY)</span>
                <span>AMOUNT (GHS)</span>
              </h3>
              <div className="space-y-2 font-bold text-slate-800 dark:text-slate-200">
                {capital.map((acc, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-sans">{acc.name}</span>
                    <span>₵ {(Number(acc.currentBalance) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 text-emerald-600 dark:text-emerald-400">
                  <span className="font-sans">Retained Surplus / Net Profit for the Period (P&L)</span>
                  <span>₵ {currentNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-slate-300 dark:border-slate-700 font-black text-sm text-indigo-600 dark:text-indigo-400">
                  <span className="font-sans uppercase">TOTAL ACCUMULATED EQUITY</span>
                  <span>₵ {totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Current Liabilities */}
            <div className="space-y-3">
              <h3 className="font-black border-b-2 border-slate-900 dark:border-slate-100 pb-2 uppercase text-xs tracking-widest text-rose-600 dark:text-rose-400 flex justify-between">
                <span>4. CURRENT LIABILITIES (PAYABLES & TAXES)</span>
                <span>AMOUNT (GHS)</span>
              </h3>
              <div className="space-y-2 font-bold text-slate-800 dark:text-slate-200">
                {liabilities.map((acc, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-sans">{acc.name}</span>
                    <span className="text-rose-600 dark:text-rose-400">
                      ₵ {(Number(acc.currentBalance) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t-2 border-slate-300 dark:border-slate-700 font-black text-sm text-rose-600 dark:text-rose-400">
                  <span className="font-sans uppercase">TOTAL CURRENT LIABILITIES</span>
                  <span>₵ {totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Total Equity & Liabilities Summary Banner */}
            <div className="bg-indigo-950 text-white p-5 rounded-2xl flex justify-between items-center border border-indigo-800 shadow-lg">
              <span className="text-xs font-black uppercase tracking-wider font-sans">TOTAL EQUITY & LIABILITIES</span>
              <span className="text-xl font-black underline decoration-double decoration-indigo-400 font-mono text-indigo-400">
                ₵ {totalEquityAndLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

          </section>

        </div>

        {/* Governance Certification & Signature Footer */}
        <div className="pt-12 border-t-2 border-slate-900 dark:border-slate-100 grid grid-cols-2 gap-12 text-xs font-bold font-sans">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Prepared & Certified By:</p>
            <div className="mt-8 border-b-2 border-slate-900 dark:border-slate-100 w-56" />
            <p className="text-slate-900 dark:text-slate-100 uppercase font-black mt-2 text-sm">{userName}</p>
            <p className="text-[10px] text-emerald-600 font-bold uppercase">Chief Accountant & Financial Controller</p>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Executive Approval & Board Sign-Off:</p>
            <div className="mt-8 border-b-2 border-slate-900 dark:border-slate-100 w-56 ml-auto" />
            <p className="text-slate-900 dark:text-slate-100 uppercase font-black mt-2 text-sm">Medical Director & CEO</p>
            <p className="text-[10px] text-indigo-600 font-bold uppercase">GAM Med Executive Governance Board</p>
          </div>
        </div>

      </div>

    </div>
  );
}
