'use client';

import * as React from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  isPopular: boolean;
  cta: string;
}

/**
 * == Dynamic SaaS Pricing Section ==
 * 
 * Fetches commercial tiers directly from Firestore. 
 * Allows the Platform Owner to update prices and features instantly from the Command Centre.
 */
export function PricingSection() {
  const firestore = useFirestore();

  // LIVE QUERY: Fetch all pricing plans from the public register
  const pricingQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'pricing_plans'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: plans, isLoading } = useCollection<PricingPlan>(pricingQuery);

  return (
    <section id="pricing" className="py-24 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <div className="flex items-center justify-center gap-2 text-blue-600 font-black uppercase tracking-[0.2em] text-[10px]">
            <ShieldCheck size={14} />
            <span>Multi-Tenant Enterprise Architecture</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter">
            Transparent Scaling for Every Facility.
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Choose the diagnostic and administrative capacity that fits your hospital's volume. 
            All plans include <strong>logical data isolation</strong> as standard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {isLoading ? (
            // Loading Skeletons
            [1, 2, 3].map((i) => (
              <div key={i} className="p-8 border rounded-3xl space-y-6">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-1/3" />
                <div className="space-y-2 pt-4">
                  {[1, 2, 3, 4].map(j => <Skeleton key={j} className="h-4 w-full" />)}
                </div>
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ))
          ) : plans && plans.length > 0 ? (
            plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative p-8 border rounded-3xl flex flex-col transition-all hover:shadow-2xl hover:border-blue-600 group ${
                  plan.isPopular ? 'border-blue-600 shadow-xl scale-105 z-10 bg-slate-50/50' : 'border-slate-200'
                }`}
              >
                {plan.isPopular && (
                  <span className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                    MOST POPULAR
                  </span>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{plan.name}</h3>
                  <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">{plan.description}</p>
                  <div className="mt-8 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{plan.price}</span>
                    {plan.price.includes('₵') || plan.price.includes('₦') ? (
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">/ Month</span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4 mb-10 flex-grow">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Included Features:</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm font-semibold text-slate-600">
                        <Check className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button 
                  variant={plan.isPopular ? 'default' : 'outline'} 
                  className={`w-full h-14 text-base font-black uppercase tracking-widest rounded-2xl shadow-md group-hover:scale-[1.02] transition-transform ${
                    plan.isPopular ? 'bg-blue-600 hover:bg-blue-700' : 'border-2'
                  }`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/5">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-bold">Initializing dynamic pricing registry...</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
