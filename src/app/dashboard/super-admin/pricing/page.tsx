'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Tag, Loader2, CreditCard } from 'lucide-react';

/**
 * == Super Admin: Pricing & Commercial Strategy Manager ==
 * 
 * Provides real-time control over the platform's public pricing tiers.
 * Change made here are instantly reflected on the landing page via Firestore synchronization.
 */
export default function PricingManager() {
    const firestore = useFirestore();
    const [isInitializing, setIsInitializing] = React.useState(false);

    // 1. LIVE QUERY: Listen to the pricing plans in real-time
    const pricingQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, "pricing_plans");
    }, [firestore]);

    const { data: plans, isLoading } = useCollection(pricingQuery);

    // ONE-TIME INITIALIZATION FUNCTION
    const handleInitialize = async () => {
        if (!firestore) return;
        setIsInitializing(true);
        
        const defaultPlans = [
            {
                id: 'clinic-starter',
                name: 'Clinic Starter',
                price: '₦50,000',
                description: 'Perfect for small private practices.',
                features: ['Patient Records', 'Vital Tracking', '10 Staff Accounts'],
                isPopular: false,
                cta: 'Start Trial'
            },
            {
                id: 'professional',
                name: 'Professional',
                price: '₦150,000',
                description: 'Full-scale management for hospitals.',
                features: ['Pharmacy & Lab', 'Inpatient Ward', 'Unlimited Staff'],
                isPopular: true,
                cta: 'Get Started'
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                price: 'Custom',
                description: 'Advanced features for medical centers.',
                features: ['Surgical Module', 'Radiology Integration', '24/7 Support'],
                isPopular: false,
                cta: 'Contact Sales'
            }
        ];

        try {
            for (const plan of defaultPlans) {
                await setDoc(doc(firestore, "pricing_plans", plan.id), plan);
            }
            toast.success("Pricing Registry Initialized!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to initialize registry.");
        } finally {
            setIsInitializing(false);
        }
    };

    const handleUpdatePrice = async (planId: string, newPrice: string) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, "pricing_plans", planId), { price: newPrice });
            toast.success("Price Updated!", { description: "The landing page now shows the new price." });
        } catch (e) {
            console.error(e);
            toast.error("Update failed");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-8">
            <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Pricing & Revenue Control</h1>
                    <p className="text-muted-foreground font-medium italic mt-1">Manage the public pricing tiers for the GamMed platform.</p>
                </div>
            </div>

            {(!plans || plans.length === 0) ? (
                <Card className="border-dashed border-2 p-12 text-center bg-slate-50">
                    <CardHeader>
                        <CardTitle>Pricing Registry Empty</CardTitle>
                        <CardDescription>You haven't set up your public pricing plans yet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={handleInitialize} 
                            disabled={isInitializing}
                            className="bg-blue-600 font-bold"
                        >
                            {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Setup Default Pricing Plans
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <Card key={plan.id} className={plan.isPopular ? "border-2 border-primary shadow-xl scale-105 z-10" : "shadow-md"}>
                            <CardHeader className={plan.isPopular ? "bg-primary/5" : ""}>
                                <CardTitle className="text-lg flex justify-between items-center font-black uppercase tracking-tight">
                                    {plan.name}
                                    {plan.isPopular && <Tag className="h-4 w-4 text-primary fill-current" />}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                                    Firestore ID: {plan.id}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Monthly Subscription Price</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            defaultValue={plan.price} 
                                            id={`price-${plan.id}`} 
                                            placeholder="e.g. ₦150,000"
                                            className="font-black text-lg h-11"
                                        />
                                        <Button 
                                            size="icon" 
                                            variant="default"
                                            className="shrink-0 h-11 w-11"
                                            onClick={() => {
                                                const val = (document.getElementById(`price-${plan.id}`) as HTMLInputElement).value;
                                                handleUpdatePrice(plan.id, val);
                                            }}
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="pt-6 border-t border-dashed">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-3 tracking-widest">Active Tier Features</p>
                                    <ul className="space-y-2">
                                        {plan.features?.map((f: string, i: number) => (
                                            <li key={i} className="text-xs font-bold text-slate-600 flex items-start gap-2 leading-relaxed">
                                                <span className="text-primary mt-0.5">•</span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
