'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { Zap, HeartPulse, Activity, Loader2, ShieldAlert, Plus, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

export default function SpecialtyDashboard() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [loadingSession, setLoadingSession] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

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
            orderBy('createdAt', 'desc')
        );
    }, [firestore, hospitalId]);
    const { data: plans, isLoading: plansLoading } = useCollection(plansQuery);

    const activePlans = useMemo(() => plans?.filter(p => p.status === 'ACTIVE') || [], [plans]);
    const completedPlans = useMemo(() => plans?.filter(p => p.status === 'COMPLETED') || [], [plans]);

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
            loggedByName: userProfile?.fullName || user.displayName || 'Unknown Staff',
            createdAt: serverTimestamp()
        };
    
        try {
            const sessionCollectionRef = collection(firestore, `hospitals/${hospitalId}/treatment_plans/${plan.id}/sessions`);
            const sessionDocRef = doc(sessionCollectionRef);
            const sessionId = sessionDocRef.id;

            setDocumentNonBlocking(sessionDocRef, sessionData, { merge: true });
            
            toast({ title: 'Session Started', description: `Live flowsheet for ${plan.patientName} is active.` });
            router.push(`/specialty/session/${sessionId}?planId=${plan.id}`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error starting session', description: error.message });
            setLoadingSession(null);
        }
      };

    const isLoading = isUserLoading || isProfileLoading;
    if (isLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;

    if (!isAuthorized) return <ShieldAlert className="text-destructive m-8">Access Denied</ShieldAlert>;

    const currentPlans = activeTab === 'active' ? activePlans : completedPlans;

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

            {/* Premium Tab Bar */}
            <div className="flex gap-4 border-b border-muted pb-0">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-wider transition-all border-b-4 ${
                        activeTab === 'active' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Active Plans ({activePlans.length})
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-wider transition-all border-b-4 ${
                        activeTab === 'completed' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Completed Plans ({completedPlans.length})
                </button>
            </div>
            
            {plansLoading && <Loader2 className="animate-spin mx-auto text-primary" />}
            
            {!plansLoading && currentPlans.length === 0 && (
                <div className="text-center p-20 bg-card rounded-2xl border-2 border-dashed">
                    <p className="font-bold text-muted-foreground">No {activeTab} treatment plans found.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentPlans.map(plan => (
                    <PlanCard 
                        key={plan.id}
                        plan={plan}
                        hospitalId={hospitalId}
                        handleStartSession={handleStartSession}
                        loadingSession={loadingSession}
                    />
                ))}
            </div>
        </div>
    );
}

function PlanCard({ plan, hospitalId, handleStartSession, loadingSession }: any) {
    const [showHistory, setShowHistory] = useState(false);

    const getServiceIcon = (serviceType: string) => {
        switch (serviceType) {
            case 'DIALYSIS': return <Zap className="text-blue-500" />;
            case 'ONCOLOGY': return <HeartPulse className="text-red-500" />;
            case 'PHYSIO': return <Activity className="text-green-500" />;
            default: return <Zap />;
        }
    };

    const isCompleted = plan.status === 'COMPLETED';

    return (
        <div className="bg-card p-6 rounded-[32px] border shadow-sm flex flex-col justify-between h-fit">
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
                
                {isCompleted ? (
                    <div className="bg-muted text-muted-foreground font-black uppercase text-[10px] tracking-wider py-3 rounded-2xl text-center border">
                        Plan Completed
                    </div>
                ) : (
                    <Button 
                        className="w-full" 
                        onClick={() => handleStartSession(plan)} 
                        disabled={loadingSession === plan.id}
                    >
                        {loadingSession === plan.id ? <Loader2 className="animate-spin" /> : <Play size={16} />}
                        Start New Session
                    </Button>
                )}

                <Button 
                    variant="outline" 
                    className="w-full justify-between font-bold text-xs h-9 rounded-xl mt-1"
                    onClick={() => setShowHistory(!showHistory)}
                >
                    <span>Session History Logs</span>
                    {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>

                {showHistory && <PlanSessionsList planId={plan.id} hospitalId={hospitalId} />}
            </div>
        </div>
    );
}

function PlanSessionsList({ planId, hospitalId }: { planId: string, hospitalId: string }) {
    const firestore = useFirestore();
    const sessionsQuery = useMemoFirebase(() => {
        if (!firestore || !hospitalId || !planId) return null;
        return query(
            collection(firestore, `hospitals/${hospitalId}/treatment_plans/${planId}/sessions`),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, hospitalId, planId]);
    const { data: sessions, isLoading } = useCollection(sessionsQuery);

    if (isLoading) return <div className="flex justify-center py-2"><Loader2 className="animate-spin h-4 w-4" /></div>;

    return (
        <div className="mt-4 space-y-2 border-t pt-4">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Sessions logged ({sessions?.length || 0})</h4>
            {sessions?.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic">No sessions logged yet.</p>
            ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {sessions?.map((session) => (
                        <div key={session.id} className="flex justify-between items-center text-xs bg-muted/40 p-2 rounded-xl border border-muted/50">
                            <div>
                                <span className="font-bold">
                                    {session.status === 'COMPLETED' ? '✅ Session' : '⏳ Live'}
                                </span>
                                <span className="text-[9px] text-muted-foreground ml-2">
                                    {session.createdAt?.toDate ? format(session.createdAt.toDate(), 'MMM d, HH:mm') : ''}
                                </span>
                            </div>
                            <Button size="sm" variant="ghost" asChild className="h-6 text-[10px] font-black uppercase text-primary">
                                <Link href={`/specialty/session/${session.id}?planId=${planId}`}>
                                    {session.status === 'COMPLETED' ? 'View' : 'Resume'}
                                </Link>
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
