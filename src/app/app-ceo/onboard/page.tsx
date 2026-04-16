'use client';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebaseApp, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { getAuth } from 'firebase/auth';
import { collection, query } from 'firebase/firestore';
import { Zap, ShieldCheck, Globe, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { CeoOnboardHospitalForm } from '@/components/app/ceo-onboard-hospital-form';

function OnboardingContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const firebaseApp = useFirebaseApp();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const pricingPlansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricing_plans')) : null, [firestore]);
  const { data: pricingPlans, isLoading: arePricingPlansLoading } = useCollection(pricingPlansQuery);

  const initialValues = useMemo(() => ({
    hospitalName: searchParams.get('hospitalName') || '',
    directorName: searchParams.get('directorName') || '',
    directorEmail: searchParams.get('directorEmail') || '',
    mrnPrefix: searchParams.get('mrnPrefix') || '',
  }), [searchParams]);

  const handleOnboard = async (values: any) => {
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
          description: "Syncing director identity... The new director can now log in."
      });
      
      // The global onIdTokenChanged listener in FirebaseProvider handles the refresh,
      // but we can also force a refresh on the current (CEO) client if needed,
      // though it's not critical for the NEW user's token.
      const auth = getAuth(firebaseApp);
      if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
      }
      
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
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
      )
  }

  return (
    <div className="animate-in fade-in duration-500">
        <CeoOnboardHospitalForm
            onSubmit={handleOnboard}
            isLoading={loading}
            pricingPlans={pricingPlans || []}
            initialValues={initialValues}
        />
    </div>
  );
}


export default function Page() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Provisioning Engine</h1>
        <p className="text-slate-400">Deploy a new, fully-isolated hospital tenant onto the GAM_Med platform.</p>
      </div>

      <Suspense fallback={<div className="p-10 text-center text-white">Loading Lead Details...</div>}>
        <OnboardingContent />
      </Suspense>
    </div>
  );
}
