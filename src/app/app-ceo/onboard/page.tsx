'use client';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebaseApp, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Zap, ShieldCheck, Globe, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const regions = [
    { value: 'AHA', label: 'Ahafo' },
    { value: 'ASH', label: 'Ashanti' },
    { value: 'BON', label: 'Bono' },
    { value: 'BEA', label: 'Bono East' },
    { value: 'CEN', label: 'Central' },
    { value: 'EAS', label: 'Eastern' },
    { value: 'GAR', label: 'Greater Accra' },
    { value: 'NEA', label: 'North East' },
    { value: 'NOR', label: 'Northern' },
    { value: 'OTI', label: 'Oti' },
    { value: 'SAV', label: 'Savannah' },
    { value: 'UEA', label: 'Upper East' },
    { value: 'UWE', label: 'Upper West' },
    { value: 'VOL', label: 'Volta' },
    { value: 'WES', label: 'Western' },
    { value: 'WNO', label: 'Western North' },
];

function OnboardingForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const firebaseApp = useFirebaseApp();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const pricingPlansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricing_plans')) : null, [firestore]);
  const { data: pricingPlans, isLoading: arePricingPlansLoading } = useCollection(pricingPlansQuery);

  const [form, setForm] = useState({
    hospitalName: searchParams.get('hospitalName') || '',
    region: 'GAR',
    directorName: searchParams.get('directorName') || '',
    directorEmail: searchParams.get('directorEmail') || '',
    mrnPrefix: searchParams.get('mrnPrefix') || '',
    subscriptionPlan: 'PROFESSIONAL',
    monthlyRateNumeric: 5000,
    monthlyRateWords: '',
  });

  useEffect(() => {
    if (pricingPlans) {
        const selectedPlan = pricingPlans.find(p => p.id === form.subscriptionPlan);
        if (selectedPlan) {
            setForm(prev => ({...prev, monthlyRateNumeric: selectedPlan.monthlyPrice}));
        }
    }
  }, [form.subscriptionPlan, pricingPlans]);

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseApp) {
        toast({ variant: 'destructive', title: "Firebase App not available."});
        return;
    }
    setLoading(true);
    try {
      const functions = getFunctions(firebaseApp);
      const provision = httpsCallable(functions, 'provisionFullHospital');
      const result: any = await provision(form);
      toast({ 
          title: `HOSPITAL LIVE: ${result.data.hospitalId}`, 
          description: "COA, Inventory, and Director settings fully injected."
      });
    } catch (e: any) {
      toast({ 
        variant: 'destructive', 
        title: "Provisioning failed",
        description: e.message
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (arePricingPlansLoading) {
      return (
          <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
          </div>
      )
  }

  return (
    <div className="animate-in fade-in duration-500">
      <form onSubmit={handleOnboard} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* --- SECTION 1: CLINICAL IDENTITY --- */}
        <div className="bg-white p-8 rounded-[40px] border-4 border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Globe className="text-blue-600" size={18} />
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Clinical Identity</h3>
          </div>
          
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Hospital Full Name</label>
            <input 
              type="text" required 
              value={form.hospitalName}
              placeholder="Enter Hospital Name"
              className="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 text-slate-900 font-bold bg-white focus:border-blue-600 outline-none transition-all shadow-inner"
              onChange={e => setForm({...form, hospitalName: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Region</label>
              <select 
                className="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 text-slate-900 font-bold bg-white outline-none focus:border-blue-600"
                value={form.region}
                onChange={e => setForm({...form, region: e.target.value})}
              >
                {regions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">EHR Prefix</label>
              <input 
                type="text" maxLength={4} 
                value={form.mrnPrefix}
                className="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 text-blue-600 font-black uppercase bg-white outline-none focus:border-blue-600"
                onChange={e => setForm({...form, mrnPrefix: e.target.value.toUpperCase()})} 
              />
            </div>
          </div>
        </div>

        {/* --- SECTION 2: ADMINISTRATIVE CONTROL --- */}
        <div className="bg-white p-8 rounded-[40px] border-4 border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b">
            <ShieldCheck className="text-green-600" size={18} />
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Director Access</h3>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Director Name</label>
            <input 
              type="text" required 
              value={form.directorName}
              className="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 text-slate-900 font-bold bg-white focus:border-blue-600 outline-none"
              onChange={e => setForm({...form, directorName: e.target.value})} 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Official Email</label>
            <input 
              type="email" required 
              value={form.directorEmail}
              className="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 text-slate-900 font-bold bg-white focus:border-blue-600 outline-none"
              onChange={e => setForm({...form, directorEmail: e.target.value})} 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">SaaS Pricing Tier</label>
            <select 
              className="w-full p-4 border-2 border-slate-100 rounded-2xl mt-1 text-slate-900 font-bold bg-white outline-none focus:border-blue-600"
              value={form.subscriptionPlan}
              onChange={e => setForm({...form, subscriptionPlan: e.target.value})}
            >
              {pricingPlans?.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name} (₵ {plan.monthlyPrice})</option>
              ))}
            </select>
          </div>
        </div>

        {/* --- SECTION 3: FINANCIAL AUTHORIZATION (Words) --- */}
        <div className="md:col-span-2 bg-[#0f172a] p-10 rounded-[50px] text-white shadow-2xl space-y-6 border-b-8 border-blue-600">
           <h3 className="text-xl font-black uppercase italic tracking-tighter text-blue-400">Financial Verification</h3>
           <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Type Subscription Amount in Words</label>
              <input 
                required
                placeholder="e.g. FIVE THOUSAND GHANA CEDIS ONLY"
                className="w-full p-5 bg-slate-800 border-2 border-slate-700 rounded-3xl text-white font-black uppercase italic outline-none focus:border-blue-500 transition-all"
                value={form.monthlyRateWords}
                onChange={e => setForm({...form, monthlyRateWords: e.target.value.toUpperCase()})}
              />
           </div>
        </div>

        <div className="md:col-span-2 pt-4">
          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white font-black py-6 rounded-3xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
            Initialize Hospital Tenant
          </button>
        </div>
      </form>
    </div>
  );
}


export default function Page() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 text-black tracking-tight">Provisioning Engine</h1>
        <p className="text-slate-500">Deploy a new, fully-isolated hospital tenant onto the GAM_Med platform.</p>
      </div>

      <Suspense fallback={<div className="p-10 text-center">Loading Lead Details...</div>}>
        <OnboardingForm />
      </Suspense>
    </div>
  );
}
