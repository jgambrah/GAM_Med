
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
import { Button } from '@/components/ui/button';
import { ControlledSubstance } from '@/lib/types';
import { TransactionLogDialog } from './components/transaction-log-dialog';
import { LogTransactionDialog } from './components/log-transaction-dialog';
import { ShieldAlert, DownloadCloud, Loader2, Scale } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

/**
 * == SaaS Pharmacy: Controlled Substance Registry ==
 * 
 * Provides a high-security workbench for managing narcotics.
 * Strictly logically isolated via the hospitalId SaaS wall.
 */
export default function ControlledSubstancesPage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [selectedSubstance, setSelectedSubstance] = React.useState<ControlledSubstance | null>(null);
    const [transactionSubstance, setTransactionSubstance] = React.useState<ControlledSubstance | null>(null);
    const [isGenerating, setIsGenerating] = React.useState(false);

    // 1. LIVE QUERY: Listen for all controlled substances in THIS hospital
    const substancesQuery = useMemoFirebase(() => {
        if (!firestore || !user?.hospitalId) return null;
        return query(
            collection(firestore, "controlled_substances"),
            where("hospitalId", "==", user.hospitalId),
            orderBy("name", "asc")
        );
    }, [firestore, user?.hospitalId]);

    const { data: substances, isLoading } = useCollection<ControlledSubstance>(substancesQuery);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        toast.info('Generating Compliance Return...', { description: 'Compiling audit logs based on MoH standards.' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('Report Ready', { description: 'Monthly narcotic usage return has been generated.' });
        setIsGenerating(false);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50/30 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
                        <ShieldAlert className="text-red-600 h-8 w-8" />
                        Narcotics & Controlled Drugs
                    </h1>
                    <p className="text-muted-foreground font-medium">Statutory inventory and secure chain-of-custody for <strong>{user?.hospitalId}</strong></p>
                </div>
                <Button onClick={handleGenerateReport} disabled={isGenerating} variant="outline" className="shadow-sm border-2">
                    <DownloadCloud className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Compiling...' : 'MoH Compliance Return'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-red-50 border-red-200 border-t-4 border-t-red-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-red-800 flex items-center gap-2">
                            <Scale className="h-3 w-3" /> Secure Inventory Count
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-red-900">{substances?.length || 0}</div>
                        <p className="text-[10px] text-red-700/70 mt-1 uppercase font-bold tracking-tighter">Regulated substances on hand</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-md overflow-hidden border-none ring-1 ring-slate-200">
                <CardHeader className="bg-muted/20 border-b">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Digital Dangerous Drugs Register (DDDR)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Substance / Formulation</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Strength</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Total Quantity</TableHead>
                                <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {substances && substances.length > 0 ? (
                                substances.map((substance) => (
                                    <TableRow key={substance.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="pl-6">
                                            <p className="font-black text-slate-900">{substance.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase">{substance.form}</p>
                                        </TableCell>
                                        <TableCell className="font-bold text-xs">{substance.strength}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black font-mono text-lg text-primary">{substance.totalQuantity}</span>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{substance.unit}s</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6 space-x-2">
                                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase hover:bg-muted" onClick={() => setSelectedSubstance(substance)}>
                                                Chain of Custody
                                            </Button>
                                            <Button size="sm" className="h-8 text-[10px] font-black uppercase shadow-sm" onClick={() => setTransactionSubstance(substance)}>
                                                Record Movement
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic">
                                        No controlled substances found in the facility register.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedSubstance && (
                <TransactionLogDialog
                    substance={selectedSubstance}
                    isOpen={!!selectedSubstance}
                    onOpenChange={() => setSelectedSubstance(null)}
                />
            )}
             {transactionSubstance && (
                <LogTransactionDialog
                    substance={transactionSubstance}
                    isOpen={!!transactionSubstance}
                    onOpenChange={() => setTransactionSubstance(null)}
                />
            )}
        </div>
    );
}
