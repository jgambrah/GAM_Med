'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, UserPlus, CheckCircle, Loader2, Hospital, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * == Super Admin: Sales Pipeline Desk ==
 * 
 * Provides a live view of all 'Request for Demo' leads captured via the landing page.
 * Allows the Platform Owner to review and eventually provision new hospital tenants.
 */
export default function SalesLeadsDesk() {
    const firestore = useFirestore();

    // 1. LIVE QUERY: Listen for demo requests across the platform
    const leadsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "demo_requests"), orderBy("requestedAt", "desc"));
    }, [firestore]);

    const { data: leads, isLoading } = useCollection(leadsQuery);

    return (
        <div className="p-8 space-y-8 min-h-screen bg-slate-50/30">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-blue-900">Sales Pipeline</h1>
                    <p className="text-muted-foreground font-medium italic">Manage incoming demo requests and prospect engagement.</p>
                </div>
                <Badge variant="outline" className="h-8 px-4 border-blue-200 text-blue-700 bg-blue-50 font-black uppercase tracking-widest">
                    {leads?.length || 0} Total Leads
                </Badge>
            </div>

            <Card className="shadow-xl overflow-hidden border-none ring-1 ring-slate-200">
                <CardHeader className="bg-slate-900 text-white pb-6">
                    <div className="flex items-center gap-2">
                        <Hospital className="h-5 w-5 text-blue-400" />
                        <CardTitle className="text-lg">Prospect Registry</CardTitle>
                    </div>
                    <CardDescription className="text-slate-400 text-xs">
                        Potential hospital clients waiting for platform onboarding.
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
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Email & Phone</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                                    <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads && leads.length > 0 ? (
                                    leads.map((lead: any) => (
                                        <TableRow key={lead.id} className="hover:bg-slate-50/80 transition-colors border-b last:border-0 h-20">
                                            <TableCell className="pl-6">
                                                <p className="font-black text-slate-900 text-base">{lead.hospitalName}</p>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase mt-1">
                                                    <Clock size={10} />
                                                    {lead.requestedAt ? formatDistanceToNow(new Date(lead.requestedAt), { addSuffix: true }) : 'Recently'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-bold text-sm text-slate-700">{lead.name}</p>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                        <Mail size={12} className="text-blue-500" /> {lead.email}
                                                    </p>
                                                    <p className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                        <Phone size={12} className="text-green-500" /> {lead.phone}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={lead.status === 'Pending' ? 'destructive' : 'secondary'}
                                                    className="text-[9px] font-black uppercase tracking-widest px-2"
                                                >
                                                    {lead.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px] tracking-widest h-9 px-4">
                                                    <UserPlus className="mr-2 h-3.5 w-3.5" />
                                                    Provision
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-40 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-30">
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
