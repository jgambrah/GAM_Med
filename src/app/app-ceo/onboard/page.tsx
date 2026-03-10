'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebaseApp, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Zap, ShieldCheck, Globe, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CeoOnboardHospitalForm } from '@/components/app/ceo-onboard-hospital-form';
import { Skeleton } from '@/components/ui/skeleton';

function OnboardingForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const firebaseApp = useFirebaseApp();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const pricingPlansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricing_plans')) : null, [firestore]);
  const { data: pricingPlans, isLoading: arePricingPlansLoading } = useCollection(pricingPlansQuery);

  const initialFormValues = {
    hospitalName: searchParams.get('hospitalName') || '',
    region: 'GAR',
    directorName: searchParams.get('directorName') || '',
    directorEmail: searchParams.get('directorEmail') || '',
    mrnPrefix: searchParams.get('mrnPrefix') || '',
    subscriptionPlan: 'PRO',
  };

  const handleOnboard = async (values: typeof initialFormValues) => {
    if (!firebaseApp) {
        toast({ variant: 'destructive', title: "Firebase App not available."});
        return;
    }
    setLoading(true);
    try {
      const functions = getFunctions(firebaseApp);
      const provision = httpsCallable(functions, 'provisionFullHospital');
      const result: any = await provision(values);
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
    <CeoOnboardHospitalForm 
        onSubmit={handleOnboard} 
        isLoading={loading} 
        pricingPlans={pricingPlans || []}
        initialValues={initialFormValues}
    />
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
