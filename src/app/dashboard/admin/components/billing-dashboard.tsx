'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Invoice, Claim, FinancialTransaction, LedgerAccount, LedgerEntry } from '@/lib/types';
import Link from 'next/link';
import { InvoiceDetailDialog } from './invoice-detail-dialog';
import { ClaimDetailDialog } from './claim-detail-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { LogPaymentSchema } from '@/lib/schemas';
import { toast } from '@/hooks/use-toast';
import { LedgerPostingDialog } from './ledger-posting-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Loader2 } from 'lucide-react';

/**
 * == SaaS Billing & Accounts Receivable ==
 * 
 * Centralised financial hub. All lookups and filters are strictly scoped 
 * to the current facility's hospitalId.
 */
export function BillingDashboard() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const hospitalId = user?.hospitalId || '';

  // 1. LIVE QUERY: Recent Invoices for THIS facility
  const invQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
        collection(firestore, "invoices"),
        where("hospitalId", "==", hospitalId),
        orderBy("createdAt", "desc"),
        limit(50)
    );
  }, [firestore, hospitalId]);

  const { data: invoices, isLoading: isInvLoading } = useCollection<Invoice>(invQuery);

  if (!hospitalId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts Receivable</CardTitle>
        <CardDescription>
          Strategic financial status for <strong>{hospitalId}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="invoices">
            <TabsList>
                <TabsTrigger value="invoices">Invoice Registry</TabsTrigger>
                <TabsTrigger value="reconciliation">Payments</TabsTrigger>
            </TabsList>
            <TabsContent value="invoices" className="mt-4">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Invoice ID</TableHead>
                                <TableHead>Patient</TableHead>
                                <TableHead className="text-right">Amount (₵)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isInvLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : invoices && invoices.length > 0 ? (
                                invoices.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-mono text-[10px] pl-6 uppercase tracking-wider">{inv.invoiceId?.slice(0, 8) || inv.id?.slice(0,8)}</TableCell>
                                        <TableCell className="font-bold">{inv.patientName}</TableCell>
                                        <TableCell className="text-right font-black">₵{inv.grandTotal.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant={inv.status === 'Paid' ? 'secondary' : 'default'} className="text-[10px] uppercase font-black tracking-tighter">
                                                {inv.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold">Details</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">No facility invoices recorded.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>
            <TabsContent value="reconciliation" className="mt-4">
                <div className="p-8 text-center border-2 border-dashed rounded-xl bg-muted/10 opacity-50">
                    <p className="text-sm font-medium">Secure Payment Processing Scoped to {hospitalId}</p>
                </div>
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}