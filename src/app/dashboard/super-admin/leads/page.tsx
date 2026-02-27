'use client';

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2, Hospital, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CreateHospitalModal from '@/components/super-admin/CreateHospitalModal';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

/**
 * == Super Admin: Sales Leads Desk ==
 * 
 * Manages demo requests and provides direct integration to provisioning.
 */
export default function SalesLeadsPage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [selectedLead, setSelectedLead] = useState<any>(null);

    // 1. LIVE QUERY: Listen for demo requests
    // SAAS GUARD: Wrap query in role check to prevent "Spy Queries" causing 500 errors for Marcus
    const leadsQuery = useMemoFirebase(() => {
        if (!firestore || user?.role !== 'super_admin') return null;
        return query(collection(firestore, "demo_requests"), orderBy("requestedAt", "desc"));
    }, [firestore, user?.role]);

    const { data: leads, isLoading } = useCollection(leadsQuery);

    const markAsOnboarded = async (leadId: string) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'demo_requests', leadId), { 
                status: 'Onboarded',
                updatedAt: serverTimestamp()
            });
            toast.success("Lead marked as onboarded.");
        } catch (e) {
            console.error("Status update failed:", e);
        }
        setSelectedLead(null);
    };

    // UI GUARD: Explicitly block rendering for non-CEO users
    if (user?.role !== 'super_admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-muted/20 rounded-2xl border-2 border-dashed">
                <Hospital className="h-16 w-16 mb-4 text-muted-foreground opacity-40" />
                <h2 className="text-xl font-black uppercase tracking-widest text-muted-foreground">Access Restricted</h2>
                <p className="text-sm text-muted-foreground mt-2">Only platform administrators can manage the sales pipeline.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Sales Pipeline</h1>
                    <p className="text-muted-foreground font-medium italic">Manage incoming demo requests and prospect engagement.</p>
                </div>
                <Badge variant="outline" className="h-8 px-4 border-blue-200 text-blue-700 bg-blue-50 font-black uppercase tracking-widest">
                    {leads?.length || 0} TOTAL LEADS
                </Badge>
            </div>

            {selectedLead && (
                <CreateHospitalModal 
                    initialData={{
                        name: selectedLead.name,
                        email: selectedLead.email,
                        hospitalName: selectedLead.hospitalName
                    }}
                    onSuccess={() => markAsOnboarded(selectedLead.id)}
                />
            )}

            <Card className="shadow-xl overflow-hidden border-none ring-1 ring-slate-200">
                <CardHeader className="bg-slate-900 text-white pb-6">
                    <div className="flex items-center gap-2">
                        <Hospital className="h-5 w-5 text-blue-400" />
                        <CardTitle className="text-lg">Prospect Registry</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400 text-xs">
                        Potential hospital clients waiting for platform evaluation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                    {isLoading ? (
                        <div className="p-20 text-center flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Syncing Pipeline...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50 border-b">
                                <TableRow>
                                    <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Hospital / Facility</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Contact Person</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                                    <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads && leads.length > 0 ? (
                                    leads.map((lead: any) => (
                                        <TableRow key={lead.id} className="hover:bg-slate-50/80 transition-colors h-24 border-b last:border-0">
                                            <TableCell className="pl-6">
                                                <p className="font-black text-slate-900 text-base leading-tight">{lead.hospitalName}</p>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase mt-1">
                                                    <Clock size={10} />
                                                    Requested {lead.requestedAt ? formatDistanceToNow(new Date(lead.requestedAt), { addSuffix: true }) : 'Recently'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <p className="font-bold text-slate-700 leading-tight">{lead.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{lead.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={lead.status === 'Pending' ? 'destructive' : 'default'}
                                                    className="text-[9px] font-black uppercase tracking-widest px-2 shadow-sm border-none"
                                                >
                                                    {lead.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                {lead.status === 'Pending' ? (
                                                    <Button 
                                                        size="sm" 
                                                        className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px] tracking-widest h-9 px-4 shadow-md"
                                                        onClick={() => setSelectedLead(lead)}
                                                    >
                                                        <UserPlus className="mr-2 h-3.5 w-3.5" />
                                                        Provision
                                                    </Button>
                                                ) : (
                                                    <Badge variant="outline" className="text-green-600 border-green-600 uppercase text-[9px] font-black px-3 py-1">Complete</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-40 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-30 grayscale">
                                                <Hospital className="h-12 w-12 mb-2" />
                                                <p className="text-sm font-medium tracking-tighter">No demo requests in the pipeline.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
