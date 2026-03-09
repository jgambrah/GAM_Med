'use client';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldAlert, DollarSign, Settings, Save, Archive } from 'lucide-react';

const defaultConfig = {
    dailyStorageFee: 50,
    embalmingFee: 500,
    autopsyFee: 800,
    chamberCount: 10,
};

export default function MortuarySetupPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const hospitalId = userProfile?.hospitalId;
    const isAuthorized = ['DIRECTOR', 'ADMIN'].includes(userProfile?.role || '');

    const configRef = useMemoFirebase(() => {
        if (!firestore || !hospitalId) return null;
        return doc(firestore, 'hospitals', hospitalId, 'mortuary_config', 'main');
    }, [firestore, hospitalId]);
    const { data: remoteConfig, isLoading: isConfigLoading } = useDoc(configRef);
    
    const [formState, setFormState] = useState(defaultConfig);

    useEffect(() => {
        if (remoteConfig) {
            setFormState(remoteConfig as any);
        } else {
            setFormState(defaultConfig);
        }
    }, [remoteConfig]);

    const handleSave = async () => {
        if (!configRef || !userProfile) return;
        setLoading(true);
        try {
            await setDocumentNonBlocking(configRef, {
                ...formState,
                hospitalId,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            toast({ title: 'Mortuary Configuration Saved' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setLoading(false);
        }
    };
    
    const pageIsLoading = isUserLoading || isProfileLoading || isConfigLoading;

    if (pageIsLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>
    }

    if(!isAuthorized) {
        return (
            <div className="flex flex-1 items-center justify-center bg-background p-4">
                <div className="text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You are not authorized for this module.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
                </div>
            </div>
        );
    }
    

    return (
        <div className="p-8 space-y-8 max-w-4xl mx-auto text-black font-bold">
            <div className="flex justify-between items-end border-b-4 border-slate-900 pb-6">
                <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter italic">Mortuary <span className="text-blue-600">Configuration</span></h1>
                <p className="text-slate-500 font-bold text-xs uppercase italic">Define tariffs and cold storage capacity.</p>
                </div>
                <Button onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={16}/>} Save Configuration
                </Button>
            </div>
            
            <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-2 flex items-center gap-2">
                    <DollarSign size={16} className="text-primary"/> Service Tariffs (GHS)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <TariffInput label="Daily Storage Fee" value={formState.dailyStorageFee} onChange={(v) => setFormState({...formState, dailyStorageFee: Number(v)})}/>
                    <TariffInput label="Standard Embalming" value={formState.embalmingFee} onChange={(v) => setFormState({...formState, embalmingFee: Number(v)})}/>
                    <TariffInput label="Autopsy Fee" value={formState.autopsyFee} onChange={(v) => setFormState({...formState, autopsyFee: Number(v)})}/>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-2 flex items-center gap-2">
                    <Archive size={16} className="text-primary"/> Cold Storage Setup
                </h3>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Total Chamber Capacity</label>
                    <input type="number" className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-xl mt-1" 
                    value={formState.chamberCount} onChange={(e) => setFormState({...formState, chamberCount: Number(e.target.value)})}/>
                </div>
            </div>
        </div>
    );
}

function TariffInput({ label, value, onChange }: { label: string, value: number, onChange: (v: string) => void }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400">{label}</label>
            <input type="number" className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-xl" value={value} onChange={e => onChange(e.target.value)} />
        </div>
    );
}
