'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Inbox, CheckCircle2, XCircle } from 'lucide-react';
import { Referral } from '@/lib/types';

/**
 * == Reception Module: Incoming Referrals Inbox ==
 * 
 * A real-time work-queue for receptionists at the receiving hospital.
 * Strictly logically isolated via the toHospitalId SaaS Wall.
 */
export default function IncomingReferralsPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // 1. LIVE QUERY: Listen for referrals where THIS hospital is the destination
    const incomingQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "referrals"),
            where("toHospitalId", "==", user.hospitalId),
            where("status", "==", "Pending")
        );
    }, [firestore, user?.hospitalId]);

    const { data: incoming, isLoading } = useCollection<Referral>(incomingQuery);

    const handleUpdateStatus = (id: string, status: Referral['status'], patientName: string) => {
        if (!firestore) return;
        
        const ref = doc(firestore, 'referrals', id);
        
        updateDocumentNonBlocking(ref, { 
            status,
            updatedAt: serverTimestamp()
        });

        toast.success(`Referral ${status}`, {
            description: `Patient ${patientName} has been ${status.toLowerCase()}.`
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-serif italic text-slate-900">Incoming Referrals</h1>
                    <p className="text-sm text-muted-foreground">Triage queue for incoming patient transfers.</p>
                </div>
                <Badge variant="outline" className="h-8 px-4 border-blue-200 text-blue-700 bg-blue-50">
                    {incoming?.length || 0} PENDING
                </Badge>
            </div>

            <div className="grid gap-4">
                {incoming && incoming.length > 0 ? (
                    incoming.map((ref) => (
                        <Card key={ref.id} className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-bold text-lg text-slate-900">{ref.patientName}</h4>
                                        <Badge variant="secondary" className="text-[10px] uppercase font-black tracking-widest">
                                            From: {ref.fromHospitalName}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1 italic leading-relaxed">
                                        "{ref.clinicalSummary}"
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant={ref.priority === 'Emergency' ? 'destructive' : 'outline'} className="text-[9px] font-bold uppercase">
                                            Priority: {ref.priority}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground font-mono">ID: {ref.patientId}</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 shrink-0">
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-9 text-destructive border-destructive/20 hover:bg-destructive/5"
                                        onClick={() => handleUpdateStatus(ref.id!, 'Rejected', ref.patientName)}
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        className="h-9 bg-blue-600 hover:bg-blue-700"
                                        onClick={() => handleUpdateStatus(ref.id!, 'Accepted', ref.patientName)}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Accept & Register
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-24 border-2 border-dashed rounded-xl bg-muted/5">
                        <Inbox className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                        <h3 className="font-bold text-slate-900">Queue is Clear</h3>
                        <p className="text-sm text-muted-foreground">No new referrals requiring attention.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
