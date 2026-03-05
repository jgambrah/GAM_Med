'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebaseApp } from '@/firebase';
import { Zap, ShieldCheck, Globe, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 1. THE INTERNAL FORM
function OnboardingForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    hospitalName: '',
    region: 'GAR',
    directorEmail: '',
    directorName: '',
    subscriptionPlan: 'PRO',
    mrnPrefix: 'GAM'
  });

  // This fires as soon as the URL parameters are ready
  useEffect(() => {
    const hName = searchParams.get('hospitalName');
    const dEmail = searchParams.get('directorEmail');
    const dName = searchParams.get('directorName');

    if (hName || dEmail || dName) {
      console.log("✅ Lead data found in URL. Filling form...");
      setForm(prev => ({
        ...prev,
        hospitalName: hName || '',
        directorEmail: dEmail || '',
        directorName: dName || ''
      }));
    }
  }, [searchParams]);

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!firebaseApp) {
        toast({ variant: 'destructive', title: "Firebase App not available."});
        setLoading(false);
        return;
    }

    try {
      const functions = getFunctions(firebaseApp);
      const onboard = httpsCallable(functions, 'onboardHospital');
      const result: any = await onboard(form);
      toast({
          title: "Onboarding Success!",
          description: `Hospital ${form.hospitalName} is live with ID: ${result.data.hospitalId}`
      })
    } catch (err: any) {
      toast({
          variant: 'destructive',
          title: 'Onboarding Failed',
          description: err.message
      })
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleOnboard} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Globe size={18} className="text-blue-500" /> Clinical Identity
          </h3>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Hospital Name</label>
            <input type="text" required value={form.hospitalName} className="w-full p-2 border rounded mt-1 text-black bg-slate-50"
              onChange={e => setForm({...form, hospitalName: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="text-xs font-bold text-slate-500 uppercase">Region</label>
               <select className="w-full p-2 border rounded mt-1 text-black" value={form.region}
                 onChange={e => setForm({...form, region: e.target.value})}>
                 <option value="GAR">Greater Accra</option>
                 <option value="ASH">Ashanti</option>
                 <option value="WR">Western</option>
               </select>
            </div>
            <div>
               <label className="text-xs font-bold text-slate-500 uppercase text-black">MRN Prefix</label>
               <input type="text" maxLength={4} value={form.mrnPrefix} className="w-full p-2 border rounded mt-1 font-mono uppercase text-black"
                 onChange={e => setForm({...form, mrnPrefix: e.target.value.toUpperCase()})} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4 text-black">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <ShieldCheck size={18} className="text-green-500" /> Director Access
          </h3>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Director Name</label>
            <input type="text" required value={form.directorName} className="w-full p-2 border rounded mt-1 text-black bg-slate-50"
              onChange={e => setForm({...form, directorName: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Director Email</label>
            <input type="email" required value={form.directorEmail} className="w-full p-2 border rounded mt-1 text-black bg-slate-50"
              onChange={e => setForm({...form, directorEmail: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Subscription Plan</label>
            <select className="w-full p-2 border rounded mt-1 text-black" value={form.subscriptionPlan}
              onChange={e => setForm({...form, subscriptionPlan: e.target.value})}>
              <option value="CLINIC">Clinic Tier</option>
              <option value="PRO">Pro Hospital</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : 'Provision Now'}
            <Zap size={20} />
          </button>
        </div>
      </form>
  );
}

// 2. THE MAIN PAGE WRAPPER
export default function Page() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 text-black tracking-tight">Provisioning Engine</h1>
        <p className="text-slate-500">Initializing a new secure hospital instance.</p>
      </div>

      <Suspense fallback={<div className="p-10 text-center">Loading Lead Details...</div>}>
        <OnboardingForm />
      </Suspense>
    </div>
  );
}
