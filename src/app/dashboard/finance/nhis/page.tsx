'use client';

import * as React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Hourglass, CheckCircle2, XCircle, Landmark, Loader2, TrendingUp, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { NhisClaim } from '@/lib/types';

/**
 * == NHIS Claims & Tracking Hub ==
 * 
 * Provides high-fidelity oversight of statutory government claims.
 * Every claim is logically isolated via the hospitalId SaaS Wall.
 */
export default function NHISTrackingPage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const hospitalId = user?.hospitalId || '';

    // 1. LIVE SAAS QUERY: Listen for NHIS claims for THIS facility
    const claimsQuery = useMemoFirebase(() => {
        if (!firestore || !hospitalId) return null;
        return query(
            collection(firestore, "nhis_claims"),
            where("hospitalId", "==", hospitalId),
            orderBy("createdAt", "desc")
        );
    }, [firestore, hospitalId]);

    const { data: claims, isLoading } = useCollection<NhisClaim>(claimsQuery);

    const calculateTotal = (items: NhisClaim[] | null) => {
        if (!items) return 0;
        return items.reduce((acc, curr) => acc + (parseFloat(curr.amount as any) || 0), 0);
    };

    const filterBy = (items: NhisClaim[] | null, status: string) => {
        if (!items) return 0;
        return items.filter(i => i.status === status).length;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50/30 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
                        <Landmark className="text-blue-600 h-8 w-8" />
                        NHIS Claims & Reimbursement
                    </h1>
                    <p className="text-muted-foreground font-medium italic">Statutory government claim tracking for <strong>{hospitalId}</strong></p>
                </div>
                <div className="flex flex-col items-end">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total Booked Revenue</p>
                    <Badge variant="outline" className="h-10 px-6 border-blue-200 text-blue-700 bg-white font-black text-lg shadow-sm">
                        ₵{calculateTotal(claims).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Badge>
                </div>
            </div>

            {/* Claim Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatusCard 
                    title="Pending Submission" 
                    count={filterBy(claims, 'Pending')} 
                    icon={<FileText className="text-slate-500" />} 
                    sub="Awaiting Batching"
                />
                <StatusCard 
                    title="Under Review" 
                    count={filterBy(claims, 'Submitted')} 
                    icon={<Hourglass className="text-orange-500" />} 
                    sub="Submitted to NHIA"
                />
                <StatusCard 
                    title="Vetted" 
                    count={filterBy(claims, 'Vetted')} 
                    icon={<ShieldCheck className="text-blue-500" />} 
                    sub="Audit Complete"
                />
                <StatusCard 
                    title="Approved" 
                    count={filterBy(claims, 'Approved')} 
                    icon={<CheckCircle2 className="text-green-600" />} 
                    sub="Pending Disbursement"
                />
                <StatusCard 
                    title="Rejected" 
                    count={filterBy(claims, 'Rejected')} 
                    icon={<XCircle className="text-red-600" />} 
                    sub="Action Required"
                />
            </div>

            {/* Claims Registry */}
            <Card className="shadow-xl border-none ring-1 ring-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-900 text-white pb-6">
                    <CardTitle className="text-lg font-bold">NHIS Claims Register</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">Official ledger of G-DRG tariff claims scoped to this facility.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b">
                            <TableRow>
                                <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Claim ID</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Patient / NHIS ID</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Service Date</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Diagnosis (ICD-10)</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Tariff Amount (₵)</TableHead>
                                <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Claim Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {claims && claims.length > 0 ? (
                                claims.map((claim) => (
                                    <TableRow key={claim.id} className="hover:bg-slate-50 transition-colors border-b last:border-0 h-16">
                                        <TableCell className="pl-6 font-mono text-[10px] font-bold text-muted-foreground uppercase">
                                            {claim.id.slice(0, 8)}
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-bold text-slate-900 text-xs">{claim.patientName}</p>
                                            <p className="text-[9px] font-mono text-blue-600 font-bold tracking-tight">{claim.nhisNumber}</p>
                                        </TableCell>
                                        <TableCell className="text-[11px] font-medium text-slate-600">
                                            {claim.serviceDate ? format(new Date(claim.serviceDate), 'MMM dd, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-200 bg-slate-50">
                                                {claim.diagnosisCode || 'PENDING'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-black font-mono text-slate-900">
                                            ₵{parseFloat(claim.amount as any).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Badge className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm border-none",
                                                claim.status === 'Paid' ? "bg-emerald-500" :
                                                claim.status === 'Approved' ? "bg-green-500" :
                                                claim.status === 'Rejected' ? "bg-red-500" :
                                                claim.status === 'Submitted' ? "bg-blue-500" : "bg-slate-500"
                                            )}>
                                                {claim.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-30">
                                            <FileText className="h-12 w-12 mb-2" />
                                            <p className="text-sm font-medium">No NHIS claims recorded for this facility.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Operational Guidance */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                    <strong>Coordination Tip:</strong> Reconcile <strong>Rejected</strong> claims within 48 hours to minimize the reimbursement cycle. Use the <strong>Clinical Returns</strong> module to ensure ICD-10 coding accuracy before final NHIA submission.
                </p>
            </div>
        </div>
    );
}

function StatusCard({ title, count, icon, sub }: { title: string, count: number, icon: React.ReactNode, sub: string }) {
    return (
        <Card className="shadow-sm border-none bg-white ring-1 ring-slate-200">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
                    <Badge variant="secondary" className="text-[10px] font-black">{count}</Badge>
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{title}</p>
                <h3 className="text-2xl font-black mt-2 text-slate-900">{count}</h3>
                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-2 tracking-tighter">{sub}</p>
            </CardContent>
        </Card>
    );
}
