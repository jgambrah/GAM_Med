'use client';

import * as React from 'react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger, 
    DialogDescription 
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExtendTrialDialog({ hospital }: { hospital: any }) {
    const firestore = useFirestore();
    const [loading, setLoading] = React.useState(false);
    const [open, setOpen] = React.useState(false);

    const handleExtend = async (days: number) => {
        if (!firestore) return;
        setLoading(true);
        try {
            // 1. Calculate new expiry date
            // Handle both Firestore Timestamps and ISO strings
            const currentExpiry = hospital.trialEndsAt?.toDate 
                ? hospital.trialEndsAt.toDate() 
                : (hospital.trialEndsAt ? new Date(hospital.trialEndsAt) : new Date());
                
            const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
            
            const newExpiry = new Date(baseDate);
            newExpiry.setDate(newExpiry.getDate() + days);

            // 2. Update Firestore (The SaaS Extension Logic)
            // Use hospital.id (from doc.id) or hospital.hospitalId
            const hospitalRef = doc(firestore, 'hospitals', hospital.id || hospital.hospitalId);
            await updateDoc(hospitalRef, {
                trialEndsAt: Timestamp.fromDate(newExpiry),
                subscriptionStatus: 'trialing', // This unlocks the app automatically if it was expired
                isActive: true,
                status: 'active'
            });

            toast.success(`Trial Period Extended`, {
                description: `New expiry for ${hospital.name}: ${newExpiry.toLocaleDateString()}`
            });
            setOpen(false);
        } catch (error) {
            console.error("Trial extension failed:", error);
            toast.error("Process Failed", { description: "You don't have permission to modify tenant subscriptions." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest text-blue-600 border-blue-200 hover:bg-blue-50 shadow-sm transition-all">
                    <Clock className="mr-1.5 h-3 w-3" /> Manage Trial
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-t-4 border-t-blue-600">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                        <Clock className="h-5 w-5" />
                        <DialogTitle className="font-black uppercase tracking-tighter">Trial Extension Desk</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs font-medium">
                        Adjust the evaluation period for <strong>{hospital.name}</strong>.
                        <br />
                        Current Expiry: <span className="font-bold text-slate-900">{hospital.trialEndsAt ? (hospital.trialEndsAt.toDate ? hospital.trialEndsAt.toDate().toLocaleDateString() : new Date(hospital.trialEndsAt).toLocaleDateString()) : 'Not Set'}</span>
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 gap-3 py-6">
                    <Button 
                        onClick={() => handleExtend(7)} 
                        disabled={loading}
                        variant="outline"
                        className="justify-start h-14 font-bold border-2 hover:border-blue-500 hover:bg-blue-50 group"
                    >
                        <CalendarDays className="mr-3 h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" /> 
                        <div className="text-left">
                            <p className="text-sm">Add +7 Days</p>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase">Short Grace Period</p>
                        </div>
                    </Button>
                    <Button 
                        onClick={() => handleExtend(14)} 
                        disabled={loading}
                        variant="outline"
                        className="justify-start h-14 font-bold border-2 hover:border-blue-500 hover:bg-blue-50 group"
                    >
                        <CalendarDays className="mr-3 h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" /> 
                        <div className="text-left">
                            <p className="text-sm">Add +14 Days</p>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase">Standard Extension</p>
                        </div>
                    </Button>
                    <Button 
                        onClick={() => handleExtend(30)} 
                        disabled={loading}
                        className="justify-start h-14 bg-slate-900 hover:bg-slate-800 font-bold group"
                    >
                        {loading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <CalendarDays className="mr-3 h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" />}
                        <div className="text-left">
                            <p className="text-sm">Add +30 Days</p>
                            <p className="text-[10px] font-medium text-slate-400 uppercase">Full Month Evaluation</p>
                        </div>
                    </Button>
                </div>
                
                <div className="pt-4 border-t">
                    <p className="text-[9px] text-center text-muted-foreground italic">
                        Extension takes effect immediately. The facility dashboard will unlock automatically.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
