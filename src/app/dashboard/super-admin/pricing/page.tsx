'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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
 * Changes made here are instantly reflected on the landing page via Firestore synchronization.
 */
export default function PricingManager() {
    const db = useFirestore();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) return;
        // Listen to the pricing plans in real-time
        const unsubscribe = onSnapshot(collection(db, "pricing_plans"), (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlans(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    const handleUpdatePrice = async (planId: string, newPrice: string) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, "pricing_plans", planId), { price: newPrice });
            toast.success("Price Updated!", { description: "The landing page now shows the new price." });
        } catch (e) {
            console.error(e);
            toast.error("Update failed");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Pricing & Revenue Control</h1>
                    <p className="text-muted-foreground font-medium italic mt-1">Manage the public pricing tiers for the GamMed platform.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.length > 0 ? plans.map((plan) => (
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
                )) : (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/5">
                        <p className="text-muted-foreground font-bold italic">No pricing plans found in registry. Ensure the 'pricing_plans' collection is initialized.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
