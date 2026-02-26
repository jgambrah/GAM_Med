'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Bill, StaffExpenseClaim } from '@/lib/types';
import { Loader2, Wallet } from 'lucide-react';

/**
 * == SaaS Accounts Payable Dashboard ==
 * 
 * High-fidelity oversight of facility liabilities.
 * Strictly logically isolated to the active hospital tenant.
 */
export function AccountsPayableDashboard() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const hospitalId = user?.hospitalId || '';

  // 1. LIVE QUERY: Pending vendor bills for THIS facility
  const billsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
        collection(firestore, "bills"),
        where("hospitalId", "==", hospitalId),
        orderBy("dueDate", "asc"),
        limit(50)
    );
  }, [firestore, hospitalId]);

  const { data: bills, isLoading: isBillsLoading } = useCollection<Bill>(billsQuery);

  if (!hospitalId) return null;

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-slate-50 border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Facility Liabilities</CardTitle>
                    <Wallet className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-black">₵{(bills?.reduce((acc, b) => acc + b.totalAmount, 0) || 0).toLocaleString()}</div>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Total Vendor Debt (SaaS Scoped)</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader className="border-b bg-muted/10">
                <CardTitle className="text-lg font-bold">Vendor Liability Registry</CardTitle>
                <CardDescription>Logical Isolation active for facility: <strong>{hospitalId}</strong></CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="pl-6">Invoice Ref</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead className="text-right">Balance Due (₵)</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right pr-6">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isBillsLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                        ) : bills && bills.length > 0 ? (
                            bills.map((bill) => (
                                <TableRow key={bill.id} className="hover:bg-muted/20 transition-colors">
                                    <TableCell className="font-mono text-[10px] pl-6 uppercase">{bill.billId?.slice(0, 8)}</TableCell>
                                    <TableCell className="font-bold text-sm">{bill.supplierId}</TableCell>
                                    <TableCell className="text-right font-black">₵{bill.totalAmount.toFixed(2)}</TableCell>
                                    <TableCell className="text-xs font-medium text-muted-foreground">{format(new Date(bill.dueDate), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{bill.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No pending liabilities found for this facility.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}