'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Tag, Loader2 } from 'lucide-react';

export default function PricingManager() {
    const firestore = useFirestore();
    const [isInitializing, setIsInitializing] = useState(false);

    const pricingQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, "pricing_plans");
    }, [firestore]);

    const { data: plans, isLoading } = useCollection(pricingQuery);

    const handleInitialize = async () => {
        if (!firestore) return;
        setIsInitializing(true);
        const defaultPlans = [
            {
                id: 'clinic-starter',
                name: 'Clinic Starter',
                price: '₦50,000',
                description: 'Perfect for small private practices.',
                features: [
                    'Basic Patient EHR', 
                    'Vital Signs Log', 
                    'Appointment Scheduling', 
                    'Basic Invoicing', 
                    'Limit: 10 Staff Accounts'
                ],
                slugs: ['ehr', 'vitals', 'appointments', 'billing'],
                isPopular: false,
                cta: 'Start Trial'
            },
            {
                id: 'professional',
                name: 'Professional',
                price: '₦150,000',
                description: 'Full-scale management for hospitals.',
                features: [
                    'Everything in Starter',
                    'Full Pharmacy Module',
                    'Laboratory Information System (LIS)',
                    'Inpatient & Bed Management',
                    'Inventory & Procurement',
                    'Nursing Station Task Queue'
                ],
                slugs: ['ehr', 'vitals', 'appointments', 'billing', 'pharmacy', 'lab', 'wards', 'inventory', 'nursing'],
                isPopular: true,
                cta: 'Get Started'
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                price: 'Custom',
                description: 'Advanced features for medical centers.',
                features: [
                    'Everything in Professional',
                    'Surgical & OT Management',
                    'Radiology (PACS) Imaging',
                    'Government Compliance Reporting',
                    'Narcotics/Controlled Substances Log',
                    'Executive BI Analytics',
                    'Multi-Branch Management',
                    'Priority 24/7 Support'
                ],
                slugs: ['ehr', 'vitals', 'appointments', 'billing', 'pharmacy', 'lab', 'wards', 'inventory', 'nursing', 'surgery', 'radiology', 'compliance', 'narcotics', 'analytics'],
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
            toast.success("Price Updated!");
        } catch (e) {
            toast.error("Update failed");
        }
    };

    if (isLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-600" /></div>;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pricing & Revenue Control</h1>
                    <p className="text-muted-foreground">Manage the public pricing tiers for the GamMed platform.</p>
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
                            className="bg-blue-600"
                        >
                            {isInitializing ? "Initializing..." : "Setup Default Pricing Plans"}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <Card key={plan.id} className={plan.isPopular ? "border-blue-500 shadow-md ring-1 ring-blue-200" : ""}>
                            <CardHeader>
                                <CardTitle className="text-lg flex justify-between items-center font-bold">
                                    {plan.name}
                                    {plan.isPopular && <Tag className="h-4 w-4 text-blue-500" />}
                                </CardTitle>
                                <CardDescription className="text-xs uppercase font-bold tracking-widest">Slugs: {plan.slugs?.join(', ')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase">Monthly Price</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            defaultValue={plan.price} 
                                            id={`price-${plan.id}`} 
                                            className="font-bold"
                                        />
                                        <Button 
                                            size="icon" 
                                            variant="outline"
                                            onClick={() => {
                                                const val = (document.getElementById(`price-${plan.id}`) as HTMLInputElement).value;
                                                handleUpdatePrice(plan.id, val);
                                            }}
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t">
                                    <p className="text-xs font-black text-muted-foreground uppercase mb-3 tracking-widest">Active Tier Features</p>
                                    <ul className="text-xs space-y-2">
                                        {plan.features?.map((f: string, i: number) => (
                                            <li key={i} className="text-slate-600 flex items-center gap-2">
                                               <span className="h-1 w-1 bg-blue-400 rounded-full" /> {f}
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
