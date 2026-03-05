'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { Zap, HeartPulse, Activity, Loader2, ShieldAlert, Plus, Play, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

export default function SpecialtyDashboard() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [loadingSession, setLoadingSession] = useState<string | null>(null);

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const hospitalId = userProfile?.hospitalId;
    const isAuthorized = ['DIRECTOR', 'DOCTOR', 'NURSE', 'ADMIN'].includes(userProfile?.role || '');

    const plansQuery = useMemoFirebase(() => {
        if (!firestore || !hospitalId) return null;
        return query(
            collection(firestore, `hospitals/${hospitalId}/treatment_plans`),
            where('status', '==', 'ACTIVE'),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, hospitalId]);
    const { data: plans, isLoading: plansLoading } = useCollection(plansQuery);

    const getServiceIcon = (serviceType: string) => {
        switch (serviceType) {
            case 'DIALYSIS': return <Zap className="text-blue-500" />;
            case 'ONCOLOGY': return <HeartPulse className="text-red-500" />;
            case 'PHYSIO': return <Activity className="text-green-500" />;
            default: return <Zap />;
        }
    };
    
    const handleStartSession = async (plan: any) => {
        if (!firestore || !user || !hospitalId) return toast({ variant: 'destructive', title: 'System not ready.' });
        setLoadingSession(plan.id);
    
        const sessionData = {
            planId: plan.id,
            patientId: plan.patientId,
            patientName: plan.patientName,
            hospitalId: hospitalId,
            unitId: plan.unitId,
            startTime: serverTimestamp(),
            status: 'IN_PROGRESS',
            readings: [],
            billed: false,
            consumablesDeducted: false,
            loggedBy: user.uid,
            loggedByName: user.displayName || 'Unknown Staff',
            createdAt: serverTimestamp()
        };
    
        try {
            const sessionCollectionRef = collection(firestore, `hospitals/${hospitalId}/treatment_plans/${plan.id}/sessions`);
            const sessionRef = await addDocumentNonBlocking(sessionCollectionRef, sessionData);
            
            if (sessionRef?.id) {
                toast({ title: 'Session Started', description: `Live flowsheet for ${plan.patientName} is active.` });
                router.push(`/specialty/session/${sessionRef.id}`);
            } else {
                 throw new Error("Failed to create session document.");
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error starting session', description: error.message });
            setLoadingSession(null);
        }
      };

    const isLoading = isUserLoading || isProfileLoading;
    if (isLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;

    if (!isAuthorized) return <ShieldAlert className="text-destructive m-8">Access Denied</ShieldAlert>;

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-end border-b pb-6">
                <div>
                   <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Specialty Care <span className="text-primary">Dashboard</span></h1>
                   <p className="text-muted-foreground font-medium">Live overview of all cycle-based treatment plans.</p>
                </div>
                <Button asChild>
                    <Link href="/specialty/plans/new"><Plus size={16} /> Authorize New Plan</Link>
                </Button>
            </div>
            
            {plansLoading && <Loader2 className="animate-spin mx-auto text-primary" />}
            
            {!plansLoading && plans?.length === 0 && (
                <div className="text-center p-20 bg-card rounded-2xl border-2 border-dashed">
                    <p className="font-bold text-muted-foreground">No active treatment plans found.</p>
                    <p className="text-sm text-muted-foreground">Click "Authorize New Plan" to get started.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans?.map(plan => (
                    <div key={plan.id} className="bg-card p-6 rounded-[32px] border shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-muted rounded-2xl">{getServiceIcon(plan.serviceType)}</div>
                                <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">{plan.unitName}</span>
                            </div>
                            <h3 className="text-lg font-black uppercase text-foreground">{plan.patientName}</h3>
                            <p className="text-xs font-bold text-muted-foreground uppercase">{plan.frequency}</p>
                        </div>
                        <div className="mt-6 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-primary">Session Progress</span>
                                <span>{plan.sessionsCompleted} / {plan.sessionsAuthorized}</span>
                            </div>
                            <Progress value={(plan.sessionsCompleted / plan.sessionsAuthorized) * 100} />
                            <Button 
                                className="w-full" 
                                onClick={() => handleStartSession(plan)} 
                                disabled={loadingSession === plan.id}
                            >
                                {loadingSession === plan.id ? <Loader2 className="animate-spin" /> : <Play size={16} />}
                                Start New Session
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
