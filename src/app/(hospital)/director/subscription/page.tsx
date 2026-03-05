'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { usePaystackPayment } from 'react-paystack';
import { CreditCard, Zap, ShieldCheck, CheckCircle2, Crown, Calendar, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SubscriptionPortal() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const plansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricing_plans')) : null, [firestore]);
  const { data: plans, isLoading: arePlansLoading } = useCollection(plansQuery);

  const hospitalQuery = useMemoFirebase(() => {
      if (!firestore || !hospitalId) return null;
      return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalQuery);
  
  const handlePaymentSuccess = (reference: any) => {
    toast({ title: "Payment Received!", description: "Your clinical instance is being updated via our secure webhook..." });
    // The Webhook handles the actual database update for security.
  };

  const handlePaymentClose = () => {
      toast({ variant: 'destructive', title: "Payment Closed", description: "The payment window was closed before completion." });
  }

  const PayButton = ({ plan }: { plan: any }) => {
    const amount = billingCycle === 'MONTHLY' ? plan.monthlyPrice : plan.annualPrice;
    const config = {
      reference: (new Date()).getTime().toString(),
      email: user?.email!,
      amount: amount * 100, // Paystack uses pesewas
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      metadata: {
        custom_fields: [
          { display_name: "Hospital ID", variable_name: "hospital_id", value: hospitalId },
          { display_name: "Plan ID", variable_name: "plan_id", value: plan.id },
          { display_name: "Cycle", variable_name: "billing_cycle", value: billingCycle }
        ]
      }
    };
    const initializePayment = usePaystackPayment(config);

    return (
      <Button 
        onClick={() => initializePayment({onSuccess: handlePaymentSuccess, onClose: handlePaymentClose})}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all"
      >
        Renew via MoMo / Card
      </Button>
    );
  };
  
  const isLoading = isUserLoading || isProfileLoading || arePlansLoading || isHospitalLoading;
  
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  if (!userProfile?.role.includes('DIRECTOR')) {
     return (
        <div className="flex flex-1 items-center justify-center bg-background p-4">
            <div className="text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">This portal is for Hospital Directors only.</p>
                 <Button onClick={() => router.push('/dashboard')} className="mt-4">Return to Dashboard</Button>
            </div>
         </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 text-black font-bold">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b pb-8">
        <div>
           <h1 className="text-4xl font-black uppercase tracking-tighter italic">Billing <span className="text-blue-600">& License</span></h1>
           <p className="text-slate-500 font-bold text-xs uppercase italic">Manage your facility's SaaS standing.</p>
        </div>
        
        {/* CYCLE TOGGLE */}
        <div className="bg-slate-900 p-1.5 rounded-2xl flex gap-2">
           <button onClick={() => setBillingCycle('MONTHLY')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${billingCycle === 'MONTHLY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Monthly</button>
           <button onClick={() => setBillingCycle('ANNUAL')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${billingCycle === 'ANNUAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Annual (Discounted)</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans?.sort((a,b) => a.monthlyPrice - b.monthlyPrice).map((plan: any) => (
          <div key={plan.id} className={`bg-white p-8 rounded-[40px] border-4 flex flex-col justify-between ${plan.id === hospital?.subscriptionPlan ? 'border-blue-600 shadow-2xl scale-105' : 'border-slate-50 shadow-sm'}`}>
            <div>
              <div className="flex justify-between items-start mb-6">
                 <h3 className="text-2xl font-black uppercase italic">{plan.name}</h3>
                 {plan.id === hospital?.subscriptionPlan && <Crown className="text-blue-600" size={24}/>}
              </div>
              <div className="mb-8">
                 <p className="text-4xl font-black italic">₵ {billingCycle === 'MONTHLY' ? plan.monthlyPrice.toLocaleString() : plan.annualPrice.toLocaleString()}</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{billingCycle === 'MONTHLY' ? '/ per month' : '/ per year'}</p>
              </div>
              <ul className="space-y-4 mb-10">
                 {plan.features?.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                       <CheckCircle2 size={16} className="text-green-500" /> {f}
                    </li>
                 ))}
              </ul>
            </div>
            <PayButton plan={plan} />
          </div>
        ))}
      </div>
    </div>
  );
}
