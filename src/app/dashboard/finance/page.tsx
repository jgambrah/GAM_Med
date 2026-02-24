'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, Receipt, CreditCard, TrendingUp, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Invoice } from '@/lib/types';
import { ReceivePaymentDialog } from '@/components/finance/receive-payment-dialog';

/**
 * == Hospital Finance Hub ==
 * 
 * The central dashboard for hospital accountants and directors.
 * Aggregates real-time billing data across the entire facility.
 */
export default function FinanceDashboardPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // 1. LIVE QUERY: Fetch recent invoices for THIS hospital
    const invoicesQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "invoices"),
            where("hospitalId", "==", user.hospitalId),
            orderBy("createdAt", "desc"),
            limit(50)
        );
    }, [firestore, user?.hospitalId]);

    const { data: invoices, isLoading } = useCollection<Invoice>(invoicesQuery);

    // 2. AGGREGATE STATS (Live from current result set)
    const stats = React.useMemo(() => {
        if (!invoices) return { revenueToday: 0, pendingAmount: 0, count: 0 };
        
        return invoices.reduce((acc, inv) => {
            if (inv.status === 'Paid') {
                acc.revenueToday += inv.grandTotal;
            } else if (inv.status === 'Pending Payment' || inv.status === 'Overdue') {
                acc.pendingAmount += inv.amountDue;
            }
            acc.count++;
            return acc;
        }, { revenueToday: 0, pendingAmount: 0, count: 0 });
    }, [invoices]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Wallet className="h-8 w-8 text-green-600" />
                        Hospital Finance Hub
                    </h1>
                    <p className="text-muted-foreground">
                        Real-time financial performance for <strong>{user?.hospitalId}</strong>.
                    </p>
                </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-green-50 border-green-200 shadow-sm border-t-4 border-t-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-green-700 font-bold uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="h-3 w-3" />
                            Revenue (Settled)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-green-900">₵{stats.revenueToday.toLocaleString()}</div>
                        <p className="text-[10px] text-green-700/70 mt-1 font-semibold uppercase">Real-time Collected Revenue</p>
                    </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200 shadow-sm border-t-4 border-t-orange-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-orange-700 font-bold uppercase tracking-wider flex items-center gap-2">
                            <CreditCard className="h-3 w-3" />
                            Accounts Receivable
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-orange-900">₵{stats.pendingAmount.toLocaleString()}</div>
                        <p className="text-[10px] text-orange-700/70 mt-1 font-semibold uppercase">Total Outstanding Invoices</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200 shadow-sm border-t-4 border-t-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-blue-700 font-bold uppercase tracking-wider flex items-center gap-2">
                            <Receipt className="h-3 w-3" />
                            Activity Count
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-blue-900">{stats.count}</div>
                        <p className="text-[10px] text-blue-700/70 mt-1 font-semibold uppercase">Recent Invoices Generated</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Invoices Table */}
            <Card className="shadow-md overflow-hidden">
                <div className="p-4 border-b font-bold bg-muted/20 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Recent Transactions Ledger
                </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Invoice ID</TableHead>
                                <TableHead>Patient</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date Issued</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices && invoices.length > 0 ? (
                                invoices.map((inv) => (
                                    <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-mono text-[10px] pl-6 uppercase tracking-widest text-muted-foreground">
                                            {inv.id.slice(0, 12)}
                                        </TableCell>
                                        <TableCell className="font-bold">{inv.patientName}</TableCell>
                                        <TableCell className="text-right font-black">
                                            ₵{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={inv.status === 'Paid' ? 'secondary' : 'default'}
                                                className={
                                                    inv.status === 'Paid' 
                                                        ? 'bg-green-500 hover:bg-green-600 border-none text-white' 
                                                        : 'bg-orange-500 hover:bg-orange-600 border-none text-white'
                                                }
                                            >
                                                {inv.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-medium">
                                            {inv.createdAt ? format(new Date(inv.createdAt.seconds * 1000), 'MMM dd, p') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {inv.status !== 'Paid' && (
                                                <ReceivePaymentDialog invoice={inv} />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center opacity-30">
                                            <FileText className="h-12 w-12 mb-2" />
                                            <p>No transactions recorded for this facility.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
