'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, query } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, CheckCircle2, Edit3, Save, X, DollarSign, Loader2, ShieldAlert } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface Plan {
    id: string;
    name: string;
    price: string;
    monthlyPrice: number;
    annualPrice: number;
    description: string;
    isPopular: boolean;
    features: string[];
    maxStaff: number;
    maxPatients: number;
}

interface Hospital {
    id: string;
    status: 'active' | 'suspended';
    subscriptionPlan: string;
}

export default function PricingConsolePage() {
    const { user, isUserLoading: isUserAuthLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [claims, setClaims] = useState<any>(null);
    const [isClaimsLoading, setIsClaimsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            user.getIdTokenResult(true).then((idTokenResult) => {
                setClaims(idTokenResult.claims);
                setIsClaimsLoading(false);
            });
        } else if (!isUserAuthLoading) {
            setIsClaimsLoading(false);
        }
    }, [user, isUserAuthLoading]);

    const isSuperAdmin = claims?.role === 'SUPER_ADMIN';

    const plansQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'pricing_plans')) : null, [firestore]);
    const { data: plans, isLoading: arePlansLoading } = useCollection<Omit<Plan, 'id'>>(plansQuery);
    
    const hospitalsQuery = useMemoFirebase(() => isSuperAdmin && firestore ? collection(firestore, 'hospitals') : null, [firestore, isSuperAdmin]);
    const { data: hospitals, isLoading: areHospitalsLoading } = useCollection<Omit<Hospital, 'id'>>(hospitalsQuery);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Plan>>({});

    const projectedRevenue = useMemo(() => {
        if (!hospitals || !plans) return 0;
        return hospitals
            .filter(h => h.status === 'active')
            .reduce((total, hospital) => {
                const plan = plans.find(p => p.id === hospital.subscriptionPlan);
                const priceValue = plan?.monthlyPrice || 0;
                return total + priceValue;
        }, 0);
    }, [hospitals, plans]);


    const startEdit = (plan: Plan) => {
        setEditingId(plan.id);
        setEditForm(plan);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleFormChange = (field: keyof Omit<Plan, 'id' | 'features'>, value: string | number | boolean) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };
    
    const handleFeaturesChange = (value: string) => {
        setEditForm(prev => ({ ...prev, features: value.split(',').map(f => f.trim()) }));
    };

    const saveEdit = () => {
        if (!firestore || !editingId) return;

        const { id, ...planData } = editForm;
        
        // Also update the 'price' field for display consistency, e.g. "GHS 1000"
        const updatedPlanData = {
            ...planData,
            price: `GHS ${planData.monthlyPrice?.toLocaleString() || '0'}`
        };

        updateDocumentNonBlocking(doc(firestore, "pricing_plans", editingId), updatedPlanData);

        toast({
            title: "Plan Updated",
            description: `The ${editForm.name} plan has been updated globally.`,
        });

        cancelEdit();
    };

    const isPageLoading = isUserAuthLoading || isClaimsLoading;
    const isLoading = arePlansLoading || areHospitalsLoading || isPageLoading;

    if (isPageLoading) {
        return (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        );
    }
    
    if (!isSuperAdmin) {
        return (
          <div className="flex flex-1 items-center justify-center bg-background p-4">
            <div className="text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have SUPER_ADMIN privileges.</p>
                 <Button onClick={() => router.push('/')} className="mt-4">Return to Login</Button>
            </div>
         </div>
        );
    }


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Revenue <span className="text-primary">Console</span></h1>
                <p className="text-muted-foreground font-medium">Manage SaaS tiers and feature gating for the GAM_Med network.</p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Platform MRR (Projected)</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-8 w-1/2" />
                    ) : (
                        <div className="text-2xl font-bold">
                            {`GHS ${projectedRevenue.toLocaleString()}`}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">Monthly Recurring Revenue from active facilities.</p>
                </CardContent>
            </Card>

            {arePlansLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="p-6">
                            <Skeleton className="h-12 w-12 mb-4 rounded-xl" />
                            <Skeleton className="h-8 w-1/2 mb-2" />
                            <Skeleton className="h-10 w-3/4 mb-6" />
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {plans?.sort((a,b) => (a.monthlyPrice || 0) - (b.monthlyPrice || 0)).map((plan) => (
                    <Card key={plan.id} className={`p-6 shadow-sm transition-all ${editingId === plan.id ? 'border-primary ring-4 ring-primary/10' : 'border-border'} ${plan.isPopular && !editingId ? 'border-primary' : ''}`}>
                        {plan.isPopular && !editingId && <Badge className="absolute -top-3 right-4">Popular</Badge>}
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-primary p-3 rounded-xl text-primary-foreground">
                                <CreditCard size={24} />
                            </div>
                            {editingId === plan.id ? (
                                <div className="flex gap-2">
                                    <Button onClick={saveEdit} size="icon" variant="ghost" className="text-green-600 hover:bg-green-100 hover:text-green-700"><Save size={18} /></Button>
                                    <Button onClick={cancelEdit} size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10"><X size={18} /></Button>
                                </div>
                            ) : (
                                <Button onClick={() => startEdit(plan as Plan)} size="icon" variant="ghost" className="text-muted-foreground hover:text-primary"><Edit3 size={18} /></Button>
                            )}
                        </div>

                        {editingId === plan.id ? (
                           <div className="space-y-4">
                                <Input className="h-auto p-0 text-xl font-black text-foreground uppercase border-0 focus-visible:ring-0" value={editForm.name || ''} onChange={e => handleFormChange('name', e.target.value)} />
                                <div>
                                    <Label className="text-xs font-bold text-muted-foreground">Description</Label>
                                    <Input className="mt-1" value={editForm.description || ''} onChange={e => handleFormChange('description', e.target.value)} />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs font-bold text-muted-foreground">Monthly Rate (₵)</Label>
                                        <Input type="number" className="mt-1 font-black" value={editForm.monthlyPrice || ''} onChange={e => handleFormChange('monthlyPrice', Number(e.target.value))} />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-bold text-muted-foreground">Annual Rate (₵)</Label>
                                        <Input type="number" className="mt-1 font-black" value={editForm.annualPrice || ''} onChange={e => handleFormChange('annualPrice', Number(e.target.value))} />
                                        <p className="text-[8px] text-green-600 font-bold uppercase mt-1">Suggested: {(Number(editForm.monthlyPrice || 0) * 10).toFixed(2)} (2 months free)</p>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs font-bold text-muted-foreground">Features (comma-separated)</Label>
                                    <Input className="mt-1" value={(editForm.features || []).join(', ')} onChange={e => handleFeaturesChange(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs font-bold text-muted-foreground">Max Staff</Label>
                                        <Input type="number" className="mt-1" value={editForm.maxStaff ?? ''} onChange={e => handleFormChange('maxStaff', Number(e.target.value))} />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-bold text-muted-foreground">Max Patients</Label>
                                        <Input type="number" className="mt-1" value={editForm.maxPatients ?? ''} onChange={e => handleFormChange('maxPatients', Number(e.target.value))} />
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                <Switch id={`is-popular-${plan.id}`} checked={editForm.isPopular || false} onCheckedChange={checked => handleFormChange('isPopular', checked)} />
                                <Label htmlFor={`is-popular-${plan.id}`}>Mark as Popular</Label>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-xl font-black text-foreground uppercase">{plan.name}</h3>
                                <p className="text-sm text-muted-foreground min-h-[40px] mt-1">{plan.description}</p>
                                <div className="flex items-baseline gap-1 mt-2">
                                    <span className="text-3xl font-black">{plan.price}</span>
                                    <span className="text-muted-foreground text-sm font-bold uppercase">/mo</span>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 space-y-3">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b pb-2">Plan Limits & Features</p>
                            <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 size={14} className="text-primary" /> Max Staff: <strong>{plan.maxStaff === -1 ? 'Unlimited' : plan.maxStaff}</strong></div>
                            <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 size={14} className="text-primary" /> Max Patients: <strong>{plan.maxPatients === -1 ? 'Unlimited' : plan.maxPatients.toLocaleString()}</strong></div>
                            {plan.features?.map((feature: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm font-medium">
                                    <CheckCircle2 size={14} className="text-primary" /> {feature}
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

    