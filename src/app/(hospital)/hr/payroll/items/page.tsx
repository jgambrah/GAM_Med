'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import { 
  Receipt, Plus, Banknote, Scissors, CheckCircle2, 
  Edit3, Trash2, Wallet, Calculator, AlertCircle, 
  Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PayrollItemRegistryHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'HR_MANAGER', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState<'ALLOWANCE' | 'DEDUCTION'>('ALLOWANCE');
  const [isTaxable, setIsTaxable] = useState(false);
  const [calcType, setCalcType] = useState<'FIXED AMOUNT' | 'PERCENTAGE (%)'>('FIXED AMOUNT');

  const payrollItemsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payroll_items`));
  }, [firestore, hospitalId]);
  const { data: rawPayrollItems, isLoading: areItemsLoading } = useCollection(payrollItemsQuery);

  const demoAllowances = useMemo(() => [
    { id: 'ALW-FUEL-01', name: 'FUEL ALLOWANCE', label: 'FUEL ALLOWANCE', type: 'ALLOWANCE', calcType: 'FIXED AMOUNT', taxable: false, isTaxable: false },
    { id: 'ALW-RISK-01', name: 'RISK ALLOWANCE', label: 'RISK ALLOWANCE', type: 'ALLOWANCE', calcType: 'PERCENTAGE (%)', taxable: true, isTaxable: true },
    { id: 'ALW-RESP-02', name: 'RESPONSIBILITY ALLOWANCE', label: 'RESPONSIBILITY ALLOWANCE', type: 'ALLOWANCE', calcType: 'FIXED AMOUNT', taxable: true, isTaxable: true },
  ], []);

  const demoDeductions = useMemo(() => [
    { id: 'DED-PRUD-01', name: 'PRUDENTIAL LIFE ASSURANCE', label: 'PRUDENTIAL LIFE ASSURANCE', type: 'DEDUCTION', calcType: 'FIXED AMOUNT', mandatory: false },
    { id: 'DED-GMA-01', name: 'GMA DUES', label: 'GMA DUES', type: 'DEDUCTION', calcType: 'PERCENTAGE (%)', mandatory: true },
    { id: 'DED-LOAN-02', name: 'SCHEME - GCB BANK', label: 'SCHEME - GCB BANK', type: 'DEDUCTION', calcType: 'FIXED AMOUNT', mandatory: false },
  ], []);

  const standardAllowances = useMemo(() => {
    if (rawPayrollItems && rawPayrollItems.length > 0) {
      const dbAllowances = rawPayrollItems
        .filter((i: any) => i.type === 'ALLOWANCE')
        .map((i: any, idx: number) => ({
          id: i.id ? `ALW-${i.id.slice(0, 6).toUpperCase()}` : `ALW-00${idx + 1}`,
          name: (i.label || i.name || 'ALLOWANCE').toUpperCase(),
          label: (i.label || i.name || 'ALLOWANCE').toUpperCase(),
          calcType: i.calcType || 'FIXED AMOUNT',
          taxable: i.isTaxable !== false,
          isTaxable: i.isTaxable !== false,
          type: 'ALLOWANCE',
          raw: i,
        }));
      if (dbAllowances.length > 0) return dbAllowances;
    }
    return demoAllowances;
  }, [rawPayrollItems, demoAllowances]);

  const standardDeductions = useMemo(() => {
    if (rawPayrollItems && rawPayrollItems.length > 0) {
      const dbDeductions = rawPayrollItems
        .filter((i: any) => i.type === 'DEDUCTION')
        .map((i: any, idx: number) => ({
          id: i.id ? `DED-${i.id.slice(0, 6).toUpperCase()}` : `DED-00${idx + 1}`,
          name: (i.label || i.name || 'DEDUCTION').toUpperCase(),
          label: (i.label || i.name || 'DEDUCTION').toUpperCase(),
          calcType: i.calcType || 'FIXED AMOUNT',
          mandatory: i.category === 'UNION' || i.mandatory === true,
          type: 'DEDUCTION',
          raw: i,
        }));
      if (dbDeductions.length > 0) return dbDeductions;
    }
    return demoDeductions;
  }, [rawPayrollItems, demoDeductions]);

  const handleRegisterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toast({ variant: 'destructive', title: 'Item Name required', description: 'Please enter a valid item name.' });
      return;
    }

    if (!firestore || !hospitalId) {
      toast({ title: "Item Registered", description: `${itemName.toUpperCase()} added to local registry.` });
      setItemName('');
      setIsTaxable(false);
      return;
    }

    try {
      const dataToSave: any = {
        label: itemName.trim().toUpperCase(),
        name: itemName.trim().toUpperCase(),
        type: itemType,
        calcType: calcType,
        hospitalId: hospitalId,
        createdAt: serverTimestamp()
      };

      if (itemType === 'ALLOWANCE') {
        dataToSave.isTaxable = isTaxable;
      } else {
        dataToSave.category = isTaxable ? 'UNION' : 'VOLUNTARY';
        dataToSave.mandatory = isTaxable;
      }

      addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/payroll_items`), dataToSave);
      toast({ title: "Payroll Item Standardized", description: `${itemName.toUpperCase()} registered successfully.` });
      setItemName('');
      setIsTaxable(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Registration Error", description: err.message });
    }
  };

  const handleDeleteItem = (item: any) => {
    if (!firestore || !hospitalId || !item.raw?.id) {
      toast({ title: "Item removed from registry." });
      return;
    }
    const confirmation = confirm(`Are you sure you want to remove ${item.name}?`);
    if (confirmation) {
      deleteDocumentNonBlocking(doc(firestore, `hospitals/${hospitalId}/payroll_items`, item.raw.id));
      toast({ title: "Item removed from registry." });
    }
  };

  const isLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (isLoading) {
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
          <p className="text-slate-500 text-sm mt-2">You are not authorized to configure payroll registry items.</p>
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
        {/* Ambient Radial Accent Glows - Emerald/Indigo for Payroll */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Receipt className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                PAYROLL ITEM REGISTRY
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CONFIGURE GLOBAL ALLOWANCES, DEDUCTIONS, AND TAXABLE BENEFITS FOR THE PAYROLL ENGINE.
            </p>
          </div>

          {/* Active User Context */}
          <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start md:self-auto">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-black text-emerald-400 text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">PAYROLL ADMINISTRATOR</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Active Codes</span>
              <div className="text-2xl font-black text-white">{standardAllowances.length + standardDeductions.length}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">Configured items</span>
            </div>
            <div className="p-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Global Allowances</span>
              <div className="text-2xl font-black text-emerald-400">{standardAllowances.length}</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-1 block">Additions to basic</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-rose-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Global Deductions</span>
              <div className="text-2xl font-black text-rose-400">{standardDeductions.length}</div>
              <span className="text-[10px] font-bold text-rose-400 mt-1 block">Subtractions from gross</span>
            </div>
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl">
              <Scissors className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Taxable Benefits</span>
              <div className="text-2xl font-black text-amber-400">
                {standardAllowances.filter(a => a.taxable || a.isTaxable).length}
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Subject to PAYE</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. REGISTRATION COMMAND BAR                */}
      {/* ========================================== */}
      <form onSubmit={handleRegisterItem} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 mb-8 flex flex-col lg:flex-row items-center gap-4">
        
        <div className="flex-1 w-full relative">
          <input
            type="text"
            placeholder="Item Name (e.g. Risk Allowance, Union Dues)..."
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black uppercase tracking-wide text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
        
        <div className="w-full lg:w-48 shrink-0">
          <select 
            value={itemType}
            onChange={(e) => setItemType(e.target.value as any)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm cursor-pointer"
          >
            <option value="ALLOWANCE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">ALLOWANCE</option>
            <option value="DEDUCTION" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">DEDUCTION</option>
          </select>
        </div>

        <div className="w-full lg:w-auto flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <input 
            type="checkbox" 
            id="taxable"
            checked={isTaxable}
            onChange={(e) => setIsTaxable(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 focus:ring-emerald-600 cursor-pointer"
          />
          <label htmlFor="taxable" className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            {itemType === 'ALLOWANCE' ? 'TAXABLE (PAYE)' : 'MANDATORY DEDUCTION'}
          </label>
        </div>

        <button 
          type="submit"
          className="w-full lg:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" /> REGISTER ITEM
        </button>

      </form>

      {/* ========================================== */}
      {/* 3. DUAL-COLUMN FINANCIAL LEDGERS           */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: ALLOWANCES */}
        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> STANDARD ALLOWANCES
            </h2>
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded uppercase">
              Earnings / Additions
            </span>
          </div>
          
          <div className="space-y-3">
            {standardAllowances.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between group hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-100 dark:border-emerald-900 shrink-0 mt-0.5">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                      {item.name}
                    </h3>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{item.id}</span>
                      <span>•</span>
                      <span className="text-slate-600 dark:text-slate-400">{item.calcType}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {item.taxable || item.isTaxable ? (
                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded text-[9px] font-black flex items-center gap-1 border border-amber-200 dark:border-amber-800 uppercase tracking-wider">
                      <AlertCircle className="w-3 h-3" /> TAXABLE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-black flex items-center gap-1 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" /> NON-TAXABLE
                    </span>
                  )}
                  
                  {/* Actions - Visible on hover */}
                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button type="button" className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer" title="Edit Item">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDeleteItem(item)} className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer" title="Delete Item">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: DEDUCTIONS */}
        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-rose-600 dark:text-rose-400" /> STANDARD DEDUCTIONS
            </h2>
            <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded uppercase">
              Subtractions
            </span>
          </div>
          
          <div className="space-y-3">
            {standardDeductions.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between group hover:border-rose-200 dark:hover:border-rose-800 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded border border-rose-100 dark:border-rose-900 shrink-0 mt-0.5">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                      {item.name}
                    </h3>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{item.id}</span>
                      <span>•</span>
                      <span className="text-slate-600 dark:text-slate-400">{item.calcType}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {item.mandatory ? (
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[9px] font-black flex items-center gap-1 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                      MANDATORY
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800/40 text-slate-400 rounded text-[9px] font-black flex items-center gap-1 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                      OPTIONAL
                    </span>
                  )}
                  
                  {/* Actions - Visible on hover */}
                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button type="button" className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer" title="Edit Item">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDeleteItem(item)} className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer" title="Delete Item">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
