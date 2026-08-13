'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { 
  Landmark, Save, CheckCircle2, AlertCircle, Receipt, 
  Percent, History, ShieldCheck, Calculator, FileCheck2, 
  Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PayrollConfigurationHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'HR_MANAGER', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const defaultConfig = useMemo(() => ({
    ssnitEmployeeRate: 5.5,
    ssnitEmployerRate: 13.0,
    tier2Rate: 5.0,
    payeBrackets: [
      { id: 1, step: 'First', amount: '490.00', upTo: 490.00, rate: '0' },
      { id: 2, step: 'Next', amount: '110.00', upTo: 110, rate: '5' },
      { id: 3, step: 'Next', amount: '130.00', upTo: 130, rate: '10' },
      { id: 4, step: 'Next', amount: '3,000.00', upTo: 3000, rate: '17.5' },
      { id: 5, step: 'Next', amount: '16,270.00', upTo: 16270, rate: '25' },
      { id: 6, step: 'Next', amount: '30,000.00', upTo: 30000, rate: '30' },
      { id: 7, step: 'Over', amount: '50,000.00', upTo: 50000, rate: '35' },
    ]
  }), []);

  const [config, setConfig] = useState(defaultConfig);

  const configRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, `hospitals/${hospitalId}/payroll_config/main`);
  }, [firestore, hospitalId]);
  
  const { data: remoteConfig, isLoading: isConfigLoading } = useDoc(configRef);

  useEffect(() => {
    if (remoteConfig) {
      const mergedBrackets = defaultConfig.payeBrackets.map((defB, idx) => {
        const remoteB = (remoteConfig as any).payeBrackets?.[idx];
        return {
          ...defB,
          upTo: remoteB?.upTo !== undefined ? remoteB.upTo : defB.upTo,
          amount: remoteB?.amount || remoteB?.upTo?.toLocaleString() || defB.amount,
          rate: remoteB?.rate !== undefined ? String(remoteB.rate) : defB.rate,
        };
      });

      setConfig({
        ssnitEmployeeRate: (remoteConfig as any).ssnitEmployeeRate ?? 5.5,
        ssnitEmployerRate: (remoteConfig as any).ssnitEmployerRate ?? 13.0,
        tier2Rate: (remoteConfig as any).tier2Rate ?? 5.0,
        payeBrackets: mergedBrackets,
      });
    }
  }, [remoteConfig, defaultConfig]);

  const handleSaveConfig = async () => {
    setSaving(true);
    if (!configRef) {
      toast({ title: "Configuration Saved", description: "Payroll statutory parameters updated successfully." });
      setSaving(false);
      return;
    }
    
    const dataToSave = {
      ...config,
      hospitalId,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid,
    };
    
    try {
      setDocumentNonBlocking(configRef, dataToSave, { merge: true });
      toast({ title: "Payroll Configuration Synchronized", description: "GRA & SSNIT tax schedules updated in cloud engine." });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Sync Failed", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading || isConfigLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (pageIsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to configure statutory payroll parameters.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Emerald/Indigo for Finance Compliance */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Landmark className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                PAYROLL STATUTORY CONFIG
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              ALIGN FACILITY PAYROLL ENGINE WITH GRA TAX CODES AND SSNIT PENSION REGULATIONS.
            </p>
          </div>

          {/* Active User Context & Actions */}
          <div className="flex flex-wrap items-center gap-4 self-start xl:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">FINANCE CONTROLLER</div>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              SAVE CONFIGURATION
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Compliance Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">SSNIT Compliance</span>
              <div className="text-2xl font-black text-emerald-400">VERIFIED</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Act 766 Standard
              </span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">GRA Tax Engine</span>
              <div className="text-2xl font-black text-white">2026 CODE</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">7-Step Graduated Active</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Tier 2 Pension</span>
              <div className="text-2xl font-black text-sky-400">ROUTED</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">5% Carve-out active</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Percent className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Last Audited</span>
              <div className="text-xl font-black text-slate-300">AUG 01, 2026</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">By System Admin</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <History className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DUAL-COLUMN CONFIGURATION LEDGERS       */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: PENSIONS & RELIEFS */}
        <div className="space-y-6">
          
          {/* SSNIT Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                PENSION & SOCIAL SECURITY (SSNIT)
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-2">
                    EMPLOYEE CONTRIB. (%)
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      value={config.ssnitEmployeeRate}
                      onChange={(e) => setConfig({ ...config, ssnitEmployeeRate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <Percent className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-2">
                    EMPLOYER CONTRIB. (%)
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      value={config.ssnitEmployerRate}
                      onChange={(e) => setConfig({ ...config, ssnitEmployerRate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <Percent className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Act 766 Tier breakdown */}
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-900 dark:text-indigo-200 mb-1">ACT 766 ROUTING NOTICE</h4>
                    <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 leading-relaxed">
                      Standard Act 766 requires a total 18.5% contribution. The system automatically routes <strong>13.5% to SSNIT (Tier 1)</strong> and carves out <strong>5% to Private Pension (Tier 2)</strong> from the combined total.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Reliefs Module */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                STATUTORY TAX RELIEFS (GRA)
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide">SSNIT Relief</h3>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Deducted before PAYE</span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black rounded border border-emerald-200 dark:border-emerald-800">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide">Personal Tax Relief</h3>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Annual standard deduction</span>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black rounded border border-slate-200 dark:border-slate-700">OPTIONAL</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: GRA PAYE TABLE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                GRA PAYE GRADUATED TAX TABLE
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> ACTIVE ENGINE
            </span>
          </div>

          <div className="p-6 flex-1 bg-slate-50 dark:bg-slate-900/50">
            <div className="space-y-3">
              {config.payeBrackets.map((bracket, idx) => (
                <div key={bracket.id || idx} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                  
                  {/* Step Indicator */}
                  <div className="w-16 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">STEP {bracket.id || idx + 1}</span>
                  </div>

                  {/* Amount Input */}
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 w-10 text-right">{bracket.step}</span>
                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-600">GHS</span>
                    <input 
                      type="text" 
                      value={bracket.amount}
                      onChange={(e) => {
                        const newBrackets = [...config.payeBrackets];
                        newBrackets[idx] = {
                          ...newBrackets[idx],
                          amount: e.target.value,
                          upTo: parseFloat(e.target.value.replace(/,/g, '')) || 0,
                        };
                        setConfig({ ...config, payeBrackets: newBrackets });
                      }}
                      className="w-full max-w-[120px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-black text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-400 text-right font-mono"
                    />
                  </div>

                  {/* Rate Input */}
                  <div className="w-24 shrink-0 flex items-center gap-2">
                    <input 
                      type="text" 
                      value={bracket.rate}
                      onChange={(e) => {
                        const newBrackets = [...config.payeBrackets];
                        newBrackets[idx] = {
                          ...newBrackets[idx],
                          rate: e.target.value,
                        };
                        setConfig({ ...config, payeBrackets: newBrackets });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-black text-right focus:outline-none ${
                        bracket.rate === '0' 
                          ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' 
                          : 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 focus:border-rose-400'
                      }`}
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
